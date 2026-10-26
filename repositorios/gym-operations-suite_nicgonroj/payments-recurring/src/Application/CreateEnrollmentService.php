<?php

declare(strict_types=1);

namespace DemoGym\Application;

use DemoGym\Config;
use DemoGym\Domain\CheckoutGateway;
use DemoGym\Domain\EnrollmentReference;
use DemoGym\Domain\Idempotency;
use DemoGym\Domain\PriceCatalog;
use DemoGym\Domain\Uuid;
use DemoGym\Http\HttpException;
use DemoGym\Infrastructure\EnrollmentRepository;
use DemoGym\Khipu\KhipuEnrollmentService;
use DemoGym\Infrastructure\MercadoPagoApiException;
use InvalidArgumentException;
use PDOException;
use RuntimeException;
use Throwable;

final class CreateEnrollmentService
{
    public function __construct(
        private readonly Config $config,
        private readonly PriceCatalog $catalog,
        private readonly EnrollmentRequestValidator $validator,
        private readonly EnrollmentRepository $enrollments,
        private readonly CheckoutGateway $checkoutGateway,
        private readonly CheckoutRequestFactory $requestFactory,
        private readonly CheckoutPreflight $preflight,
        private readonly ?KhipuEnrollmentService $khipu = null
    ) {
    }

