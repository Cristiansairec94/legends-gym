<?php

declare(strict_types=1);

namespace DemoGym\Khipu;

use DateTimeImmutable;
use DateTimeZone;
use DemoGym\Config;
use DemoGym\Domain\EnrollmentReference;
use DemoGym\Domain\PriceCatalog;
use DemoGym\Domain\Uuid;
use DemoGym\Http\HttpException;
use PDOException;
use Throwable;

/**
 * Inscripción pagada por transferencia Khipu (pago único y prepago).
 *
 * Un POST de creación que falla o queda incierto nunca entrega la URL de pago:
 * nadie puede pagar ese cobro, así que el socio puede iniciar otro intento sin
 * riesgo de duplicado. Si aun así llegara dinero, el webhook lo asocia por la
 * referencia y lo deja visible.
 */
final class KhipuEnrollmentService
{
    public function __construct(
        private readonly Config $config,
        private readonly PriceCatalog $catalog,
        private readonly KhipuStore $store,
        private readonly KhipuClient $client,
        private readonly KhipuRequestFactory $requests,
        private readonly KhipuPaymentProcessor $processor,
        private readonly ?\Closure $clock = null
    ) {
    }

    /** Hay credenciales Khipu en esta instalación. No abre el medio de pago por sí solo. */
    public function configured(): bool
    {
        try {
            $this->config->assertKhipuLocalConfiguration();
            return true;
        } catch (Throwable) {
            return false;
        }
    }

    /** Gate abierto, credenciales válidas y esquema aplicado: se pueden crear cobros nuevos. */
    public function available(): bool
    {
        try {
            return $this->config->khipuEnabled() && $this->configured() && $this->store->schemaReady();
        } catch (Throwable) {
            return false;
        }
    }

    /** La referencia pertenece a una inscripción Khipu. Nunca consulta si Khipu no está configurado. */
    public function handles(string $reference): bool
    {
        if (!EnrollmentReference::isValid($reference) || !$this->configured()) {
            return false;
        }
        try {
            return $this->store->findByReference($reference) !== null;
        } catch (Throwable) {
            return false;
        }
    }

    /**
     * @param array<string, mixed> $input Solicitud ya validada por EnrollmentRequestValidator.
     * @return array{http_status:int,body:array<string,mixed>}
     */
    public function create(array $input, string $idempotencyHash, string $fingerprint): array
    {
        if (!in_array((string) ($input['payment_mode'] ?? ''), $this->config->khipuTransferModes(), true)) {
            throw new HttpException(422, 'payment_provider_not_enabled', 'La transferencia no está disponible para esta forma de pago.');
        }
        if (!$this->available()) {
            return $this->unavailableResponse();
        }

        try {
            $existing = $this->store->findByIdempotencyHash($idempotencyHash);
        } catch (Throwable) {
            error_log('DGYM khipu idempotency lookup failed');
            return $this->unavailableResponse();
        }
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
            $expiresAt = $this->now()->modify('+' . $this->config->khipuPaymentExpiryHours() . ' hours');
            // Todo lo que puede fallar localmente se resuelve antes del INSERT.
            $payload = $this->requests->transferPayment($offer, $reference, $expiresAt);
            $receiverId = $this->config->khipuReceiverId();
        } catch (Throwable $exception) {
            error_log('DGYM khipu local preparation failed type=' . get_class($exception));
            return $this->unavailableResponse();
        }

        try {
            $enrollment = $this->store->createEnrollment($input, $offer, $publicId, $reference, $idempotencyHash, $fingerprint);
        } catch (PDOException $exception) {
            if ($exception->getCode() !== '23000') {
                error_log('DGYM khipu enrollment persistence failed');
                return $this->unavailableResponse();
            }
            try {
                $raceWinner = $this->store->findByIdempotencyHash($idempotencyHash);
            } catch (Throwable) {
                $raceWinner = null;
            }
            return $raceWinner === null ? $this->unavailableResponse() : $this->existingResponse($raceWinner, $fingerprint);
        } catch (Throwable $exception) {
            error_log('DGYM khipu enrollment persistence failed type=' . get_class($exception));
            return $this->unavailableResponse();
        }
        $enrollmentId = (int) $enrollment['id'];

