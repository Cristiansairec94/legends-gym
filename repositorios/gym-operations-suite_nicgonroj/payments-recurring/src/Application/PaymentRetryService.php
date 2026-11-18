<?php

declare(strict_types=1);

namespace DemoGym\Application;

use DemoGym\Config;
use DemoGym\Domain\EnrollmentReference;
use DemoGym\Domain\Idempotency;
use DemoGym\Domain\PendingSubscriptionRequest;
use DemoGym\Domain\PaymentTransition;
use DemoGym\Domain\Uuid;
use DemoGym\Http\HttpException;
use DemoGym\Infrastructure\EnrollmentRepository;
use DemoGym\Infrastructure\MercadoPagoApiException;
use DemoGym\Infrastructure\MercadoPagoClient;
use DemoGym\Infrastructure\PaymentAttemptBindingMismatchException;
use DemoGym\Infrastructure\ReadBudgetExceeded;
use DemoGym\Infrastructure\WebhookEventRepository;
use InvalidArgumentException;
use RuntimeException;
use Throwable;

/** Recupera un checkout rechazado sin duplicar la inscripción. */
final class PaymentRetryService
{
    public function __construct(
        private readonly Config $config,
        private readonly EnrollmentRepository $enrollments,
        private readonly MercadoPagoClient $mercadoPago,
        private readonly CheckoutRequestFactory $requests,
        private readonly CheckoutPreflight $preflight,
        private readonly WebhookEventRepository $events
    ) {}

    /** @return array{http_status:int,body:array<string,mixed>} */
    public function retry(string $reference, string $idempotencyKey): array
    {
        $reference = strtoupper(trim($reference));
        if (!EnrollmentReference::isValid($reference)) {
            throw new HttpException(422, 'invalid_request', 'La referencia no es válida.');
        }
        try {
            $idempotencyHash = Idempotency::hashKey($idempotencyKey);
        } catch (InvalidArgumentException) {
            throw new HttpException(422, 'invalid_request', 'Envía una X-Idempotency-Key válida.');
        }

        // Esta comprobación ocurre antes del lock durable, la persistencia
        // financiera y cualquier mutación en Mercado Pago.
        $this->assertServiceReady();

        $enrollment = $this->enrollments->findByReference($reference);
        if ($enrollment === null || !hash_equals($reference, (string) ($enrollment['reference'] ?? ''))) {
            throw new HttpException(404, 'not_found', 'No encontramos esa inscripción.', false, 'status_only');
        }

        $locked = $this->enrollments->withPaymentRetryLock(
            (int) $enrollment['id'],
            fn (): array => $this->retryLocked((int) $enrollment['id'], $reference, $idempotencyHash)
        );
        if (!$locked['acquired']) {
            throw new HttpException(409, 'retry_busy', 'La inscripción se está actualizando. Intenta nuevamente en unos segundos.');
        }
        return $locked['result'];
    }

    private function assertServiceReady(): void
    {
        if (!$this->config->checkoutEnabled()) {
            throw new HttpException(
                503,
                'payment_retry_unavailable',
                'Los pagos están temporalmente deshabilitados. Conserva tu referencia e inténtalo nuevamente.',
                true,
                'same_idempotency_key'
            );
        }
        $inspection = $this->preflight->inspect();
        if (($inspection['ready'] ?? false) !== true) {
            throw new HttpException(
                503,
                'payment_retry_unavailable',
                'No pudimos comprobar que el servicio de pago esté listo. Conserva tu referencia e inténtalo nuevamente.',
                true,
                'same_idempotency_key'
            );
        }
    }

    /** @return array{http_status:int,body:array<string,mixed>} */
    private function retryLocked(int $enrollmentId, string $reference, string $idempotencyHash): array
    {
        $enrollment = $this->requiredEnrollment($enrollmentId);
        $retry = $this->enrollments->findPaymentRetryByIdempotencyHash($idempotencyHash);
        if ($retry !== null && (int) $retry['enrollment_id'] !== $enrollmentId) {
            throw new HttpException(409, 'idempotency_conflict', 'La clave de reintento ya fue usada.', false, 'new_idempotency_key');
        }

        if ((string) ($enrollment['checkout_type'] ?? '') === 'preference') {
            if ($retry !== null) {
                throw $this->reviewRequired('Una preferencia contiene un reemplazo de suscripción inesperado.');
            }
            return $this->resumePreferenceCheckout($enrollment, $reference);
        }

        if ($retry === null) {
            $this->assertLocallyEligible($enrollment);
            $active = $this->enrollments->findCheckoutAttemptForEnrollment(
                $enrollmentId,
                (string) ($enrollment['mp_subscription_id'] ?? ''),
                null
            );
            if ($active === null || !(bool) ($active['is_active'] ?? false)) {
                throw $this->reviewRequired('No se pudo identificar el checkout activo.');
            }

            // Una clave nueva adopta la operación durable que ya reemplaza al
            // checkout activo. uq_checkout_attempt_replaces impide dos ciclos.
            $retry = $this->enrollments->findPaymentRetryByReplacedAttempt((int) $active['id']);
            if ($retry === null) {
                $pendingProbe = in_array(
                    (string) ($enrollment['status'] ?? ''),
                    ['checkout_ready', 'subscription_pending', 'subscription_authorized', 'payment_pending'],
                    true
                );
                $activeRequest = $this->requests->buildStoredSubscription(
                    $enrollment,
                    (string) $active['external_reference'],
                    $reference
                );
                $attemptReference = EnrollmentReference::generate();
                // Validar la contratación antes de persistir el retry o cancelar
                // el checkout que todavía representa al miembro.
                $this->requests->buildStoredSubscription($enrollment, $attemptReference, $reference);
                $facts = $this->freshFinancialCheck($enrollment, [
                    (int) $active['id'] => ['pending', 'authorized', 'canceled', 'cancelled'],
                ]);
                $this->persistPhaseEvidence(
                    $enrollment,
                    (int) $active['id'],
                    'initial-precheck',
                    $facts['evidence']
                );
                $activeSubscription = $this->subscriptionFact($facts, (int) $active['id']);
                $providerStatus = strtolower(trim((string) ($activeSubscription['status'] ?? '')));
                $activeRejected = isset($facts['rejected_attempts'][(int) $active['id']]);
                if ($providerStatus === 'authorized' && !$activeRejected) {
                    $this->enrollments->updateCheckoutAttemptGatewayStatus((int) $active['id'], 'authorized');
                    $this->enrollments->updateGatewayState($enrollmentId, [
                        'status' => 'subscription_authorized',
                        'subscription_status' => 'authorized',
                        'error_code' => null,
                    ]);
                    $this->enrollments->reconcileInitialPayment($enrollmentId);
                    throw new HttpException(
                        409,
                        'payment_authorization_pending',
                        'La suscripción fue autorizada y estamos confirmando el pago. No reemplazaremos el checkout de esta inscripción.',
                        false,
                        'status_only'
                    );
                }
                if ($pendingProbe && $providerStatus === 'pending' && !$activeRejected) {
                    $this->persistPhaseEvidence(
                        $enrollment,
                        (int) $active['id'],
                        'pending-probe',
                        $facts['evidence']
                    );
                    $validated = $this->validateRetryCheckout(
                        $enrollment,
                        $active,
                        $activeRequest['offer'],
                        $activeSubscription
                    );
                    return $this->success($reference, $validated['checkout_url'], 200);
                }
                if ($pendingProbe && ($activeRejected || in_array($providerStatus, ['canceled', 'cancelled'], true))) {
                    $this->enrollments->updateGatewayState($enrollmentId, [
                        'status' => 'payment_rejected',
                        'subscription_status' => $providerStatus,
                        'payment_status' => $activeRejected ? 'rejected' : 'not_created',
                        'membership_status' => 'not_activated',
                        'error_code' => null,
                    ]);
                    $enrollment = $this->requiredEnrollment($enrollmentId);
                }
                $retry = $this->enrollments->preparePaymentRetryAttempt(
                    $enrollmentId,
                    $attemptReference,
                    $idempotencyHash,
                    Uuid::v4(),
                    (int) $active['id']
                );
                return $this->cancelOldAttempt(
                    $enrollment,
                    $active,
                    $retry,
                    $activeSubscription
                );
            }
        }

        $state = (string) ($retry['lifecycle_status'] ?? '');
        if ($state === 'active') {
            return $this->resumeActiveAttempt($enrollmentId, $reference, $retry);
        }

        $old = $this->replacedAttempt($enrollmentId, $retry);
        if (in_array($state, ['awaiting_cancellation', 'cancel_uncertain'], true)) {
            $this->requests->buildStoredSubscription(
                $enrollment,
                (string) $retry['external_reference'],
                (string) $enrollment['reference']
            );
            $facts = $this->freshFinancialCheck($enrollment, [
                (int) $old['id'] => ['pending', 'authorized', 'canceled', 'cancelled'],
            ]);
            $this->persistPhaseEvidence(
                $enrollment,
                (int) $retry['id'],
                'cancellation-precheck',
                $facts['evidence']
            );
            return $this->cancelOldAttempt(
                $enrollment,
                $old,
                $retry,
                $this->subscriptionFact($facts, (int) $old['id'])
            );
        }

        if ($state === 'ready_to_create') {
            $request = $this->requests->buildStoredSubscription(
                $enrollment,
                (string) $retry['external_reference'],
                (string) $enrollment['reference']
            );
            $this->assertLocallyEligible($this->requiredEnrollment($enrollmentId), true);
            $facts = $this->freshFinancialCheck($enrollment, [
                (int) $old['id'] => ['canceled', 'cancelled'],
            ]);
            $this->persistPhaseEvidence(
                $enrollment,
                (int) $retry['id'],
                'creation-precheck',
                $facts['evidence']
            );
            $this->mercadoPago->assertMutationBudget();
            if (!$this->enrollments->markPaymentRetryCreationStarted((int) $retry['id'])) {
                throw new HttpException(409, 'retry_busy', 'El reintento cambió de estado. Vuelve a consultar.');
            }
            return $this->createNewAttempt($enrollment, $retry, $request);
        }

        if (in_array($state, ['creating', 'creation_uncertain'], true)) {
            $request = $this->requests->buildStoredSubscription(
                $enrollment,
                (string) $retry['external_reference'],
                (string) $enrollment['reference']
            );
            return $this->reconcileNewAttempt($enrollment, $retry, $request);
        }

        if ($state === 'confirmed') {
            return $this->activateConfirmedAttempt($enrollment, $old, $retry);
        }

        if ($state === 'payment_received_before_cancellation') {
            // Este estado también es un punto de reanudación. Mercado Pago
            // puede acreditar el cargo mientras la preapproval todavía figura
            // pending; en ese caso reconcileInitialPayment debe esperar a que
            // la suscripción quede authorized. Cada consulta vuelve a leer la
            // evidencia completa y nunca cancela ni crea otro checkout.
            $this->freshFinancialCheck($enrollment, [
                (int) $old['id'] => ['pending', 'authorized', 'canceled', 'cancelled'],
            ]);
            throw $this->reviewRequired('El pago observado ya no aparece en la conciliación remota.');
        }

        if (in_array($state, ['cancel_failed', 'creation_failed', 'review_required'], true)) {
            $this->markEnrollmentReview($enrollment, 'payment_retry_' . $state);
        }
        throw $this->reviewRequired('El reintento requiere revisión.');
    }

