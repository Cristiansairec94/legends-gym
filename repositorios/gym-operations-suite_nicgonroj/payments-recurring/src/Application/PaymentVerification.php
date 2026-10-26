<?php

declare(strict_types=1);

namespace DemoGym\Application;

use DateTimeImmutable;
use DateTimeZone;
use InvalidArgumentException;

/** Projection of a payment GET, called only after ownership and financial checks. */
final class PaymentVerification
{
    /** Existing linked facts unchanged by a CLI GET must not replay historical transitions.
     * @param array<string,mixed> $verification @param array<string,mixed>|null $stored
     */
    public static function matchesStoredPayment(array $verification, ?array $stored): bool
    {
        if ($stored === null || (int) ($stored['checkout_link_verified'] ?? 0) !== 1) return false;
        $facts = $verification['payment'];
        foreach (['id' => 'mp_payment_id', 'status' => 'status', 'status_detail' => 'status_detail', 'currency' => 'currency',
            'paid_at' => 'paid_at', 'last_gateway_update_at' => 'last_gateway_update_at'] as $field => $column) {
            if ((string) ($facts[$field] ?? '') !== (string) ($stored[$column] ?? '')) return false;
        }
        return $facts['amount'] === (int) ($stored['amount'] ?? -1)
            && $facts['amount_refunded'] === (int) ($stored['amount_refunded'] ?? -1);
    }

    /** @param array<string,mixed> $payment @return array<string,mixed> */
    public static function snapshot(array $payment, string $environment, string $source, ?string $verifiedAt = null, ?array $checkoutVerification = null): array
    {
        if (!in_array($environment, ['test', 'production'], true)
            || !in_array($source, ['webhook', 'reconciliation_read'], true)) {
            throw new InvalidArgumentException('Invalid verification provenance.');
        }
        $id = trim((string) ($payment['id'] ?? ''));
        $collector = trim((string) ($payment['collector_id'] ?? ''));
        $application = trim((string) ($payment['application_id'] ?? $payment['client_id'] ?? ''));
        $applicationMissing = !isset($payment['application_id']) && !isset($payment['client_id']);
        foreach (['application_id', 'client_id'] as $key) {
            if (isset($payment[$key]) && (string) $payment[$key] !== $application) throw new InvalidArgumentException('Contradictory payment application.');
        }
        $status = strtolower(trim((string) ($payment['status'] ?? '')));
        $detail = strtolower(trim((string) ($payment['status_detail'] ?? '')));
        $amount = $payment['transaction_amount'] ?? null;
        $refunded = $payment['transaction_amount_refunded'] ?? 0;
        if (!preg_match('/^[A-Za-z0-9_-]{1,160}$/D', $id)
            || !preg_match('/^[1-9][0-9]{0,19}$/D', $collector)
            || (!$applicationMissing && !preg_match('/^[1-9][0-9]{0,19}$/D', $application))
            || ($applicationMissing && $checkoutVerification === null)
            || $status === '' || strtoupper((string) ($payment['currency_id'] ?? '')) !== 'CLP'
            || !is_numeric($amount) || (float) $amount < 0 || floor((float) $amount) !== (float) $amount
            || !is_numeric($refunded) || (float) $refunded < 0 || floor((float) $refunded) !== (float) $refunded
            || (float) $refunded > (float) $amount) {
            throw new InvalidArgumentException('Invalid payment verification facts.');
        }
        $liveMode = $payment['live_mode'] ?? null;
        if (array_key_exists('live_mode', $payment) && (!is_bool($liveMode) || $liveMode !== ($environment === 'production'))) {
            throw new InvalidArgumentException('Invalid payment verification environment.');
        }
        $updated = self::date($payment['date_last_updated'] ?? null);
        $paid = self::date($payment['date_approved'] ?? null);
        $verified = self::date($verifiedAt ?? (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format('Y-m-d\TH:i:s.v\Z'));
        if ($updated === null || $verified === null || $updated > $verified || ($paid !== null && $paid > $verified)) {
            throw new InvalidArgumentException('Invalid payment verification chronology.');
        }
        if ($applicationMissing) {
            $proof = $checkoutVerification;
            $checkoutDate = self::date($proof['verified_at'] ?? null);
            $kind = $proof['kind'] ?? null; $linkage = $proof['linkage'] ?? null;
            $authorizedId = $proof['authorized_payment_id'] ?? null;
            $merchantOrderId = $proof['merchant_order_id'] ?? null;
            if ($liveMode !== ($environment === 'production') || ($proof['schema'] ?? null) !== 'dgym-checkout-verification/1'
                || ($proof['authenticated_lookup'] ?? null) !== true || ($proof['environment'] ?? null) !== $environment
                || ($proof['collector_id'] ?? null) !== $collector || ($proof['payment_id'] ?? null) !== $id
                || !preg_match('/^[A-Za-z0-9_-]{1,160}$/D', (string) ($proof['id'] ?? ''))
                || !preg_match('/^[1-9][0-9]{0,19}$/D', (string) ($proof['application_id'] ?? ''))
                || $checkoutDate === null || $checkoutDate > $verified
                || !(($kind === 'subscription' && in_array($linkage, ['native_subscription', 'authorized_payment'], true))
                    || ($kind === 'preference' && in_array($linkage, ['native_preference', 'merchant_order'], true)))
                || ($linkage === 'authorized_payment'
                    ? !is_string($authorizedId) || !preg_match('/^[A-Za-z0-9_-]{1,160}$/D', $authorizedId)
                    : $authorizedId !== null)
                || ($linkage === 'merchant_order'
                    ? !is_string($merchantOrderId) || !preg_match('/^[1-9][0-9]{0,19}$/D', $merchantOrderId)
                    : $merchantOrderId !== null)) {
                throw new InvalidArgumentException('Invalid checkout verification evidence.');
            }
        }
        $snapshot = [
            'schema' => $applicationMissing ? 'dgym-payment-verification/2' : 'dgym-payment-verification/1',
            'source' => $source,
            'environment' => $environment,
            'verified_at' => (new DateTimeImmutable($verified, new DateTimeZone('UTC')))->format('Y-m-d\TH:i:s.v\Z'),
            'authenticated_lookup' => true,
            'collector_id' => $collector,
            'application_id' => $applicationMissing ? null : $application,
            'live_mode' => $liveMode,
            'payment' => [
                'id' => $id, 'status' => $status, 'status_detail' => $detail,
                'amount' => (int) $amount, 'amount_refunded' => (int) $refunded,
                'currency' => 'CLP', 'paid_at' => $paid, 'last_gateway_update_at' => $updated,
            ],
        ];
        if ($applicationMissing) {
            $snapshot['ownership_basis'] = 'collector_environment_checkout';
            $snapshot['checkout_verification'] = $checkoutVerification;
        }
        return $snapshot;
    }

    private static function date(mixed $value): ?string
    {
        if ($value === null || $value === '') return null;
        if (!is_string($value) || !preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/D', $value)) {
            throw new InvalidArgumentException('Invalid timestamp.');
        }
        $date = new DateTimeImmutable($value);
        $errors = DateTimeImmutable::getLastErrors();
        if (is_array($errors) && ($errors['warning_count'] > 0 || $errors['error_count'] > 0)) {
            throw new InvalidArgumentException('Invalid timestamp.');
        }
        return $date->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s.v');
    }
}
