<?php

declare(strict_types=1);

namespace DemoGym\Domain;

use DateTimeImmutable;
use DateTimeZone;
use InvalidArgumentException;

final class PendingSubscriptionRequest
{
    /**
     * Crea una suscripción pendiente SIN plan asociado. El checkout alojado permite al pagador
     * elegir el medio de pago y conserva la referencia individual de la inscripción.
     *
     * @param array{name:string,charge_amount:int,currency:string} $offer
     * @return array<string, mixed>
     */
    public static function build(array $offer, int $duration, string $payerEmail, string $reference, string $backUrl): array
    {
        return [
            'reason' => $offer['name'] . ' · ' . $duration . ' meses',
            'payer_email' => $payerEmail,
            'external_reference' => $reference,
            'back_url' => $backUrl,
            'status' => 'pending',
            'auto_recurring' => [
                'frequency' => 1,
                'frequency_type' => 'months',
                'end_date' => self::endDate($reference, $duration),
                'transaction_amount' => $offer['charge_amount'],
                'currency_id' => $offer['currency'],
            ],
        ];
    }

    /**
     * Mercado Pago documenta end_date (no repetitions) para suscripciones
     * pendientes sin plan. La fecha queda anclada a la referencia UTC para
     * que POST, GET, conciliación y Webhooks validen el mismo valor.
     *
     * El último día es el anterior al aniversario de N meses: si el primer
     * cargo ocurre al autorizar, quedan exactamente N ventanas mensuales.
     */
    public static function endDate(string $reference, int $duration): string
    {
        if ($duration < 1 || !preg_match('/^DGYM-(\d{8})-[A-F0-9]{32}$/', $reference, $matches)) {
            throw new InvalidArgumentException('Referencia o duración inválida para la suscripción.');
        }

        $utc = new DateTimeZone('UTC');
        $referenceDate = DateTimeImmutable::createFromFormat('!Ymd', $matches[1], $utc);
        if (!$referenceDate instanceof DateTimeImmutable || $referenceDate->format('Ymd') !== $matches[1]) {
            throw new InvalidArgumentException('La referencia contiene una fecha inválida.');
        }

        return $referenceDate
            ->modify('+' . $duration . ' months')
            ->modify('-1 day')
            ->setTime(23, 59, 59, 0)
            ->format('Y-m-d\TH:i:s.v\Z');
    }
}