    /** @param array<string, mixed> $payload @return array{http_status:int,body:array<string,mixed>} */
    public function create(array $payload, string $idempotencyKey): array
    {
        if (
            !$this->config->checkoutEnabled()
            || !EnrollmentRequestValidator::publicContractIsDeployable(
                $this->config->pricingVersion(),
                $this->config->consentTextVersion(),
                $this->config->appEnvironment()
            )
        ) {
            throw new HttpException(503, 'service_not_configured', 'El checkout todavía no está habilitado.');
        }

        try {
            $idempotencyHash = Idempotency::hashKey($idempotencyKey);
        } catch (InvalidArgumentException) {
            throw new HttpException(422, 'invalid_request', 'Envía una Idempotency-Key válida para evitar inscripciones duplicadas.');
        }

        $input = $this->validator->validate($payload);
        $fingerprint = Idempotency::fingerprint($input);
        $preflight = $this->preflight->inspect();
        if (!$preflight['ready']) {
            error_log('DGYM local preflight failed code=' . $preflight['code']);
            return $this->localDefinitiveFailureResponse();
        }

        // Khipu resuelve su propia idempotencia y persistencia. La huella incluye
        // el proveedor, por lo que una misma clave no puede cruzar de un medio a otro.
        if (($input['payment_provider'] ?? 'mercadopago') === 'khipu') {
            return $this->khipu === null
                ? $this->localDefinitiveFailureResponse()
                : $this->khipu->create($input, $idempotencyHash, $fingerprint);
        }

        $existing = $this->enrollments->findByIdempotencyHash($idempotencyHash);
        if ($existing !== null) {
            return $this->existingResponse($existing, $fingerprint);
        }

        try {
            $offer = $this->catalog->offer(
                (string) $input['plan_code'],
                (string) $input['payment_mode'],
                (int) $input['duration']
            );
            $publicId = Uuid::v4();
            $reference = EnrollmentReference::generate();
            // Toda la configuración que puede fallar localmente se resuelve antes
            // del INSERT. publicId es también la clave remota estable de Checkout Pro.
            $checkoutRequest = $this->requestFactory->build($offer, $input, $reference);
        } catch (Throwable $exception) {
            error_log('DGYM local checkout preparation failed type=' . get_class($exception));
            return $this->localDefinitiveFailureResponse();
        }

        try {
            $enrollment = $this->enrollments->create(
                $input,
                $offer,
                $publicId,
                $reference,
                $idempotencyHash,
                $fingerprint
            );
        } catch (PDOException $exception) {
            if (!EnrollmentRepository::isUniqueViolation($exception)) {
                error_log('DGYM local enrollment persistence failed');
                return $this->localDefinitiveFailureResponse();
            }
            try {
                $raceWinner = $this->enrollments->findByIdempotencyHash($idempotencyHash);
            } catch (Throwable) {
                error_log('DGYM local enrollment race lookup failed');
                return $this->localDefinitiveFailureResponse();
            }
            if ($raceWinner === null) {
                error_log('DGYM local enrollment unique collision unresolved');
                return $this->localDefinitiveFailureResponse();
            }
            return $this->existingResponse($raceWinner, $fingerprint);
        } catch (Throwable $exception) {
            error_log('DGYM local enrollment persistence failed type=' . get_class($exception));
            return $this->localDefinitiveFailureResponse();
        }

        $checkoutType = (string) $checkoutRequest['type'];
        try {
            $createdResource = $this->checkoutGateway->createCheckout(
                $checkoutType,
                $checkoutRequest['payload'],
                $publicId
            );
        } catch (MercadoPagoApiException $exception) {
            if ($exception->outcomeUncertain) {
                $reconciled = $this->tryReconcileCheckout($enrollment, $offer);
                if ($reconciled !== null) {
                    return $this->successResponse($enrollment, $reconciled, 201);
                }
            }

            $status = $exception->outcomeUncertain ? 'checkout_creation_uncertain' : 'checkout_creation_failed';
            $configurationRejected = in_array($exception->httpStatus, [401, 403], true)
                || in_array($exception->providerErrorCode, ['invalid_credentials', 'unauthorized', 'forbidden'], true);
            $reasonCode = match (true) {
                $configurationRejected => 'service_not_configured',
                in_array($exception->httpStatus, [400, 422], true) => 'mercado_pago_request_rejected',
                default => 'mercado_pago_unavailable',
            };
            $failureRecorded = $this->recordCheckoutFailure(
                (int) $enrollment['id'],
                $status,
                $reasonCode,
                $reference
            );
            error_log(sprintf(
                'DGYM checkout failure ref=%s http=%d uncertain=%s provider_code=%s request_id=%s',
                $reference,
                $exception->httpStatus,
                $exception->outcomeUncertain ? 'yes' : 'no',
                $exception->providerErrorCode ?? 'unknown',
                $exception->providerRequestId ?? 'none'
            ));
            return $exception->outcomeUncertain || !$failureRecorded
                ? $this->uncertainCheckoutResponse($reference)
                : $this->definitiveFailureResponse($reference, $reasonCode);
        } catch (Throwable $exception) {
            $this->recordCheckoutFailure((int) $enrollment['id'], 'checkout_creation_uncertain', 'gateway_request_failed', $reference);
            error_log('DGYM checkout request failed ref=' . $reference . ' type=' . get_class($exception));
            return $this->uncertainCheckoutResponse($reference);
        }

        try {
            // Se exige coincidencia en la respuesta del POST y nuevamente en un
            // GET autenticado. Para /preapproval, end_date debe reaparecer
            // exactamente; si MLC lo omite o modifica, el checkout queda cerrado.
            $postValidated = CheckoutResponseValidator::validate(
                $checkoutType,
                $createdResource,
                $offer,
                $reference,
                $this->config->useSandboxCheckoutUrl(),
                $this->config->mercadoPagoSellerId(),
                $this->config->mercadoPagoApplicationId()
            );
            $confirmed = $this->fetchAndValidateCheckout(
                $checkoutType,
                $postValidated['resource_id'],
                $offer,
                $reference
            );
            if (!hash_equals($postValidated['resource_id'], $confirmed['resource_id'])) {
                throw new RuntimeException('Mercado Pago devolvió IDs de checkout inconsistentes.');
            }
            $this->enrollments->markCheckoutReady(
                (int) $enrollment['id'],
                $checkoutType,
                $confirmed['resource_id'],
                $confirmed['checkout_url']
            );
        } catch (MercadoPagoApiException $exception) {
            $this->recordCheckoutFailure(
                (int) $enrollment['id'],
                'checkout_creation_uncertain',
                'gateway_confirmation_unavailable',
                $reference
            );
            error_log('DGYM checkout confirmation failed ref=' . $reference . ' http=' . $exception->httpStatus);
            return $this->uncertainCheckoutResponse($reference);
        } catch (Throwable $exception) {
            $this->recordCheckoutFailure((int) $enrollment['id'], 'review_required', 'gateway_response_mismatch', $reference);
            error_log('DGYM checkout response mismatch ref=' . $reference);
            return $this->uncertainCheckoutResponse($reference);
        }

        return $this->successResponse($enrollment, $confirmed, 201);
    }