    /** @return array{http_status:int,body:array<string,mixed>} */
    private function resumePreferenceCheckout(array $enrollment, string $reference): array
    {
        $this->assertPreferenceLocallyEligible($enrollment);
        $enrollmentId = (int) $enrollment['id'];
        $resourceId = trim((string) ($enrollment['mp_preference_id'] ?? ''));
        $attempts = $this->enrollments->checkoutAttemptReferences($enrollmentId);
        if (count($attempts) !== 1) {
            throw $this->reviewRequired('La preferencia no tiene un único intento atribuible.');
        }
        $attempt = $attempts[0];
        if ((int) ($enrollment['active_checkout_attempt_id'] ?? 0) !== (int) ($attempt['id'] ?? 0)
            || !(bool) ($attempt['is_active'] ?? false)
            || (string) ($attempt['lifecycle_status'] ?? '') !== 'active'
            || (string) ($attempt['checkout_type'] ?? '') !== 'preference'
            || $resourceId === ''
            || !hash_equals($resourceId, trim((string) ($attempt['resource_id'] ?? '')))
            || !hash_equals((string) ($attempt['external_reference'] ?? ''), $reference)
        ) {
            throw $this->reviewRequired('La preferencia activa no coincide con la inscripción.');
        }

        try {
            $stored = $this->requests->buildStoredPreference($enrollment);
        } catch (Throwable) {
            $this->markRetryReview($enrollment, $attempt, 'preference_contract_invalid');
            throw $this->reviewRequired('La contratación persistida no permite verificar el pago.');
        }
        $firstPreference = $this->validatedPreference($enrollment, $attempt, $stored['offer']);
        $results = [];
        $merchantOrders = [];
        $merchantOrderPaymentIds = [];
        $readPaymentIds = function () use ($enrollmentId, $attempt): array {
            $ids = [];
            foreach ($this->enrollments->paymentIdsForEnrollment($enrollmentId) as $storedPayment) {
                if ((int) ($storedPayment['checkout_attempt_id'] ?? 0) !== (int) $attempt['id']) {
                    throw $this->reviewRequired('Un pago persistido no pertenece a la preferencia activa.');
                }
                $ids[] = (string) $storedPayment['mp_payment_id'];
            }
            return $ids;
        };
        $scanEnrollment = $enrollment;
        $scanEnrollment['checkout_references'] = [(string) $attempt['external_reference']];
        $scanEnrollment['checkout_subscription_ids'] = [];
        try {
            $scan = new ReconciliationScan(
                $this->mercadoPago->reconciliationSearch(),
                function (string $topic, string $paymentId) use (
                    $enrollment,
                    $attempt,
                    $firstPreference,
                    &$merchantOrders,
                    &$merchantOrderPaymentIds,
                    &$results
                ): bool {
                    if ($topic !== 'payment') {
                        return false;
                    }
                    $payment = $this->mercadoPago->getPayment($paymentId);
                    $merchantOrder = null;
                    $merchantOrderId = CheckoutPaymentVerification::merchantOrderId($payment);
                    if ($merchantOrderId !== null) {
                        if (!isset($merchantOrders[$merchantOrderId])) {
                            $merchantOrders[$merchantOrderId] = $this->mercadoPago->getMerchantOrder($merchantOrderId);
                        }
                        $merchantOrder = $merchantOrders[$merchantOrderId];
                        foreach (CheckoutPaymentVerification::merchantOrderPaymentIds($merchantOrder) as $relatedId) {
                            $merchantOrderPaymentIds[$relatedId] = true;
                        }
                    }
                    $results[$paymentId] = $this->verifyAndPersistPayment(
                        $enrollment,
                        $attempt,
                        $firstPreference['resource'],
                        $payment,
                        null,
                        $merchantOrder
                    );
                    return true;
                },
                $readPaymentIds
            );
            $snapshot = $scan->run(
                $scanEnrollment,
                $this->config->mercadoPagoCredentialEnvironment()
            );
        } catch (HttpException $exception) {
            throw $exception;
        } catch (Throwable) {
            throw new HttpException(
                503,
                'payment_retry_unavailable',
                'No pudimos comprobar todos los pagos de esta inscripción. Intenta nuevamente.',
                true,
                'same_idempotency_key'
            );
        }
        if (($snapshot['complete'] ?? false) !== true) {
            throw new HttpException(
                503,
                'payment_retry_unavailable',
                'No pudimos comprobar todos los pagos de esta inscripción. Intenta nuevamente.',
                true,
                'same_idempotency_key'
            );
        }
        $expectedPaymentIds = array_values(array_map('strval', $snapshot['payment_ids'] ?? []));
        sort($expectedPaymentIds, SORT_STRING);
        $resultPaymentIds = array_keys($results);
        sort($resultPaymentIds, SORT_STRING);
        if ($expectedPaymentIds !== $resultPaymentIds) {
            throw $this->reviewRequired('La búsqueda completa no coincide con los pagos verificados.');
        }
        $orderPaymentIds = array_keys($merchantOrderPaymentIds);
        sort($orderPaymentIds, SORT_STRING);
        if (array_diff($orderPaymentIds, $expectedPaymentIds) !== []) {
            throw new HttpException(
                503,
                'payment_retry_unavailable',
                'La orden comercial contiene pagos que todavía no aparecen en la búsqueda completa. Intenta nuevamente.',
                true,
                'same_idempotency_key'
            );
        }

        $accredited = array_values(array_filter(
            $results,
            static fn (array $result): bool => $result['accredited'] === true
        ));
        $pending = array_values(array_filter(
            $results,
            static fn (array $result): bool => $result['pending'] === true
        ));
        if ($accredited !== []) {
            if (count($accredited) !== 1
                || $pending !== []
                || $this->enrollments->countVerifiedAccreditedPayments($enrollmentId) !== 1
            ) {
                $this->markRetryReview($enrollment, $attempt, 'duplicate_payment_detected', 'approved');
                throw $this->reviewRequired('La preferencia contiene más de un pago acreditado.');
            }
            $this->applyPreferencePaymentState($enrollment, $accredited[0]);
            throw new HttpException(
                409,
                'payment_already_received',
                'Encontramos un pago acreditado para esta inscripción. Consulta su estado.',
                false,
                'status_only'
            );
        }
        if ($pending !== []) {
            if (count($pending) !== 1) {
                $this->markRetryReview($enrollment, $attempt, 'multiple_pending_payments');
                throw $this->reviewRequired('La preferencia contiene más de un pago en proceso.');
            }
            $this->applyPreferencePaymentState($enrollment, $pending[0]);
            throw new HttpException(
                409,
                'payment_confirmation_pending',
                'Mercado Pago mantiene un pago en confirmación para esta inscripción.',
                false,
                'status_only'
            );
        }
        foreach ($results as $result) {
            if ($result['rejected'] !== true) {
                throw $this->reviewRequired('La preferencia contiene un movimiento no terminal.');
            }
        }
        if ((string) ($enrollment['status'] ?? '') === 'payment_rejected' && $results === []) {
            throw $this->reviewRequired('El rechazo local no tiene un pago remoto verificable.');
        }
        if ((string) ($enrollment['status'] ?? '') === 'payment_pending' && $results === []) {
            throw new HttpException(
                503,
                'payment_retry_unavailable',
                'El pago figura pendiente, pero todavía no aparece en la verificación completa.',
                true,
                'same_idempotency_key'
            );
        }

        $finalPreference = $this->validatedPreference($enrollment, $attempt, $stored['offer']);
        $decision = $this->enrollments->preferenceRetryDecision(
            $enrollmentId,
            (int) $attempt['id'],
            $resultPaymentIds
        );
        if ($decision['ready'] !== true) {
            if ($decision['reason'] === 'initial_payment_confirmed') {
                throw new HttpException(
                    409,
                    'payment_already_received',
                    'Esta inscripción ya tiene un pago inicial confirmado.',
                    false,
                    'status_only'
                );
            }
            if ($decision['reason'] === 'payment_set_changed') {
                throw new HttpException(
                    503,
                    'payment_retry_unavailable',
                    'Los pagos cambiaron durante la verificación. Vuelve a consultar antes de continuar.',
                    true,
                    'same_idempotency_key'
                );
            }
            if ($decision['reason'] === 'payment_not_terminal_rejected') {
                throw new HttpException(
                    409,
                    'payment_confirmation_pending',
                    'Mercado Pago mantiene actividad financiera en confirmación para esta inscripción.',
                    false,
                    'status_only'
                );
            }
            throw $this->reviewRequired('La decisión final de la preferencia bloqueó el reintento.');
        }
        $digests = array_map(
            static fn (string $paymentId): string => hash('sha256', $paymentId),
            $resultPaymentIds
        );
        sort($digests, SORT_STRING);
        $this->persistPhaseEvidence($enrollment, (int) $attempt['id'], 'preference-resume', [
            'schema' => 'dgym-preference-resume-evidence/1',
            'environment' => $this->config->mercadoPagoCredentialEnvironment(),
            'verified_at' => $this->verifiedAt(),
            'search_passes' => 2,
            'preference_reads' => 2,
            'payment_id_digests' => $digests,
            'result' => $results === [] ? 'no_payment_found' : 'only_rejected_payments',
        ]);
        return $this->success($reference, $finalPreference['validated']['checkout_url'], 200);
    }

