<?php

declare(strict_types=1);

namespace DemoGym\Khipu;

use DateTimeImmutable;
use DateTimeZone;
use DemoGym\Config;
use DemoGym\Domain\EnrollmentReference;
use Throwable;

/**
 * Única vía para cambiar el estado de un pago Khipu: consulta el pago por GET
 * autenticado, lo compara con la inscripción y aplica la transición. La usan el
 * webhook firmado y la verificación desde la página de estado, de modo que un
 * aviso perdido se recupera con la misma regla.
 */
final class KhipuPaymentProcessor
{
    public const UNMATCHED = 'unmatched';

    public function __construct(
        private readonly Config $config,
        private readonly KhipuStore $store,
        private readonly KhipuClient $client,
        private readonly ?\Closure $clock = null
    ) {
    }

    /**
     * @return array{
     *   outcome:string,state:?string,enrollment_id:?int,reference:?string,
     *   payment_url:?string,snapshot:array<string, mixed>
     * }
     * @throws KhipuApiException Si el GET falla; quien llama decide si es transitorio.
     */
    public function refresh(string $paymentId, string $source): array
    {
        $paymentId = KhipuClient::safePaymentId($paymentId);
        $payment = $this->client->getPayment($paymentId);
        $now = $this->now();
        $snapshot = [
            'schema' => 'dgym-khipu-payment-verification/1',
            'source' => $source,
            'authenticated_lookup' => true,
            'environment' => $this->config->khipuCredentialEnvironment(),
            'verified_at' => $now->format('Y-m-d\TH:i:s.v\Z'),
            // Sin nombre, correo, RUT ni cuenta del pagador.
            'payment' => [
                'id' => $paymentId,
                'status' => self::text($payment['status'] ?? null),
                'status_detail' => self::text($payment['status_detail'] ?? null),
                'amount' => is_numeric($payment['amount'] ?? null) ? (int) round((float) $payment['amount']) : null,
                'currency' => self::text($payment['currency'] ?? null),
                'payment_method' => self::text($payment['payment_method'] ?? null),
                'conciliation_date' => self::text($payment['conciliation_date'] ?? null),
                'out_of_date_conciliation' => ($payment['out_of_date_conciliation'] ?? false) === true,
            ],
        ];
        $unmatched = static fn (string $reason): array => [
            'outcome' => self::UNMATCHED, 'state' => null, 'enrollment_id' => null, 'reference' => null,
            'payment_url' => null, 'snapshot' => $snapshot + ['outcome' => self::UNMATCHED, 'reason' => $reason],
        ];

        if (!is_string($payment['payment_id'] ?? null) || !hash_equals($paymentId, $payment['payment_id'])) {
            return $unmatched('payment_id_mismatch');
        }
        $reference = is_string($payment['transaction_id'] ?? null) ? $payment['transaction_id'] : '';
        if (!EnrollmentReference::isValid($reference)) {
            return $unmatched('transaction_id_not_enrollment');
        }
        $enrollment = $this->store->findByReference($reference);
        if ($enrollment === null) {
            return $unmatched('enrollment_not_found');
        }
        $enrollmentId = (int) $enrollment['id'];

        $errorCode = null;
        try {
            $classification = KhipuPaymentVerification::classify(
                $payment,
                $this->config->khipuReceiverId(),
                $reference,
                (int) $enrollment['checkout_amount']
            );
            $outcome = match ($classification) {
                KhipuPaymentVerification::APPROVED => KhipuTransition::APPROVED,
                KhipuPaymentVerification::REVERSED => KhipuTransition::REVERSED,
                KhipuPaymentVerification::REJECTED => KhipuTransition::REJECTED,
                default => ($payment['status'] ?? null) === 'verifying'
                    ? KhipuTransition::VERIFYING
                    : KhipuTransition::PENDING,
            };
            if ($outcome === KhipuTransition::APPROVED && ($payment['out_of_date_conciliation'] ?? false) === true) {
                // El dinero llegó después del vencimiento del enlace: lo decide el gimnasio.
                $outcome = KhipuTransition::REVIEW;
                $errorCode = 'khipu_out_of_date_conciliation';
            } elseif ($outcome === KhipuTransition::PENDING && self::expired($payment['expires_date'] ?? null, $now)) {
                $outcome = KhipuTransition::EXPIRED;
            }
        } catch (KhipuDataMismatchException $exception) {
            $outcome = KhipuTransition::REVIEW;
            $errorCode = 'khipu_mismatch_' . $exception->field;
        }

        $state = $this->store->applyPaymentOutcome($enrollmentId, $paymentId, $outcome, $errorCode);
        $paymentUrl = null;
        if ($outcome === KhipuTransition::PENDING && $state === 'checkout_ready') {
            $paymentUrl = self::trustedPaymentUrl($payment['payment_url'] ?? null);
        }
        return [
            'outcome' => $outcome,
            'state' => $state,
            'enrollment_id' => $enrollmentId,
            'reference' => $reference,
            'payment_url' => $paymentUrl,
            'snapshot' => $snapshot + ['outcome' => $outcome, 'state' => $state, 'error_code' => $errorCode],
        ];
    }

    /**
     * Respaldo del webhook para ejecutar por cron: vuelve a leer los cobros
     * abiertos. Un fallo en uno no detiene los demás.
     *
     * @return array{checked:int,failed:int,outcomes:array<string,int>}
     */
    public function sweep(int $limit = 50): array
    {
        $summary = ['checked' => 0, 'failed' => 0, 'outcomes' => []];
        foreach ($this->store->pendingPaymentIds($limit) as $paymentId) {
            $summary['checked']++;
            try {
                $outcome = $this->refresh($paymentId, 'sweep')['outcome'];
                $summary['outcomes'][$outcome] = ($summary['outcomes'][$outcome] ?? 0) + 1;
            } catch (Throwable $exception) {
                $summary['failed']++;
                error_log('DGYM khipu sweep lookup failed type=' . get_class($exception));
            }
        }
        return $summary;
    }

    /** Solo se entrega al navegador una URL HTTPS de Khipu, sin credenciales ni puerto. */
    public static function trustedPaymentUrl(mixed $url): ?string
    {
        // parse_url tolera barras invertidas, espacios y caracteres de control que un
        // navegador interpreta de otra forma: se rechazan antes de mirar el host.
        if (!is_string($url) || $url === '' || strlen($url) > 2048 || preg_match('/[\\\\\s\x00-\x1F\x7F]/', $url) === 1) {
            return null;
        }
        $parts = parse_url($url);
        if (!is_array($parts)
            || strtolower((string) ($parts['scheme'] ?? '')) !== 'https'
            || isset($parts['user']) || isset($parts['pass']) || isset($parts['port'])
        ) {
            return null;
        }
        $host = strtolower((string) ($parts['host'] ?? ''));
        return $host === 'khipu.com' || str_ends_with($host, '.khipu.com') ? $url : null;
    }

    private static function expired(mixed $expiresDate, DateTimeImmutable $now): bool
    {
        if (!is_string($expiresDate) || trim($expiresDate) === '') {
            return false;
        }
        try {
            return new DateTimeImmutable($expiresDate) < $now;
        } catch (Throwable) {
            return false;
        }
    }

    private static function text(mixed $value): ?string
    {
        return is_string($value) && $value !== '' ? substr($value, 0, 80) : null;
    }

    private function now(): DateTimeImmutable
    {
        $now = $this->clock === null ? new DateTimeImmutable('now') : ($this->clock)();
        return $now->setTimezone(new DateTimeZone('UTC'));
    }
}
