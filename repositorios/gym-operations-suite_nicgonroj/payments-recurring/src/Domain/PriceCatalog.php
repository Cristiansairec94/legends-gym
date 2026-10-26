<?php

declare(strict_types=1);

namespace DemoGym\Domain;

use InvalidArgumentException;

final class PriceCatalog
{
    public const VERSION = '2026-10-06-v4';
    public const CURRENCY = 'CLP';
    public const AVAILABILITY_SCHEMA_VERSION = 'dgym-checkout-availability-v2';
    public const ENROLLMENT_SCHEMA_VERSION = 'dgym-enrollment-v1';

    /** @var array<string, array{checkout_type:string,durations:list<int>}> */
    private const PAYMENT_OPTIONS = [
        'automatic' => ['checkout_type' => 'subscription', 'durations' => [3, 6, 12]],
        'single' => ['checkout_type' => 'preference', 'durations' => [1]],
        'prepaid' => ['checkout_type' => 'preference', 'durations' => [3, 6, 12]],
    ];

    /**
     * Montos enteros CLP provenientes del tarifario canónico aprobado. Este
     * catálogo es la única fuente de precios y combinaciones del backend.
     *
     * @var array<string, array<string, mixed>>
     */
    private const PLANS = [
        'inicio' => [
            'name' => 'Plan Inicio',
            'regular_monthly' => 19990,
            'automatic' => [
                3 => ['installment' => 18990, 'total' => 56970, 'discount_percent' => 5],
                6 => ['installment' => 17990, 'total' => 107940, 'discount_percent' => 10],
                12 => ['installment' => 16990, 'total' => 203880, 'discount_percent' => 15],
            ],
            'prepaid' => [3 => 55170, 6 => 105540, 12 => 196680],
        ],
        'pro' => [
            'name' => 'Plan Pro',
            'regular_monthly' => 29990,
            'automatic' => [
                3 => ['installment' => 28490, 'total' => 85470, 'discount_percent' => 5],
                6 => ['installment' => 26990, 'total' => 161940, 'discount_percent' => 10],
                12 => ['installment' => 25490, 'total' => 305880, 'discount_percent' => 15],
            ],
            'prepaid' => [3 => 82770, 6 => 158340, 12 => 295080],
        ],
    ];

    /** @return list<string> */
    public function planCodes(): array
    {
        return array_keys(self::PLANS);
    }

    /** @return list<string> */
    public function paymentModes(): array
    {
        return array_keys(self::PAYMENT_OPTIONS);
    }

    /** @return list<int> */
    public function durationsForMode(string $paymentMode): array
    {
        if (!isset(self::PAYMENT_OPTIONS[$paymentMode])) {
            throw new InvalidArgumentException('Modalidad de pago inválida.');
        }
        return self::PAYMENT_OPTIONS[$paymentMode]['durations'];
    }

    public function checkoutType(string $paymentMode): string
    {
        if (!isset(self::PAYMENT_OPTIONS[$paymentMode])) {
            throw new InvalidArgumentException('Modalidad de pago inválida.');
        }
        return self::PAYMENT_OPTIONS[$paymentMode]['checkout_type'];
    }

    /** @return array<string, array{checkout_type:string,durations:list<int>}> */
    public function paymentOptions(): array
    {
        return self::PAYMENT_OPTIONS;
    }

    public function supports(string $planCode, string $paymentMode, int $duration): bool
    {
        return isset(self::PLANS[$planCode], self::PAYMENT_OPTIONS[$paymentMode])
            && in_array($duration, self::PAYMENT_OPTIONS[$paymentMode]['durations'], true);
    }

