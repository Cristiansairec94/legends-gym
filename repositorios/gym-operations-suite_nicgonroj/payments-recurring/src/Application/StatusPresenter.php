<?php

declare(strict_types=1);

namespace DemoGym\Application;

final class StatusPresenter
{
    /** @param array<string, mixed> $enrollment @return array<string, mixed> */
    public function present(array $enrollment): array
    {
        if ((string) ($enrollment['payment_provider'] ?? 'mercadopago') === 'khipu') {
            return $this->presentKhipu($enrollment);
        }
        $status = (string) $enrollment['status'];
        $paymentConfirmed = trim((string) ($enrollment['initial_payment_confirmed_at'] ?? '')) !== '';
        $recoverableCanceledSubscription = !$paymentConfirmed
            && $status === 'subscription_canceled'
            && (string) ($enrollment['checkout_type'] ?? '') === 'subscription'
            && in_array(
                strtolower(trim((string) ($enrollment['subscription_status'] ?? ''))),
                ['canceled', 'cancelled'],
                true
            )
            && trim((string) ($enrollment['error_code'] ?? '')) === '';
        [$state, $message] = match ($status) {
            'payment_verified' => ['payment_confirmed', 'Pago confirmado. El gimnasio validará la activación de tu membresía.'],
            'payment_rejected' => ['payment_rejected', 'El pago no fue aprobado. Conserva tu referencia y consulta al gimnasio antes de iniciar otro intento.'],
            'payment_refunded', 'chargeback', 'review_required', 'payment_issue_review' => ['manual_review', 'La inscripción requiere revisión del gimnasio.'],
            'subscription_authorized', 'payment_pending', 'subscription_pending' => ['payment_pending', 'Estamos confirmando el pago con Mercado Pago.'],
            'subscription_paused', 'subscription_canceled' => ['manual_review', 'La suscripción requiere revisión del gimnasio.'],
            default => ['checkout_pending', 'Completa el proceso en Mercado Pago; el retorno del navegador no confirma el pago.'],
        };
        $manualReview = (string) ($enrollment['membership_status'] ?? '') === 'manual_review';
        if ($manualReview && !$recoverableCanceledSubscription) {
            $state = 'manual_review';
            $message = 'La inscripción requiere revisión del gimnasio.';
        }

        $retryCheckoutUrl = null;
        $recoveryAction = 'none';
        $checkoutStillPending = !$manualReview
            && !$paymentConfirmed
            && in_array(
                $status,
                ['checkout_ready', 'subscription_pending', 'subscription_authorized', 'payment_pending'],
                true
            );
        if ($checkoutStillPending) {
            // Cualquier checkout pendiente puede tener un pago todavía no
            // reflejado localmente. El endpoint de retry hace el probe remoto
            // estable antes de decidir si reutiliza o reemplaza el checkout.
            $recoveryAction = 'probe_payment';
        }
        if (
            !$paymentConfirmed
            && ($status === 'payment_rejected' || $recoverableCanceledSubscription)
            && (!$manualReview || $recoverableCanceledSubscription)
            && in_array((string) ($enrollment['checkout_type'] ?? ''), ['subscription', 'preference'], true)
        ) {
            // Un intento rechazado se comprueba íntegramente en el servidor.
            // Suscripciones reemplazan el checkout; preferencias sólo vuelven a
            // abrir su init_point recién validado y jamás crean otro recurso.
            $recoveryAction = 'restart_payment';
            $retryCheckoutUrl = null;
            $state = 'payment_rejected';
            $message = 'El pago no fue aprobado. Puedes reintentar con el mismo u otro medio de pago desde esta página sin completar otra vez el formulario.';
        }

        return [
            'reference' => (string) $enrollment['reference'],
            'state' => $state,
            'message' => $message,
            'payment_confirmed' => $paymentConfirmed,
            'membership_active' => false,
            'recovery_action' => $recoveryAction,
            'retry_checkout_url' => $retryCheckoutUrl,
            'plan' => [
                'name' => (string) $enrollment['plan_name'],
                'duration_months' => (int) $enrollment['duration_months'],
                'payment_mode' => (string) ($enrollment['payment_mode'] ?? ''),
                'checkout_type' => (string) ($enrollment['checkout_type'] ?? ''),
                'installment_amount' => (int) $enrollment['installment_amount'],
                'charge_count' => (int) ($enrollment['checkout_charge_count'] ?? 1),
                'today_amount' => (int) ($enrollment['checkout_amount'] ?? $enrollment['installment_amount']),
                'total_amount' => (int) ($enrollment['contract_total'] ?? $enrollment['installment_amount']),
                'currency' => (string) $enrollment['currency'],
            ],
            'updated_at' => (string) $enrollment['updated_at'],
        ];
    }