    /** @param array<string,mixed> $offer @return array{resource:array<string,mixed>,validated:array<string,mixed>} */
    private function validatedPreference(array $enrollment, array $attempt, array $offer): array
    {
        try {
            $expectedId = trim((string) ($attempt['resource_id'] ?? ''));
            if ($expectedId === '') {
                throw new RuntimeException('La preferencia persistida no tiene identificador.');
            }
            $preference = $this->mercadoPago->getPreference($expectedId);
            $this->assertPreferenceActive($preference);
            $validated = CheckoutResponseValidator::validate(
                'preference',
                $preference,
                $offer,
                (string) $attempt['external_reference'],
                $this->config->useSandboxCheckoutUrl(),
                $this->config->mercadoPagoSellerId(),
                $this->config->mercadoPagoApplicationId()
            );
            if (!hash_equals($expectedId, (string) $validated['resource_id'])) {
                throw new RuntimeException('La preferencia consultada no coincide con el intento.');
            }
            return ['resource' => $preference, 'validated' => $validated];
        } catch (MercadoPagoApiException $exception) {
            throw $exception;
        } catch (Throwable) {
            $this->markRetryReview($enrollment, $attempt, 'preference_checkout_mismatch');
            throw $this->reviewRequired('La preferencia remota no coincide con la inscripción.');
        }
    }

    /** @param array<string,mixed> $preference */
    private function assertPreferenceActive(array $preference): void
    {
        if (!array_key_exists('expires', $preference)) {
            return;
        }
        if (!is_bool($preference['expires'])) {
            throw new RuntimeException('La vigencia de la preferencia no es verificable.');
        }
        if ($preference['expires'] === false) {
            return;
        }
        $fromValue = $preference['expiration_date_from'] ?? null;
        $toValue = $preference['expiration_date_to'] ?? null;
        if ($this->mysqlDate($fromValue) === null || $this->mysqlDate($toValue) === null) {
            throw new RuntimeException('La vigencia de la preferencia no es verificable.');
        }
        try {
            $now = new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
            $from = new \DateTimeImmutable((string) $fromValue);
            $to = new \DateTimeImmutable((string) $toValue);
        } catch (Throwable) {
            throw new RuntimeException('La vigencia de la preferencia no es verificable.');
        }
        if ($now < $from || $now >= $to) {
            throw new RuntimeException('La preferencia ya no está vigente.');
        }
    }

    /** @param array{payment_id:string,status:string,status_detail:string} $payment */
    private function applyPreferencePaymentState(array $enrollment, array $payment): void
    {
        $transition = PaymentTransition::decide(
            'preference',
            $payment['status'],
            $payment['status_detail'],
            0,
            true,
            false,
            trim((string) ($enrollment['initial_payment_confirmed_at'] ?? '')) !== '',
            (string) $enrollment['status'],
            (string) $enrollment['membership_status']
        );
        $this->enrollments->updateGatewayState((int) $enrollment['id'], [
            'status' => $transition['internal_status'],
            'membership_status' => $transition['membership_status'],
            'payment_status' => $transition['payment_status'],
            'mp_last_payment_id' => $payment['payment_id'],
            'error_code' => $transition['error_code'],
        ]);
        $this->enrollments->reconcileInitialPayment((int) $enrollment['id']);
    }

    /** @return array{http_status:int,body:array<string,mixed>} */
    private function resumeActiveAttempt(int $enrollmentId, string $reference, array $retry): array
    {
        $enrollment = $this->requiredEnrollment($enrollmentId);
        if ((int) ($enrollment['active_checkout_attempt_id'] ?? 0) !== (int) $retry['id']
            || !hash_equals((string) ($retry['resource_id'] ?? ''), (string) ($enrollment['mp_subscription_id'] ?? ''))
        ) {
            $this->markRetryReview($enrollment, $retry, 'active_retry_enrollment_mismatch');
            throw $this->reviewRequired('El retry activo no coincide con la inscripción.');
        }
        $request = $this->requests->buildStoredSubscription(
            $enrollment,
            (string) $retry['external_reference'],
            (string) $enrollment['reference']
        );
        $facts = $this->freshFinancialCheck($enrollment, [
            (int) $retry['id'] => ['pending', 'authorized', 'canceled', 'cancelled'],
        ]);
        if (isset($facts['rejected_attempts'][(int) $retry['id']])
            || in_array((string) ($enrollment['status'] ?? ''), ['payment_rejected', 'subscription_canceled'], true)
        ) {
            throw new HttpException(
                409,
                'payment_retry_cycle_finished',
                'El intento anterior ya terminó. Inicia un nuevo reintento con el mismo u otro medio de pago.',
                false,
                'new_idempotency_key'
            );
        }
        $subscription = $this->subscriptionFact($facts, (int) $retry['id']);
        $providerStatus = strtolower(trim((string) ($subscription['status'] ?? '')));
        if (in_array($providerStatus, ['canceled', 'cancelled'], true)) {
            $this->enrollments->updateCheckoutAttemptGatewayStatus((int) $retry['id'], $providerStatus);
            $this->enrollments->updateGatewayState($enrollmentId, [
                'status' => 'subscription_canceled',
                'subscription_status' => $providerStatus,
                'membership_status' => 'manual_review',
                'error_code' => null,
            ]);
            throw new HttpException(
                409,
                'payment_retry_cycle_finished',
                'El intento terminó sin pago. Puedes iniciar un nuevo reintento desde el estado de tu inscripción.',
                false,
                'new_idempotency_key'
            );
        }
        if ($providerStatus === 'authorized') {
            $this->enrollments->updateCheckoutAttemptGatewayStatus((int) $retry['id'], $providerStatus);
            $this->enrollments->updateGatewayState($enrollmentId, [
                'status' => 'subscription_authorized',
                'subscription_status' => 'authorized',
                'error_code' => null,
            ]);
            $this->enrollments->reconcileInitialPayment($enrollmentId);
            throw new HttpException(
                409,
                'payment_authorization_pending',
                'La suscripción fue autorizada y estamos confirmando el pago. No reemplazaremos el checkout de esta inscripción.',
                false,
                'status_only'
            );
        }
        if ($providerStatus !== 'pending') {
            $this->markRetryReview($enrollment, $retry, 'active_retry_not_pending');
            throw $this->reviewRequired('El checkout activo ya no está pendiente.');
        }
        $validated = $this->validateRetryCheckout($enrollment, $retry, $request['offer'], $subscription);
        return $this->success($reference, $validated['checkout_url'], 200);
    }

    /** @return array{http_status:int,body:array<string,mixed>} */
    private function cancelOldAttempt(array $enrollment, array $old, array $retry, array $knownSubscription): array
    {
        // Se vuelve a construir para cubrir operaciones adoptadas por una clave
        // distinta después de una interrupción del navegador.
        $this->requests->buildStoredSubscription(
            $enrollment,
            (string) $retry['external_reference'],
            (string) $enrollment['reference']
        );
        $this->assertSubscription(
            $enrollment,
            $old,
            $knownSubscription,
            ['pending', 'authorized', 'canceled', 'cancelled']
        );
        $status = strtolower(trim((string) ($knownSubscription['status'] ?? '')));
        $putException = null;
        if (!in_array($status, ['canceled', 'cancelled'], true)) {
            $this->mercadoPago->assertMutationBudget();
            try {
                $this->mercadoPago->cancelSubscription((string) $old['resource_id']);
            } catch (MercadoPagoApiException $exception) {
                // Incluso un 4xx definitivo puede llegar después de que el
                // proveedor aplicó la cancelación. Solo el GET decide.
                $putException = $exception;
            }
        }

        try {
            $confirmed = $this->mercadoPago->getSubscription((string) $old['resource_id']);
        } catch (MercadoPagoApiException|ReadBudgetExceeded) {
            $target = $putException !== null && !$putException->outcomeUncertain
                ? 'cancel_failed'
                : 'cancel_uncertain';
            $this->enrollments->transitionPaymentRetryAttempt(
                (int) $retry['id'],
                ['awaiting_cancellation', 'cancel_uncertain'],
                $target
            );
            if ($target === 'cancel_uncertain') {
                return $this->continueResponse((string) $enrollment['reference']);
            }
            $this->markEnrollmentReview($enrollment, 'payment_retry_cancel_failed');
            throw new HttpException(
                503,
                'payment_retry_unavailable',
                'Mercado Pago no permitió cerrar el intento anterior.',
                false,
                'status_only'
            );
        }
        $this->assertSubscription(
            $enrollment,
            $old,
            $confirmed,
            ['pending', 'authorized', 'canceled', 'cancelled']
        );

        $providerStatus = strtolower(trim((string) ($confirmed['status'] ?? '')));
        if (!in_array($providerStatus, ['canceled', 'cancelled'], true)) {
            $target = $putException !== null && !$putException->outcomeUncertain
                ? 'cancel_failed'
                : 'cancel_uncertain';
            $this->enrollments->transitionPaymentRetryAttempt(
                (int) $retry['id'],
                ['awaiting_cancellation', 'cancel_uncertain'],
                $target
            );
            if ($target === 'cancel_uncertain') {
                return $this->continueResponse((string) $enrollment['reference']);
            }
            $this->markEnrollmentReview($enrollment, 'payment_retry_cancel_failed');
            throw new HttpException(
                503,
                'payment_retry_unavailable',
                'El intento anterior continúa abierto en Mercado Pago.',
                false,
                'status_only'
            );
        }

        $facts = $this->freshFinancialCheck($enrollment, [
            (int) $old['id'] => ['canceled', 'cancelled'],
        ]);
        $this->persistPhaseEvidence(
            $enrollment,
            (int) $retry['id'],
            'cancellation-confirmed',
            $facts['evidence']
        );
        $this->enrollments->markPaymentRetryReadyToCreate(
            (int) $retry['id'],
            (int) $old['id'],
            $providerStatus
        );
        // Fase 1: la creación siempre ocurre en una llamada posterior.
        return $this->continueResponse((string) $enrollment['reference']);
    }

