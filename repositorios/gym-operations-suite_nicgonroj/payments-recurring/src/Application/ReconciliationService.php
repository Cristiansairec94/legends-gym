<?php
declare(strict_types=1);
namespace DemoGym\Application;

use DemoGym\Config;
use DemoGym\Infrastructure\EnrollmentRepository;
use DemoGym\Infrastructure\MercadoPagoApiException;
use DemoGym\Infrastructure\MercadoPagoClient;
use DemoGym\Infrastructure\ReadBudgetExceeded;
use DemoGym\Infrastructure\ReconciliationReadContext;
use DemoGym\Infrastructure\WebhookEventRepository;
use PDO;
use Throwable;

/** Shared by private CLI and authenticated server-to-server manual requests. */
final class ReconciliationService
{
    public function __construct(
        private readonly Config $config, private readonly PDO $pdo,
        private readonly EnrollmentRepository $enrollments, private readonly WebhookEventRepository $events,
        private readonly ?\Closure $transport = null
    ) {}

    public function run(string $runId, int $after = 0, int $limit = 1, ?string $publicId = null, int $budgetSeconds = 45, string $trigger = 'manual'): array
    {
        if (!preg_match('/^[A-Za-z0-9_-]{8,80}$/D', $runId) || $after < 0 || $after > 999999999999999
            || $limit < 1 || $limit > 50 || ($publicId !== null && !self::validPublicId($publicId))
            || ($publicId !== null && $after !== 0) || !in_array($trigger, ['manual', 'cli'], true)) throw new \InvalidArgumentException('Invalid reconciliation request.');
        $summary = ['schema' => 'dgym-manual-reconciliation-result/1', 'runId' => $runId,
            'startedAt' => gmdate('Y-m-d\TH:i:s\Z'), 'finishedAt' => null, 'verifiedAt' => null,
            'processed' => 0, 'complete' => 0, 'incomplete' => 0, 'replayed' => 0,
            'nextAfterId' => $after, 'hasMore' => false, 'status' => 'error', 'error' => null, 'errorCodes' => []];
        $lockName = null;
        $reads = new ReconciliationReadContext($budgetSeconds);
        try {
            $this->config->assertMercadoPagoCredentialEnvironment();
            $environment = $this->config->mercadoPagoCredentialEnvironment(); $summary['environment'] = $environment;
            $candidateLock = 'dgym-reconcile:' . substr(hash('sha256', (string) $this->pdo->query('SELECT DATABASE()')->fetchColumn()), 0, 40);
            $lock = $this->pdo->prepare('SELECT GET_LOCK(?, 0)'); $lock->execute([$candidateLock]);
            if ((int) $lock->fetchColumn() !== 1) { $summary['status'] = 'busy'; $summary['error'] = 'reconciliation_busy'; throw new \RuntimeException('busy'); }
            $lockName = $candidateLock;
            $fields = 'id,public_id,reference,created_at,mp_subscription_id';
            $query = $this->pdo->prepare($publicId !== null
                ? 'SELECT ' . $fields . ' FROM enrollments WHERE public_id = :public_id LIMIT 1'
                : 'SELECT ' . $fields . ' FROM enrollments WHERE id > :after ORDER BY id LIMIT ' . ($limit + 1));
            $query->execute($publicId !== null ? ['public_id' => $publicId] : ['after' => $after]); $rows = $query->fetchAll();
            if ($publicId !== null && $rows === []) { $summary['error'] = 'enrollment_not_found'; throw new \RuntimeException('not_found'); }
            $summary['hasMore'] = $publicId === null && count($rows) > $limit;
            // The same client/deadline serves search AND nested invoice/payment/checkout GETs.
            $client = new MercadoPagoClient($this->config, $reads, $this->transport);
            $processor = new WebhookProcessor($this->config, $this->enrollments, $this->events, $client);
            $eventResult = function (int $id): array {
                $read = $this->pdo->prepare('SELECT status,enrollment_id,resource_snapshot_json,error_code FROM webhook_events WHERE id=?');
                $read->execute([$id]); $row = $read->fetch(); return is_array($row) ? $row : [];
            };
            $register = function (string $topic, string $resourceId, int $enrollmentId, int $attempt = 0) use ($runId, $trigger): array {
                return $this->events->register(hash('sha256', implode("\n", ['dgym-reconciliation/1', $runId, (string) $enrollmentId, (string) $attempt, $topic, $resourceId])), [
                    'event_id' => null, 'request_id' => 'reconciliation-' . $runId, 'topic' => $topic,
                    'action' => $topic === 'reconciliation.scan' ? 'reconciliation.scan' : 'reconciliation.read',
                    'resource_id' => $resourceId, 'live_mode' => false, 'enrollment_id' => $enrollmentId,
                    'payload' => ['source' => 'reconciliation_read', 'run_id' => $runId, 'scan_attempt' => $attempt,
                        'signature_verified' => false, 'trigger' => $trigger],
                ]);
            };
            foreach (array_slice($rows, 0, $limit) as $enrollment) {
                $reads->timeoutMilliseconds();
                $enrollmentId = (int) $enrollment['id'];
                $attempts = $this->enrollments->checkoutAttemptReferences($enrollmentId);
                $enrollment['checkout_references'] = array_values(array_unique(array_map(
                    static fn (array $attempt): string => (string) ($attempt['external_reference'] ?? ''),
                    $attempts
                )));
                $enrollment['checkout_subscription_ids'] = array_values(array_unique(array_map(
                    static fn (array $attempt): string => (string) ($attempt['resource_id'] ?? ''),
                    array_values(array_filter(
                        $attempts,
                        static fn (array $attempt): bool => (string) ($attempt['checkout_type'] ?? '') === 'subscription'
                            && trim((string) ($attempt['resource_id'] ?? '')) !== ''
                    ))
                )));
                $scanEvent = $register('reconciliation.scan', (string) $enrollment['public_id'], $enrollmentId);
                $scanId = (int) $scanEvent['id']; $snapshot = null;
                if (!$this->events->acquire($scanId)) {
                    $previous = $eventResult($scanId);
                    if (($previous['status'] ?? '') === 'processed') $summary['replayed']++;
                    else { $summary['incomplete']++; $summary['errorCodes'][] = 'scan_in_progress'; }
                    $snapshot = json_decode((string) ($previous['resource_snapshot_json'] ?? ''), true);
                } else {
                    // Failed scans always get a new attempt: never reuse successful old GETs with a new timestamp.
                    $attempt = (int) $scanEvent['attempts']; $subscriptionFacts = null; $lookupErrors = [];
                    $readIds = function () use ($enrollmentId): array {
                        $read = $this->pdo->prepare('SELECT mp_payment_id FROM payment_records WHERE enrollment_id=? ORDER BY mp_payment_id LIMIT 101');
                        $read->execute([$enrollmentId]); return array_map('strval', $read->fetchAll(PDO::FETCH_COLUMN));
                    };
                    $refresh = function (string $topic, string $resourceId) use ($register, $eventResult, $processor, $reads, $enrollmentId, $attempt, &$subscriptionFacts, &$lookupErrors): bool {
                        try { $reads->timeoutMilliseconds(); }
                        catch (ReadBudgetExceeded) { $lookupErrors[] = 'budget_exceeded'; return false; }
                        $event = $register($topic, $resourceId, $enrollmentId, $attempt); $id = (int) $event['id'];
                        if ($this->events->acquire($id)) {
                            try { $processor->process($id, $topic, $resourceId, 'reconciliation_read'); }
                            catch (Throwable $error) {
                                $diagnostic = self::safeFailure($error); $lookupErrors[] = $diagnostic['code'];
                                $this->events->finish($id, 'failed_transient', $enrollmentId,
                                    ['schema' => 'dgym-reconciliation-failure/1', 'diagnostic' => $diagnostic], 'reconciliation_lookup_failed');
                            }
                        }
                        $result = $eventResult($id);
                        $success = ($result['status'] ?? '') === 'processed' && (int) ($result['enrollment_id'] ?? 0) === $enrollmentId;
                        if ($success && $topic === 'subscription_preapproval') {
                            $facts = json_decode((string) ($result['resource_snapshot_json'] ?? ''), true);
                            $subscriptionFacts = is_array($facts) ? ($facts['subscription_verification'] ?? null) : null;
                        }
                        return $success;
                    };
                    try {
                        $subscription = static function () use (&$subscriptionFacts): ?array { return $subscriptionFacts; };
                        $snapshot = (new ReconciliationScan($client->reconciliationSearch(), $refresh, $readIds, $subscription))->run($enrollment, $environment);
                    } catch (Throwable $error) {
                        $snapshot = ['schema' => 'dgym-reconciliation-scan/1', 'source' => 'reconciliation_read', 'environment' => $environment,
                            'complete' => false, 'completed_at' => gmdate('Y-m-d\TH:i:s\Z'), 'payment_ids' => [], 'errors' => ['scan_failed', self::safeFailure($error)['code']]];
                    }
                    $snapshot['diagnostics'] = $reads->diagnostics();
                    if ($snapshot['diagnostics']['budget_exhausted']) $lookupErrors[] = 'budget_exceeded';
                    $snapshot['errors'] = array_values(array_unique(array_merge($snapshot['errors'], $lookupErrors)));
                    $snapshot['complete'] = $snapshot['complete'] === true && $snapshot['errors'] === [];
                    $complete = $snapshot['complete'];
                    $this->events->finish($scanId, $complete ? 'processed' : 'failed_transient', $enrollmentId, $snapshot, $complete ? null : 'reconciliation_incomplete');
                    $summary[$complete ? 'complete' : 'incomplete']++;
                }
                if (is_array($snapshot)) {
                    $summary['errorCodes'] = array_merge($summary['errorCodes'], $snapshot['errors'] ?? []);
                    if (($snapshot['complete'] ?? false) === true) $summary['verifiedAt'] = $snapshot['completed_at'] ?? null;
                }
                $summary['processed']++; $summary['nextAfterId'] = $enrollmentId;
            }
            $summary['status'] = $summary['incomplete'] > 0 ? 'incomplete' : ($summary['replayed'] > 0 && $summary['complete'] === 0 ? 'replayed' : 'complete');
        } catch (Throwable $error) {
            $summary['error'] ??= self::safeFailure($error)['code']; $summary['errorCodes'][] = $summary['error'];
        } finally {
            if ($lockName !== null) { try { $release = $this->pdo->prepare('SELECT RELEASE_LOCK(?)'); $release->execute([$lockName]); } catch (Throwable) {} }
            $summary['finishedAt'] = gmdate('Y-m-d\TH:i:s\Z');
            $summary['errorCodes'] = array_values(array_unique($summary['errorCodes']));
            $summary['diagnostics'] = $reads->diagnostics();
        }
        return $summary;
    }

    public static function validPublicId(string $id): bool
    {
        return preg_match('/^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/D', $id) === 1;
    }

    public static function safeFailure(Throwable $error): array
    {
        if ($error instanceof ReadBudgetExceeded) return ['code' => 'budget_exceeded'];
        if ($error instanceof MercadoPagoApiException) return ['code' => match (true) {
            $error->httpStatus === 0 => 'provider_transport_failed', $error->httpStatus === 429 => 'provider_rate_limited',
            $error->httpStatus >= 500 => 'provider_server_failed', default => 'provider_request_failed',
        }, 'http_status' => $error->httpStatus];
        if ($error instanceof GatewayStateNotReadyException) return ['code' => 'provider_verification_failed'];
        if ($error instanceof \PDOException) return ['code' => 'storage_failed'];
        return ['code' => 'reconciliation_unavailable'];
    }
}