        try {
            $created = $this->client->createPayment($payload);
            $paymentId = KhipuClient::safePaymentId((string) $created['payment_id']);
            // La respuesta del POST no basta: un GET autenticado debe devolver la
            // misma cuenta de cobro, referencia, moneda y monto antes de entregar la URL.
            $confirmed = $this->client->getPayment($paymentId);
            if (!is_string($confirmed['payment_id'] ?? null) || !hash_equals($paymentId, $confirmed['payment_id'])) {
                throw new KhipuDataMismatchException('payment_id');
            }
            $classification = KhipuPaymentVerification::classify($confirmed, $receiverId, $reference, (int) $offer['today_amount']);
            if ($classification !== KhipuPaymentVerification::PENDING) {
                throw new KhipuDataMismatchException('status');
            }
            $paymentUrl = KhipuPaymentProcessor::trustedPaymentUrl($confirmed['payment_url'] ?? null);
            if ($paymentUrl === null) {
                throw new KhipuDataMismatchException('payment_url');
            }
            $this->store->markCheckoutReady($enrollmentId, $paymentId, $paymentUrl);
        } catch (KhipuApiException $exception) {
            $configurationError = $exception->httpStatus >= 400
                && $exception->httpStatus < 500
                && !in_array($exception->httpStatus, [408, 409, 429], true);
            error_log(sprintf('DGYM khipu checkout failure ref=%s http=%d', $reference, $exception->httpStatus));
            return $this->creationFailed($enrollmentId, $reference, $configurationError ? 'service_not_configured' : 'khipu_unavailable');
        } catch (KhipuDataMismatchException $exception) {
            error_log('DGYM khipu checkout mismatch ref=' . $reference . ' field=' . $exception->field);
            return $this->creationFailed($enrollmentId, $reference, 'service_not_configured');
        } catch (Throwable $exception) {
            error_log('DGYM khipu checkout request failed ref=' . $reference . ' type=' . get_class($exception));
            return $this->creationFailed($enrollmentId, $reference, 'khipu_unavailable');
        }