    /** @return array{http_status:int,body:array<string,mixed>} */
    private function createNewAttempt(array $enrollment, array $retry, array $request): array
    {
        try {
            $created = $this->mercadoPago->createCheckout(
                'subscription',
                $request['payload'],
                (string) $retry['remote_idempotency_key']
            );
        } catch (ReadBudgetExceeded) {
            // assertMutationBudget se ejecutó antes del CAS; si aun así el
            // presupuesto se agotó antes del transporte, el POST no comenzó.
            $this->enrollments->transitionPaymentRetryAttempt(
                (int) $retry['id'],
                ['creating'],
                'ready_to_create'
            );
            return $this->continueResponse((string) $enrollment['reference']);
        } catch (MercadoPagoApiException $exception) {
            $this->enrollments->transitionPaymentRetryAttempt(
                (int) $retry['id'],
                ['creating'],
                $exception->outcomeUncertain ? 'creation_uncertain' : 'creation_failed'
            );
            if ($exception->outcomeUncertain) {
                return $this->continueResponse((string) $enrollment['reference']);
            }
            $this->markEnrollmentReview($enrollment, 'payment_retry_creation_failed');
            throw new HttpException(
                503,
                'payment_retry_unavailable',
                'Mercado Pago no pudo crear el nuevo intento.',
                false,
                'status_only'
            );
        } catch (Throwable) {
            $this->enrollments->transitionPaymentRetryAttempt((int) $retry['id'], ['creating'], 'creation_uncertain');
            return $this->continueResponse((string) $enrollment['reference']);
        }
        return $this->confirmNewAttempt($enrollment, $retry, $request['offer'], $created);
    }

    /** @return array{http_status:int,body:array<string,mixed>} */
    private function reconcileNewAttempt(array $enrollment, array $retry, array $request): array
    {
        try {
            $matches = $this->mercadoPago->searchCheckout(
                'subscription',
                (string) $retry['external_reference'],
                (string) $enrollment['email'],
                (int) $enrollment['checkout_amount']
            );
        } catch (Throwable) {
            return $this->continueResponse((string) $enrollment['reference']);
        }
        if (count($matches) === 0) {
            $retryState = (string) ($retry['lifecycle_status'] ?? '');
            if (in_array($retryState, ['creating', 'creation_uncertain'], true)) {
                $miss = $this->enrollments->recordPaymentRetryReconciliationMiss((int) $retry['id']);
                $missLimit = $retryState === 'creating' ? 3 : 6;
                $minimumAge = $retryState === 'creating' ? 120 : 600;
                if (is_array($miss)
                    && in_array($miss['state'], ['creating', 'creation_uncertain'], true)
                    && $miss['count'] >= $missLimit
                    && $miss['age_seconds'] >= $minimumAge
                ) {
                    $this->enrollments->transitionPaymentRetryAttempt(
                        (int) $retry['id'],
                        [$miss['state']],
                        'review_required'
                    );
                    $this->markEnrollmentReview($enrollment, 'payment_retry_creation_not_observed');
                    throw $this->reviewRequired('No apareció un checkout después de iniciar la creación.');
                }
            }
            return $this->continueResponse((string) $enrollment['reference']);
        }
        if (count($matches) !== 1) {
            $this->enrollments->transitionPaymentRetryAttempt(
                (int) $retry['id'],
                ['creating', 'creation_uncertain'],
                'review_required'
            );
            $this->markEnrollmentReview($enrollment, 'payment_retry_multiple_checkouts');
            throw $this->reviewRequired('Mercado Pago devolvió más de un checkout para el reintento.');
        }
        return $this->confirmNewAttempt($enrollment, $retry, $request['offer'], $matches[0]);
    }

    /** @return array{http_status:int,body:array<string,mixed>} */
    private function confirmNewAttempt(array $enrollment, array $retry, array $offer, array $resource): array
    {
        try {
            $post = CheckoutResponseValidator::validate(
                'subscription',
                $resource,
                $offer,
                (string) $retry['external_reference'],
                $this->config->useSandboxCheckoutUrl(),
                $this->config->mercadoPagoSellerId(),
                $this->config->mercadoPagoApplicationId()
            );
            $fresh = $this->mercadoPago->getSubscription($post['resource_id']);
            $confirmed = $this->validateRetryCheckout($enrollment, $retry, $offer, $fresh);
            if (!hash_equals($post['resource_id'], $confirmed['resource_id'])) {
                throw new RuntimeException('Mercado Pago devolvió recursos inconsistentes.');
            }
            $this->persistPhaseEvidence(
                $enrollment,
                (int) $retry['id'],
                'checkout-confirmed',
                [
                    'schema' => 'dgym-payment-retry-checkout-confirmation/1',
                    'environment' => $this->config->mercadoPagoCredentialEnvironment(),
                    'verified_at' => $this->verifiedAt(),
                    'attempt_id' => (int) $retry['id'],
                    'subscription_status' => 'pending',
                    'resource_id_digest' => hash('sha256', $confirmed['resource_id']),
                    'result' => 'checkout_confirmed',
                ]
            );
            $this->enrollments->recordPaymentRetryResource(
                (int) $retry['id'],
                $confirmed['resource_id'],
                $confirmed['checkout_url'],
                $confirmed['initial_gateway_status']
            );
            // Fase 2: el recurso queda confirmed, sin activarlo ni exponerlo.
            return $this->continueResponse((string) $enrollment['reference']);
        } catch (ReadBudgetExceeded) {
            // El POST pudo terminar; se buscará por referencia con la misma
            // clave en otra llamada y nunca se repetirá automáticamente.
            $this->enrollments->transitionPaymentRetryAttempt(
                (int) $retry['id'],
                ['creating'],
                'creation_uncertain'
            );
            return $this->continueResponse((string) $enrollment['reference']);
        } catch (MercadoPagoApiException) {
            $this->enrollments->transitionPaymentRetryAttempt(
                (int) $retry['id'],
                ['creating'],
                'creation_uncertain'
            );
            return $this->continueResponse((string) $enrollment['reference']);
        } catch (Throwable) {
            $this->enrollments->transitionPaymentRetryAttempt(
                (int) $retry['id'],
                ['creating', 'creation_uncertain'],
                'review_required'
            );
            $this->markEnrollmentReview($enrollment, 'payment_retry_checkout_verification_failed');
            throw $this->reviewRequired('No se pudo verificar el nuevo checkout.');
        }
    }

    /** @return array{http_status:int,body:array<string,mixed>} */
    private function activateConfirmedAttempt(array $enrollment, array $old, array $retry): array
    {
        $request = $this->requests->buildStoredSubscription(
            $enrollment,
            (string) $retry['external_reference'],
            (string) $enrollment['reference']
        );
        // Fase 3: vuelve a conciliar tanto el checkout cancelado como el nuevo
        // después del POST y antes del CAS que cambia el intento activo.
        $facts = $this->freshFinancialCheck($enrollment, [
            (int) $old['id'] => ['canceled', 'cancelled'],
            (int) $retry['id'] => ['pending'],
        ]);
        $this->persistPhaseEvidence(
            $enrollment,
            (int) $retry['id'],
            'activation-precheck',
            $facts['evidence']
        );
        if (isset($facts['rejected_attempts'][(int) $retry['id']])) {
            $this->markRetryReview($enrollment, $retry, 'new_retry_rejected_before_activation');
            throw $this->reviewRequired('El nuevo intento fue rechazado antes de activarse.');
        }
        $subscription = $this->subscriptionFact($facts, (int) $retry['id']);
        $validated = $this->validateRetryCheckout($enrollment, $retry, $request['offer'], $subscription);
        try {
            $this->enrollments->activatePaymentRetryAttempt((int) $enrollment['id'], (int) $retry['id']);
        } catch (Throwable) {
            $this->markRetryReview($enrollment, $retry, 'payment_retry_activation_failed');
            throw $this->reviewRequired('La inscripción cambió antes de activar el checkout nuevo.');
        }
        $activeEnrollment = $this->requiredEnrollment((int) $enrollment['id']);
        if ((int) ($activeEnrollment['active_checkout_attempt_id'] ?? 0) !== (int) $retry['id']
            || !hash_equals((string) $retry['resource_id'], (string) ($activeEnrollment['mp_subscription_id'] ?? ''))
            || !in_array(
                (string) ($activeEnrollment['status'] ?? ''),
                ['checkout_ready', 'subscription_pending'],
                true
            )
        ) {
            $this->markRetryReview($activeEnrollment, $retry, 'payment_retry_active_state_mismatch');
            throw $this->reviewRequired('No se pudo comprobar el intento activo.');
        }
        return $this->success((string) $enrollment['reference'], $validated['checkout_url'], 200);
    }

