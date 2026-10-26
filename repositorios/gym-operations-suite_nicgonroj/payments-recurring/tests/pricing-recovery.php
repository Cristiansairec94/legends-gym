<?php

declare(strict_types=1);

// Offline only: no bootstrap, database, credentials, HTTP or financial writes.
use DemoGym\Application\CreateEnrollmentService;
use DemoGym\Domain\PriceCatalog;

require_once dirname(__DIR__) . '/autoload.php';

$service = (new ReflectionClass(CreateEnrollmentService::class))->newInstanceWithoutConstructor();
(new ReflectionProperty(CreateEnrollmentService::class, 'catalog'))->setValue($service, new PriceCatalog());
$recover = new ReflectionMethod(CreateEnrollmentService::class, 'storedOfferForReconciliation');
$assertSame = static function (mixed $expected, mixed $actual): void {
    if ($expected !== $actual) {
        throw new RuntimeException('Unexpected recovery result.');
    }
};
$assertRejected = static function (array $stored) use ($recover, $service): void {
    try {
        $recover->invoke($service, $stored);
    } catch (RuntimeException) {
        return;
    }
    throw new RuntimeException('Malformed historical terms must be rejected.');
};
$snapshot = static function (string $version, string $plan, string $mode, int $duration, int $regular, int $amount): array {
    $count = $mode === 'automatic' ? $duration : 1;
    return [
        'pricing_version' => $version, 'plan_code' => $plan, 'payment_mode' => $mode,
        'duration_months' => $duration, 'currency' => 'CLP',
        'checkout_type' => $mode === 'automatic' ? 'subscription' : 'preference',
        'checkout_amount' => $amount, 'checkout_charge_count' => $count,
        'regular_monthly_amount' => $regular, 'regular_contract_total' => $regular * $duration,
        'contract_total' => $amount * $count,
        'installment_amount' => $mode === 'prepaid' ? intdiv($amount, $duration) : $amount,
    ];
};

$historical = [
    'inicio' => [19990, [18990, 17990, 16990], [55170, 105540, 196680]],
    'pro' => [29990, [28490, 26990, 25490], [82770, 158340, 295080]],
];
$count = 0;
foreach ($historical as $plan => [$regular, $automatic, $prepaid]) {
    $selections = [['single', 1, $regular]];
    foreach ([3, 6, 12] as $index => $months) {
        $selections[] = ['automatic', $months, $automatic[$index]];
        $selections[] = ['prepaid', $months, $prepaid[$index]];
    }
    foreach ($selections as [$mode, $months, $amount]) {
        $stored = $snapshot('2026-09-07-v2', $plan, $mode, $months, $regular, $amount);
        $before = $stored;
        $offer = $recover->invoke($service, $stored);
        $assertSame($amount, $offer['charge_amount']);
        $assertSame($stored['contract_total'], $offer['total']);
        $assertSame('2026-09-07-v2', $offer['pricing_version']);
        $assertSame($before, $stored);
        // MySQL/PDO may return numeric columns as canonical decimal strings.
        foreach (['duration_months', 'checkout_amount', 'checkout_charge_count', 'regular_monthly_amount', 'regular_contract_total', 'contract_total', 'installment_amount'] as $key) {
            $stored[$key] = (string) $stored[$key];
        }
        $assertSame($offer, $recover->invoke($service, $stored));
        ++$count;
    }
}
$assertSame(14, $count);
echo "OK 14 historical v2 offers retain their stored terms, with int/string PDO columns.\n";

$catalog = new PriceCatalog();
foreach ($catalog->planCodes() as $plan) {
    foreach ($catalog->paymentModes() as $mode) {
        foreach ($catalog->durationsForMode($mode) as $months) {
            $offer = $catalog->offer($plan, $mode, $months);
            $stored = [
                'pricing_version' => PriceCatalog::VERSION,
                'plan_code' => $plan,
                'payment_mode' => $mode,
                'duration_months' => $months,
                'currency' => $offer['currency'],
                'checkout_type' => $offer['checkout_type'],
                'checkout_amount' => $offer['charge_amount'],
                'checkout_charge_count' => $offer['charge_count'],
                'regular_monthly_amount' => $offer['regular_monthly'],
                'regular_contract_total' => $offer['regular_total'],
                'contract_total' => $offer['total'],
                'installment_amount' => $offer['installment'],
            ];
            $assertSame($offer['charge_amount'], $recover->invoke($service, $stored)['charge_amount']);
        }
    }
}
echo "OK 14 current v4 offers remain compatible with reconciliation.\n";

$legacy = $snapshot('2026-09-07-v2', 'inicio', 'single', 1, 19990, 19990);
$assertSame(19990, $recover->invoke($service, $legacy)['charge_amount']);
$assertSame(34990, $catalog->offer('inicio', 'single', 1)['charge_amount']);
// Even internally consistent amounts are rejected when not in that version.
$assertRejected($snapshot('2026-09-07-v2', 'inicio', 'single', 1, 19990, 34990));
$assertRejected($snapshot('2026-09-07-v2', 'inicio', 'single', 1, 19990, 1));
$assertRejected(array_replace($legacy, ['pricing_version' => PriceCatalog::VERSION]));
$assertRejected(array_replace($legacy, ['pricing_version' => 'unknown-version']));
foreach (['checkout_amount', 'checkout_charge_count', 'duration_months', 'regular_monthly_amount', 'regular_contract_total', 'contract_total', 'installment_amount'] as $key) {
    foreach ([null, 0, -1, true, false, [], 19990.0, '19990.00', '19990x', '1.999e4', '019990', ' 19990', '999999999999999999999999999999'] as $invalid) {
        $assertRejected(array_replace($legacy, [$key => $invalid]));
    }
    $missing = $legacy;
    unset($missing[$key]);
    $assertRejected($missing);
}
foreach ([['currency' => 'USD'], ['checkout_type' => 'subscription'], ['payment_mode' => 'automatic'], ['plan_code' => 'unknown'], ['duration_months' => 3]] as $change) {
    $assertRejected(array_replace($legacy, $change));
}
echo "OK malformed, mismatched, unknown and repriced historical terms fail closed.\n";

// Missing/invalid historical terms cannot fall through to checkout creation.
$existingResponse = new ReflectionMethod(CreateEnrollmentService::class, 'existingResponse');
$response = $existingResponse->invoke($service, [
    'request_fingerprint' => 'same-fingerprint', 'status' => 'checkout_creation_uncertain',
    'reference' => 'LOCAL-RECOVERY-TEST',
], 'same-fingerprint');
$assertSame('reconcile_before_retry', $response['body']['error']['retry_mode']);
$assertSame(false, $response['body']['error']['retryable']);
echo "OK incomplete recovery remains closed; no database or gateway initialized.\n";