    /** @param array<string, mixed> $existing @return array{http_status:int,body:array<string,mixed>} */
    private function existingResponse(array $existing, string $fingerprint, bool $requireExactFingerprint = true): array
    {
        if (($requireExactFingerprint && !hash_equals((string) $existing['request_fingerprint'], $fingerprint))
            || (string) ($existing['payment_provider'] ?? 'mercadopago') !== 'mercadopago'
        ) {
            throw new HttpException(
                409,
                'idempotency_conflict',
                'La misma Idempotency-Key ya fue usada con otros datos.',
                true,
                'new_idempotency_key'
            );
        }

        $status = (string) ($existing['status'] ?? '');
        $reference = (string) ($existing['reference'] ?? '');
        $checkoutId = trim((string) ($existing['mp_checkout_id'] ?? $existing['mp_subscription_id'] ?? ''));
        $checkoutUrl = trim((string) ($existing['checkout_url'] ?? ''));
        $checkoutType = (string) ($existing['checkout_type'] ?? '');
        $checkoutNeedsProbe = in_array($checkoutType, ['subscription', 'preference'], true)
            && in_array(
                $status,
                ['checkout_ready', 'subscription_pending', 'subscription_authorized', 'payment_pending'],
                true
            );
        $checkoutCanBeReused = in_array($status, ['checkout_ready', 'subscription_pending'], true);
        if ($checkoutNeedsProbe) {
            // Una repetición idempotente puede llegar cuando Mercado Pago ya
            // registró actividad que el webhook aún no reflejó. Nunca devolver
            // desde aquí una URL cobrable: el endpoint de reintento hace la
            // conciliación estable antes de decidir sobre esta inscripción.
            return $this->pendingCheckoutProbeResponse($reference, $checkoutType);
        }

        if (in_array($status, ['creating_checkout', 'checkout_creation_uncertain'], true)) {
            try {
                $offer = $this->storedOfferForReconciliation($existing);
                $reconciled = $this->tryReconcileCheckout($existing, $offer);
                if ($reconciled !== null) {
                    return $this->successResponse($existing, $reconciled, 200);
                }
            } catch (Throwable) {
                // Sigue cerrado hasta conciliación manual; nunca crea otro checkout.
            }
            return $this->uncertainCheckoutResponse($reference);
        }

        if ($status === 'checkout_creation_failed') {
            if ($checkoutUrl !== '' || $checkoutId !== '') {
                return $this->uncertainCheckoutResponse($reference);
            }
            $reasonCode = (string) ($existing['error_code'] ?? 'mercado_pago_unavailable');
            if (!in_array($reasonCode, ['service_not_configured', 'mercado_pago_request_rejected', 'mercado_pago_unavailable'], true)) {
                $reasonCode = 'mercado_pago_unavailable';
            }
            return $this->definitiveFailureResponse($reference, $reasonCode);
        }
        $recoverableCanceledSubscription = $status === 'subscription_canceled'
            && (string) ($existing['checkout_type'] ?? '') === 'subscription'
            && trim((string) ($existing['initial_payment_confirmed_at'] ?? '')) === ''
            && trim((string) ($existing['error_code'] ?? '')) === '';
        if ($status === 'payment_rejected' || $recoverableCanceledSubscription) {
            return (string) ($existing['checkout_type'] ?? '') === 'preference'
                ? $this->rejectedPreferenceResponse($reference)
                : $this->rejectedSubscriptionResponse($reference);
        }
        if ($checkoutCanBeReused || $status === 'review_required') {
            return $this->uncertainCheckoutResponse($reference);
        }

        return $this->lockedEnrollmentResponse($reference);
    }