    /**
     * Hace una lectura remota completa y estable de todos los intentos. Cada
     * pago descubierto se atribuye por recurso o factura, se valida y se
     * persiste sin guardar el payload crudo del proveedor.
     *
     * @param array<int,list<string>> $expectedSubscriptionStatuses
     * @return array{subscriptions:array<int,array<string,mixed>>,rejected_attempts:array<int,true>,evidence:array<string,mixed>}
     */
    private function freshFinancialCheck(array $enrollment, array $expectedSubscriptionStatuses): array
    {
        $enrollmentId = (int) $enrollment['id'];
        $this->assertLocallyEligible($this->requiredEnrollment($enrollmentId), true);
        $attempts = $this->enrollments->checkoutAttemptReferences($enrollmentId);
        if ($attempts === [] || count($attempts) > 10) {
            throw $this->reviewRequired('La cantidad de intentos no permite una conciliación acotada.');
        }

        $attemptsById = [];
        $subscriptions = [];
        $evidenceAttempts = [];
        foreach ($attempts as $attempt) {
            $attemptId = (int) $attempt['id'];
            $attemptsById[$attemptId] = $attempt;
            $evidenceAttempts[$attemptId] = [
                'attempt_id' => $attemptId,
                'subscription_status' => null,
                'payment_id_digests' => [],
                'invoice_id_digests' => [],
            ];
            if ((string) ($attempt['checkout_type'] ?? '') !== 'subscription') {
                throw $this->reviewRequired('El historial contiene otro tipo de checkout.');
            }
            $resourceId = trim((string) ($attempt['resource_id'] ?? ''));
            if ($resourceId === '') {
                continue;
            }
            $subscription = $this->mercadoPago->getSubscription($resourceId);
            $this->assertSubscription(
                $enrollment,
                $attempt,
                $subscription,
                ['pending', 'authorized', 'paused', 'canceled', 'cancelled']
            );
            $subscriptions[$attemptId] = $subscription;
            $evidenceAttempts[$attemptId]['subscription_status'] = strtolower(
                trim((string) ($subscription['status'] ?? ''))
            );
        }

        $search = $this->mercadoPago->reconciliationSearch();
        try {
            $created = new \DateTimeImmutable((string) $enrollment['created_at'], new \DateTimeZone('UTC'));
        } catch (Throwable) {
            throw $this->reviewRequired('La fecha de inscripción no es verificable.');
        }
        $begin = $created->modify('-1 day')->format('Y-m-d\TH:i:s.v\Z');
        $end = (new \DateTimeImmutable('tomorrow', new \DateTimeZone('UTC')))->format('Y-m-d\TH:i:s.v\Z');
        $firstSearches = [];
        $invoiceByPayment = [];
        $paymentIdsByAttempt = [];
        $rejectedAttempts = [];
        $accreditedPayments = [];
        $pendingPayments = [];

        // Las facturas se leen primero: son la prueba alternativa cuando el
        // GET de payment no expone un preapproval_id nativo.
        foreach ($attempts as $attempt) {
            $attemptId = (int) $attempt['id'];
            $resourceId = trim((string) ($attempt['resource_id'] ?? ''));
            if ($resourceId === '') {
                continue;
            }
            $invoiceSearch = $search->authorizedPayments($resourceId);
            $firstSearches['invoice:' . $attemptId] = $invoiceSearch;
            foreach (array_keys($invoiceSearch) as $invoiceId) {
                $evidenceAttempts[$attemptId]['invoice_id_digests'][] = hash('sha256', (string) $invoiceId);
                $invoice = $this->mercadoPago->getAuthorizedPayment((string) $invoiceId);
                $invoiceFacts = $this->validateInvoice(
                    $enrollment,
                    $attempt,
                    $invoice,
                    (string) $invoiceId
                );
                if ($invoiceFacts['payment_id'] !== null) {
                    $paymentId = $invoiceFacts['payment_id'];
                    $evidenceAttempts[$attemptId]['payment_id_digests'][] = hash('sha256', $paymentId);
                    if (isset($invoiceByPayment[$paymentId])) {
                        $this->markRetryReview($enrollment, $attempt, 'payment_linked_to_multiple_invoices');
                        throw $this->reviewRequired('Un pago aparece en más de una factura.');
                    }
                    $invoiceByPayment[$paymentId] = [
                        'attempt_id' => $attemptId,
                        'invoice' => $invoice,
                    ];
                    $paymentIdsByAttempt[$attemptId][$paymentId] = true;
                } elseif ($invoiceFacts['rejected']) {
                    $rejectedAttempts[$attemptId] = true;
                } else {
                    $this->markRetryReview($enrollment, $attempt, 'invoice_without_verifiable_payment');
                    throw $this->reviewRequired('Hay una factura sin pago verificable.');
                }
            }
        }

        foreach ($attempts as $attempt) {
            $attemptId = (int) $attempt['id'];
            $attemptReference = (string) $attempt['external_reference'];
            $payments = $search->payments($attemptReference, $begin, $end);
            $firstSearches['payment:' . $attemptId] = $payments;
            foreach (array_keys($payments) as $paymentId) {
                $evidenceAttempts[$attemptId]['payment_id_digests'][] = hash('sha256', (string) $paymentId);
                $paymentIdsByAttempt[$attemptId][(string) $paymentId] = true;
            }
        }

        foreach ($this->enrollments->paymentIdsForEnrollment($enrollmentId) as $storedPayment) {
            $attemptId = $storedPayment['checkout_attempt_id'];
            if ($attemptId === null || !isset($attemptsById[$attemptId])) {
                throw $this->reviewRequired('Un pago persistido no tiene intento atribuible.');
            }
            $paymentIdsByAttempt[$attemptId][$storedPayment['mp_payment_id']] = true;
            $evidenceAttempts[$attemptId]['payment_id_digests'][] = hash(
                'sha256',
                $storedPayment['mp_payment_id']
            );
        }

        $seenPaymentIds = [];
        foreach ($paymentIdsByAttempt as $attemptId => $ids) {
            $attempt = $attemptsById[$attemptId] ?? null;
            $subscription = $subscriptions[$attemptId] ?? null;
            if (!is_array($attempt) || !is_array($subscription)) {
                throw $this->reviewRequired('Un pago no tiene suscripción verificable.');
            }
            foreach (array_keys($ids) as $paymentId) {
                if (isset($seenPaymentIds[$paymentId]) && $seenPaymentIds[$paymentId] !== $attemptId) {
                    $this->markRetryReview($enrollment, $attempt, 'payment_discovered_in_multiple_attempts');
                    throw $this->reviewRequired('Un pago aparece en más de un intento.');
                }
                $seenPaymentIds[$paymentId] = $attemptId;
                $invoiceEntry = $invoiceByPayment[$paymentId] ?? null;
                if (is_array($invoiceEntry) && (int) $invoiceEntry['attempt_id'] !== $attemptId) {
                    $this->markRetryReview($enrollment, $attempt, 'payment_invoice_attempt_mismatch');
                    throw $this->reviewRequired('La factura del pago pertenece a otro intento.');
                }
                $payment = $this->mercadoPago->getPayment((string) $paymentId);
                $result = $this->verifyAndPersistPayment(
                    $enrollment,
                    $attempt,
                    $subscription,
                    $payment,
                    is_array($invoiceEntry) ? $invoiceEntry['invoice'] : null
                );
                if ($result['rejected']) {
                    $rejectedAttempts[$attemptId] = true;
                }
                if ($result['accredited']) {
                    $accreditedPayments[$attemptId][(string) $result['payment_id']] = true;
                }
                if ($result['pending']) {
                    $pendingPayments[$attemptId][(string) $result['payment_id']] = [
                        'status' => $result['status'],
                        'status_detail' => $result['status_detail'],
                    ];
                }
            }
        }

        // Una segunda búsqueda detecta cobros que hayan aparecido durante el
        // recorrido; en ese caso se detiene el retry y se concilia de nuevo.
        foreach ($attempts as $attempt) {
            $attemptId = (int) $attempt['id'];
            $attemptReference = (string) $attempt['external_reference'];
            if (($firstSearches['payment:' . $attemptId] ?? null)
                !== $search->payments($attemptReference, $begin, $end)
            ) {
                throw $this->reviewRequired('Los pagos cambiaron durante la verificación.');
            }
            $resourceId = trim((string) ($attempt['resource_id'] ?? ''));
            if ($resourceId !== ''
                && ($firstSearches['invoice:' . $attemptId] ?? null)
                    !== $search->authorizedPayments($resourceId)
            ) {
                throw $this->reviewRequired('Las facturas cambiaron durante la verificación.');
            }
        }

        // No se decide con el GET tomado antes de recorrer pagos. Cada
        // suscripción se relee al final; en particular la vieja debe seguir
        // cancelada y la nueva pendiente inmediatamente antes del CAS.
        foreach ($attempts as $attempt) {
            $attemptId = (int) $attempt['id'];
            $resourceId = trim((string) ($attempt['resource_id'] ?? ''));
            if ($resourceId === '') {
                continue;
            }
            $subscription = $this->mercadoPago->getSubscription($resourceId);
            $this->assertSubscription(
                $enrollment,
                $attempt,
                $subscription,
                ['pending', 'authorized', 'paused', 'canceled', 'cancelled']
            );
            $subscriptions[$attemptId] = $subscription;
            $evidenceAttempts[$attemptId]['subscription_status'] = strtolower(
                trim((string) ($subscription['status'] ?? ''))
            );
        }

        foreach ($expectedSubscriptionStatuses as $attemptId => $allowedStatuses) {
            $attempt = $attemptsById[(int) $attemptId] ?? null;
            $subscription = $subscriptions[(int) $attemptId] ?? null;
            if (!is_array($attempt) || !is_array($subscription)) {
                throw $this->reviewRequired('Falta una suscripción requerida para el retry.');
            }
            $status = strtolower(trim((string) ($subscription['status'] ?? '')));
            if (!in_array($status, $allowedStatuses, true)) {
                $this->markRetryReview($enrollment, $attempt, 'unexpected_subscription_status');
                throw $this->reviewRequired('La suscripción cambió a un estado inesperado.');
            }
        }
        foreach ($subscriptions as $attemptId => $subscription) {
            if (array_key_exists($attemptId, $expectedSubscriptionStatuses)) {
                continue;
            }
            $status = strtolower(trim((string) ($subscription['status'] ?? '')));
            if (!in_array($status, ['canceled', 'cancelled'], true)) {
                $attempt = $attemptsById[$attemptId];
                $this->markRetryReview($enrollment, $attempt, 'historical_subscription_still_open');
                throw $this->reviewRequired('Una suscripción histórica continúa abierta.');
            }
        }

        if ($accreditedPayments !== []) {
            $this->resolveAccreditedPaymentBeforeRetry(
                $this->requiredEnrollment($enrollmentId),
                $attemptsById,
                $subscriptions,
                $accreditedPayments
            );
        }
        if ($pendingPayments !== []) {
            $this->resolvePendingPaymentBeforeRetry(
                $this->requiredEnrollment($enrollmentId),
                $attemptsById,
                $subscriptions,
                $pendingPayments
            );
        }

        $this->assertLocallyEligible($this->requiredEnrollment($enrollmentId), true);
        foreach ($evidenceAttempts as &$evidenceAttempt) {
            $evidenceAttempt['payment_id_digests'] = array_values(array_unique($evidenceAttempt['payment_id_digests']));
            sort($evidenceAttempt['payment_id_digests'], SORT_STRING);
            $evidenceAttempt['invoice_id_digests'] = array_values(array_unique($evidenceAttempt['invoice_id_digests']));
            sort($evidenceAttempt['invoice_id_digests'], SORT_STRING);
        }
        unset($evidenceAttempt);
        ksort($evidenceAttempts, SORT_NUMERIC);
        return [
            'subscriptions' => $subscriptions,
            'rejected_attempts' => $rejectedAttempts,
            'evidence' => [
                'schema' => 'dgym-payment-retry-financial-check/1',
                'environment' => $this->config->mercadoPagoCredentialEnvironment(),
                'verified_at' => $this->verifiedAt(),
                'search_passes' => 2,
                'subscription_reads' => 2,
                'attempts' => array_values($evidenceAttempts),
                'result' => 'no_blocking_financial_evidence',
            ],
        ];
    }