    /**
     * @return array{
     *   plan_code:string,name:string,payment_mode:string,duration_months:int,checkout_type:string,
     *   regular_monthly:int,installment:int,regular_total:int,total:int,charge_amount:int,
     *   charge_count:int,discount_percent:int,savings_amount:int,today_amount:int,
     *   plan_amount:int,enrollment_fee_amount:int,
     *   currency:string,pricing_version:string
     * }
     */
    public function offer(string $planCode, string $paymentMode, int $duration): array
    {
        if (!$this->supports($planCode, $paymentMode, $duration)) {
            throw new InvalidArgumentException('Combinación de plan, modalidad y duración inválida.');
        }

        $plan = self::PLANS[$planCode];
        $regularMonthly = (int) $plan['regular_monthly'];
        $regularTotal = $regularMonthly * $duration;
        // Toda inscripción online cobra una matrícula única. En automático se
        // incorpora solo al primer cargo; las cuotas siguientes conservan el
        // valor mensual del plan.
        $enrollmentFee = 15000;

        if ($paymentMode === 'automatic') {
            $specific = $plan['automatic'][$duration];
            $installment = (int) $specific['installment'];
            $planAmount = (int) $specific['total'];
            $total = $planAmount + $enrollmentFee;
            $discount = (int) $specific['discount_percent'];
            $chargeAmount = $installment + $enrollmentFee;
            $chargeCount = $duration;
        } elseif ($paymentMode === 'single') {
            $installment = $regularMonthly + $enrollmentFee;
            $total = $installment;
            $planAmount = $regularMonthly;
            $discount = 0;
            $chargeAmount = $total;
            $chargeCount = 1;
        } else {
            $planAmount = (int) $plan['prepaid'][$duration];
            $total = $planAmount + $enrollmentFee;
            $installment = intdiv($planAmount, $duration);
            $discount = (int) round((1 - ($planAmount / $regularTotal)) * 100);
            $chargeAmount = $total;
            $chargeCount = 1;
        }

        return [
            'plan_code' => $planCode,
            'name' => (string) $plan['name'],
            'payment_mode' => $paymentMode,
            'duration_months' => $duration,
            'checkout_type' => self::PAYMENT_OPTIONS[$paymentMode]['checkout_type'],
            'regular_monthly' => $regularMonthly,
            'installment' => $installment,
            'regular_total' => $regularTotal,
            'total' => $total,
            'plan_amount' => $planAmount,
            'enrollment_fee_amount' => $enrollmentFee,
            'charge_amount' => $chargeAmount,
            'charge_count' => $chargeCount,
            'discount_percent' => $discount,
            'savings_amount' => $regularTotal - $planAmount,
            'today_amount' => $chargeAmount,
            'currency' => self::CURRENCY,
            'pricing_version' => self::VERSION,
        ];
    }

    /** @return array{name:string,regular_monthly:int,installment:int,total:int,charge_amount:int,enrollment_fee_amount:int,discount_percent:int,regular_total:int,currency:string,pricing_version:string} */
    public function automaticOffer(string $planCode, int $duration): array
    {
        $offer = $this->offer($planCode, 'automatic', $duration);
        return [
            'name' => $offer['name'],
            'regular_monthly' => $offer['regular_monthly'],
            'installment' => $offer['installment'],
            'total' => $offer['total'],
            'charge_amount' => $offer['charge_amount'],
            'enrollment_fee_amount' => $offer['enrollment_fee_amount'],
            'discount_percent' => $offer['discount_percent'],
            'regular_total' => $offer['regular_total'],
            'currency' => $offer['currency'],
            'pricing_version' => $offer['pricing_version'],
        ];
    }

    public function prepaidTotal(string $planCode, int $duration): int
    {
        return $this->offer($planCode, 'prepaid', $duration)['total'];
    }

    /**
     * @param array<string, list<int>> $enabledDurations
     * @return list<array<string, int|string>>
     */
    public function publicOffers(array $enabledDurations): array
    {
        $offers = [];
        foreach ($this->planCodes() as $planCode) {
            foreach ($this->paymentModes() as $mode) {
                foreach ($enabledDurations[$mode] ?? [] as $duration) {
                    $offer = $this->offer($planCode, $mode, $duration);
                    $offers[] = [
                        'plan_id' => $offer['plan_code'],
                        'plan_name' => $offer['name'],
                        'payment_mode' => $offer['payment_mode'],
                        'duration_months' => $offer['duration_months'],
                        'checkout_type' => $offer['checkout_type'],
                        'regular_monthly_amount' => $offer['regular_monthly'],
                        'installment_amount' => $offer['installment'],
                        'regular_total_amount' => $offer['regular_total'],
                        'total_amount' => $offer['total'],
                        'plan_amount' => $offer['plan_amount'],
                        'enrollment_fee_amount' => $offer['enrollment_fee_amount'],
                        'charge_amount' => $offer['charge_amount'],
                        'charge_count' => $offer['charge_count'],
                        'discount_percent' => $offer['discount_percent'],
                        'savings_amount' => $offer['savings_amount'],
                        'today_amount' => $offer['today_amount'],
                        'currency' => $offer['currency'],
                    ];
                }
            }
        }
        return $offers;
    }
}
