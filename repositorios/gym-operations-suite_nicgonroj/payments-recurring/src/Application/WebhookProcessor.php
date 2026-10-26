<?php

declare(strict_types=1);

namespace DemoGym\Application;

use DemoGym\Domain\PendingSubscriptionRequest;
use DemoGym\Config;
use DemoGym\Domain\CheckoutGateway;
use DemoGym\Domain\PaymentTransition;
use DemoGym\Domain\SubscriptionAmountGateway;
use DemoGym\Infrastructure\EnrollmentRepository;
use DemoGym\Infrastructure\MercadoPagoApiException;
use DemoGym\Infrastructure\PaymentAttemptBindingMismatchException;
use DemoGym\Infrastructure\WebhookEventRepository;

final class WebhookProcessor
{
    private const ENROLLMENT_FEE_AMOUNT = 15000;

    /**
     * Snapshot financiero congelado. Solo esta versión incorporó la matrícula
     * al primer cargo de las suscripciones automáticas. Mantenerlo explícito
     * evita descontar $15.000 a contratos históricos o a versiones futuras.
     *
     * @var array<string, array<int, int>>
     */
    private const ENROLLMENT_FEE_SUBSCRIPTION_INSTALLMENTS = [
        'inicio' => [3 => 18990, 6 => 17990, 12 => 16990],
        'pro' => [3 => 28490, 6 => 26990, 12 => 25490],
    ];

    public function __construct(
        private readonly Config $config,
        private readonly EnrollmentRepository $enrollments,
        private readonly WebhookEventRepository $events,
        private readonly CheckoutGateway $mercadoPago
    ) {
    }

