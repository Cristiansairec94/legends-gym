<?php

declare(strict_types=1);

namespace DemoGym\Application;

use Closure;
use DateTimeImmutable;
use DateTimeZone;
use DemoGym\Infrastructure\ReconciliationSearch;

/** A stable discovery pass plus GETs of every discovered/known payment. */
final class ReconciliationScan
{
    /**
     * @param Closure(string,string):bool $refresh Only GET processing; true means processed for this enrollment.
     * @param Closure():list<string> $localPaymentIds
     */
    public function __construct(
        private readonly ReconciliationSearch $search,
        private readonly Closure $refresh,
        private readonly Closure $localPaymentIds,
        private readonly ?Closure $subscriptionInfo = null,
        private readonly ?Closure $clock = null
    ) {}

    /** @param array<string,mixed> $enrollment @return array<string,mixed> */
    public function run(array $enrollment, string $environment, ?DateTimeImmutable $now = null): array
    {
        if (!in_array($environment, ['test', 'production'], true)) throw new \InvalidArgumentException('Invalid scan environment.');
        $fixedNow = $now !== null && $this->clock === null;
        $now = ($now ?? $this->currentTime())->setTimezone(new DateTimeZone('UTC'));
        $started = $now->format('Y-m-d\TH:i:s.v\Z');
        $floor = $now->modify('-364 days');
        $created = new DateTimeImmutable((string) $enrollment['created_at'], new DateTimeZone('UTC'));
        $begin = ($created > $floor ? $created : $floor)->format('Y-m-d\TH:i:s.v\Z');
        $snapshot = [
            'schema' => 'dgym-reconciliation-scan/1', 'source' => 'reconciliation_read',
            'environment' => $environment, 'started_at' => $started, 'completed_at' => null,
            'scope' => 'all-checkout-attempt-references-and-subscriptions-plus-known-payments',
            'complete' => false, 'payment_ids' => [], 'errors' => [],
            'window_start' => $begin, 'window_end' => $started, 'subscription' => null,
        ];
        $errors = [];
        if ($created < $floor || $created > $now) $errors[] = 'historical_window_incomplete';
        $reference = (string) $enrollment['reference'];
        $references = self::references(array_merge(
            [$reference],
            is_array($enrollment['checkout_references'] ?? null) ? $enrollment['checkout_references'] : []
        ));
        $subscriptionId = trim((string) ($enrollment['mp_subscription_id'] ?? ''));
        $subscriptionIds = self::ids(array_merge(
            $subscriptionId === '' ? [] : [$subscriptionId],
            is_array($enrollment['checkout_subscription_ids'] ?? null) ? $enrollment['checkout_subscription_ids'] : []
        ));
        if (count($references) > 10 || count($subscriptionIds) > 10) {
            $errors[] = 'checkout_attempt_limit_exceeded';
        }
        $references = array_slice($references, 0, 10);
        $subscriptionIds = array_slice($subscriptionIds, 0, 10);
        $known = self::ids(($this->localPaymentIds)());
        $expected = $known;
        // Independent endpoints can fail independently. Preserve every successful
        // authenticated payment refresh, but never certify an incomplete scan.
        if ($subscriptionId !== '') {
            try {
                if (!$this->refreshSafely('subscription_preapproval', $subscriptionId)) $errors[] = 'subscription_lookup_failed';
                elseif ($this->subscriptionInfo !== null) $snapshot['subscription'] = ($this->subscriptionInfo)();
            } catch (\Throwable) { $errors[] = 'subscription_lookup_failed'; }
        }
        foreach ($subscriptionIds as $historicalSubscriptionId) {
            if ($historicalSubscriptionId === $subscriptionId) continue;
            try {
                if (!$this->refreshSafely('subscription_preapproval', $historicalSubscriptionId)) {
                    $errors[] = 'historical_subscription_lookup_failed';
                }
            } catch (\Throwable) { $errors[] = 'historical_subscription_lookup_failed'; }
        }
        $payments = [];
        $paymentPasses = [];
        foreach ($references as $checkoutReference) {
            try {
                $found = $this->search->payments($checkoutReference, $begin, $started);
                $paymentPasses[$checkoutReference] = $found;
                $payments = $payments + $found;
            } catch (\Throwable) { $errors[] = 'payments_discovery_failed'; }
        }
        $invoices = [];
        $invoicePasses = [];
        foreach ($subscriptionIds as $checkoutSubscriptionId) {
            try {
                $found = $this->search->authorizedPayments($checkoutSubscriptionId);
                $invoicePasses[$checkoutSubscriptionId] = $found;
                $invoices = $invoices + $found;
            } catch (\Throwable) { $errors[] = 'invoices_discovery_failed'; }
        }
        $expected = self::ids(array_merge($known, array_map('strval', array_keys($payments)), array_values(array_filter(array_column($invoices, 'payment_id')))));
        if (count($expected) > 100) $errors[] = 'payment_limit_exceeded';
        // Invoice GET validates linkage. Each payment GET independently validates
        // ownership, linkage and financial facts before any persisted update.
        foreach (array_slice($invoices, 0, 100, true) as $id => $invoice) {
            if ($invoice['payment_id'] !== null && !$this->refreshSafely('authorized_payment', (string) $id)) $errors[] = 'lookup_failed';
        }
        if (count($invoices) > 100) $errors[] = 'payment_limit_exceeded';
        foreach (array_slice($expected, 0, 100) as $paymentId) {
            if (!$this->refreshSafely('payment', $paymentId)) $errors[] = 'lookup_failed';
        }
        // A search is not a transactional remote snapshot. The second pass
        // advances its end boundary so a payment created during the first pass
        // cannot remain invisible merely because both reads shared a stale cut.
        $secondNow = $fixedNow ? $now : $this->currentTime();
        if ($secondNow < $now) $secondNow = $now;
        $secondEnd = $secondNow->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d\TH:i:s.v\Z');
        $snapshot['window_end'] = $secondEnd;
        foreach ($paymentPasses as $checkoutReference => $firstPass) {
            try { if ($firstPass !== $this->search->payments($checkoutReference, $begin, $secondEnd)) $errors[] = 'search_changed'; }
            catch (\Throwable) { $errors[] = 'payments_discovery_failed'; }
        }
        foreach ($invoicePasses as $checkoutSubscriptionId => $firstPass) {
            try { if ($firstPass !== $this->search->authorizedPayments($checkoutSubscriptionId)) $errors[] = 'search_changed'; }
            catch (\Throwable) { $errors[] = 'invoices_discovery_failed'; }
        }
        try { if ($expected !== self::ids(($this->localPaymentIds)())) $errors[] = 'payment_set_changed'; }
        catch (\Throwable) { $errors[] = 'discovery_or_lookup_failed'; }
        $snapshot['complete'] = $errors === [];
        $snapshot['payment_ids'] = $expected;
        $snapshot['errors'] = array_values(array_unique($errors));
        $snapshot['completed_at'] = (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format('Y-m-d\TH:i:s.v\Z');
        return $snapshot;
    }

    private function currentTime(): DateTimeImmutable
    {
        $value = $this->clock === null ? new DateTimeImmutable('now') : ($this->clock)();
        if (!$value instanceof DateTimeImmutable) {
            throw new \RuntimeException('Invalid reconciliation clock.');
        }
        return $value->setTimezone(new DateTimeZone('UTC'));
    }

    private function refreshSafely(string $topic, string $id): bool
    {
        try { return ($this->refresh)($topic, $id) === true; }
        catch (\Throwable) { return false; }
    }

    /** @param list<string> $ids @return list<string> */
    private static function ids(array $ids): array
    {
        $ids = array_values(array_unique(array_map('strval', $ids)));
        foreach ($ids as $id) if (!preg_match('/^[A-Za-z0-9_-]{1,160}$/D', $id)) throw new \InvalidArgumentException('Invalid payment ID.');
        sort($ids, SORT_STRING);
        return $ids;
    }

    /** @param list<mixed> $references @return list<string> */
    private static function references(array $references): array
    {
        $references = array_values(array_unique(array_map('strval', $references)));
        foreach ($references as $reference) {
            if (!preg_match('/^DGYM-\d{8}-[A-F0-9]{32}$/D', $reference)) {
                throw new \InvalidArgumentException('Invalid checkout reference.');
            }
        }
        sort($references, SORT_STRING);
        return $references;
    }
}
