<?php

declare(strict_types=1);

namespace DemoGym\Khipu;

use InvalidArgumentException;

/**
 * Decide, sin efectos, cómo cambia una inscripción Khipu ante el resultado de
 * un GET autenticado del pago. La persistencia solo bloquea las filas y aplica
 * lo que esta clase devuelve.
 *
 * Reglas fijas: un pago acreditado o revertido nunca se degrada por una
 * lectura posterior, la revisión manual es permanente y un segundo pago para la
 * misma referencia no se acredita solo.
 */
final class KhipuTransition
{
    public const APPROVED = 'approved';
    public const PENDING = 'pending';
    public const VERIFYING = 'verifying';
    public const REJECTED = 'rejected';
    public const EXPIRED = 'expired';
    public const REVERSED = 'reversed';
    public const REVIEW = 'review';

    private const OUTCOMES = [
        self::APPROVED, self::PENDING, self::VERIFYING, self::REJECTED,
        self::EXPIRED, self::REVERSED, self::REVIEW,
    ];

    private const REVIEW_STATUSES = ['payment_refunded', 'chargeback', 'review_required', 'payment_issue_review'];

    /**
     * @param array<string, mixed> $enrollment
     * @param array<string, mixed> $charge
     * @return array{
     *   charge:array<string, string|null>,charge_confirmed:bool,
     *   enrollment:array<string, string|null>,enrollment_confirmed:bool,state:string
     * }
     */
    public static function decide(
        array $enrollment,
        array $charge,
        string $paymentId,
        string $outcome,
        ?string $errorCode = null
    ): array {
        if (!in_array($outcome, self::OUTCOMES, true)) {
            throw new InvalidArgumentException('Resultado de pago Khipu desconocido.');
        }
        $paymentId = KhipuClient::safePaymentId($paymentId);
        $status = (string) ($enrollment['status'] ?? '');
        $chargeStatus = (string) ($charge['status'] ?? '');
        $boundId = trim((string) ($charge['khipu_payment_id'] ?? ''));
        $manualReview = (string) ($enrollment['membership_status'] ?? '') === 'manual_review';
        $paymentConfirmed = trim((string) ($enrollment['initial_payment_confirmed_at'] ?? '')) !== '';
        $result = [
            'charge' => [], 'charge_confirmed' => false,
            'enrollment' => [], 'enrollment_confirmed' => false, 'state' => $status,
        ];
        $review = static function (array $result, string $code) use ($manualReview, $status): array {
            $result['charge']['last_error_code'] = $code;
            $result['enrollment']['membership_status'] = 'manual_review';
            // No reemplaza un estado de revisión previo ni su motivo original.
            if (!$manualReview && !in_array($status, self::REVIEW_STATUSES, true)) {
                $result['enrollment']['status'] = 'review_required';
                $result['enrollment']['error_code'] = $code;
                $result['state'] = 'review_required';
            }
            return $result;
        };

        if ($boundId !== '' && !hash_equals($boundId, $paymentId)) {
            return $review($result, 'khipu_second_payment');
        }
        if ($boundId === '') {
            $result['charge']['khipu_payment_id'] = $paymentId;
        }
        $settled = in_array($chargeStatus, ['confirmed', 'reversed'], true);

        if ($outcome === self::REVIEW) {
            return $review($result, $errorCode ?? 'khipu_data_mismatch');
        }

        if ($outcome === self::REVERSED) {
            $result['charge']['status'] = 'reversed';
            $result['charge']['last_error_code'] = 'khipu_payment_reversed';
            $result['enrollment'] = [
                'status' => 'payment_refunded',
                'payment_status' => 'refunded',
                'membership_status' => 'manual_review',
            ];
            // La devolución siempre queda visible, pero no borra el motivo de una revisión anterior.
            if (!$manualReview && !in_array($status, self::REVIEW_STATUSES, true)) {
                $result['enrollment']['error_code'] = 'khipu_payment_reversed';
            }
            $result['state'] = 'payment_refunded';
            return $result;
        }

        if ($outcome === self::APPROVED) {
            if ($chargeStatus === 'reversed') {
                return $result;
            }
            $result['charge']['status'] = 'confirmed';
            $result['charge']['last_error_code'] = null;
            $result['charge_confirmed'] = true;
            $result['enrollment']['payment_status'] = 'approved_accredited';
            $result['enrollment_confirmed'] = true;
            if (!$manualReview && !in_array($status, self::REVIEW_STATUSES, true)) {
                $result['enrollment']['status'] = 'payment_verified';
                $result['enrollment']['error_code'] = null;
                if ((string) ($enrollment['membership_status'] ?? '') === 'not_activated') {
                    $result['enrollment']['membership_status'] = 'pending_manual_activation';
                }
                $result['state'] = 'payment_verified';
            }
            return $result;
        }

        if ($settled) {
            return $result;
        }

        if ($outcome === self::VERIFYING) {
            $result['charge']['status'] = 'verifying';
            if (!$manualReview && !$paymentConfirmed && in_array($status, ['checkout_ready', 'payment_pending', 'payment_rejected'], true)) {
                $result['enrollment'] = ['status' => 'payment_pending', 'payment_status' => 'pending', 'error_code' => null];
                $result['state'] = 'payment_pending';
            }
            return $result;
        }

        if ($outcome === self::REJECTED || $outcome === self::EXPIRED) {
            $code = $outcome === self::EXPIRED ? 'khipu_payment_expired' : 'khipu_payment_rejected';
            $result['charge']['status'] = $outcome;
            $result['charge']['last_error_code'] = $code;
            if (!$manualReview && !$paymentConfirmed && !in_array($status, self::REVIEW_STATUSES, true)) {
                $result['enrollment'] = ['status' => 'payment_rejected', 'payment_status' => 'rejected', 'error_code' => $code];
                $result['state'] = 'payment_rejected';
            }
            return $result;
        }

        // PENDING: el pagador aún no inicia la transferencia; el enlace sigue vigente.
        // Si Khipu había informado una verificación que no prosperó, el cobro
        // vuelve a quedar abierto para que el socio pueda reintentar con el mismo enlace.
        if ($chargeStatus === 'verifying') {
            $result['charge']['status'] = 'created';
            if (!$manualReview && !$paymentConfirmed && $status === 'payment_pending') {
                $result['enrollment'] = ['status' => 'checkout_ready', 'payment_status' => 'not_created'];
                $result['state'] = 'checkout_ready';
            }
        }
        return $result;
    }
}