    /**
     * @return array{payment_id:?string,rejected:bool}
     */
    private function validateInvoice(array $enrollment, array $attempt, array $invoice, string $requestedId): array
    {
        $id = trim((string) ($invoice['id'] ?? ''));
        $resourceId = trim((string) ($attempt['resource_id'] ?? ''));
        $reference = (string) $attempt['external_reference'];
        $status = strtolower(trim((string) ($invoice['status'] ?? '')));
        $embedded = $invoice['payment'] ?? null;
        $paymentId = is_array($embedded) ? trim((string) ($embedded['id'] ?? '')) : null;
        $validPaymentId = $paymentId === null || $paymentId === ''
            || preg_match('/^[A-Za-z0-9_-]{1,160}$/D', $paymentId) === 1;
        if (preg_match('/^[A-Za-z0-9_-]{1,160}$/D', $id) !== 1
            || !hash_equals($requestedId, $id)
            || !hash_equals($resourceId, trim((string) ($invoice['preapproval_id'] ?? '')))
            || (array_key_exists('external_reference', $invoice)
                && !hash_equals($reference, trim((string) $invoice['external_reference'])))
            || $status === ''
            || !is_numeric($invoice['transaction_amount'] ?? null)
            || abs((float) $invoice['transaction_amount'] - (float) $enrollment['checkout_amount']) > 0.001
            || (string) ($invoice['currency_id'] ?? '') !== (string) $enrollment['currency']
            || !$validPaymentId
        ) {
            $this->markRetryReview($enrollment, $attempt, 'invalid_authorized_payment');
            throw $this->reviewRequired('La factura no acredita el intento exacto.');
        }
        foreach ([
            'collector_id' => $this->config->mercadoPagoSellerId(),
            'application_id' => $this->config->mercadoPagoApplicationId(),
            'client_id' => $this->config->mercadoPagoApplicationId(),
        ] as $key => $expected) {
            if (isset($invoice[$key]) && (string) $invoice[$key] !== $expected) {
                $this->markRetryReview($enrollment, $attempt, 'invoice_account_mismatch');
                throw $this->reviewRequired('La factura pertenece a otra cuenta.');
            }
        }
        if (array_key_exists('live_mode', $invoice)
            && (!is_bool($invoice['live_mode'])
                || $invoice['live_mode'] !== ($this->config->mercadoPagoCredentialEnvironment() === 'production'))
        ) {
            $this->markRetryReview($enrollment, $attempt, 'invoice_environment_mismatch');
            throw $this->reviewRequired('La factura pertenece a otro entorno.');
        }
        foreach (['date_last_updated', 'last_modified'] as $dateField) {
            if (isset($invoice[$dateField]) && $this->mysqlDate($invoice[$dateField]) === null) {
                $this->markRetryReview($enrollment, $attempt, 'invoice_timestamp_invalid');
                throw $this->reviewRequired('La factura no contiene una fecha verificable.');
            }
        }
        return [
            'payment_id' => $paymentId === null || $paymentId === '' ? null : $paymentId,
            'rejected' => in_array($status, ['rejected', 'canceled', 'cancelled'], true),
        ];
    }

    /** @return array{rejected:bool,accredited:bool,pending:bool,payment_id:string,status:string,status_detail:string} */
    private function verifyAndPersistPayment(
        array $enrollment,
        array $attempt,
        array $checkout,
        array $payment,
        ?array $invoice,
        ?array $merchantOrder = null
    ): array {
        $checkoutType = (string) ($attempt['checkout_type'] ?? '');
        if (!in_array($checkoutType, ['subscription', 'preference'], true)) {
            $this->markRetryReview($enrollment, $attempt, 'payment_retry_checkout_type_invalid');
            throw $this->reviewRequired('El tipo de checkout no es verificable.');
        }
        $context = $enrollment;
        $context['checkout_type'] = $checkoutType;
        $context['reference'] = (string) $attempt['external_reference'];
        $context['mp_subscription_id'] = $checkoutType === 'subscription'
            ? (string) $attempt['resource_id']
            : null;
        $context['mp_preference_id'] = $checkoutType === 'preference'
            ? (string) $attempt['resource_id']
            : null;
        try {
            $proof = CheckoutPaymentVerification::proof(
                $context,
                $payment,
                $checkout,
                $this->config->mercadoPagoCredentialEnvironment(),
                $this->config->mercadoPagoSellerId(),
                $this->config->mercadoPagoApplicationId(),
                $invoice,
                null,
                $merchantOrder
            );
            $snapshot = PaymentVerification::snapshot(
                $payment,
                $this->config->mercadoPagoCredentialEnvironment(),
                'reconciliation_read',
                null,
                $proof
            );
        } catch (Throwable) {
            $this->markRetryReview($enrollment, $attempt, 'payment_ownership_not_proven');
            throw $this->reviewRequired('Un pago no acredita el intento exacto.');
        }

        $facts = $snapshot['payment'];
        if ((int) ($facts['amount'] ?? -1) !== (int) $enrollment['checkout_amount']
            || (string) ($facts['currency'] ?? '') !== (string) $enrollment['currency']
        ) {
            $this->markRetryReview($enrollment, $attempt, 'payment_amount_mismatch');
            throw $this->reviewRequired('El monto del pago no coincide con la contratación.');
        }

        try {
            $effective = $this->enrollments->upsertPayment((int) $enrollment['id'], [
                'checkout_attempt_id' => (int) $attempt['id'],
                'mp_payment_id' => (string) $facts['id'],
                'mp_authorized_payment_id' => $proof['authorized_payment_id'] ?? null,
                'checkout_type' => $checkoutType,
                'mp_preference_id' => $checkoutType === 'preference'
                    ? (string) $attempt['resource_id']
                    : null,
                'status' => (string) $facts['status'],
                'status_detail' => (string) ($facts['status_detail'] ?? '') ?: null,
                'amount' => (int) $facts['amount'],
                'amount_refunded' => (int) $facts['amount_refunded'],
                'ever_accredited' => ((string) $facts['status'] === 'approved'
                        && (string) ($facts['status_detail'] ?? '') === 'accredited')
                    || in_array((string) $facts['status'], ['refunded', 'charged_back'], true),
                'currency' => (string) $facts['currency'],
                'subscription_link_verified' => $checkoutType === 'subscription',
                'checkout_link_verified' => true,
                'paid_at' => $facts['paid_at'] ?? null,
                'last_gateway_update_at' => $facts['last_gateway_update_at'],
            ]);
        } catch (PaymentAttemptBindingMismatchException $exception) {
            $this->markRetryReview(
                $enrollment,
                $attempt,
                $exception->reasonCode,
                strtolower((string) ($facts['status'] ?? 'unknown')) ?: 'unknown',
                (string) ($facts['id'] ?? '')
            );
            throw $this->reviewRequired('El pago ya está vinculado a otra inscripción o intento.');
        }

        $status = strtolower((string) $effective['status']);
        $statusDetail = strtolower((string) ($effective['status_detail'] ?? ''));
        $amountRefunded = (int) $effective['amount_refunded'];
        $rejected = in_array($status, ['rejected', 'canceled', 'cancelled'], true)
            && $amountRefunded === 0
            && !(bool) ($effective['ever_accredited'] ?? false);
        $accredited = $status === 'approved'
            && $statusDetail === 'accredited'
            && $amountRefunded === 0
            && (bool) ($effective['ever_accredited'] ?? false);
        if ($accredited) {
            return [
                'rejected' => false,
                'accredited' => true,
                'pending' => false,
                'payment_id' => (string) $facts['id'],
                'status' => $status,
                'status_detail' => $statusDetail,
            ];
        }
        $pending = $amountRefunded === 0
            && !(bool) ($effective['ever_accredited'] ?? false)
            && (in_array($status, ['pending', 'in_process'], true)
                || ($status === 'approved' && $statusDetail !== 'accredited'));
        if ($pending) {
            return [
                'rejected' => false,
                'accredited' => false,
                'pending' => true,
                'payment_id' => (string) $facts['id'],
                'status' => $status,
                'status_detail' => $statusDetail,
            ];
        }
        if (!$rejected) {
            $this->markRetryReview(
                $enrollment,
                $attempt,
                'payment_retry_blocked_by_' . ($status === '' ? 'unknown' : $status),
                $status === '' ? 'unknown' : $status,
                (string) $facts['id']
            );
            throw $this->reviewRequired(
                $status === 'approved' && $statusDetail === 'accredited'
                    ? 'Existe un pago acreditado que impide abrir otro checkout.'
                    : 'Existe un movimiento financiero que impide abrir otro checkout.'
            );
        }
        return [
            'rejected' => true,
            'accredited' => false,
            'pending' => false,
            'payment_id' => (string) $facts['id'],
            'status' => $status,
            'status_detail' => $statusDetail,
        ];
    }

