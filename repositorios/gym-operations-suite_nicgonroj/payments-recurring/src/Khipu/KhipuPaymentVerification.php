<?php

declare(strict_types=1);

namespace DemoGym\Khipu;

/**
 * Compara un pago obtenido por GET /v3/payments/{id} con lo esperado localmente.
 * Una notificación, aun firmada, solo dispara esta consulta: nunca cambia estado por sí sola.
 */
final class KhipuPaymentVerification
{
    public const APPROVED = 'approved';
    public const PENDING = 'pending';
    public const REVERSED = 'reversed';
    public const REJECTED = 'rejected';

    /**
     * @param array<string, mixed> $payment
     * @return self::APPROVED|self::PENDING|self::REVERSED|self::REJECTED
     */
    public static function classify(array $payment, int $receiverId, string $transactionId, int $expectedAmount): string
    {
        if ((int) ($payment['receiver_id'] ?? 0) !== $receiverId) {
            throw new KhipuDataMismatchException('receiver_id');
        }
        if (!is_string($payment['transaction_id'] ?? null) || !hash_equals($transactionId, $payment['transaction_id'])) {
            throw new KhipuDataMismatchException('transaction_id');
        }
        if (($payment['currency'] ?? null) !== 'CLP') {
            throw new KhipuDataMismatchException('currency');
        }
        // Khipu entrega amount como texto decimal ("34990.0000").
        $amount = $payment['amount'] ?? null;
        if (!is_numeric($amount) || (float) $amount !== (float) $expectedAmount) {
            throw new KhipuDataMismatchException('amount');
        }
        $status = $payment['status'] ?? null;
        $detail = $payment['status_detail'] ?? null;
        if (in_array($detail, ['reversed', 'partially-refunded', 'fully-refunded', 'marked-as-abuse'], true)) {
            return self::REVERSED;
        }
        if ($status === 'done' && $detail === 'normal') {
            return self::APPROVED;
        }
        // El pagador declaró que no pagará: no hay dinero que acreditar ni devolver.
        if ($detail === 'rejected-by-payer' && $status !== 'done') {
            return self::REJECTED;
        }
        if (in_array($status, ['pending', 'verifying'], true) || $detail === 'pending') {
            return self::PENDING;
        }
        // done con marked-paid-by-receiver u otro detalle no se acredita automáticamente.
        throw new KhipuDataMismatchException('status');
    }
}
