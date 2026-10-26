<?php
declare(strict_types=1);

namespace DemoGym\Application;

use DateTimeImmutable;
use DateTimeZone;
use InvalidArgumentException;

/** Evidence from an authenticated checkout GET, never from configuration alone. */
final class CheckoutPaymentVerification
{
    public static function proof(array $enrollment, array $payment, array $checkout, string $environment,
        string $expectedCollector, string $expectedApplication, ?array $invoice = null,
        ?string $verifiedAt = null, ?array $merchantOrder = null): array
    {
        $kind = (string) ($enrollment['checkout_type'] ?? '');
        $expectedId = (string) ($enrollment[$kind === 'subscription' ? 'mp_subscription_id' : 'mp_preference_id'] ?? '');
        $paymentId = (string) ($payment['id'] ?? '');
        $id = (string) ($checkout['id'] ?? '');
        $collector = self::identifier($checkout['collector_id'] ?? null);
        $application = self::identifier($checkout['application_id'] ?? $checkout['client_id'] ?? null);
        $reference = (string) ($enrollment['reference'] ?? '');
        if (!in_array($kind, ['subscription', 'preference'], true) || !in_array($environment, ['production', 'test'], true)
            || !self::resourceId($paymentId) || !self::resourceId($id) || $id !== $expectedId
            || $collector === null || $collector !== $expectedCollector || (string) ($payment['collector_id'] ?? '') !== $collector
            || $application === null || $application !== $expectedApplication
            || $reference === '' || (string) ($checkout['external_reference'] ?? '') !== $reference
            || (string) ($payment['external_reference'] ?? '') !== $reference
            || !is_bool($payment['live_mode'] ?? null) || $payment['live_mode'] !== ($environment === 'production')) {
            throw new InvalidArgumentException('Invalid checkout ownership proof.');
        }
        foreach (array_merge([$checkout, $payment], $invoice === null ? [] : [$invoice]) as $resource) {
            if (isset($resource['collector_id']) && self::identifier($resource['collector_id']) !== $expectedCollector) throw new InvalidArgumentException('Contradictory checkout collector.');
            foreach (['application_id', 'client_id'] as $key) {
                if (isset($resource[$key]) && self::identifier($resource[$key]) !== $expectedApplication) throw new InvalidArgumentException('Contradictory checkout application.');
            }
            if (array_key_exists('live_mode', $resource) && (!is_bool($resource['live_mode']) || $resource['live_mode'] !== ($environment === 'production'))) throw new InvalidArgumentException('Contradictory checkout environment.');
        }
        $authorizedId = null;
        $merchantOrderId = null;
        $native = self::nativeId($payment, $kind);
        if ($native !== null && $native !== $id) throw new InvalidArgumentException('Contradictory native checkout link.');
        if ($kind === 'preference' && $merchantOrder !== null) {
            $merchantOrderId = self::merchantOrderId($payment);
            if ($merchantOrderId === null) throw new InvalidArgumentException('Missing merchant order link.');
            self::assertMerchantOrder(
                $enrollment,
                $payment,
                $merchantOrder,
                $merchantOrderId,
                $expectedCollector,
                $expectedApplication
            );
        }
        if ($kind === 'subscription' && $invoice !== null) {
            $authorizedId = (string) ($invoice['id'] ?? '');
            if (!self::resourceId($authorizedId) || (string) ($invoice['preapproval_id'] ?? '') !== $id
                || (string) ($invoice['payment']['id'] ?? '') !== $paymentId
                || (isset($invoice['external_reference']) && (string) $invoice['external_reference'] !== $reference)
                || !is_numeric($invoice['transaction_amount'] ?? null)
                || (float) $invoice['transaction_amount'] !== (float) self::expectedSubscriptionPaymentAmount($enrollment, $paymentId)
                || ($invoice['currency_id'] ?? null) !== ($enrollment['currency'] ?? null)) throw new InvalidArgumentException('Invalid invoice checkout link.');
            $linkage = 'authorized_payment';
        } elseif ($kind === 'preference' && $merchantOrderId !== null) {
            $linkage = 'merchant_order';
        } elseif ($native !== null) {
            $linkage = $kind === 'subscription' ? 'native_subscription' : 'native_preference';
        } else {
            throw new InvalidArgumentException('Checkout payment link not proven.');
        }
        $date = $verifiedAt ?? (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format('Y-m-d\TH:i:s.v\Z');
        if (!preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/D', $date)) throw new InvalidArgumentException('Invalid checkout verification timestamp.');
        return ['schema' => 'dgym-checkout-verification/1', 'authenticated_lookup' => true, 'kind' => $kind, 'id' => $id,
            'application_id' => $application, 'collector_id' => $collector, 'environment' => $environment, 'verified_at' => $date,
            'linkage' => $linkage, 'authorized_payment_id' => $authorizedId,
            'merchant_order_id' => $merchantOrderId, 'payment_id' => $paymentId];
    }

    public static function nativeId(array $payment, string $kind): ?string
    {
        $values = $kind === 'subscription'
            ? [$payment['preapproval_id'] ?? null, $payment['subscription_id'] ?? null, $payment['metadata']['preapproval_id'] ?? null, $payment['point_of_interaction']['transaction_data']['subscription_id'] ?? null]
            : [$payment['preference_id'] ?? null, $payment['metadata']['preference_id'] ?? null];
        $id = null;
        foreach ($values as $value) {
            if ($value === null || $value === '') continue;
            if ((!is_string($value) && !is_int($value)) || !self::resourceId((string) $value)
                || ($id !== null && $id !== (string) $value)) throw new InvalidArgumentException('Contradictory native checkout link.');
            $id = (string) $value;
        }
        return $id;
    }

    public static function merchantOrderId(array $payment): ?string
    {
        $value = $payment['order']['id'] ?? null;
        if ($value === null || $value === '') return null;
        if ((!is_string($value) && !is_int($value))
            || preg_match('/^[1-9][0-9]{0,19}$/D', (string) $value) !== 1
        ) {
            throw new InvalidArgumentException('Invalid merchant order link.');
        }
        return (string) $value;
    }

    /** @return list<string> */
    public static function merchantOrderPaymentIds(array $merchantOrder): array
    {
        $payments = $merchantOrder['payments'] ?? null;
        if (!is_array($payments) || !array_is_list($payments)) {
            throw new InvalidArgumentException('Invalid merchant order payments.');
        }
        $seen = [];
        $ids = [];
        foreach ($payments as $payment) {
            $id = is_array($payment) ? (string) ($payment['id'] ?? '') : '';
            if (preg_match('/^[A-Za-z0-9_-]{1,160}$/D', $id) !== 1 || isset($seen[$id])) {
                throw new InvalidArgumentException('Invalid merchant order payment ID.');
            }
            $seen[$id] = true;
            $ids[] = $id;
        }
        sort($ids, SORT_STRING);
        return $ids;
    }

    private static function assertMerchantOrder(
        array $enrollment,
        array $payment,
        array $merchantOrder,
        string $merchantOrderId,
        string $expectedCollector,
        string $expectedApplication
    ): void {
        $orderId = (string) ($merchantOrder['id'] ?? '');
        $preferenceId = (string) ($enrollment['mp_preference_id'] ?? '');
        $reference = (string) ($enrollment['reference'] ?? '');
        $collector = self::identifier($merchantOrder['collector']['id'] ?? null);
        $application = self::identifier($merchantOrder['application_id'] ?? null);
        $total = $merchantOrder['total_amount'] ?? null;
        if (!hash_equals($merchantOrderId, $orderId)
            || $preferenceId === ''
            || !hash_equals($preferenceId, (string) ($merchantOrder['preference_id'] ?? ''))
            || $reference === ''
            || !hash_equals($reference, (string) ($merchantOrder['external_reference'] ?? ''))
            || $collector !== $expectedCollector
            || $application !== $expectedApplication
            || !is_numeric($total)
            || floor((float) $total) !== (float) $total
            || (int) $total !== (int) ($enrollment['checkout_amount'] ?? -1)
            || !in_array((string) ($merchantOrder['status'] ?? ''), ['opened', 'closed', 'expired'], true)
        ) {
            throw new InvalidArgumentException('Invalid merchant order ownership proof.');
        }

        self::merchantOrderPaymentIds($merchantOrder);
        $paymentId = (string) ($payment['id'] ?? '');
        $matched = null;
        foreach (($merchantOrder['payments'] ?? []) as $candidate) {
            if (is_array($candidate) && (string) ($candidate['id'] ?? '') === $paymentId) {
                if ($matched !== null) throw new InvalidArgumentException('Duplicated merchant order payment.');
                $matched = $candidate;
            }
        }
        $amount = $matched['transaction_amount'] ?? null;
        if (!is_array($matched)
            || !is_numeric($amount)
            || (float) $amount !== (float) ($payment['transaction_amount'] ?? -1)
            || (string) ($matched['currency_id'] ?? '') !== (string) ($payment['currency_id'] ?? '')
            || strtolower((string) ($matched['status'] ?? '')) !== strtolower((string) ($payment['status'] ?? ''))
            || strtolower((string) ($matched['status_detail'] ?? '')) !== strtolower((string) ($payment['status_detail'] ?? ''))
        ) {
            throw new InvalidArgumentException('Merchant order does not contain the exact payment.');
        }
    }
    private static function identifier(mixed $value): ?string
    {
        return (is_string($value) || is_int($value)) && preg_match('/^[1-9][0-9]{0,19}$/D', (string) $value) ? (string) $value : null;
    }

    /** @param array<string,mixed> $enrollment */
    private static function expectedSubscriptionPaymentAmount(array $enrollment, string $paymentId): int
    {
        $checkout = (int) ($enrollment['checkout_amount'] ?? -1);
        $installment = (int) ($enrollment['installment_amount'] ?? $checkout);
        if ((string) ($enrollment['checkout_type'] ?? '') !== 'subscription'
            || $checkout - $installment !== 15000
        ) {
            return $checkout;
        }
        $initialConfirmed = trim((string) ($enrollment['initial_payment_confirmed_at'] ?? '')) !== '';
        $initialPaymentId = trim((string) ($enrollment['initial_mp_payment_id'] ?? ''));
        if (!$initialConfirmed || ($initialPaymentId !== '' && hash_equals($initialPaymentId, $paymentId))) {
            return $checkout;
        }
        return $installment;
    }

    private static function resourceId(string $value): bool { return preg_match('/^[A-Za-z0-9_-]{1,160}$/D', $value) === 1; }
}