    /**
     * Transferencia Khipu: un solo pago, sin suscripción ni reemplazo de checkout.
     * Un enlace rechazado o vencido no se reabre; el socio inicia otra inscripción.
     *
     * @param array<string, mixed> $enrollment
     * @return array<string, mixed>
     */
    private function presentKhipu(array $enrollment): array
    {
        $status = (string) $enrollment['status'];
        $paymentConfirmed = trim((string) ($enrollment['initial_payment_confirmed_at'] ?? '')) !== '';
        $manualReview = (string) ($enrollment['membership_status'] ?? '') === 'manual_review';
        $expired = (string) ($enrollment['error_code'] ?? '') === 'khipu_payment_expired';
        // Un alta que lleva minutos en creating_checkout se interrumpió antes de
        // entregar el enlace: nadie puede pagarla y no tiene sentido seguir esperando.
        if ($status === 'creating_checkout') {
            $updatedAt = strtotime((string) ($enrollment['updated_at'] ?? '') . ' UTC');
            if ($updatedAt !== false && time() - $updatedAt > 300) {
                $status = 'checkout_creation_failed';
            }
        }
        [$state, $message] = match ($status) {
            'payment_verified' => ['payment_confirmed', 'Transferencia confirmada. El gimnasio validará la activación de tu membresía.'],
            'payment_rejected' => ['payment_rejected', $expired
                ? 'El enlace de pago venció sin registrar una transferencia. Puedes iniciar una nueva inscripción cuando quieras.'
                : 'La transferencia no se completó. Puedes iniciar una nueva inscripción cuando quieras.'],
            'checkout_creation_failed' => ['payment_rejected', 'No pudimos abrir el pago por transferencia. Puedes iniciar una nueva inscripción cuando quieras.'],
            'payment_refunded', 'chargeback', 'review_required', 'payment_issue_review' => ['manual_review', 'La inscripción requiere revisión del gimnasio.'],
            'payment_pending' => ['payment_pending', 'Estamos confirmando tu transferencia con Khipu.'],
            default => ['checkout_pending', 'Completa la transferencia en Khipu; el retorno del navegador no confirma el pago.'],
        };
        if ($manualReview) {
            $state = 'manual_review';
            $message = 'La inscripción requiere revisión del gimnasio.';
        }
        // La verificación vuelve a leer el pago en Khipu: recupera un aviso
        // perdido y solo entonces devuelve el mismo enlace si sigue sin pagarse.
        $canProbe = !$manualReview && !$paymentConfirmed && in_array($status, ['checkout_ready', 'payment_pending'], true);

        return [
            'reference' => (string) $enrollment['reference'],
            'state' => $state,
            'message' => $message,
            'payment_confirmed' => $paymentConfirmed,
            'membership_active' => false,
            'payment_provider' => 'khipu',
            'recovery_action' => $canProbe ? 'probe_payment' : 'none',
            'retry_checkout_url' => null,
            'plan' => [
                'name' => (string) $enrollment['plan_name'],
                'duration_months' => (int) $enrollment['duration_months'],
                'payment_mode' => (string) ($enrollment['payment_mode'] ?? ''),
                'checkout_type' => (string) ($enrollment['checkout_type'] ?? ''),
                'installment_amount' => (int) $enrollment['installment_amount'],
                'charge_count' => 1,
                'today_amount' => (int) ($enrollment['checkout_amount'] ?? $enrollment['installment_amount']),
                'total_amount' => (int) ($enrollment['contract_total'] ?? $enrollment['installment_amount']),
                'currency' => (string) $enrollment['currency'],
            ],
            'updated_at' => (string) $enrollment['updated_at'],
        ];
    }
}