    public function process(int $eventId, string $topic, string $resourceId, string $verificationSource = 'webhook'): void
    {
        if (!in_array($verificationSource, ['webhook', 'reconciliation_read'], true)) {
            throw new \InvalidArgumentException('Origen de verificación no válido.');
        }
        // El cuerpo del webhook no cubre live_mode en el manifiesto HMAC. Esta
        // barrera independiente fija el alcance test/production declarado
        // antes de cualquier
        // consulta remota. El flag recibido se conserva para auditoría, pero no
        // puede provocar ni permitir una transición de estado.
        $this->config->assertMercadoPagoCredentialEnvironment();

        $kind = $this->resourceKind($topic);
        if ($kind === null) {
            $this->events->finish($eventId, 'ignored', null, null, 'unsupported_topic');
            return;
        }

        $resource = match ($kind) {
            'subscription' => $this->mercadoPago->getSubscription($resourceId),
            'payment' => $this->mercadoPago->getPayment($resourceId),
            'authorized_payment' => $this->mercadoPago->getAuthorizedPayment($resourceId),
            'chargeback' => $this->mercadoPago->getChargeback($resourceId),
            'claim' => $this->mercadoPago->getClaim($resourceId),
        };
        if (!hash_equals($resourceId, trim((string) ($resource['id'] ?? '')))) {
            throw new GatewayStateNotReadyException('El GET no corresponde al recurso solicitado.');
        }

        $relatedPayment = null;
        if (in_array($kind, ['chargeback', 'claim'], true)) {
            if ($kind === 'chargeback') {
                $chargebackPaymentIds = $this->relatedPaymentIds($resource);
                if (count($chargebackPaymentIds) !== 1) {
                    $this->reviewAmbiguousChargeback($eventId, $resource, $chargebackPaymentIds);
                    return;
                }
            }
            $relatedPaymentId = $this->relatedPaymentId($kind, $resource);
            if ($relatedPaymentId === '') {
                $this->events->finish(
                    $eventId,
                    'unmatched',
                    null,
                    $this->snapshot($kind, $resource),
                    $kind . '_payment_link_missing'
                );
                return;
            }
            $relatedPayment = $this->mercadoPago->getPayment($relatedPaymentId);
        }
        $authorizedPaymentResource = null;
        $authorizedOwnershipSubscription = null;
        if ($kind === 'authorized_payment') {
            $embeddedPayment = is_array($resource['payment'] ?? null) ? $resource['payment'] : [];
            $embeddedPaymentId = trim((string) ($embeddedPayment['id'] ?? ''));
            if ($embeddedPaymentId !== '') {
                $authorizedPaymentResource = $this->mercadoPago->getPayment($embeddedPaymentId);
            } else {
                $authorizedSubscriptionId = trim((string) ($resource['preapproval_id'] ?? ''));
                if ($authorizedSubscriptionId === '') {
                    $this->events->finish(
                        $eventId,
                        'review_required',
                        null,
                        $this->snapshot($kind, $resource),
                        'authorized_payment_subscription_link_missing'
                    );
                    return;
                }
                // La factura no expone collector_id en MLC. Se autentica su
                // ownership consultando la preapproval exacta antes de decidir
                // si el intento sin payment.id es transitorio o terminal.
                $authorizedOwnershipSubscription = $this->mercadoPago->getSubscription($authorizedSubscriptionId);
            }
        }

        $verifiedPayment = is_array($relatedPayment) ? $relatedPayment : $authorizedPaymentResource;
        $lookupResource = is_array($verifiedPayment)
            ? $verifiedPayment
            : (is_array($authorizedOwnershipSubscription) ? $authorizedOwnershipSubscription : $resource);
        $snapshot = $this->snapshot($kind, $resource, $verifiedPayment);
        $isPaymentLookup = $kind === 'payment' || is_array($verifiedPayment);
        if (!$this->authenticatedResourceMatchesEnvironment($lookupResource, $isPaymentLookup)) {
            // Puede ser un token/seller mal configurado o un campo aún no
            // propagado. Nunca acusar terminalmente un evento financiero que
            // no logró demostrar ownership: conservar el retry.
            throw new GatewayStateNotReadyException('No se pudo acreditar entorno, collector y aplicación del recurso.');
        }
        $reference = trim((string) ($lookupResource['external_reference'] ?? ''));
        $subscriptionId = match ($kind) {
            'subscription' => trim((string) ($resource['id'] ?? '')),
            'authorized_payment' => trim((string) ($resource['preapproval_id'] ?? '')),
            default => $this->linkedSubscriptionId($lookupResource),
        };
        $paymentId = (
            in_array($kind, ['payment', 'chargeback', 'claim'], true)
            || ($kind === 'authorized_payment' && is_array($verifiedPayment))
        )
            ? trim((string) ($lookupResource['id'] ?? ''))
            : '';

        try {
            $attempt = $this->resolveCheckoutAttempt(
                $kind,
                $resource,
                $lookupResource,
                $reference,
                $subscriptionId
            );
        } catch (GatewayDataMismatchException) {
            $mismatchEnrollment = $reference !== '' ? $this->enrollments->findByReference($reference) : null;
            if ($mismatchEnrollment === null && $subscriptionId !== '') {
                $mismatchEnrollment = $this->enrollments->findBySubscriptionId($subscriptionId);
            }
            if ($mismatchEnrollment === null && $paymentId !== '') {
                $mismatchEnrollment = $this->enrollments->findByPaymentId($paymentId);
            }
            $mismatchEnrollmentId = is_array($mismatchEnrollment) ? (int) $mismatchEnrollment['id'] : null;
            if ($mismatchEnrollmentId !== null) {
                $this->enrollments->updateGatewayState($mismatchEnrollmentId, [
                    'status' => 'review_required',
                    'membership_status' => 'manual_review',
                    'error_code' => 'gateway_data_mismatch',
                ]);
            }
            $this->events->finish(
                $eventId,
                'review_required',
                $mismatchEnrollmentId,
                $snapshot,
                'gateway_data_mismatch'
            );
            return;
        }
        $enrollment = $attempt !== null
            ? $this->enrollments->findById((int) $attempt['enrollment_id'])
            : ($reference !== '' ? $this->enrollments->findByReference($reference) : null);
        if ($enrollment === null && $subscriptionId !== '') {
            $enrollment = $this->enrollments->findBySubscriptionId($subscriptionId);
        }
        if ($enrollment === null && $paymentId !== '') {
            $enrollment = $this->enrollments->findByPaymentId($paymentId);
        }
        if ($enrollment === null) {
            $this->events->finish($eventId, 'unmatched', null, $snapshot, 'enrollment_not_found');
            return;
        }
        if ($attempt === null && $paymentId !== '') {
            $paymentFacts = $this->enrollments->paymentFacts((int) $enrollment['id'], $paymentId);
            $storedAttemptId = is_array($paymentFacts) ? (int) ($paymentFacts['checkout_attempt_id'] ?? 0) : 0;
            if ($storedAttemptId > 0) {
                $attempt = $this->checkoutAttemptById((int) $enrollment['id'], $storedAttemptId);
            }
        }
        if ($attempt === null) {
            // La migración crea un intento para cada checkout previo. Procesar
            // sin ese vínculo reintroduciría la ambigüedad que permite que un
            // webhook tardío modifique el checkout vigente.
            throw new GatewayStateNotReadyException('No se pudo resolver el intento exacto del checkout.');
        }
        try {
            if ((int) $attempt['enrollment_id'] !== (int) $enrollment['id']) {
                throw new GatewayDataMismatchException('El intento de checkout pertenece a otra inscripción.');
            }
            $snapshot['checkout_attempt'] = [
                'id' => (int) $attempt['id'],
                'number' => (int) $attempt['attempt_number'],
                'reference' => (string) $attempt['external_reference'],
                'resource_id' => (string) ($attempt['resource_id'] ?? ''),
                'is_active_at_lookup' => (bool) ($attempt['is_active'] ?? false),
            ];

            $attemptEnrollment = $this->enrollmentForCheckoutAttempt($enrollment, $attempt);

            $checkoutVerification = null;
            if ($isPaymentLookup && (
                (string) ($attemptEnrollment['checkout_type'] ?? '') === 'preference'
                || (!isset($lookupResource['application_id']) && !isset($lookupResource['client_id']))
            )) {
                $checkoutVerification = $this->verifyPaymentCheckout(
                    $attemptEnrollment,
                    $lookupResource,
                    $kind === 'authorized_payment' ? $resource : null
                );
            }
        } catch (GatewayDataMismatchException) {
            $this->finishGatewayMismatch($eventId, (int) $enrollment['id'], $snapshot);
            return;
        }

        try {
            $this->enrollments->withLockedEnrollment(
                (int) $enrollment['id'],
                function (array $lockedEnrollment) use (
                    $reference,
                    $attempt,
                    $kind,
                    $resource,
                    $relatedPayment,
                    $authorizedPaymentResource,
                    $authorizedOwnershipSubscription,
                    $verificationSource,
                    $checkoutVerification
                ): void {
                    $lockedAttempt = $this->enrollments->findCheckoutAttemptForEnrollment(
                        (int) $lockedEnrollment['id'],
                        trim((string) ($attempt['resource_id'] ?? '')) ?: null,
                        (string) $attempt['external_reference']
                    );
                    if ($lockedAttempt === null || (int) $lockedAttempt['id'] !== (int) $attempt['id']) {
                        throw new GatewayDataMismatchException('El intento de checkout cambió antes de procesar el evento.');
                    }
                    $attemptEnrollment = $this->enrollmentForCheckoutAttempt($lockedEnrollment, $lockedAttempt);
                    $replacement = $this->enrollments->findPaymentRetryByReplacedAttempt((int) $lockedAttempt['id']);
                    $replacementState = is_array($replacement)
                        ? (string) ($replacement['lifecycle_status'] ?? '')
                        : '';
                    $isBeingReplaced = is_array($replacement) && in_array(
                        $replacementState,
                        ['awaiting_cancellation', 'cancel_uncertain', 'ready_to_create', 'creating', 'creation_uncertain', 'confirmed', 'active'],
                        true
                    );
                    $isCancellationPending = (int) ($lockedEnrollment['active_checkout_attempt_id'] ?? 0) === (int) $lockedAttempt['id']
                        && (string) ($lockedAttempt['lifecycle_status'] ?? '') === 'active'
                        && in_array($replacementState, ['awaiting_cancellation', 'cancel_uncertain'], true);
                    $isActive = (int) ($lockedEnrollment['active_checkout_attempt_id'] ?? 0) === (int) $lockedAttempt['id']
                        && (string) ($lockedAttempt['lifecycle_status'] ?? '') === 'active'
                        && !$isBeingReplaced;
                    $isInFlightReplacement = !$isActive
                        && (int) ($lockedAttempt['replaces_attempt_id'] ?? 0) > 0
                        && in_array(
                            (string) ($lockedAttempt['lifecycle_status'] ?? ''),
                            ['creating', 'creation_uncertain', 'confirmed'],
                            true
                        );
                    if ($isInFlightReplacement) {
                        // El recurso nuevo puede publicar un webhook entre su GET
                        // de confirmación y la activación atómica. Reintentarlo
                        // evita clasificarlo falsamente como histórico.
                        throw new GatewayStateNotReadyException('El nuevo intento todavía se está activando.');
                    }
                    $historicalAttempt = !$isActive;
                    if (
                        $isActive
                        &&
                        in_array(
                            (string) ($lockedEnrollment['status'] ?? ''),
                            ['creating_checkout', 'checkout_creation_uncertain'],
                            true
                        )
                        && trim((string) ($lockedEnrollment['mp_checkout_id'] ?? '')) === ''
                    ) {
                        // El webhook puede adelantar al POST. Pedir reintento evita
                        // fijar un pago antes de persistir el checkout confirmado.
                        throw new GatewayStateNotReadyException('La inscripción todavía está enlazando el checkout.');
                    }
                    if ($reference !== '' && !hash_equals((string) $lockedAttempt['external_reference'], $reference)) {
                        throw new GatewayDataMismatchException('Referencia externa inconsistente.');
                    }
                    if ($kind === 'subscription') {
                        $this->applySubscription(
                            $attemptEnrollment,
                            $resource,
                            (int) $lockedAttempt['id'],
                            $historicalAttempt,
                            $isCancellationPending
                        );
                    } elseif ($kind === 'payment') {
                        $this->applyPayment(
                            $attemptEnrollment,
                            $resource,
                            null,
                            false,
                            $verificationSource === 'reconciliation_read',
                            $checkoutVerification,
                            (int) $lockedAttempt['id'],
                            $historicalAttempt
                        );
                    } elseif ($kind === 'authorized_payment') {
                        $this->applyAuthorizedPayment(
                            $attemptEnrollment,
                            $resource,
                            $authorizedPaymentResource,
                            $authorizedOwnershipSubscription,
                            $verificationSource === 'reconciliation_read',
                            $checkoutVerification,
                            (int) $lockedAttempt['id'],
                            $historicalAttempt
                        );
                    } elseif ($kind === 'chargeback') {
                        $this->applyChargeback(
                            $attemptEnrollment,
                            $resource,
                            $relatedPayment ?? [],
                            (int) $lockedAttempt['id'],
                            $historicalAttempt
                        );
                    } else {
                        $this->applyClaim(
                            $attemptEnrollment,
                            $resource,
                            $relatedPayment ?? [],
                            (int) $lockedAttempt['id'],
                            $historicalAttempt
                        );
                    }
                }
            );
        } catch (GatewayDataMismatchException | PaymentAttemptBindingMismatchException) {
            $this->finishGatewayMismatch($eventId, (int) $enrollment['id'], $snapshot);
            return;
        }

        // Una suscripción nueva parte con mensualidad + matrícula. En cuanto el
        // primer pago queda acreditado por webhook, reduce el monto remoto a la
        // mensualidad normal. La conciliación manual es estrictamente de lectura:
        // nunca debe modificar una suscripción ni invalidar evidencia financiera
        // porque esa mutación independiente necesite revisión.
        if ($verificationSource === 'webhook') {
            $this->normalizeRecurringAmountAfterEnrollmentFee((int) $enrollment['id']);
        }

        // Preserve this GET's provenance only after ownership, exact enrollment
        // linkage, financial checks and persistence succeeded. Earlier snapshots
        // do not inherit this verification. A CLI lookup is never represented as
        // a signed webhook.
        $paymentResource = $kind === 'payment' ? $resource : $verifiedPayment;
        if (is_array($paymentResource)) {
            $snapshot['verification'] = PaymentVerification::snapshot(
                $paymentResource,
                $this->config->mercadoPagoCredentialEnvironment(),
                $verificationSource,
                null,
                $checkoutVerification
            );
        }
        if ($kind === 'subscription') {
            $snapshot['subscription_verification'] = [
                'schema' => 'dgym-subscription-verification/1',
                'source' => $verificationSource,
                'environment' => $this->config->mercadoPagoCredentialEnvironment(),
                'authenticated_lookup' => true,
                'verified_at' => (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))->format('Y-m-d\TH:i:s.v\Z'),
                'id' => (string) $resource['id'],
                'collector_id' => (string) $resource['collector_id'],
                'application_id' => (string) ($resource['application_id'] ?? $resource['client_id']),
                'next_payment_date' => $this->canonicalTimestamp($resource['next_payment_date'] ?? null),
            ];
        }
        $this->events->finish($eventId, 'processed', (int) $enrollment['id'], $snapshot);
    }

    /** @param array<string, mixed> $enrollment @param array<string, mixed> $resource */
    private function applySubscription(
        array $enrollment,
        array $resource,
        int $checkoutAttemptId,
        bool $historicalAttempt,
        bool $cancellationPending = false
    ): void
    {
        if ((string) ($enrollment['checkout_type'] ?? '') !== 'subscription') {
            throw new GatewayDataMismatchException('Una preferencia no puede recibir eventos de suscripción.');
        }
        $subscriptionId = trim((string) ($resource['id'] ?? ''));
        $reference = trim((string) ($resource['external_reference'] ?? ''));
        $expectedSubscriptionId = trim((string) ($enrollment['mp_subscription_id'] ?? ''));
        if (
            $subscriptionId === ''
            || $reference === ''
            || $expectedSubscriptionId === ''
            || !hash_equals((string) $enrollment['reference'], $reference)
            || !hash_equals($expectedSubscriptionId, $subscriptionId)
        ) {
            throw new GatewayDataMismatchException('Suscripción o referencia inconsistente.');
        }
        if (isset($resource['preapproval_plan_id']) && trim((string) $resource['preapproval_plan_id']) !== '') {
            throw new GatewayDataMismatchException('La suscripción no debe estar asociada a un plan.');
        }
        $recurring = is_array($resource['auto_recurring'] ?? null) ? $resource['auto_recurring'] : [];
        $this->assertSubscriptionRecurringAmount(
            $enrollment,
            $recurring['transaction_amount'] ?? null,
            $recurring['currency_id'] ?? null
        );
        $frequency = $this->canonicalInteger($recurring['frequency'] ?? null);
        $expectedEndDate = PendingSubscriptionRequest::endDate(
            (string) $enrollment['reference'],
            (int) $enrollment['checkout_charge_count']
        );
        $actualEndDate = $this->canonicalTimestamp($recurring['end_date'] ?? null);
        if (
            $frequency !== 1
            || (string) ($recurring['frequency_type'] ?? '') !== 'months'
            || $actualEndDate === null
            || !hash_equals($expectedEndDate, $actualEndDate)
        ) {
            throw new GatewayDataMismatchException('Configuración de recurrencia finita inconsistente.');
        }

        $status = strtolower((string) ($resource['status'] ?? ''));
        $this->enrollments->updateCheckoutAttemptGatewayStatus(
            $checkoutAttemptId,
            $status === '' ? 'unknown' : $status
        );
        if ($historicalAttempt) {
            // Un intento reemplazado sigue siendo evidencia financiera válida,
            // pero sus estados terminales no pueden degradar el checkout nuevo.
            // Mientras el PUT de cancelación está pendiente, pending/authorized
            // aún describen al intento que sigue activo y no prueban reactivación.
            if ($cancellationPending && in_array($status, ['pending', 'authorized'], true)) {
                return;
            }
            // Después de cancelarlo/reemplazarlo, cualquier estado distinto de
            // canceled puede volver a originar cobros o ser una contradicción.
            if (!in_array($status, ['cancelled', 'canceled'], true)) {
                $this->enrollments->updateGatewayState((int) $enrollment['id'], [
                    'status' => 'review_required',
                    'membership_status' => 'manual_review',
                    'error_code' => in_array($status, ['pending', 'authorized'], true)
                        ? 'historical_checkout_reactivated'
                        : 'historical_checkout_unsafe_status',
                ]);
            }
            return;
        }
        $internal = match ($status) {
            'pending' => 'subscription_pending',
            'authorized' => 'subscription_authorized',
            'paused' => 'subscription_paused',
            'cancelled', 'canceled' => 'subscription_canceled',
            default => 'review_required',
        };
        $changes = [
            'status' => $internal,
            'subscription_status' => $status === '' ? 'unknown' : $status,
            'error_code' => $internal === 'review_required' ? 'unknown_subscription_status' : null,
        ];
        $hasInitialPayment = (string) ($enrollment['initial_payment_confirmed_at'] ?? '') !== '';
        if ($hasInitialPayment && in_array($status, ['pending', 'authorized'], true)) {
            $changes['status'] = (string) $enrollment['status'];
        }
        if ($status === 'pending' && (string) $enrollment['subscription_status'] === 'authorized') {
            $changes['subscription_status'] = 'authorized';
            $changes['status'] = (string) $enrollment['status'];
        }
        if (in_array($status, ['paused', 'cancelled', 'canceled'], true)) {
            $changes['membership_status'] = 'manual_review';
        }
        $this->enrollments->updateGatewayState((int) $enrollment['id'], $changes);
        $this->reconcileInitialPaymentIdempotently((int) $enrollment['id']);
    }

    /** @param array<string, mixed> $enrollment @param array<string, mixed> $resource */
    private function applyPayment(
        array $enrollment,
        array $resource,
        ?string $authorizedPaymentId = null,
        bool $subscriptionLinkVerifiedByAuthorizedPayment = false,
        bool $preserveUnchangedSummary = false,
        ?array $checkoutVerification = null,
        ?int $checkoutAttemptId = null,
        bool $historicalAttempt = false
    ): bool {
        $paymentId = trim((string) ($resource['id'] ?? ''));
        if ($paymentId === '') {
            throw new GatewayDataMismatchException('Pago sin identificador.');
        }
        $checkoutType = (string) ($enrollment['checkout_type'] ?? '');
        if (!in_array($checkoutType, ['subscription', 'preference'], true)) {
            throw new GatewayDataMismatchException('Tipo de checkout persistido inválido.');
        }

        $paymentReference = trim((string) ($resource['external_reference'] ?? ''));
        $expectedReference = (string) $enrollment['reference'];
        if ($paymentReference !== '' && !hash_equals($expectedReference, $paymentReference)) {
            throw new GatewayDataMismatchException('El pago pertenece a otra referencia.');
        }

        $linkedSubscriptionId = $this->linkedSubscriptionId($resource);
        $expectedSubscriptionId = trim((string) ($enrollment['mp_subscription_id'] ?? ''));
        $subscriptionLinkVerified = false;
        $checkoutLinkVerified = false;
        $preferenceId = null;
        if ($checkoutType === 'subscription') {
            if (
                $linkedSubscriptionId !== ''
                && ($expectedSubscriptionId === '' || !hash_equals($expectedSubscriptionId, $linkedSubscriptionId))
            ) {
                throw new GatewayDataMismatchException('El pago pertenece a otra suscripción.');
            }
            $subscriptionLinkVerified = $subscriptionLinkVerifiedByAuthorizedPayment
                || ($linkedSubscriptionId !== '' && hash_equals($expectedSubscriptionId, $linkedSubscriptionId));
            $checkoutLinkVerified = $subscriptionLinkVerified;
        } else {
            if ($paymentReference === '' || !hash_equals($expectedReference, $paymentReference)) {
                throw new GatewayDataMismatchException('El pago único no contiene la referencia exacta.');
            }
            if ($linkedSubscriptionId !== '') {
                throw new GatewayDataMismatchException('Un pago único no puede pertenecer a una suscripción.');
            }
            $preferenceId = $this->linkedPreferenceId($resource);
            $expectedPreferenceId = trim((string) ($enrollment['mp_preference_id'] ?? ''));
            if ($preferenceId !== null && ($expectedPreferenceId === '' || !hash_equals($expectedPreferenceId, $preferenceId))) {
                throw new GatewayDataMismatchException('El pago pertenece a otra preferencia.');
            }
            $proofKind = (string) ($checkoutVerification['kind'] ?? '');
            $proofCheckoutId = (string) ($checkoutVerification['id'] ?? '');
            $proofPaymentId = (string) ($checkoutVerification['payment_id'] ?? '');
            $proofLinkage = (string) ($checkoutVerification['linkage'] ?? '');
            if ($proofKind !== 'preference'
                || $expectedPreferenceId === ''
                || !hash_equals($expectedPreferenceId, $proofCheckoutId)
                || !hash_equals($paymentId, $proofPaymentId)
                || !in_array($proofLinkage, ['native_preference', 'merchant_order'], true)
            ) {
                throw new GatewayDataMismatchException('No se acreditó el vínculo exacto con la preferencia.');
            }
            if ($preferenceId === null) {
                if ($proofLinkage !== 'merchant_order') {
                    throw new GatewayDataMismatchException('El pago no contiene un vínculo verificable con la preferencia.');
                }
                $preferenceId = $expectedPreferenceId;
            }
            $checkoutLinkVerified = hash_equals($expectedPreferenceId, $preferenceId);
        }

        $existingPayment = $this->enrollments->paymentFacts((int) $enrollment['id'], $paymentId);
        $this->assertPaymentMoney(
            $enrollment,
            $resource['transaction_amount'] ?? null,
            $resource['currency_id'] ?? null,
            $existingPayment
        );
        $amountRefunded = $this->refundedAmount($enrollment, $resource['transaction_amount_refunded'] ?? 0);
        $status = strtolower((string) ($resource['status'] ?? ''));
        $statusDetail = strtolower((string) ($resource['status_detail'] ?? ''));
        $gatewayUpdatedAt = $this->mysqlDate($resource['date_last_updated'] ?? null);
        if ($gatewayUpdatedAt === null) {
            throw new GatewayDataMismatchException('El pago no contiene un timestamp de actualización válido.');
        }

        $unchanged = $preserveUnchangedSummary && PaymentVerification::matchesStoredPayment(
            PaymentVerification::snapshot($resource, $this->config->mercadoPagoCredentialEnvironment(), 'reconciliation_read', null, $checkoutVerification),
            $this->enrollments->paymentFacts((int) $enrollment['id'], $paymentId)
        );

        // El vínculo es evidencia sticky. El GET autenticado siempre aporta el
        // estado actual, y el repositorio además rechaza regresiones temporales.
        $effectivePayment = $this->enrollments->upsertPayment((int) $enrollment['id'], [
            'checkout_attempt_id' => $checkoutAttemptId,
            'mp_payment_id' => $paymentId,
            'mp_authorized_payment_id' => $authorizedPaymentId,
            'checkout_type' => $checkoutType,
            'mp_preference_id' => $preferenceId,
            'status' => $status === '' ? 'unknown' : $status,
            'status_detail' => $statusDetail === '' ? null : $statusDetail,
            'amount' => (int) round((float) $resource['transaction_amount']),
            'amount_refunded' => $amountRefunded,
            'ever_accredited' => ($status === 'approved' && $statusDetail === 'accredited')
                || in_array($status, ['refunded', 'charged_back'], true),
            'currency' => strtoupper((string) $resource['currency_id']),
            'subscription_link_verified' => $subscriptionLinkVerified,
            'checkout_link_verified' => $checkoutLinkVerified,
            'paid_at' => $this->mysqlDate($resource['date_approved'] ?? null),
            'last_gateway_update_at' => $gatewayUpdatedAt,
        ]);
        // La transición de la inscripción se decide con el estado que realmente
        // quedó persistido. Así un GET más antiguo no puede degradar payment_records
        // y acto seguido degradar enrollments con el snapshot descartado.
        $persistedCheckoutLink = $effectivePayment['checkout_link_verified'];
        $status = $effectivePayment['status'];
        $statusDetail = $effectivePayment['status_detail'];
        $amountRefunded = $effectivePayment['amount_refunded'];
        $everAccredited = $effectivePayment['ever_accredited'];
        if ($historicalAttempt) {
            $isTerminalWithoutPayment = in_array($status, ['rejected', 'cancelled', 'canceled'], true)
                && $amountRefunded === 0
                && !$everAccredited;
            if (!$isTerminalWithoutPayment) {
                $this->enrollments->updateGatewayState((int) $enrollment['id'], [
                    'status' => 'review_required',
                    'payment_status' => $status === '' ? 'unknown' : $status,
                    'membership_status' => 'manual_review',
                    'mp_last_payment_id' => $paymentId,
                    'error_code' => 'historical_attempt_financial_activity',
                ]);
            }
            // Sólo rechazo/cancelación terminales son silenciosos. Pending,
            // in_process, unknown y cualquier approved aún podrían acreditarse.
            return $persistedCheckoutLink;
        }
        if ($unchanged && $persistedCheckoutLink) {
            // Rechecking a previously rejected attempt must not reopen a sticky
            // issue after a later successful payment. Changed facts still take
            // the normal transition path, including refunds and chargebacks.
            return true;
        }

        if ($persistedCheckoutLink && $status === 'approved' && $statusDetail === 'accredited' && $amountRefunded === 0) {
            $verifiedChargeCount = $this->enrollments->countVerifiedAccreditedPayments((int) $enrollment['id']);
            $expectedChargeCount = (int) ($enrollment['checkout_charge_count'] ?? 0);
            if (PaymentTransition::chargeLimitExceeded($verifiedChargeCount, $expectedChargeCount)) {
                $this->enrollments->updateGatewayState((int) $enrollment['id'], [
                    'status' => 'review_required',
                    'membership_status' => 'manual_review',
                    'payment_status' => 'approved_accredited',
                    'mp_last_payment_id' => $paymentId,
                    'error_code' => $checkoutType === 'preference'
                        ? 'duplicate_payment_detected'
                        : 'charge_count_exceeded',
                ]);
                return $persistedCheckoutLink;
            }
        }

        $isSubscriptionAuthorized = (string) $enrollment['subscription_status'] === 'authorized';
        $hasInitialPayment = (string) ($enrollment['initial_payment_confirmed_at'] ?? '') !== '';
        $transition = PaymentTransition::decide(
            $checkoutType,
            $status,
            $statusDetail,
            $amountRefunded,
            $persistedCheckoutLink,
            $isSubscriptionAuthorized,
            $hasInitialPayment,
            (string) $enrollment['status'],
            (string) $enrollment['membership_status']
        );
        $isLinkedAccredited = $transition['linked_accredited'];
        $changes = [
            'status' => $transition['internal_status'],
            'membership_status' => $transition['membership_status'],
            'error_code' => $transition['error_code'],
        ];
        if ($persistedCheckoutLink) {
            $changes['payment_status'] = $transition['payment_status'];
            $changes['mp_last_payment_id'] = $paymentId;
        }
        $this->enrollments->updateGatewayState((int) $enrollment['id'], $changes);
        $this->reconcileInitialPaymentIdempotently(
            (int) $enrollment['id'],
            $isLinkedAccredited && !$hasInitialPayment ? $paymentId : null
        );
        return $persistedCheckoutLink;
    }

    /** @param array<string, mixed> $enrollment @param array<string, mixed> $resource */
    private function applyAuthorizedPayment(
        array $enrollment,
        array $resource,
        ?array $paymentResource = null,
        ?array $ownershipSubscription = null,
        bool $preserveUnchangedSummary = false,
        ?array $checkoutVerification = null,
        ?int $checkoutAttemptId = null,
        bool $historicalAttempt = false
    ): void
    {
        if ((string) ($enrollment['checkout_type'] ?? '') !== 'subscription') {
            throw new GatewayDataMismatchException('Una preferencia no puede recibir un pago autorizado recurrente.');
        }
        $authorizedSubscriptionId = trim((string) ($resource['preapproval_id'] ?? ''));
        $expectedSubscriptionId = trim((string) ($enrollment['mp_subscription_id'] ?? ''));
        if (
            $authorizedSubscriptionId === ''
            || $expectedSubscriptionId === ''
            || !hash_equals($expectedSubscriptionId, $authorizedSubscriptionId)
        ) {
            throw new GatewayDataMismatchException('El pago autorizado no identifica la suscripción esperada.');
        }
        $authorizedStatus = strtolower(trim((string) ($resource['status'] ?? '')));
        $payment = is_array($resource['payment'] ?? null) ? $resource['payment'] : [];
        $paymentId = trim((string) ($payment['id'] ?? ''));
        if ($paymentId === '') {
            $this->assertSubscriptionRecurringAmount(
                $enrollment,
                $resource['transaction_amount'] ?? null,
                $resource['currency_id'] ?? null
            );
            $ownershipSubscriptionId = is_array($ownershipSubscription)
                ? trim((string) ($ownershipSubscription['id'] ?? ''))
                : '';
            $ownershipReference = is_array($ownershipSubscription)
                ? trim((string) ($ownershipSubscription['external_reference'] ?? ''))
                : '';
            if (
                $ownershipSubscriptionId === ''
                || !hash_equals($expectedSubscriptionId, $ownershipSubscriptionId)
                || $ownershipReference === ''
                || !hash_equals((string) $enrollment['reference'], $ownershipReference)
            ) {
                throw new GatewayDataMismatchException('La factura no pudo acreditar ownership mediante su suscripción.');
            }
            if ($historicalAttempt) {
                if (!in_array($authorizedStatus, ['rejected', 'cancelled', 'canceled'], true)) {
                    $this->enrollments->updateGatewayState((int) $enrollment['id'], [
                        'status' => 'review_required',
                        'membership_status' => 'manual_review',
                        'error_code' => 'historical_checkout_reactivated',
                    ]);
                }
                // Un rechazo sin pago de una factura antigua se conserva en el
                // snapshot del evento y no reemplaza el estado del checkout nuevo.
                return;
            }
            if (in_array($authorizedStatus, ['scheduled', 'recycling'], true)) {
                throw new GatewayStateNotReadyException('El intento recurrente aún no publica su pago.');
            }
            $this->enrollments->updateGatewayState((int) $enrollment['id'], [
                'status' => 'review_required',
                'payment_status' => $authorizedStatus === ''
                    ? 'authorized_payment_unknown'
                    : 'authorized_payment_' . $authorizedStatus,
                'membership_status' => 'manual_review',
                'error_code' => 'authorized_payment_link_missing',
            ]);
            return;
        }
        if (!is_array($paymentResource) || !hash_equals($paymentId, trim((string) ($paymentResource['id'] ?? '')))) {
            throw new GatewayDataMismatchException('El pago autorizado autenticado no coincide con la factura.');
        }
        if (!$this->authenticatedResourceMatchesEnvironment($paymentResource, true)) {
            throw new GatewayDataMismatchException('El pago autorizado pertenece a otro entorno.');
        }
        $authorizedPaymentId = isset($resource['id']) ? trim((string) $resource['id']) : null;
        $this->applyPayment(
            $enrollment,
            $paymentResource,
            $authorizedPaymentId === '' ? null : $authorizedPaymentId,
            true,
            $preserveUnchangedSummary,
            $checkoutVerification,
            $checkoutAttemptId,
            $historicalAttempt
        );
    }

    /** @param array<string, mixed> $enrollment @param array<string, mixed> $chargeback @param array<string, mixed> $payment */
    private function applyChargeback(
        array $enrollment,
        array $chargeback,
        array $payment,
        ?int $checkoutAttemptId = null,
        bool $historicalAttempt = false
    ): void
    {
        $paymentId = trim((string) ($payment['id'] ?? ''));
        if ($paymentId === '' || !$this->resourceLinksPayment('chargeback', $chargeback, $paymentId)) {
            throw new GatewayDataMismatchException('El contracargo no identifica el pago esperado.');
        }
        $currency = $chargeback['currency'] ?? $chargeback['currency_id'] ?? null;
        $amount = $chargeback['amount'] ?? null;
        if (
            !is_numeric($amount)
            || (float) $amount <= 0
            || (float) $amount - (float) $enrollment['checkout_amount'] > 0.001
            || !is_string($currency)
            || !hash_equals((string) $enrollment['currency'], strtoupper($currency))
        ) {
            throw new GatewayDataMismatchException('Monto o moneda de contracargo inconsistente.');
        }
        $checkoutLinkVerified = $this->applyPayment(
            $enrollment,
            $payment,
            null,
            false,
            false,
            null,
            $checkoutAttemptId,
            $historicalAttempt
        );
        if (!$checkoutLinkVerified) {
            throw new GatewayDataMismatchException('El contracargo no enlaza un checkout verificado.');
        }
        $this->enrollments->markPaymentIncident(
            (int) $enrollment['id'],
            $paymentId,
            'charged_back',
            $this->mysqlDate($chargeback['date_last_updated'] ?? null)
        );
        $this->enrollments->updateGatewayState((int) $enrollment['id'], [
            'status' => $historicalAttempt ? 'review_required' : 'chargeback',
            'payment_status' => 'charged_back',
            'membership_status' => 'manual_review',
            'mp_last_payment_id' => $paymentId,
            'error_code' => $historicalAttempt
                ? 'historical_attempt_chargeback'
                : 'chargeback_received',
        ]);
    }

    /** @param array<string, mixed> $enrollment @param array<string, mixed> $claim @param array<string, mixed> $payment */
    private function applyClaim(
        array $enrollment,
        array $claim,
        array $payment,
        ?int $checkoutAttemptId = null,
        bool $historicalAttempt = false
    ): void
    {
        $paymentId = trim((string) ($payment['id'] ?? ''));
        if ($paymentId === '' || !$this->resourceLinksPayment('claim', $claim, $paymentId)) {
            throw new GatewayDataMismatchException('El reclamo no identifica el pago esperado.');
        }
        $checkoutLinkVerified = $this->applyPayment(
            $enrollment,
            $payment,
            null,
            false,
            false,
            null,
            $checkoutAttemptId,
            $historicalAttempt
        );
        if (!$checkoutLinkVerified) {
            throw new GatewayDataMismatchException('El reclamo no enlaza un checkout verificado.');
        }
        if (strtolower((string) ($claim['status'] ?? '')) === 'opened') {
            $this->enrollments->updateGatewayState((int) $enrollment['id'], [
                'status' => 'review_required',
                'membership_status' => 'manual_review',
                'error_code' => 'claim_opened',
            ]);
        }
    }

    /** @param array<string, mixed> $enrollment */
    private function assertSubscriptionRecurringAmount(array $enrollment, mixed $amount, mixed $currency): void
    {
        $normalized = $this->integerAmount($amount);
        $checkoutAmount = (int) ($enrollment['checkout_amount'] ?? 0);
        $initialConfirmed = trim((string) ($enrollment['initial_payment_confirmed_at'] ?? '')) !== '';
        $feeTerms = $this->enrollmentFeeSubscriptionTerms($enrollment);
        $allowed = $initialConfirmed && $feeTerms !== null
            ? [$feeTerms['checkout'], $feeTerms['installment']]
            : [$checkoutAmount];
        if ($normalized === null || !in_array($normalized, $allowed, true)) {
            throw new GatewayDataMismatchException('Monto inconsistente.');
        }
        if (!is_string($currency) || !hash_equals((string) $enrollment['currency'], strtoupper($currency))) {
            throw new GatewayDataMismatchException('Moneda inconsistente.');
        }
    }

    /** @param array<string,mixed>|null $existingPayment */
    private function assertPaymentMoney(array $enrollment, mixed $amount, mixed $currency, ?array $existingPayment): void
    {
        $normalized = $this->integerAmount($amount);
        $checkoutAmount = (int) ($enrollment['checkout_amount'] ?? 0);
        $initialConfirmed = trim((string) ($enrollment['initial_payment_confirmed_at'] ?? '')) !== '';
        $feeTerms = $this->enrollmentFeeSubscriptionTerms($enrollment);

        $valid = $normalized === $checkoutAmount;
        if ($feeTerms !== null) {
            if (!$initialConfirmed) {
                $valid = $normalized === $feeTerms['checkout'];
            } elseif ($normalized === $feeTerms['installment']) {
                $valid = true;
            } else {
                // El cargo inicial puede reaparecer solo al reprocesar la misma
                // transacción ya fijada; otro cargo con matrícula sería doble.
                $valid = $normalized === $feeTerms['checkout']
                    && is_array($existingPayment)
                    && (int) ($existingPayment['amount'] ?? -1) === $feeTerms['checkout'];
            }
        }
        if (!$valid) {
            throw new GatewayDataMismatchException('Monto de pago inconsistente.');
        }
        if (!is_string($currency) || !hash_equals((string) $enrollment['currency'], strtoupper($currency))) {
            throw new GatewayDataMismatchException('Moneda inconsistente.');
        }
    }

    private function integerAmount(mixed $amount): ?int
    {
        if (!is_numeric($amount)) {
            return null;
        }
        $normalized = (int) round((float) $amount);
        return abs((float) $amount - (float) $normalized) <= 0.001 && $normalized > 0
            ? $normalized
            : null;
    }

    /**
     * @param array<string,mixed> $enrollment
     * @return array{checkout:int,installment:int}|null
     */
    private function enrollmentFeeSubscriptionTerms(array $enrollment): ?array
    {
        if ((string) ($enrollment['pricing_version'] ?? '') !== '2026-10-06-v4') {
            return null;
        }

        $plan = (string) ($enrollment['plan_code'] ?? '');
        $duration = $this->canonicalInteger($enrollment['duration_months'] ?? null);
        $chargeCount = $this->canonicalInteger($enrollment['checkout_charge_count'] ?? null);
        $checkoutAmount = $this->canonicalInteger($enrollment['checkout_amount'] ?? null);
        $installmentAmount = $this->canonicalInteger($enrollment['installment_amount'] ?? null);
        $contractTotal = $this->canonicalInteger($enrollment['contract_total'] ?? null);
        $expectedInstallment = $duration === null
            ? null
            : (self::ENROLLMENT_FEE_SUBSCRIPTION_INSTALLMENTS[$plan][$duration] ?? null);

        if ((string) ($enrollment['payment_mode'] ?? '') !== 'automatic'
            || (string) ($enrollment['checkout_type'] ?? '') !== 'subscription'
            || (string) ($enrollment['currency'] ?? '') !== 'CLP'
            || $expectedInstallment === null
            || $chargeCount !== $duration
            || $installmentAmount !== $expectedInstallment
            || $checkoutAmount !== $expectedInstallment + self::ENROLLMENT_FEE_AMOUNT
            || $contractTotal !== ($expectedInstallment * $duration) + self::ENROLLMENT_FEE_AMOUNT
        ) {
            throw new GatewayDataMismatchException('Los términos de matrícula de la suscripción no coinciden con su versión.');
        }

        return ['checkout' => $checkoutAmount, 'installment' => $installmentAmount];
    }

    /** @param array<string, mixed> $enrollment */
    private function refundedAmount(array $enrollment, mixed $amount): int
    {
        if (!is_numeric($amount)) {
            throw new GatewayDataMismatchException('Monto devuelto inválido.');
        }
        $normalized = (int) round((float) $amount);
        if (
            abs((float) $amount - (float) $normalized) > 0.001
            || $normalized < 0
            || $normalized > (int) $enrollment['checkout_amount']
        ) {
            throw new GatewayDataMismatchException('Monto devuelto inconsistente.');
        }
        return $normalized;
    }

    /**
     * Resolves the immutable checkout attempt that owns a provider resource.
     * Every independent linkage published by Mercado Pago must point to the
     * same row; accepting the first match would hide contradictory evidence.
     *
     * @param array<string,mixed> $resource
     * @param array<string,mixed> $lookupResource
     * @return array<string,mixed>|null
     */
    private function resolveCheckoutAttempt(
        string $kind,
        array $resource,
        array $lookupResource,
        string $reference,
        string $subscriptionId
    ): ?array {
        $candidates = [];
        $resourceIds = [];
        if ($kind === 'subscription') {
            $resourceIds[] = trim((string) ($resource['id'] ?? ''));
        }
        if ($subscriptionId !== '') {
            $resourceIds[] = $subscriptionId;
        }
        $preferenceId = $this->linkedPreferenceId($lookupResource);
        if ($preferenceId !== null) {
            $resourceIds[] = $preferenceId;
        }
        foreach (array_unique(array_filter($resourceIds, static fn (string $id): bool => $id !== '')) as $resourceId) {
            $attempt = $this->enrollments->findCheckoutAttemptByResourceId($resourceId);
            if ($attempt !== null) {
                $candidates[] = $attempt;
            }
        }
        if ($reference !== '') {
            $referenceAttempt = $this->enrollments->findCheckoutAttemptByReference($reference);
            if ($referenceAttempt !== null) {
                $candidates[] = $referenceAttempt;
            } elseif ($candidates !== []) {
                throw new GatewayDataMismatchException('La referencia no identifica el recurso de checkout esperado.');
            }
        }
        if ($candidates === []) {
            return null;
        }
        $resolved = $candidates[0];
        foreach ($candidates as $candidate) {
            if ((int) $candidate['id'] !== (int) $resolved['id']) {
                throw new GatewayDataMismatchException('Los vínculos del proveedor apuntan a intentos distintos.');
            }
        }
        if (
            $reference !== ''
            && !hash_equals((string) $resolved['external_reference'], $reference)
        ) {
            throw new GatewayDataMismatchException('La referencia no pertenece al intento resuelto.');
        }
        return $resolved;
    }

    /** @return array<string,mixed>|null */
    private function checkoutAttemptById(int $enrollmentId, int $attemptId): ?array
    {
        foreach ($this->enrollments->checkoutAttemptReferences($enrollmentId) as $attempt) {
            if ((int) $attempt['id'] === $attemptId) {
                return $attempt;
            }
        }
        return null;
    }

    /**
     * Creates a validation-only enrollment view for the immutable attempt.
     * The canonical member reference remains untouched in the database.
     *
     * @param array<string,mixed> $enrollment
     * @param array<string,mixed> $attempt
     * @return array<string,mixed>
     */
    private function enrollmentForCheckoutAttempt(array $enrollment, array $attempt): array
    {
        if ((int) ($attempt['enrollment_id'] ?? 0) !== (int) ($enrollment['id'] ?? 0)) {
            throw new GatewayDataMismatchException('El intento no pertenece a la inscripción bloqueada.');
        }
        $checkoutType = (string) ($attempt['checkout_type'] ?? '');
        $reference = trim((string) ($attempt['external_reference'] ?? ''));
        $resourceId = trim((string) ($attempt['resource_id'] ?? ''));
        if (!in_array($checkoutType, ['subscription', 'preference'], true) || $reference === '' || $resourceId === '') {
            throw new GatewayStateNotReadyException('El intento de checkout todavía no tiene evidencia completa.');
        }
        $context = $enrollment;
        $context['reference'] = $reference;
        $context['checkout_type'] = $checkoutType;
        $context['mp_checkout_id'] = $resourceId;
        $context['mp_subscription_id'] = $checkoutType === 'subscription' ? $resourceId : null;
        $context['mp_preference_id'] = $checkoutType === 'preference' ? $resourceId : null;
        return $context;
    }

    /** @param array<string, mixed> $resource */
    private function linkedSubscriptionId(array $resource): string
    {
        $candidates = [
            $resource['preapproval_id'] ?? null,
            $resource['subscription_id'] ?? null,
            $resource['metadata']['preapproval_id'] ?? null,
            $resource['point_of_interaction']['transaction_data']['subscription_id'] ?? null,
        ];
        foreach ($candidates as $value) {
            if ((is_string($value) || is_int($value)) && trim((string) $value) !== '') {
                return trim((string) $value);
            }
        }
        return '';
    }

    /** @param array<string, mixed> $resource */
    private function linkedPreferenceId(array $resource): ?string
    {
        $candidates = [
            $resource['preference_id'] ?? null,
            $resource['metadata']['preference_id'] ?? null,
        ];
        foreach ($candidates as $value) {
            if ((is_string($value) || is_int($value)) && trim((string) $value) !== '') {
                return trim((string) $value);
            }
        }
        return null;
    }

    private function resourceKind(string $topic): ?string
    {
        return match (strtolower(trim($topic))) {
            'payment', 'payments' => 'payment',
            'subscription', 'preapproval', 'subscription_preapproval' => 'subscription',
            'invoice', 'subscription_authorized_payment', 'authorized_payment' => 'authorized_payment',
            'chargeback', 'chargebacks', 'topic_chargebacks_wh' => 'chargeback',
            'claim', 'claims', 'topic_claims_integration_wh' => 'claim',
            default => null,
        };
    }

    /** @param array<string, mixed> $resource */
    private function relatedPaymentId(string $kind, array $resource): string
    {
        if ($kind === 'chargeback') {
            $paymentIds = $this->relatedPaymentIds($resource);
            return count($paymentIds) === 1 ? $paymentIds[0] : '';
        }
        $resourceType = strtolower((string) ($resource['resource'] ?? ''));
        if ($resourceType !== '' && $resourceType !== 'payment') {
            return '';
        }
        $candidate = $resource['resource_id'] ?? $resource['payment_id'] ?? $resource['payment']['id'] ?? null;
        return is_string($candidate) || is_int($candidate) ? trim((string) $candidate) : '';
    }

    /** @param array<string, mixed> $resource @return list<string> */
    private function relatedPaymentIds(array $resource): array
    {
        $payments = $resource['payments'] ?? null;
        if (!is_array($payments)) {
            return [];
        }
        $ids = [];
        foreach ($payments as $candidate) {
            if (is_array($candidate)) {
                $candidate = $candidate['id'] ?? $candidate['payment_id'] ?? null;
            }
            if (!is_string($candidate) && !is_int($candidate)) {
                return [];
            }
            $id = trim((string) $candidate);
            if ($id === '') {
                return [];
            }
            $ids[] = $id;
        }
        return array_values(array_unique($ids));
    }

    /** @param array<string, mixed> $chargeback @param list<string> $paymentIds */
    private function reviewAmbiguousChargeback(int $eventId, array $chargeback, array $paymentIds): void
    {
        $snapshot = $this->snapshot('chargeback', $chargeback);
        $snapshot['related_payment_ids'] = $paymentIds;
        if ($paymentIds === []) {
            $this->events->finish(
                $eventId,
                'review_required',
                null,
                $snapshot,
                'chargeback_payment_link_ambiguous'
            );
            return;
        }

        $matched = [];
        foreach ($paymentIds as $paymentId) {
            $payment = $this->mercadoPago->getPayment($paymentId);
            if (!$this->authenticatedResourceMatchesEnvironment($payment)) {
                throw new GatewayStateNotReadyException('No se pudo acreditar el collector de un pago en contracargo.');
            }
            $reference = trim((string) ($payment['external_reference'] ?? ''));
            $subscriptionId = $this->linkedSubscriptionId($payment);
            $enrollment = $reference !== '' ? $this->enrollments->findByReference($reference) : null;
            if ($enrollment === null && $subscriptionId !== '') {
                $enrollment = $this->enrollments->findBySubscriptionId($subscriptionId);
            }
            if ($enrollment === null) {
                $enrollment = $this->enrollments->findByPaymentId($paymentId);
            }
            if (is_array($enrollment)) {
                $matched[(int) $enrollment['id']] = $enrollment;
            }
        }

        foreach ($matched as $enrollmentId => $_enrollment) {
            $this->enrollments->withLockedEnrollment(
                $enrollmentId,
                function (array $lockedEnrollment): void {
                    $this->enrollments->updateGatewayState((int) $lockedEnrollment['id'], [
                        'status' => 'review_required',
                        'membership_status' => 'manual_review',
                        'error_code' => 'chargeback_multiple_payments',
                    ]);
                }
            );
        }
        $matchedIds = array_keys($matched);
        $this->events->finish(
            $eventId,
            'review_required',
            count($matchedIds) === 1 ? $matchedIds[0] : null,
            $snapshot,
            'chargeback_payment_link_ambiguous'
        );
    }

    /** @param array<string, mixed> $resource */
    private function resourceLinksPayment(string $kind, array $resource, string $paymentId): bool
    {
        return in_array($kind, ['chargeback', 'claim'], true)
            && hash_equals($paymentId, $this->relatedPaymentId($kind, $resource));
    }

    /** @param array<string, mixed> $resource @param array<string, mixed>|null $relatedPayment @return array<string, mixed> */
    private function snapshot(string $kind, array $resource, ?array $relatedPayment = null): array
    {
        return [
            'kind' => $kind,
            'id' => isset($resource['id']) ? (string) $resource['id'] : null,
            'external_reference' => isset($resource['external_reference']) ? (string) $resource['external_reference'] : null,
            'status' => isset($resource['status']) ? (string) $resource['status'] : null,
            'status_detail' => isset($resource['status_detail']) ? (string) $resource['status_detail'] : null,
            'preapproval_id' => isset($resource['preapproval_id']) ? (string) $resource['preapproval_id'] : null,
            'transaction_amount' => $resource['transaction_amount'] ?? $resource['amount'] ?? null,
            'transaction_amount_refunded' => $resource['transaction_amount_refunded'] ?? null,
            'currency_id' => $resource['currency_id'] ?? $resource['currency'] ?? null,
            'date_last_updated' => $resource['date_last_updated'] ?? $resource['last_updated'] ?? null,
            'related_payment_id' => is_array($relatedPayment) && isset($relatedPayment['id'])
                ? (string) $relatedPayment['id']
                : null,
        ];
    }

    /** @param array<string,mixed> $snapshot */
    private function finishGatewayMismatch(int $eventId, int $enrollmentId, array $snapshot): void
    {
        $this->enrollments->updateGatewayState($enrollmentId, [
            'status' => 'review_required',
            'membership_status' => 'manual_review',
            'error_code' => 'gateway_data_mismatch',
        ]);
        $this->events->finish(
            $eventId,
            'review_required',
            $enrollmentId,
            $snapshot,
            'gateway_data_mismatch'
        );
    }

    private function mysqlDate(mixed $value): ?string
    {
        if (!is_string($value) || trim($value) === '') {
            return null;
        }
        try {
            return (new \DateTimeImmutable($value))->setTimezone(new \DateTimeZone('UTC'))->format('Y-m-d H:i:s.v');
        } catch (\Throwable) {
            return null;
        }
    }

    private function canonicalTimestamp(mixed $value): ?string
    {
        if (!is_string($value) || !preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/D', $value)) return null;
        try {
            $date = new \DateTimeImmutable($value);
            $errors = \DateTimeImmutable::getLastErrors();
            if (is_array($errors) && ($errors['warning_count'] > 0 || $errors['error_count'] > 0)) return null;
            return $date->setTimezone(new \DateTimeZone('UTC'))->format('Y-m-d\TH:i:s.v\Z');
        } catch (\Throwable) { return null; }
    }

    private function canonicalInteger(mixed $value): ?int
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

    /** @param array<string, mixed> $resource */
    private function authenticatedResourceMatchesEnvironment(array $resource, bool $paymentGet = false): bool
    {
        $collectorId = $resource['collector_id'] ?? null;
        $canonicalCollectorId = is_int($collectorId) && $collectorId > 0
            ? (string) $collectorId
            : (is_string($collectorId) && preg_match('/^[1-9][0-9]{0,19}$/D', $collectorId) === 1
                ? $collectorId
                : null);
        if (
            $canonicalCollectorId === null
            || !hash_equals($this->config->mercadoPagoSellerId(), $canonicalCollectorId)
        ) {
            return false;
        }
        $applicationId = $resource['application_id'] ?? $resource['client_id'] ?? null;
        foreach (['application_id', 'client_id'] as $key) {
            if (!isset($resource[$key])) continue;
            $value = $resource[$key];
            if ((!is_int($value) && !is_string($value)) || !preg_match('/^[1-9][0-9]{0,19}$/D', (string) $value)
                || !hash_equals($this->config->mercadoPagoApplicationId(), (string) $value)) return false;
        }
        if ($applicationId === null && $paymentGet) {
            // This is account/environment validation only. A missing application
            // requires a fresh checkout ownership chain before persistence.
            return is_bool($resource['live_mode'] ?? null) && $resource['live_mode'] === $this->config->isProduction();
        }
        $canonicalApplicationId = is_int($applicationId) && $applicationId > 0
            ? (string) $applicationId
            : (is_string($applicationId) && preg_match('/^[1-9][0-9]{0,19}$/D', $applicationId) === 1
                ? $applicationId
                : null);
        if (
            $canonicalApplicationId === null
            || !hash_equals($this->config->mercadoPagoApplicationId(), $canonicalApplicationId)
        ) {
            return false;
        }
        if (!array_key_exists('live_mode', $resource)) {
            // Algunos recursos no publican live_mode. En ese caso mandan el
            // alcance explícito de la credencial y los IDs autenticados.
            return true;
        }
        if (!is_bool($resource['live_mode'])) {
            return false;
        }
        return $resource['live_mode'] === $this->config->isProduction();
    }

    private function verifyPaymentCheckout(array $enrollment, array $payment, ?array $invoice): array
    {
        try {
            $kind = (string) ($enrollment['checkout_type'] ?? '');
            $paymentId = (string) ($payment['id'] ?? '');
            if (!in_array($kind, ['subscription', 'preference'], true)) throw new GatewayStateNotReadyException('Checkout ownership chain unavailable.');
            if ($kind === 'subscription' && $invoice === null && CheckoutPaymentVerification::nativeId($payment, $kind) === null) {
                // Only reuse the stored invoice identifier, never its old contents.
                $stored = $this->enrollments->paymentFacts((int) $enrollment['id'], $paymentId);
                $invoiceId = (string) ($stored['mp_authorized_payment_id'] ?? '');
                if ((int) ($stored['checkout_link_verified'] ?? 0) !== 1 || $invoiceId === '') throw new GatewayStateNotReadyException('Checkout ownership chain unavailable.');
                $invoice = $this->mercadoPago->getAuthorizedPayment($invoiceId);
                if ((string) ($invoice['id'] ?? '') !== $invoiceId) throw new GatewayStateNotReadyException('Checkout ownership chain unavailable.');
            }
            $merchantOrder = null;
            if ($kind === 'preference') {
                $merchantOrderId = CheckoutPaymentVerification::merchantOrderId($payment);
                if ($merchantOrderId !== null) {
                    $merchantOrder = $this->mercadoPago->getMerchantOrder($merchantOrderId);
                }
            }
            $checkoutId = (string) ($enrollment[$kind === 'subscription' ? 'mp_subscription_id' : 'mp_preference_id'] ?? '');
            if ($checkoutId === '') throw new GatewayStateNotReadyException('Checkout ownership chain unavailable.');
            $checkout = $kind === 'subscription' ? $this->mercadoPago->getSubscription($checkoutId) : $this->mercadoPago->getPreference($checkoutId);
            return CheckoutPaymentVerification::proof($enrollment, $payment, $checkout, $this->config->mercadoPagoCredentialEnvironment(),
                $this->config->mercadoPagoSellerId(), $this->config->mercadoPagoApplicationId(), $invoice, null, $merchantOrder);
        } catch (\InvalidArgumentException $exception) {
            throw new GatewayDataMismatchException(
                'La cadena autenticada de pago y checkout es inconsistente.',
                0,
                $exception
            );
        }
    }

    private function normalizeRecurringAmountAfterEnrollmentFee(int $enrollmentId): void
    {
        $enrollment = $this->enrollments->findById($enrollmentId);
        if (!is_array($enrollment)
            || (string) ($enrollment['checkout_type'] ?? '') !== 'subscription'
            || trim((string) ($enrollment['initial_payment_confirmed_at'] ?? '')) === ''
        ) {
            return;
        }

        try {
            $feeTerms = $this->enrollmentFeeSubscriptionTerms($enrollment);
        } catch (GatewayDataMismatchException $exception) {
            $this->markEnrollmentFeeNormalizationReview($enrollmentId, 'subscription_fee_contract_mismatch');
            throw new GatewayStateNotReadyException('Los términos de matrícula requieren revisión.');
        }
        if ($feeTerms === null) {
            return;
        }
        $checkoutAmount = $feeTerms['checkout'];
        $installmentAmount = $feeTerms['installment'];
        $subscriptionId = trim((string) ($enrollment['mp_subscription_id'] ?? ''));
        if ($subscriptionId === '' || !$this->mercadoPago instanceof SubscriptionAmountGateway) {
            $this->markEnrollmentFeeNormalizationReview($enrollmentId, 'subscription_fee_normalization_unavailable');
            throw new GatewayStateNotReadyException('No se puede normalizar el monto recurrente.');
        }

        try {
            $subscription = $this->mercadoPago->getSubscription($subscriptionId);
            $currentAmount = $this->assertSubscriptionForAmountNormalization($enrollment, $subscription);
            if ($currentAmount === $installmentAmount) {
                return;
            }
            if ($currentAmount !== $checkoutAmount) {
                $this->markEnrollmentFeeNormalizationReview($enrollmentId, 'subscription_fee_amount_mismatch');
                throw new GatewayStateNotReadyException('La suscripción tiene un monto inesperado.');
            }

            $this->mercadoPago->updateSubscriptionAmount(
                $subscriptionId,
                $installmentAmount,
                (string) $enrollment['currency']
            );
            $confirmed = $this->mercadoPago->getSubscription($subscriptionId);
            if ($this->assertSubscriptionForAmountNormalization($enrollment, $confirmed) !== $installmentAmount) {
                $this->markEnrollmentFeeNormalizationReview($enrollmentId, 'subscription_fee_normalization_unconfirmed');
                throw new GatewayStateNotReadyException('Mercado Pago no confirmó el monto recurrente.');
            }
        } catch (MercadoPagoApiException $exception) {
            throw new GatewayStateNotReadyException('No se pudo confirmar el ajuste del monto recurrente.');
        } catch (GatewayDataMismatchException $exception) {
            $this->markEnrollmentFeeNormalizationReview($enrollmentId, 'subscription_fee_normalization_mismatch');
            throw new GatewayStateNotReadyException('La suscripción no coincide con la inscripción.');
        }
    }

    /** @param array<string,mixed> $enrollment @param array<string,mixed> $subscription */
    private function assertSubscriptionForAmountNormalization(array $enrollment, array $subscription): int
    {
        $subscriptionId = trim((string) ($subscription['id'] ?? ''));
        $reference = trim((string) ($subscription['external_reference'] ?? ''));
        $collector = (string) ($subscription['collector_id'] ?? '');
        $application = (string) ($subscription['application_id'] ?? $subscription['client_id'] ?? '');
        $recurring = is_array($subscription['auto_recurring'] ?? null) ? $subscription['auto_recurring'] : [];
        $amount = $this->integerAmount($recurring['transaction_amount'] ?? null);
        if ($subscriptionId === ''
            || !hash_equals((string) $enrollment['mp_subscription_id'], $subscriptionId)
            || $reference === ''
            || !hash_equals((string) $enrollment['reference'], $reference)
            || $collector !== $this->config->mercadoPagoSellerId()
            || $application !== $this->config->mercadoPagoApplicationId()
            || (isset($subscription['preapproval_plan_id']) && trim((string) $subscription['preapproval_plan_id']) !== '')
            || (array_key_exists('live_mode', $subscription)
                && (!is_bool($subscription['live_mode'])
                    || $subscription['live_mode'] !== ($this->config->mercadoPagoCredentialEnvironment() === 'production')))
            || !in_array(strtolower((string) ($subscription['status'] ?? '')), ['pending', 'authorized'], true)
            || $amount === null
            || (string) ($recurring['currency_id'] ?? '') !== (string) $enrollment['currency']
        ) {
            throw new GatewayDataMismatchException('La suscripción no permite normalizar la matrícula.');
        }
        return $amount;
    }

    private function markEnrollmentFeeNormalizationReview(int $enrollmentId, string $errorCode): void
    {
        $this->enrollments->updateGatewayState($enrollmentId, [
            'status' => 'review_required',
            'membership_status' => 'manual_review',
            'error_code' => $errorCode,
        ]);
    }

    private function reconcileInitialPaymentIdempotently(int $enrollmentId, ?string $expectedPaymentId = null): void
    {
        $this->enrollments->reconcileInitialPayment($enrollmentId);
        $fresh = $this->enrollments->findById($enrollmentId);
        $fixedPaymentId = is_array($fresh) ? trim((string) ($fresh['initial_mp_payment_id'] ?? '')) : '';
        if ($expectedPaymentId === null || $fixedPaymentId === '') {
            return;
        }
        if (hash_equals($fixedPaymentId, $expectedPaymentId)) {
            return;
        }
        throw new GatewayDataMismatchException('El pago inicial ya está fijado a otra transacción.');
    }
}
