<?php
declare(strict_types=1);

/** Pure projections. Only backend GET attestations matching the entire persisted
 * financial row can establish provenance. A webhook body or matching ID cannot. */
function dgym_evidence_iso(?string $value): ?string {
    if ($value === null || $value === '') return null;
    try { return (new DateTimeImmutable($value, new DateTimeZone('UTC')))->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d\TH:i:s.u\Z'); }
    catch (Throwable) { return null; }
}
/** V2 preserves the payment's missing application ID and proves its exact
 * checkout through a separate authenticated GET. Never backfill from config. */
function dgym_checkout_verification_matches(array $v, array $payment, int $now): bool {
    $checkout = $v['checkout_verification'] ?? null;
    if (!is_array($checkout) || ($v['ownership_basis'] ?? '') !== 'collector_environment_checkout'
        || !array_key_exists('application_id', $v) || $v['application_id'] !== null
        || !is_bool($v['live_mode'] ?? null) || $v['live_mode'] !== (($v['environment'] ?? '') === 'production')
        || !preg_match('/^[1-9][0-9]{0,19}$/D', (string) ($v['collector_id'] ?? ''))
        || ($checkout['schema'] ?? '') !== 'dgym-checkout-verification/1' || ($checkout['authenticated_lookup'] ?? false) !== true
        || ($checkout['collector_id'] ?? null) !== ($v['collector_id'] ?? null)
        || ($checkout['environment'] ?? null) !== ($v['environment'] ?? null)
        || (string) ($checkout['payment_id'] ?? '') !== (string) ($payment['id'] ?? '')
        || !preg_match('/^[A-Za-z0-9_-]{1,160}$/D', (string) ($checkout['id'] ?? ''))
        || !preg_match('/^[1-9][0-9]{0,19}$/D', (string) ($checkout['application_id'] ?? ''))) return false;
    $kind = $checkout['kind'] ?? null; $linkage = $checkout['linkage'] ?? null;
    if (!(($kind === 'subscription' && in_array($linkage, ['native_subscription','authorized_payment'], true))
        || ($kind === 'preference' && $linkage === 'native_preference'))) return false;
    if ($linkage === 'authorized_payment') {
        if (!preg_match('/^[A-Za-z0-9_-]{1,160}$/D', (string) ($checkout['authorized_payment_id'] ?? ''))) return false;
    } elseif (!array_key_exists('authorized_payment_id', $checkout) || $checkout['authorized_payment_id'] !== null) return false;
    $checkoutAt = dgym_evidence_iso($checkout['verified_at'] ?? null);
    $paymentAt = dgym_evidence_iso($v['verified_at'] ?? null);
    return $checkoutAt !== null && $paymentAt !== null && strtotime($checkoutAt) <= $now
        && $checkoutAt <= $paymentAt;
}
function dgym_payment_evidence(array $payment, array $events, ?int $now = null): ?array {
    $now ??= time();
    if ((int) ($payment['checkout_link_verified'] ?? 0) !== 1) return null;
    foreach ($events as $event) {
        if (($event['status'] ?? '') !== 'processed') continue;
        $snapshot = json_decode((string) ($event['resource_snapshot_json'] ?? ''), true);
        $v = $snapshot['verification'] ?? null; $p = $v['payment'] ?? null;
        if (!is_array($v) || !is_array($p) || !in_array($v['schema'] ?? '', ['dgym-payment-verification/1','dgym-payment-verification/2'], true)
            || ($v['authenticated_lookup'] ?? false) !== true || !in_array($v['source'] ?? '', ['webhook', 'reconciliation_read'], true)
            || !in_array($v['environment'] ?? '', ['production', 'test'], true)
            || !preg_match('/^[0-9]+$/D', (string) ($v['collector_id'] ?? ''))) continue;
        if ($v['schema'] === 'dgym-payment-verification/1') {
            if (!preg_match('/^[0-9]+$/D', (string) ($v['application_id'] ?? ''))) continue;
        } elseif (!dgym_checkout_verification_matches($v, $p, $now)) continue;
        if (isset($v['live_mode']) && $v['live_mode'] !== ($v['environment'] === 'production')) continue;
        $verified = dgym_evidence_iso($v['verified_at'] ?? null);
        if ($verified === null || strtotime($verified) > $now) continue;
        $matches = (string) ($p['id'] ?? '') === (string) $payment['mp_payment_id']
            && ($p['status'] ?? null) === $payment['status'] && ($p['status_detail'] ?? null) === $payment['status_detail']
            && is_int($p['amount'] ?? null) && $p['amount'] === (int) $payment['amount']
            && is_int($p['amount_refunded'] ?? null) && $p['amount_refunded'] === (int) $payment['amount_refunded']
            && ($p['currency'] ?? null) === ($payment['currency'] ?? null)
            && array_key_exists('paid_at', $p) && dgym_evidence_iso($p['paid_at']) === dgym_evidence_iso($payment['paid_at'])
            && dgym_evidence_iso($p['last_gateway_update_at'] ?? null) !== null
            && dgym_evidence_iso($p['last_gateway_update_at']) === dgym_evidence_iso($payment['last_gateway_update_at']);
        if ($matches) return ['environment' => $v['environment'], 'verifiedAt' => $verified, 'source' => $v['source'], 'eventId' => (string) $event['id']];
    }
    return null;
}
function dgym_scan_evidence(array $payments, array $events): array {
    $unknown = ['complete' => false, 'verifiedAt' => null, 'environment' => 'unverified'];
    // Callers sort by receipt, not successful processing time: failed scans must
    // supersede an older successful scan rather than silently retaining success.
    foreach ($events as $event) {
        if (($event['topic'] ?? '') !== 'reconciliation.scan') continue;
        $scan = json_decode((string) ($event['resource_snapshot_json'] ?? ''), true);
        if (!is_array($scan) || ($scan['schema'] ?? '') !== 'dgym-reconciliation-scan/1') return $unknown;
        $actual = array_map(static fn(array $p): string => (string) $p['mp_payment_id'], $payments); sort($actual, SORT_STRING);
        $ids = array_map('strval', $scan['payment_ids'] ?? []); sort($ids, SORT_STRING);
        $environment = in_array($scan['environment'] ?? '', ['production', 'test'], true) ? $scan['environment'] : 'unverified';
        return ['complete' => ($event['status'] ?? '') === 'processed' && ($scan['complete'] ?? false) === true && $actual === $ids,
            'verifiedAt' => dgym_evidence_iso($scan['window_end'] ?? $scan['started_at'] ?? null), 'environment' => $environment];
    }
    return $unknown;
}
function dgym_subscription_evidence(array $enrollment, array $events): ?array {
    foreach ($events as $event) {
        if (($event['topic'] ?? '') !== 'reconciliation.scan') continue;
        if (!in_array($event['status'] ?? '', ['processed', 'failed_transient'], true)) return null;
        $scan = json_decode((string) ($event['resource_snapshot_json'] ?? ''), true);
        if (!is_array($scan) || ($scan['schema'] ?? '') !== 'dgym-reconciliation-scan/1'
            || ($scan['source'] ?? '') !== 'reconciliation_read') return null;
        $v = $scan['subscription'] ?? null;
        if (!is_array($v) || ($v['schema'] ?? '') !== 'dgym-subscription-verification/1'
            || ($v['authenticated_lookup'] ?? false) !== true
            || (string) ($v['id'] ?? '') !== (string) ($enrollment['mp_subscription_id'] ?? '')
            || empty($v['id']) || !in_array($v['environment'] ?? '', ['test','production'], true)
            || ($v['environment'] ?? '') !== ($scan['environment'] ?? '')
            || dgym_evidence_iso($v['verified_at'] ?? null) === null) return null;
        // A completed subscription GET remains valid if payment discovery later
        // fails. This does not promote the independent payment scan to complete.
        return ['nextChargeAt' => dgym_evidence_iso($v['next_payment_date'] ?? null), 'verifiedAt' => dgym_evidence_iso($v['verified_at'] ?? null), 'environment' => $v['environment']];
    }
    return null;
}