    /**
     * @param array<string, mixed> $enrollment
     * @param array<string, mixed> $offer
     * @return array{checkout_type:string,resource_id:string,checkout_url:string,initial_gateway_status:string}|null
     */
    private function tryReconcileCheckout(array $enrollment, array $offer): ?array
    {
        $checkoutType = (string) $offer['checkout_type'];
        $reference = (string) $enrollment['reference'];
        try {
            $matches = $this->checkoutGateway->searchCheckout(
                $checkoutType,
                $reference,
                (string) $enrollment['email'],
                (int) $offer['charge_amount']
            );
            if (count($matches) !== 1) {
                error_log('DGYM checkout reconciliation non-unique ref=' . $reference . ' count=' . count($matches));
                return null;
            }
            $resourceId = trim((string) ($matches[0]['id'] ?? ''));
            if ($resourceId === '') {
                return null;
            }
            $confirmed = $this->fetchAndValidateCheckout($checkoutType, $resourceId, $offer, $reference);
            $this->enrollments->markCheckoutReady(
                (int) $enrollment['id'],
                $checkoutType,
                $confirmed['resource_id'],
                $confirmed['checkout_url']
            );
            return $confirmed;
        } catch (Throwable $exception) {
            error_log('DGYM checkout reconciliation pending ref=' . $reference . ' type=' . get_class($exception));
            return null;
        }
    }

    /**
     * @param array<string, mixed> $offer
     * @return array{checkout_type:string,resource_id:string,checkout_url:string,initial_gateway_status:string}
     */
    private function fetchAndValidateCheckout(
        string $checkoutType,
        string $resourceId,
        array $offer,
        string $reference
    ): array {
        $resource = match ($checkoutType) {
            'subscription' => $this->checkoutGateway->getSubscription($resourceId),
            'preference' => $this->checkoutGateway->getPreference($resourceId),
            default => throw new RuntimeException('Tipo de checkout no soportado.'),
        };
        $validated = CheckoutResponseValidator::validate(
            $checkoutType,
            $resource,
            $offer,
            $reference,
            $this->config->useSandboxCheckoutUrl(),
            $this->config->mercadoPagoSellerId(),
            $this->config->mercadoPagoApplicationId()
        );
        if (!hash_equals($resourceId, $validated['resource_id'])) {
            throw new RuntimeException('El GET autenticado devolvió otro checkout.');
        }
        return $validated;
    }

