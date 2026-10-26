<?php

declare(strict_types=1);

namespace DemoGym\Application;

use DemoGym\Infrastructure\MercadoPagoClient;
use DemoGym\Domain\PendingSubscriptionRequest;
use DateTimeImmutable;
use RuntimeException;

final class CheckoutResponseValidator
{
    /**
     * @param array<string, mixed> $response
     * @param array<string, mixed> $offer
     * @return array{checkout_type:string,resource_id:string,checkout_url:string,initial_gateway_status:string}
     */
    public static function validate(
        string $checkoutType,
        array $response,
        array $offer,
        string $reference,
        bool $preferSandboxUrl,
        string $expectedSellerId,
        string $expectedApplicationId
    ): array {
        if (!in_array($checkoutType, ['subscription', 'preference'], true)) {
            throw new RuntimeException('Tipo de checkout inesperado.');
        }
        if (!isset($offer['checkout_type']) || !hash_equals((string) $offer['checkout_type'], $checkoutType)) {
            throw new RuntimeException('El tipo de checkout no coincide con la oferta.');
        }
        $resourceId = self::requiredString($response, 'id');
        // MLC publica init_point también bajo credenciales TEST; el aislamiento
        // lo imponen la credencial verificada y la cuenta compradora de prueba.
        $checkoutUrl = self::requiredString($response, 'init_point');
        MercadoPagoClient::assertSafeCheckoutUrl($checkoutUrl);
        $collectorId = self::canonicalIdentifier($response['collector_id'] ?? null);
        if ($collectorId === null || !hash_equals($expectedSellerId, $collectorId)) {
            throw new RuntimeException('Mercado Pago devolvió un collector inesperado.');
        }
        // /preapproval identifica la integración como application_id; la
        // preferencia de Checkout Pro publica el mismo identificador como
        // client_id en su respuesta oficial.
        $applicationKey = $checkoutType === 'subscription' ? 'application_id' : 'client_id';
        $applicationId = self::canonicalIdentifier($response[$applicationKey] ?? null);
        if ($applicationId === null || !hash_equals($expectedApplicationId, $applicationId)) {
            throw new RuntimeException('Mercado Pago devolvió una aplicación inesperada.');
        }
        if (array_key_exists('live_mode', $response)) {
            if (!is_bool($response['live_mode']) || $response['live_mode'] !== !$preferSandboxUrl) {
                throw new RuntimeException('Mercado Pago devolvió un entorno inesperado.');
            }
        }

        $externalReference = self::requiredString($response, 'external_reference');
        if (!hash_equals($reference, $externalReference)) {
            throw new RuntimeException('Mercado Pago devolvió una referencia inesperada.');
        }

        if ($checkoutType === 'subscription') {
            self::assertSubscription($response, $offer, $reference);
            return [
                'checkout_type' => 'subscription',
                'resource_id' => $resourceId,
                'checkout_url' => $checkoutUrl,
                'initial_gateway_status' => 'pending',
            ];
        }
        self::assertPreference($response, $offer);
        return [
            'checkout_type' => 'preference',
            'resource_id' => $resourceId,
            'checkout_url' => $checkoutUrl,
            'initial_gateway_status' => 'created',
        ];
    }

    /** @param array<string, mixed> $response @param array<string, mixed> $offer */
    private static function assertSubscription(array $response, array $offer, string $reference): void
    {
        if (isset($response['preapproval_plan_id']) && trim((string) $response['preapproval_plan_id']) !== '') {
            throw new RuntimeException('Mercado Pago asoció un plan no solicitado.');
        }
        if ((string) ($response['status'] ?? '') !== 'pending') {
            throw new RuntimeException('Mercado Pago devolvió un estado inicial inesperado.');
        }
        $recurring = is_array($response['auto_recurring'] ?? null) ? $response['auto_recurring'] : [];
        $frequency = self::canonicalInteger($recurring['frequency'] ?? null);
        $expectedEndDate = PendingSubscriptionRequest::endDate($reference, (int) $offer['charge_count']);
        $actualEndDate = self::canonicalTimestamp($recurring['end_date'] ?? null);
        if (
            $frequency !== 1
            || (string) ($recurring['frequency_type'] ?? '') !== 'months'
            || $actualEndDate === null
            || !hash_equals($expectedEndDate, $actualEndDate)
            || !is_numeric($recurring['transaction_amount'] ?? null)
            || abs((float) $recurring['transaction_amount'] - (float) $offer['charge_amount']) > 0.001
            || (string) ($recurring['currency_id'] ?? '') !== (string) $offer['currency']
        ) {
            throw new RuntimeException('Mercado Pago devolvió una recurrencia inesperada.');
        }
    }

    private static function canonicalTimestamp(mixed $value): ?string
    {
        if (!is_string($value) || trim($value) === '') {
            return null;
        }
        try {
            return (new DateTimeImmutable($value))
                ->setTimezone(new \DateTimeZone('UTC'))
                ->format('Y-m-d\TH:i:s.v\Z');
        } catch (\Throwable) {
            return null;
        }
    }

    /** @param array<string, mixed> $response @param array<string, mixed> $offer */
    private static function assertPreference(array $response, array $offer): void
    {
        if (isset($response['total_amount'])) {
            if (!is_numeric($response['total_amount'])
                || abs((float) $response['total_amount'] - (float) $offer['charge_amount']) > 0.001
            ) {
                throw new RuntimeException('Mercado Pago devolvió un total inesperado.');
            }
        }

        $items = $response['items'] ?? null;
        if (!is_array($items) || count($items) !== 1) {
            throw new RuntimeException('Mercado Pago no devolvió los ítems de la preferencia.');
        }
        $item = $items[0];
        if (
            !is_array($item)
            || !is_numeric($item['quantity'] ?? null)
            || (float) $item['quantity'] !== 1.0
            || !is_numeric($item['unit_price'] ?? null)
            || abs((float) $item['unit_price'] - (float) $offer['charge_amount']) > 0.001
        ) {
            throw new RuntimeException('Mercado Pago devolvió un monto de preferencia inesperado.');
        }
        if ((string) ($item['currency_id'] ?? '') !== (string) $offer['currency']) {
            throw new RuntimeException('Mercado Pago devolvió una moneda inesperada.');
        }
        if (
            !isset($response['payment_methods'])
            || !is_array($response['payment_methods'])
            || !isset($response['payment_methods']['installments'])
            || !is_numeric($response['payment_methods']['installments'])
            || (float) $response['payment_methods']['installments'] !== 1.0
        ) {
            throw new RuntimeException('Mercado Pago habilitó cuotas no solicitadas.');
        }
    }

    /** @param array<string, mixed> $response */
    private static function requiredString(array $response, string $key): string
    {
        $value = $response[$key] ?? null;
        if (!is_string($value) || trim($value) === '') {
            throw new RuntimeException('Respuesta de Mercado Pago incompleta.');
        }
        return trim($value);
    }

    private static function canonicalInteger(mixed $value): ?int
    {
        if (is_int($value)) {
            return $value;
        }
        if (!is_string($value) || preg_match('/^(?:0|[1-9][0-9]*)$/D', $value) !== 1) {
            return null;
        }
        $normalized = filter_var($value, FILTER_VALIDATE_INT);
        return is_int($normalized) ? $normalized : null;
    }

    private static function canonicalIdentifier(mixed $value): ?string
    {
        if (is_int($value) && $value > 0) {
            return (string) $value;
        }
        if (!is_string($value) || preg_match('/^[1-9][0-9]{0,19}$/D', $value) !== 1) {
            return null;
        }
        return $value;
    }

}