    /**
     * Un pago que se acreditó entre el rechazo y el clic de reintento es válido
     * únicamente para el intento todavía activo. Un sucesor sin recurso que aún
     * no alcanzó la cancelación remota se puede cerrar o reanudar con seguridad.
     * Se aplica la misma política financiera del webhook y se aborta el retry
     * antes de cualquier PUT/POST remoto.
     *
     * @param array<int,array<string,mixed>> $attemptsById
     * @param array<int,array<string,mixed>> $subscriptions
     * @param array<int,array<string,true>> $accreditedPayments
     */
    private function resolveAccreditedPaymentBeforeRetry(
        array $enrollment,
        array $attemptsById,
        array $subscriptions,
        array $accreditedPayments
    ): never {
        $attemptIds = array_keys($accreditedPayments);
        $attemptId = count($attemptIds) === 1 ? (int) $attemptIds[0] : 0;
        $paymentIds = $attemptId > 0 ? array_keys($accreditedPayments[$attemptId]) : [];
        $attempt = $attemptsById[$attemptId] ?? null;
        $subscription = $subscriptions[$attemptId] ?? null;
        $subscriptionStatus = is_array($subscription)
            ? strtolower(trim((string) ($subscription['status'] ?? '')))
            : '';
        $successor = $attemptId > 0
            ? $this->enrollments->findPaymentRetryByReplacedAttempt($attemptId)
            : null;
        $successorStillPreCancellation = is_array($successor)
            && (string) ($successor['lifecycle_status'] ?? '') === 'awaiting_cancellation'
            && trim((string) ($successor['resource_id'] ?? '')) === ''
            && trim((string) ($successor['checkout_url'] ?? '')) === '';
        $successorAlreadyStoppedByPayment = is_array($successor)
            && (string) ($successor['lifecycle_status'] ?? '') === 'payment_received_before_cancellation'
            && trim((string) ($successor['resource_id'] ?? '')) === ''
            && trim((string) ($successor['checkout_url'] ?? '')) === '';
        $isExactActiveAttempt = is_array($attempt)
            && is_array($subscription)
            && count($paymentIds) === 1
            && (int) ($enrollment['active_checkout_attempt_id'] ?? 0) === $attemptId
            && (bool) ($attempt['is_active'] ?? false)
            && (string) ($attempt['lifecycle_status'] ?? '') === 'active'
            && hash_equals(
                trim((string) ($enrollment['mp_subscription_id'] ?? '')),
                trim((string) ($attempt['resource_id'] ?? ''))
            )
            && ($successor === null || $successorStillPreCancellation || $successorAlreadyStoppedByPayment)
            && in_array($subscriptionStatus, ['pending', 'authorized'], true);

        if (!$isExactActiveAttempt) {
            $reviewAttempt = is_array($attempt) ? $attempt : ['id' => $attemptId, 'lifecycle_status' => ''];
            $this->markRetryReview(
                $enrollment,
                $reviewAttempt,
                'historical_attempt_financial_activity',
                'approved',
                count($paymentIds) === 1 ? (string) $paymentIds[0] : null
            );
            throw $this->reviewRequired('Un intento histórico o reemplazado recibió un pago acreditado.');
        }

        $verifiedChargeCount = $this->enrollments->countVerifiedAccreditedPayments((int) $enrollment['id']);
        if (PaymentTransition::chargeLimitExceeded(
            $verifiedChargeCount,
            (int) ($enrollment['checkout_charge_count'] ?? 0)
        )) {
            $this->markRetryReview(
                $enrollment,
                $attempt,
                'charge_count_exceeded',
                'approved',
                (string) $paymentIds[0]
            );
            throw $this->reviewRequired('La cantidad de pagos acreditados excede la contratación.');
        }

        $transition = PaymentTransition::decide(
            'subscription',
            'approved',
            'accredited',
            0,
            true,
            $subscriptionStatus === 'authorized',
            trim((string) ($enrollment['initial_payment_confirmed_at'] ?? '')) !== '',
            (string) $enrollment['status'],
            (string) $enrollment['membership_status']
        );
        try {
            $this->enrollments->applyActivePaymentStateBeforeRetry(
                (int) $enrollment['id'],
                $attemptId,
                $subscriptionStatus,
                (string) $paymentIds[0],
                'approved',
                'accredited',
                [
                    'subscription_status' => $subscriptionStatus,
                    'status' => $transition['internal_status'],
                    'membership_status' => $transition['membership_status'],
                    'payment_status' => $transition['payment_status'],
                    'mp_last_payment_id' => (string) $paymentIds[0],
                    'error_code' => $transition['error_code'],
                ],
                $successorStillPreCancellation ? (int) $successor['id'] : null,
                $successorStillPreCancellation ? 'payment_received_before_cancellation' : null
            );
        } catch (Throwable) {
            $this->markRetryReview(
                $this->requiredEnrollment((int) $enrollment['id']),
                $attempt,
                'payment_retry_successor_changed_during_payment',
                'approved',
                (string) $paymentIds[0]
            );
            throw $this->reviewRequired('El reemplazo cambió mientras se conciliaba el pago acreditado.');
        }
        throw new HttpException(
            409,
            'payment_already_received',
            'Encontramos un pago acreditado para esta inscripción. Consulta su estado; no abriremos otro cobro.',
            false,
            'status_only'
        );
    }

    /**
     * Pending, in_process y approved aún no acreditado bloquean un checkout
     * nuevo, pero no son una incidencia cuando pertenecen al intento activo.
     *
     * @param array<int,array<string,mixed>> $attemptsById
     * @param array<int,array<string,mixed>> $subscriptions
     * @param array<int,array<string,array{status:string,status_detail:string}>> $pendingPayments
     */
    private function resolvePendingPaymentBeforeRetry(
        array $enrollment,
        array $attemptsById,
        array $subscriptions,
        array $pendingPayments
    ): never {
        $attemptIds = array_keys($pendingPayments);
        $attemptId = count($attemptIds) === 1 ? (int) $attemptIds[0] : 0;
        $paymentIds = $attemptId > 0 ? array_keys($pendingPayments[$attemptId]) : [];
        $payment = count($paymentIds) === 1 ? $pendingPayments[$attemptId][$paymentIds[0]] : null;
        $attempt = $attemptsById[$attemptId] ?? null;
        $subscription = $subscriptions[$attemptId] ?? null;
        $subscriptionStatus = is_array($subscription)
            ? strtolower(trim((string) ($subscription['status'] ?? '')))
            : '';
        $successor = $attemptId > 0
            ? $this->enrollments->findPaymentRetryByReplacedAttempt($attemptId)
            : null;
        $successorStillPreCancellation = is_array($successor)
            && (string) ($successor['lifecycle_status'] ?? '') === 'awaiting_cancellation'
            && trim((string) ($successor['resource_id'] ?? '')) === ''
            && trim((string) ($successor['checkout_url'] ?? '')) === '';
        $isExactActiveAttempt = is_array($attempt)
            && is_array($subscription)
            && is_array($payment)
            && (int) ($enrollment['active_checkout_attempt_id'] ?? 0) === $attemptId
            && (bool) ($attempt['is_active'] ?? false)
            && (string) ($attempt['lifecycle_status'] ?? '') === 'active'
            && hash_equals(
                trim((string) ($enrollment['mp_subscription_id'] ?? '')),
                trim((string) ($attempt['resource_id'] ?? ''))
            )
            && ($successor === null || $successorStillPreCancellation)
            && in_array($subscriptionStatus, ['pending', 'authorized'], true);
        if (!$isExactActiveAttempt) {
            $reviewAttempt = is_array($attempt) ? $attempt : ['id' => $attemptId, 'lifecycle_status' => ''];
            $this->markRetryReview(
                $enrollment,
                $reviewAttempt,
                'historical_attempt_financial_activity',
                is_array($payment) ? $payment['status'] : 'unknown',
                count($paymentIds) === 1 ? (string) $paymentIds[0] : null
            );
            throw $this->reviewRequired('Un intento histórico o reemplazado tiene un pago en proceso.');
        }

        $transition = PaymentTransition::decide(
            'subscription',
            $payment['status'],
            $payment['status_detail'],
            0,
            true,
            $subscriptionStatus === 'authorized',
            trim((string) ($enrollment['initial_payment_confirmed_at'] ?? '')) !== '',
            (string) $enrollment['status'],
            (string) $enrollment['membership_status']
        );
        try {
            $this->enrollments->applyActivePaymentStateBeforeRetry(
                (int) $enrollment['id'],
                $attemptId,
                $subscriptionStatus,
                (string) $paymentIds[0],
                $payment['status'],
                $payment['status_detail'],
                [
                    'subscription_status' => $subscriptionStatus,
                    'status' => $transition['internal_status'],
                    'membership_status' => $transition['membership_status'],
                    'payment_status' => $transition['payment_status'],
                    'mp_last_payment_id' => (string) $paymentIds[0],
                    'error_code' => $transition['error_code'],
                ],
                $successorStillPreCancellation ? (int) $successor['id'] : null,
                null
            );
        } catch (Throwable) {
            $this->markRetryReview(
                $this->requiredEnrollment((int) $enrollment['id']),
                $attempt,
                'payment_retry_pending_state_changed',
                $payment['status'],
                (string) $paymentIds[0]
            );
            throw $this->reviewRequired('El pago en proceso cambió durante la conciliación.');
        }
        throw new HttpException(
            409,
            'payment_confirmation_pending',
            'Mercado Pago mantiene un pago en confirmación. No reemplazaremos el checkout de esta inscripción.',
            false,
            'status_only'
        );
    }

    /**
     * @param array<string,mixed> $offer
     * @return array{resource_id:string,checkout_url:string,initial_gateway_status:string}
     */
    private function validateRetryCheckout(array $enrollment, array $retry, array $offer, array $resource): array
    {
        try {
            $validated = CheckoutResponseValidator::validate(
                'subscription',
                $resource,
                $offer,
                (string) $retry['external_reference'],
                $this->config->useSandboxCheckoutUrl(),
                $this->config->mercadoPagoSellerId(),
                $this->config->mercadoPagoApplicationId()
            );
        } catch (Throwable) {
            $this->markRetryReview($enrollment, $retry, 'payment_retry_checkout_mismatch');
            throw $this->reviewRequired('El checkout remoto no coincide con el retry.');
        }
        $storedResource = trim((string) ($retry['resource_id'] ?? ''));
        if ($storedResource !== '' && !hash_equals($storedResource, $validated['resource_id'])) {
            throw $this->reviewRequired('El recurso remoto no coincide con el retry persistido.');
        }
        return $validated;
    }

    /** @return array<string,mixed> */
    private function subscriptionFact(array $facts, int $attemptId): array
    {
        $subscription = $facts['subscriptions'][$attemptId] ?? null;
        if (!is_array($subscription)) {
            throw $this->reviewRequired('No se pudo verificar la suscripción requerida.');
        }
        return $subscription;
    }

    /** @return array<string,mixed> */
    private function replacedAttempt(int $enrollmentId, array $retry): array
    {
        $replacedId = (int) ($retry['replaces_attempt_id'] ?? 0);
        if ($replacedId < 1) {
            throw $this->reviewRequired('El retry no identifica el intento anterior.');
        }
        foreach ($this->enrollments->checkoutAttemptReferences($enrollmentId) as $candidate) {
            if ((int) $candidate['id'] === $replacedId) {
                return $candidate;
            }
        }
        $this->markRetryReview($this->requiredEnrollment($enrollmentId), $retry, 'payment_retry_replaced_attempt_missing');
        throw $this->reviewRequired('Falta el intento anterior.');
    }