    /**
     * Solo verifica una inscripción durable para buscar/leer su checkout; jamás
     * autoriza crear un checkout histórico ni sustituye sus términos por los
     * del catálogo nuevo. El POST continúa exigiendo la versión vigente.
     *
     * @param array<string, mixed> $stored
     * @return array<string, int|string>
     */
    private function storedOfferForReconciliation(array $stored): array
    {
        $version = $stored['pricing_version'] ?? null;
        $plan = $stored['plan_code'] ?? null;
        $mode = $stored['payment_mode'] ?? null;
        $duration = self::storedPositiveInteger($stored['duration_months'] ?? null);
        if (!is_string($version) || !is_string($plan) || !is_string($mode)) {
            throw new RuntimeException('La oferta persistida está incompleta.');
        }

        if ($version === '2026-09-07-v2') {
            // Snapshot congelado de v2. No derivarlo de v3: un mes histórico
            // NO incluía matrícula y una actualización no puede agregarla.
            $historical = [
                'inicio' => ['regular' => 19990, 'automatic' => [3 => 18990, 6 => 17990, 12 => 16990], 'prepaid' => [3 => 55170, 6 => 105540, 12 => 196680]],
                'pro' => ['regular' => 29990, 'automatic' => [3 => 28490, 6 => 26990, 12 => 25490], 'prepaid' => [3 => 82770, 6 => 158340, 12 => 295080]],
            ];
            $definition = $historical[$plan] ?? null;
            if ($definition === null
                || !in_array($mode, ['single', 'automatic', 'prepaid'], true)
                || ($mode === 'single' ? $duration !== 1 : !isset($definition[$mode][$duration]))
            ) {
                throw new RuntimeException('La oferta histórica no está reconocida.');
            }
            $amount = $mode === 'single' ? $definition['regular'] : $definition[$mode][$duration];
            $count = $mode === 'automatic' ? $duration : 1;
            $expected = [
                'checkout_type' => $mode === 'automatic' ? 'subscription' : 'preference',
                'charge_amount' => $amount, 'charge_count' => $count,
                'regular_monthly' => $definition['regular'],
                'regular_total' => $definition['regular'] * $duration,
                'total' => $amount * $count,
                'installment' => $mode === 'prepaid' ? intdiv($amount, $duration) : $amount,
            ];
        } elseif ($version === PriceCatalog::VERSION) {
            $expected = $this->catalog->offer($plan, $mode, $duration);
        } else {
            throw new RuntimeException('La versión persistida requiere revisión manual.');
        }

        $fieldMap = [
            'checkout_amount' => 'charge_amount', 'checkout_charge_count' => 'charge_count',
            'regular_monthly_amount' => 'regular_monthly', 'regular_contract_total' => 'regular_total',
            'contract_total' => 'total', 'installment_amount' => 'installment',
        ];
        $offer = ['pricing_version' => $version, 'currency' => 'CLP', 'checkout_type' => $expected['checkout_type']];
        foreach ($fieldMap as $storedKey => $offerKey) {
            $amount = self::storedPositiveInteger($stored[$storedKey] ?? null);
            if ($amount !== $expected[$offerKey]) {
                throw new RuntimeException('Los términos persistidos no coinciden con su versión.');
            }
            $offer[$offerKey] = $amount;
        }
        if (($stored['currency'] ?? null) !== 'CLP' || ($stored['checkout_type'] ?? null) !== $offer['checkout_type']) {
            throw new RuntimeException('La moneda o modalidad persistida no coincide.');
        }
        return $offer;
    }

    private static function storedPositiveInteger(mixed $value): int
    {
        // PDO devuelve INT como int o cadena decimal según su configuración.
        // Rechazar floats, exponentes, sufijos y ceros iniciales: nunca truncar.
        if (is_string($value) && preg_match('/^[1-9][0-9]*$/D', $value) === 1) {
            $value = filter_var($value, FILTER_VALIDATE_INT);
        }
        if (!is_int($value) || $value < 1) {
            throw new RuntimeException('Monto o duración persistidos inválidos.');
        }
        return $value;
    }

    /**
     * @param array<string, mixed> $enrollment
     * @param array{checkout_type:string,resource_id:string,checkout_url:string,initial_gateway_status:string} $checkout
     * @return array{http_status:int,body:array<string,mixed>}
     */
    private function successResponse(array $enrollment, array $checkout, int $httpStatus): array
    {
        return [
            'http_status' => $httpStatus,
            'body' => [
                'enrollment_id' => (string) $enrollment['public_id'],
                'reference' => (string) $enrollment['reference'],
                'payment_mode' => (string) $enrollment['payment_mode'],
                'checkout_type' => $checkout['checkout_type'],
                'next_action' => 'mercado_pago',
                'checkout_url' => $checkout['checkout_url'],
            ],
        ];
    }

    /** @return array{http_status:int,body:array<string,mixed>} */
    private function definitiveFailureResponse(string $reference, string $reasonCode): array
    {
        return [
            'http_status' => 503,
            'body' => [
                'error' => [
                    'code' => $reasonCode,
                    'message' => 'No pudimos abrir Mercado Pago. Puedes intentarlo nuevamente; si el problema continúa, contacta al gimnasio.',
                    'retryable' => true,
                    'retry_mode' => 'new_idempotency_key',
                    'reference' => $reference,
                ],
            ],
        ];
    }

