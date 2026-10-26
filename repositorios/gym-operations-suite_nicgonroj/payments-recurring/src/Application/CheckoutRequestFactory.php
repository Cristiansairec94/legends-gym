<?php

declare(strict_types=1);

namespace DemoGym\Application;

use DemoGym\Config;
use DemoGym\Domain\CheckoutPreferenceRequest;
use DemoGym\Domain\PendingSubscriptionRequest;

final class CheckoutRequestFactory
{
    public function __construct(private readonly Config $config)
    {
    }

    /**
     * @param array<string, mixed> $offer
     * @param array<string, mixed> $input
     * @return array{type:string,payload:array<string,mixed>}
     */
    public function build(array $offer, array $input, string $reference): array
    {
        if ($offer['checkout_type'] === 'subscription') {
            return [
                'type' => 'subscription',
                'payload' => PendingSubscriptionRequest::build(
                    $offer,
                    (int) $offer['duration_months'],
                    (string) $input['email'],
                    $reference,
                    $this->config->returnUrl($reference)
                ),
            ];
        }

        return [
            'type' => 'preference',
            'payload' => CheckoutPreferenceRequest::build(
                $offer,
                (string) $input['email'],
                $reference,
                [
                    'success' => $this->config->returnUrl($reference, 'approved'),
                    'pending' => $this->config->returnUrl($reference, 'pending'),
                    'failure' => $this->config->returnUrl($reference, 'failure'),
                ],
                $this->config->webhookUrl()
            ),
        ];
    }

    /**
     * Reconstruye exclusivamente la suscripción persistida; no consulta el
     * catálogo actual ni cambia sus montos. La referencia del intento fija el
     * nuevo ciclo y el retorno conserva la referencia canónica del miembro.
     *
     * @param array<string,mixed> $enrollment
     * @return array{type:string,payload:array<string,mixed>,offer:array<string,mixed>}
     */
    public function buildStoredSubscription(
        array $enrollment,
        string $attemptReference,
        string $returnReference
    ): array {
        $duration = self::positiveInteger($enrollment['duration_months'] ?? null);
        $installment = self::positiveInteger($enrollment['installment_amount'] ?? null);
        $checkoutAmount = self::positiveInteger($enrollment['checkout_amount'] ?? null);
        $chargeCount = self::positiveInteger($enrollment['checkout_charge_count'] ?? null);
        if (
            (string) ($enrollment['checkout_type'] ?? '') !== 'subscription'
            || (string) ($enrollment['payment_mode'] ?? '') !== 'automatic'
            || $checkoutAmount < $installment
            || $chargeCount !== $duration
            || (string) ($enrollment['currency'] ?? '') !== 'CLP'
        ) {
            throw new \RuntimeException('La contratación persistida no permite recrear la suscripción.');
        }
        $name = trim((string) ($enrollment['plan_name'] ?? ''));
        $email = strtolower(trim((string) ($enrollment['email'] ?? '')));
        if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new \RuntimeException('La contratación persistida está incompleta.');
        }
        $offer = [
            'name' => $name,
            'installment' => $installment,
            'charge_amount' => $checkoutAmount,
            'charge_count' => $chargeCount,
            'checkout_type' => 'subscription',
            'currency' => 'CLP',
        ];
        return [
            'type' => 'subscription',
            'payload' => PendingSubscriptionRequest::build(
                $offer,
                $duration,
                $email,
                $attemptReference,
                $this->config->returnUrl($returnReference)
            ),
            'offer' => $offer,
        ];
    }

    /**
     * Reconstruye únicamente los términos persistidos de un pago único o
     * prepago. Se usa para verificar por GET la preferencia ya creada; nunca
     * crea ni reemplaza una preferencia.
     *
     * @param array<string,mixed> $enrollment
     * @return array{type:string,offer:array<string,mixed>}
     */
    public function buildStoredPreference(array $enrollment): array
    {
        $checkoutAmount = self::positiveInteger($enrollment['checkout_amount'] ?? null);
        $contractTotal = self::positiveInteger($enrollment['contract_total'] ?? null);
        $chargeCount = self::positiveInteger($enrollment['checkout_charge_count'] ?? null);
        $duration = self::positiveInteger($enrollment['duration_months'] ?? null);
        $paymentMode = (string) ($enrollment['payment_mode'] ?? '');
        if (
            (string) ($enrollment['checkout_type'] ?? '') !== 'preference'
            || !in_array($paymentMode, ['single', 'prepaid'], true)
            || ($paymentMode === 'single' && $duration !== 1)
            || ($paymentMode === 'prepaid' && $duration <= 1)
            || $chargeCount !== 1
            || $checkoutAmount !== $contractTotal
            || (string) ($enrollment['currency'] ?? '') !== 'CLP'
        ) {
            throw new \RuntimeException('La contratación persistida no permite verificar la preferencia.');
        }
        $name = trim((string) ($enrollment['plan_name'] ?? ''));
        if ($name === '') {
            throw new \RuntimeException('La contratación persistida está incompleta.');
        }
        return [
            'type' => 'preference',
            'offer' => [
                'name' => $name,
                'charge_amount' => $checkoutAmount,
                'charge_count' => 1,
                'checkout_type' => 'preference',
                'currency' => 'CLP',
            ],
        ];
    }

    private static function positiveInteger(mixed $value): int
    {
        if (is_string($value) && preg_match('/^[1-9][0-9]*$/D', $value) === 1) {
            $value = filter_var($value, FILTER_VALIDATE_INT);
        }
        if (!is_int($value) || $value < 1) {
            throw new \RuntimeException('La contratación persistida contiene montos inválidos.');
        }
        return $value;
    }
}