    private function assertSubscription(array $enrollment, array $attempt, array $resource, array $allowedStatuses): void
    {
        if (!hash_equals((string) ($attempt['resource_id'] ?? ''), trim((string) ($resource['id'] ?? '')))
            || !hash_equals((string) $attempt['external_reference'], trim((string) ($resource['external_reference'] ?? '')))
            || !in_array(strtolower(trim((string) ($resource['status'] ?? ''))), $allowedStatuses, true)
            || (string) ($resource['collector_id'] ?? '') !== $this->config->mercadoPagoSellerId()
            || (string) ($resource['application_id'] ?? '') !== $this->config->mercadoPagoApplicationId()
            || (isset($resource['preapproval_plan_id']) && trim((string) $resource['preapproval_plan_id']) !== '')
            || !is_bool($resource['live_mode'] ?? null)
            || $resource['live_mode'] !== ($this->config->mercadoPagoCredentialEnvironment() === 'production')
        ) {
            $this->markRetryReview($enrollment, $attempt, 'payment_retry_subscription_mismatch');
            throw $this->reviewRequired('La suscripción no coincide con la inscripción.');
        }
        $recurring = is_array($resource['auto_recurring'] ?? null) ? $resource['auto_recurring'] : [];
        $expectedEnd = PendingSubscriptionRequest::endDate(
            (string) $attempt['external_reference'],
            (int) $enrollment['duration_months']
        );
        try {
            $actualEnd = isset($recurring['end_date'])
                ? (new \DateTimeImmutable((string) $recurring['end_date']))
                    ->setTimezone(new \DateTimeZone('UTC'))
                    ->format('Y-m-d\TH:i:s.v\Z')
                : '';
        } catch (Throwable) {
            $this->markRetryReview($enrollment, $attempt, 'payment_retry_subscription_end_invalid');
            throw $this->reviewRequired('La fecha final de la suscripción no es verificable.');
        }
        if ((int) ($recurring['frequency'] ?? 0) !== 1
            || (string) ($recurring['frequency_type'] ?? '') !== 'months'
            || !hash_equals($expectedEnd, $actualEnd)
            || abs((float) ($recurring['transaction_amount'] ?? -1) - (float) $enrollment['checkout_amount']) > 0.001
            || (string) ($recurring['currency_id'] ?? '') !== (string) $enrollment['currency']
        ) {
            $this->markRetryReview($enrollment, $attempt, 'payment_retry_recurrence_mismatch');
            throw $this->reviewRequired('La recurrencia no coincide con la contratación.');
        }
    }

    private function assertLocallyEligible(array $enrollment, bool $allowTransitionState = false): void
    {
        $allowed = [
            'payment_rejected', 'subscription_canceled', 'checkout_ready',
            'subscription_pending', 'subscription_authorized', 'payment_pending',
        ];
        $manualReviewAllowed = (string) ($enrollment['status'] ?? '') === 'subscription_canceled'
            && trim((string) ($enrollment['error_code'] ?? '')) === '';
        if ((string) ($enrollment['checkout_type'] ?? '') !== 'subscription'
            || !in_array((string) ($enrollment['status'] ?? ''), $allowed, true)
            || ((string) ($enrollment['membership_status'] ?? '') === 'manual_review' && !$manualReviewAllowed)
        ) {
            throw new HttpException(
                409,
                'payment_retry_not_allowed',
                'Esta inscripción no permite reiniciar el pago.',
                false,
                'status_only'
            );
        }
        $evidence = $this->enrollments->paymentRetryEvidence((int) $enrollment['id']);
        if ($evidence['initial_payment']) {
            throw new HttpException(
                409,
                'payment_already_received',
                'Esta inscripción ya tiene un pago inicial confirmado.',
                false,
                'status_only'
            );
        }
        if ($evidence['incidents'] > 0) {
            $this->markEnrollmentReview(
                $enrollment,
                'local_financial_evidence_before_retry',
                'unknown'
            );
            throw $this->reviewRequired('Existe evidencia financiera que debe revisarse.');
        }
        // ever_accredited sin pago inicial puede ser el crash seguro posterior
        // al upsert. Se permite únicamente la conciliación autenticada completa;
        // resolveAccreditedPaymentBeforeRetry decidirá activo vs histórico y la
        // transacción del repositorio cerrará la transición sin crear cobros.
    }

    /** @param array<string,mixed> $enrollment */
    private function assertPreferenceLocallyEligible(array $enrollment): void
    {
        if ((string) ($enrollment['checkout_type'] ?? '') !== 'preference'
            || !in_array(
                (string) ($enrollment['status'] ?? ''),
                ['checkout_ready', 'payment_pending', 'payment_rejected'],
                true
            )
            || (string) ($enrollment['membership_status'] ?? '') === 'manual_review'
        ) {
            throw new HttpException(
                409,
                'payment_retry_not_allowed',
                'Esta inscripción no permite reintentar el pago.',
                false,
                'status_only'
            );
        }
        $evidence = $this->enrollments->paymentRetryEvidence((int) $enrollment['id']);
        if ($evidence['initial_payment'] || $evidence['ever_accredited'] > 0) {
            throw new HttpException(
                409,
                'payment_already_received',
                'Esta inscripción ya tiene un pago inicial confirmado o acreditado.',
                false,
                'status_only'
            );
        }
        if ($evidence['incidents'] > 0) {
            throw $this->reviewRequired('La preferencia contiene devolución, contracargo o incidencia.');
        }
    }

    private function markRetryReview(
        array $enrollment,
        array $attempt,
        string $reason,
        string $paymentStatus = 'unknown',
        ?string $paymentId = null
    ): void {
        $state = trim((string) ($attempt['lifecycle_status'] ?? ''));
        if ($state !== '' && $state !== 'review_required') {
            $this->enrollments->transitionPaymentRetryAttempt(
                (int) $attempt['id'],
                [$state],
                'review_required'
            );
        }
        $this->markEnrollmentReview($enrollment, $reason, $paymentStatus, $paymentId);
    }

    private function markEnrollmentReview(
        array $enrollment,
        string $reason,
        string $paymentStatus = 'unknown',
        ?string $paymentId = null
    ): void {
        $changes = [
            'status' => 'review_required',
            'payment_status' => $paymentStatus,
            'membership_status' => 'manual_review',
            'error_code' => $reason,
        ];
        if ($paymentId !== null && $paymentId !== '') {
            $changes['mp_last_payment_id'] = $paymentId;
        }
        $this->enrollments->updateGatewayState((int) $enrollment['id'], $changes);
    }

    /** @param array<string,mixed> $evidence */
    private function persistPhaseEvidence(
        array $enrollment,
        int $attemptId,
        string $phase,
        array $evidence
    ): void {
        if (preg_match('/^[a-z0-9-]{3,40}$/D', $phase) !== 1 || $attemptId < 1) {
            throw new RuntimeException('Fase de evidencia inválida.');
        }
        $digestInput = $evidence;
        unset($digestInput['verified_at']);
        $evidenceDigest = hash('sha256', json_encode(
            $digestInput,
            JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
        ));
        $dedupe = hash('sha256', implode("\n", [
            'dgym-payment-retry-evidence/1',
            (string) $enrollment['id'],
            (string) $attemptId,
            $phase,
            $evidenceDigest,
        ]));
        $snapshot = [
            'schema' => 'dgym-payment-retry-evidence/1',
            'phase' => $phase,
            'attempt_id' => $attemptId,
            'evidence_digest' => $evidenceDigest,
            'evidence' => $evidence,
        ];
        $event = $this->events->register($dedupe, [
            'event_id' => null,
            'request_id' => 'payment-retry-evidence',
            'topic' => 'payment_retry.evidence',
            'action' => $phase,
            'resource_id' => 'payment-retry-attempt-' . $attemptId,
            'live_mode' => $this->config->mercadoPagoCredentialEnvironment() === 'production',
            'enrollment_id' => (int) $enrollment['id'],
            'payload' => [
                'schema' => 'dgym-payment-retry-evidence-request/1',
                'phase' => $phase,
                'evidence_digest' => $evidenceDigest,
            ],
        ]);
        if ((string) ($event['status'] ?? '') === 'processed') {
            return;
        }
        $eventId = (int) ($event['id'] ?? 0);
        if ($eventId < 1 || !$this->events->acquire($eventId)) {
            throw new HttpException(
                409,
                'retry_busy',
                'La evidencia del reintento se está guardando. Intenta nuevamente en unos segundos.'
            );
        }
        $this->events->finish(
            $eventId,
            'processed',
            (int) $enrollment['id'],
            $snapshot,
            null
        );
    }

    private function verifiedAt(): string
    {
        return (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))
            ->format('Y-m-d\TH:i:s.v\Z');
    }

    /** @return array<string,mixed> */
    private function requiredEnrollment(int $id): array
    {
        $enrollment = $this->enrollments->findById($id);
        if ($enrollment === null) {
            throw new HttpException(404, 'not_found', 'No encontramos esa inscripción.', false, 'status_only');
        }
        return $enrollment;
    }

    private function mysqlDate(mixed $value): ?string
    {
        if (!is_string($value)
            || !preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/D', $value)
        ) {
            return null;
        }
        try {
            $date = new \DateTimeImmutable($value);
            $errors = \DateTimeImmutable::getLastErrors();
            if (is_array($errors) && ($errors['warning_count'] > 0 || $errors['error_count'] > 0)) {
                return null;
            }
            return $date->setTimezone(new \DateTimeZone('UTC'))->format('Y-m-d H:i:s.v');
        } catch (Throwable) {
            return null;
        }
    }

    private function reviewRequired(string $diagnostic): HttpException
    {
        error_log('DGYM payment retry blocked reason=' . hash('sha256', $diagnostic));
        return new HttpException(
            409,
            'payment_retry_review_required',
            'No reemplazaremos el checkout de esta inscripción porque la evidencia disponible requiere revisión del gimnasio.',
            false,
            'status_only'
        );
    }

    /** @return array{http_status:int,body:array<string,mixed>} */
    private function continueResponse(string $reference): array
    {
        return ['http_status' => 202, 'body' => [
            'reference' => $reference,
            'next_action' => 'continue_retry',
        ]];
    }

    /** @return array{http_status:int,body:array<string,mixed>} */
    private function success(string $reference, string $url, int $status): array
    {
        MercadoPagoClient::assertSafeCheckoutUrl($url);
        return ['http_status' => $status, 'body' => [
            'reference' => $reference,
            'next_action' => 'mercado_pago',
            'checkout_url' => $url,
        ]];
    }
}