    /** @return array{http_status:int,body:array<string,mixed>} */
    private function uncertainCheckoutResponse(string $reference): array
    {
        return [
            'http_status' => 503,
            'body' => [
                'error' => [
                    'code' => 'checkout_creation_uncertain',
                    'message' => 'La respuesta de Mercado Pago quedó pendiente de conciliación. No inicies otro checkout; conserva la referencia y contacta al gimnasio.',
                    'retryable' => false,
                    'retry_mode' => 'reconcile_before_retry',
                    'reference' => $reference,
                ],
            ],
        ];
    }

    /** @return array{http_status:int,body:array<string,mixed>} */
    private function rejectedPreferenceResponse(string $reference): array
    {
        return [
            'http_status' => 409,
            'body' => [
                'error' => [
                    'code' => 'payment_rejected',
                    'message' => 'El pago no fue aprobado. Consulta el estado con tu referencia y reintenta allí con el mismo u otro medio de pago, sin completar nuevamente el formulario.',
                    'retryable' => false,
                    'retry_mode' => 'status_only',
                    'reference' => $reference,
                ],
            ],
        ];
    }

    /** @return array{http_status:int,body:array<string,mixed>} */
    private function rejectedSubscriptionResponse(string $reference): array
    {
        return [
            'http_status' => 409,
            'body' => [
                'error' => [
                    'code' => 'subscription_payment_rejected',
                    'message' => 'El pago no fue aprobado. Abre o consulta el estado con tu referencia y reintenta allí sin completar nuevamente el formulario.',
                    'retryable' => false,
                    'retry_mode' => 'status_only',
                    'reference' => $reference,
                ],
            ],
        ];
    }

    /** @return array{http_status:int,body:array<string,mixed>} */
    private function pendingCheckoutProbeResponse(string $reference, string $checkoutType): array
    {
        $code = $checkoutType === 'preference'
            ? 'preference_payment_status_check'
            : 'subscription_payment_status_check';
        return [
            'http_status' => 409,
            'body' => [
                'error' => [
                    'code' => $code,
                    'message' => 'La inscripción ya está guardada. Consulta su estado con la referencia para verificar el pago antes de continuar.',
                    'retryable' => false,
                    'retry_mode' => 'status_only',
                    'reference' => $reference,
                ],
            ],
        ];
    }

    /** @return array{http_status:int,body:array<string,mixed>} */
    private function lockedEnrollmentResponse(string $reference): array
    {
        return [
            'http_status' => 409,
            'body' => [
                'error' => [
                    'code' => 'checkout_reuse_blocked',
                    'message' => 'Esta inscripción ya avanzó a otro estado. No se abrirá nuevamente el checkout; consulta el estado con tu referencia.',
                    'retryable' => false,
                    'retry_mode' => 'status_only',
                    'reference' => $reference,
                ],
            ],
        ];
    }

    /** @return array{http_status:int,body:array<string,mixed>} */
    private function localDefinitiveFailureResponse(): array
    {
        return [
            'http_status' => 503,
            'body' => [
                'error' => [
                    'code' => 'local_checkout_unavailable',
                    'message' => 'El pago en línea no está disponible en este momento. Intenta nuevamente más tarde.',
                    'retryable' => true,
                    'retry_mode' => 'same_idempotency_key',
                ],
            ],
        ];
    }

    private function recordCheckoutFailure(int $id, string $status, string $errorCode, string $reference): bool
    {
        try {
            $this->enrollments->markCheckoutFailure($id, $status, $errorCode);
            return true;
        } catch (RuntimeException) {
            // No sobreescribir un estado que cambió por webhook u otro proceso concurrente.
            error_log('DGYM checkout failure CAS skipped ref=' . $reference);
            return false;
        }
    }
}
