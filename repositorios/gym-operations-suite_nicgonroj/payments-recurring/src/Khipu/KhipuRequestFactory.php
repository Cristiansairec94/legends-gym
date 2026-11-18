<?php

declare(strict_types=1);

namespace DemoGym\Khipu;

use DemoGym\Config;
use DemoGym\Domain\EnrollmentReference;
use InvalidArgumentException;

/**
 * Construye las solicitudes a Khipu a partir de una oferta ya resuelta por
 * PriceCatalog. Ningún monto proviene del navegador.
 *
 * transaction_id es determinista: Khipu rechaza su reutilización
 * (IDEMPOTENCY_KEY_REUSED), por lo que reintentar la misma cuota no puede
 * generar un segundo cargo.
 */
final class KhipuRequestFactory
{
    public function __construct(private readonly Config $config)
    {
    }

    /**
     * Transferencia simplificada por el monto que se cobra hoy: pago único,
     * prepago o primera cuota de un contrato PAC (el mandato aún no está activo).
     *
     * $expiresAt acota la vigencia del enlace: un cobro abandonado no puede
     * pagarse semanas después con un tarifario que ya cambió.
     *
     * @param array{name:string,today_amount:int,currency:string} $offer
     * @return array<string, mixed>
     */
    public function transferPayment(array $offer, string $reference, ?\DateTimeImmutable $expiresAt = null): array
    {
        self::assertReference($reference);
        $amount = self::amount($offer['today_amount'] ?? null);
        self::assertClp($offer);
        $payload = [
            'amount' => $amount,
            'currency' => 'CLP',
            'subject' => 'Demo Gym · ' . $offer['name'],
            'transaction_id' => $reference,
            'return_url' => $this->config->returnUrl($reference, 'pending'),
            'cancel_url' => $this->config->returnUrl($reference, 'failure'),
            'notify_url' => $this->config->khipuPaymentWebhookUrl(),
            'notify_api_version' => '3.0',
        ];
        if ($expiresAt !== null) {
            $payload['expires_date'] = $expiresAt->setTimezone(new \DateTimeZone('UTC'))->format('Y-m-d\TH:i:s\Z');
        }
        return $payload;
    }

    /**
     * Mandato PAC con tope igual a la cuota mensual: el banco rechaza cualquier
     * cobro mayor aunque el backend fallara.
     *
     * @param array{name:string,installment:int,currency:string,duration_months:int,checkout_type:string} $offer
     * @return array<string, mixed>
     */
    public function subscription(array $offer, string $payerEmail, string $reference): array
    {
        self::assertReference($reference);
        self::assertClp($offer);
        if (($offer['checkout_type'] ?? null) !== 'subscription') {
            throw new InvalidArgumentException('El PAC solo aplica a ofertas de cargo automático.');
        }
        $installment = self::amount($offer['installment'] ?? null);
        $payerEmail = strtolower(trim($payerEmail));
        if (!filter_var($payerEmail, FILTER_VALIDATE_EMAIL)) {
            throw new InvalidArgumentException('Correo del pagador inválido.');
        }
        return [
            'name' => 'Demo Gym · ' . $offer['name'],
            'email' => $payerEmail,
            'max_amount' => $installment,
            'max_amount_per_charge' => $installment,
            'currency' => 'CLP',
            'notify_url' => $this->config->khipuMandateWebhookUrl(),
            'return_url' => $this->config->returnUrl($reference, 'pending'),
            'cancel_url' => $this->config->returnUrl($reference, 'failure'),
            // Referencia opaca: el formulario del banco no muestra datos personales.
            'service_reference' => $reference,
            'description' => 'Pago automático mensual de membresía Demo Gym, '
                . (int) $offer['duration_months'] . ' cuotas.',
        ];
    }

    /** @return array<string, mixed> */
    public function chargeIntent(string $subscriptionId, string $reference, int $installmentNumber, int $chargeCount, int $amount): array
    {
        self::assertReference($reference);
        if ($installmentNumber < 2 || $installmentNumber > $chargeCount || $chargeCount > 36) {
            throw new InvalidArgumentException('Número de cuota inválido para PAC.');
        }
        return [
            'subscription_id' => KhipuClient::safeSubscriptionId($subscriptionId),
            'amount' => self::amount($amount),
            'subject' => 'Demo Gym · cuota ' . $installmentNumber . ' de ' . $chargeCount,
            'transaction_id' => self::chargeTransactionId($reference, $installmentNumber),
            'notify_url' => $this->config->khipuPaymentWebhookUrl(),
            'notify_api_version' => '3.0',
            'error_response_url' => $this->config->khipuChargeErrorUrl(),
        ];
    }

    public static function chargeTransactionId(string $reference, int $installmentNumber): string
    {
        self::assertReference($reference);
        return $reference . '-C' . str_pad((string) $installmentNumber, 2, '0', STR_PAD_LEFT);
    }

    private static function assertReference(string $reference): void
    {
        if (!EnrollmentReference::isValid($reference)) {
            throw new InvalidArgumentException('Referencia de inscripción inválida.');
        }
    }

    /** @param array<string, mixed> $offer */
    private static function assertClp(array $offer): void
    {
        if (($offer['currency'] ?? null) !== 'CLP') {
            throw new InvalidArgumentException('Khipu solo se habilita para ofertas en CLP.');
        }
    }

    private static function amount(mixed $amount): int
    {
        if (!is_int($amount) || $amount < 1 || $amount > 10000000) {
            throw new InvalidArgumentException('Monto inválido.');
        }
        return $amount;
    }
}
