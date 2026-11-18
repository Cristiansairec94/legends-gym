<?php

declare(strict_types=1);

namespace DemoGym\Domain;

final class CheckoutPreferenceRequest
{
    /**
     * Checkout Pro de un solo cargo. En prepago, unit_price corresponde al
     * total completo e incluye plan y matrícula. Nunca se delegan
     * precios ni cuotas al navegador.
     *
     * @param array<string, mixed> $offer
     * @param array{success:string,pending:string,failure:string} $backUrls
     * @return array<string, mixed>
     */
    public static function build(
        array $offer,
        string $payerEmail,
        string $reference,
        array $backUrls,
        string $notificationUrl
    ): array {
        return [
            'items' => [[
                'id' => sprintf(
                    'dgym-%s-%s-%dm',
                    $offer['plan_code'],
                    $offer['payment_mode'],
                    $offer['duration_months']
                ),
                'title' => $offer['name'] . ' · ' . $offer['duration_months'] . ' mes(es) · matrícula incluida',
                'quantity' => 1,
                'currency_id' => $offer['currency'],
                'unit_price' => $offer['charge_amount'],
            ]],
            'payer' => ['email' => $payerEmail],
            'external_reference' => $reference,
            'back_urls' => $backUrls,
            'auto_return' => 'approved',
            'notification_url' => $notificationUrl,
            'payment_methods' => ['installments' => 1],
            'statement_descriptor' => 'DEMOGYM',
        ];
    }
}