        return [
            'http_status' => 201,
            'body' => $this->checkoutBody($enrollment, $paymentUrl),
        ];
    }

    /**
     * Verifica el pago desde la página de estado y, si sigue sin iniciarse,
     * devuelve el mismo enlace recién leído desde Khipu. Nunca crea otro cobro.
     *
     * @return array{http_status:int,body:array<string,mixed>}
     */
    public function resume(string $reference): array
    {
        $reference = strtoupper(trim($reference));
        if (!EnrollmentReference::isValid($reference)) {
            throw new HttpException(422, 'invalid_request', 'La referencia no es válida.');
        }
        if (!$this->configured() || !$this->store->schemaReady()) {
            throw new HttpException(
                503,
                'payment_retry_unavailable',
                'No pudimos comprobar el pago por transferencia. Conserva tu referencia e inténtalo nuevamente.',
                true,
                'same_idempotency_key'
            );
        }
        $enrollment = $this->store->findByReference($reference);
        if ($enrollment === null) {
            throw new HttpException(404, 'not_found', 'No encontramos esa inscripción.', false, 'status_only');
        }
        $charge = $this->store->findTransferCharge((int) $enrollment['id']);
        $paymentId = trim((string) ($charge['khipu_payment_id'] ?? ''));
        if ($paymentId === '') {
            throw new HttpException(
                409,
                'payment_retry_not_allowed',
                'Esta inscripción no tiene un pago por transferencia abierto. Puedes iniciar una nueva inscripción.',
                false,
                'status_only'
            );
        }

        try {
            $result = $this->processor->refresh($paymentId, 'status_page');
        } catch (KhipuApiException $exception) {
            error_log('DGYM khipu resume lookup failed ref=' . $reference . ' http=' . $exception->httpStatus);
            throw new HttpException(
                503,
                'payment_retry_unavailable',
                'No pudimos consultar el pago en Khipu. Conserva tu referencia e inténtalo nuevamente.',
                true,
                'same_idempotency_key'
            );
        }
        if ($result['enrollment_id'] !== (int) $enrollment['id']) {
            throw new HttpException(409, 'payment_retry_review_required', 'El gimnasio debe revisar este pago.', false, 'status_only');
        }

        return match ($result['outcome']) {
            KhipuTransition::APPROVED => throw new HttpException(
                409, 'payment_already_received', 'Ya recibimos tu transferencia. Estamos actualizando el estado.', false, 'status_only'
            ),
            KhipuTransition::VERIFYING => throw new HttpException(
                409, 'payment_confirmation_pending', 'Khipu está verificando tu transferencia. No inicies otro pago.', false, 'status_only'
            ),
            KhipuTransition::PENDING => $this->resumeBody($enrollment, $result['payment_url']),
            KhipuTransition::REJECTED, KhipuTransition::EXPIRED => throw new HttpException(
                409, 'payment_retry_not_allowed', 'Este enlace de pago ya no está vigente. Puedes iniciar una nueva inscripción.', false, 'status_only'
            ),
            default => throw new HttpException(
                409, 'payment_retry_review_required', 'El gimnasio debe revisar este pago antes de continuar.', false, 'status_only'
            ),
        };
    }

    /**
     * @param array<string, mixed> $enrollment
     * @return array{http_status:int,body:array<string,mixed>}
     */
    private function resumeBody(array $enrollment, ?string $paymentUrl): array
    {
        if ($paymentUrl === null || !$this->config->khipuEnabled() || !$this->config->checkoutEnabled()) {
            throw new HttpException(
                409,
                'payment_retry_not_allowed',
                'El pago por transferencia no está disponible en este momento. Conserva tu referencia y consulta al gimnasio.',
                false,
                'status_only'
            );
        }
        return ['http_status' => 200, 'body' => $this->checkoutBody($enrollment, $paymentUrl)];
    }

    /** @param array<string, mixed> $enrollment @return array<string, mixed> */
    private function checkoutBody(array $enrollment, string $paymentUrl): array
    {
        return [
            'enrollment_id' => (string) $enrollment['public_id'],
            'reference' => (string) $enrollment['reference'],
            'payment_mode' => (string) $enrollment['payment_mode'],
            'payment_provider' => KhipuRepository::PROVIDER,
            'checkout_type' => KhipuRepository::CHECKOUT_TYPE,
            'next_action' => 'khipu',
            'checkout_url' => $paymentUrl,
        ];
    }

    /** @param array<string, mixed> $existing @return array{http_status:int,body:array<string,mixed>} */
    private function existingResponse(array $existing, string $fingerprint): array
    {
        if (!hash_equals((string) ($existing['request_fingerprint'] ?? ''), $fingerprint)
            || (string) ($existing['payment_provider'] ?? '') !== KhipuRepository::PROVIDER
        ) {
            throw new HttpException(
                409,
                'idempotency_conflict',
                'La misma Idempotency-Key ya fue usada con otros datos.',
                true,
                'new_idempotency_key'
            );
        }
        $reference = (string) ($existing['reference'] ?? '');
        if ((string) ($existing['status'] ?? '') === 'checkout_creation_failed') {
            return $this->failureBody($reference);
        }
        // Nunca se reexpone desde aquí una URL persistida: la página de estado
        // vuelve a leer el pago en Khipu antes de continuar.
        return [
            'http_status' => 409,
            'body' => [
                'error' => [
                    'code' => 'khipu_payment_status_check',
                    'message' => 'La inscripción ya está guardada. Consulta su estado con la referencia para verificar la transferencia antes de continuar.',
                    'retryable' => false,
                    'retry_mode' => 'status_only',
                    'reference' => $reference,
                ],
            ],
        ];
    }

    /** @return array{http_status:int,body:array<string,mixed>} */
    private function creationFailed(int $enrollmentId, string $reference, string $reasonCode): array
    {
        try {
            $this->store->markCheckoutFailure($enrollmentId, $reasonCode);
        } catch (Throwable) {
            error_log('DGYM khipu checkout failure CAS skipped ref=' . $reference);
        }
        return $this->failureBody($reference);
    }

    /**
     * El motivo interno queda en error_code y en el log; el navegador recibe
     * siempre el mismo código porque para el socio la acción es la misma.
     *
     * @return array{http_status:int,body:array<string,mixed>}
     */
    private function failureBody(string $reference): array
    {
        return [
            'http_status' => 503,
            'body' => [
                'error' => [
                    'code' => 'khipu_unavailable',
                    'message' => 'No pudimos abrir el pago por transferencia. Puedes intentarlo nuevamente o elegir otro medio de pago.',
                    'retryable' => true,
                    'retry_mode' => 'new_idempotency_key',
                    'reference' => $reference,
                ],
            ],
        ];
    }

    /** @return array{http_status:int,body:array<string,mixed>} */
    private function unavailableResponse(): array
    {
        return [
            'http_status' => 503,
            'body' => [
                'error' => [
                    'code' => 'payment_provider_unavailable',
                    'message' => 'El pago por transferencia no está disponible en este momento. Puedes elegir otro medio de pago.',
                    'retryable' => true,
                    'retry_mode' => 'same_idempotency_key',
                ],
            ],
        ];
    }

    private function now(): DateTimeImmutable
    {
        $now = $this->clock === null ? new DateTimeImmutable('now') : ($this->clock)();
        return $now->setTimezone(new DateTimeZone('UTC'));
    }
}
