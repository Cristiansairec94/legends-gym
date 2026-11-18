<?php

declare(strict_types=1);

namespace DemoGym\Domain;

use InvalidArgumentException;

final class PaymentTransition
{
    public static function chargeLimitExceeded(int $verifiedDistinctPayments, int $expectedCharges): bool
    {
        if ($verifiedDistinctPayments < 0 || $expectedCharges < 1) {
            return true;
        }
        return $verifiedDistinctPayments > $expectedCharges;
    }

    /**
     * Política pura para que aprobaciones, rechazos e incidencias puedan probarse
     * sin red ni base de datos. Los estados de revisión son deliberadamente sticky.
     *
     * @return array{internal_status:string,membership_status:string,payment_status:string,error_code:?string,linked_accredited:bool}
     */
    public static function decide(
        string $checkoutType,
        string $gatewayStatus,
        string $statusDetail,
        int $amountRefunded,
        bool $checkoutLinkVerified,
        bool $subscriptionAuthorized,
        bool $hasInitialPayment,
        string $currentStatus,
        string $currentMembership
    ): array {
        if (!in_array($checkoutType, ['subscription', 'preference'], true) || $amountRefunded < 0) {
            throw new InvalidArgumentException('Contexto de transición de pago inválido.');
        }

        $status = strtolower(trim($gatewayStatus));
        $detail = strtolower(trim($statusDetail));
        $isAccredited = $status === 'approved' && $detail === 'accredited';
        $hasRefund = $amountRefunded > 0 || $status === 'refunded';
        $isLinkedAccredited = $isAccredited && $checkoutLinkVerified && !$hasRefund;

        if ($status === 'charged_back') {
            $internal = 'chargeback';
        } elseif ($hasRefund) {
            $internal = 'payment_refunded';
        } else {
            $internal = match ($status) {
                'approved' => $isLinkedAccredited
                    && ($checkoutType === 'preference' || $hasInitialPayment || $subscriptionAuthorized)
                    ? 'payment_verified'
                    : 'payment_pending',
                'pending', 'in_process' => 'payment_pending',
                'rejected', 'cancelled', 'canceled' => 'payment_rejected',
                default => 'review_required',
            };
        }

        if (
            $hasInitialPayment
            && !in_array($internal, ['payment_verified', 'payment_refunded', 'chargeback'], true)
        ) {
            $internal = 'payment_issue_review';
        }
        if ($currentStatus === 'chargeback' && $internal !== 'chargeback') {
            $internal = 'chargeback';
        } elseif (
            $hasInitialPayment
            && in_array($currentStatus, ['payment_refunded', 'review_required'], true)
            && !in_array($internal, ['payment_refunded', 'chargeback'], true)
        ) {
            $internal = $currentStatus;
        }

        $membership = $currentMembership;
        if (in_array($internal, ['payment_refunded', 'chargeback', 'payment_issue_review', 'review_required'], true)) {
            $membership = 'manual_review';
        } elseif ($internal === 'payment_verified' && $membership === 'not_activated') {
            $membership = 'pending_manual_activation';
        }
        if ($currentMembership === 'manual_review') {
            $membership = 'manual_review';
        }

        $paymentStatus = match (true) {
            $internal === 'chargeback' => 'charged_back',
            $internal === 'payment_refunded' => 'refunded',
            $isLinkedAccredited => 'approved_accredited',
            $isAccredited => 'approved_unlinked',
            $status === '' => 'unknown',
            default => $status,
        };
        $errorCode = match (true) {
            $internal === 'payment_refunded' => 'payment_refunded',
            $internal === 'chargeback' => 'payment_charged_back',
            $isAccredited && !$checkoutLinkVerified => 'payment_checkout_link_missing',
            $internal === 'review_required' => 'unknown_payment_status',
            default => null,
        };

        return [
            'internal_status' => $internal,
            'membership_status' => $membership,
            'payment_status' => $paymentStatus,
            'error_code' => $errorCode,
            'linked_accredited' => $isLinkedAccredited,
        ];
    }
}
