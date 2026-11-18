<?php

declare(strict_types=1);

use DemoGym\App;
use DemoGym\Domain\EnrollmentReference;
use DemoGym\Http\HttpException;
use DemoGym\Http\JsonResponse;
use DemoGym\Http\Request;

try {
    set_time_limit(45);
    /** @var App $app */
    $app = require dirname(__DIR__) . '/loader.php';
    Request::assertMethod('POST');
    if (Request::header('Origin') === '') {
        throw new HttpException(403, 'invalid_origin', 'Origen no permitido.');
    }
    Request::assertSameOrigin($app->config->allowedOrigin());
    $payload = Request::jsonBody(2048);
    $reference = $payload['reference'] ?? null;
    if (!is_string($reference)) {
        throw new HttpException(422, 'invalid_request', 'La referencia es obligatoria.');
    }
    $clientIp = Request::clientIp();
    $referenceDigest = hash('sha256', strtoupper(trim($reference)));
    $windowSeconds = $app->config->paymentRetryRateLimitWindowSeconds();
    $globalAllowed = $app->rateLimiter->consume(
        $clientIp,
        $app->config->rateLimitSecret(),
        $app->config->paymentRetryGlobalRateLimitMax(),
        $windowSeconds,
        'payment-retry-global'
    );
    $referenceAllowed = $globalAllowed && $app->rateLimiter->consume(
        $clientIp . '|' . $referenceDigest,
        $app->config->rateLimitSecret(),
        $app->config->paymentRetryRateLimitMax(),
        $windowSeconds,
        'payment-retry-reference'
    );
    if (!$referenceAllowed) {
        throw new HttpException(429, 'rate_limited', 'Demasiados intentos. Espera unos minutos antes de reintentar.');
    }
    // Una transferencia Khipu no tiene checkout que reemplazar: solo se vuelve a
    // leer el pago y, si sigue sin iniciarse, se devuelve el mismo enlace.
    $normalizedReference = strtoupper(trim($reference));
    $result = EnrollmentReference::isValid($normalizedReference) && $app->khipuEnrollment->handles($normalizedReference)
        ? $app->khipuEnrollment->resume($normalizedReference)
        : $app->paymentRetry->retry($reference, Request::header('X-Idempotency-Key'));
    JsonResponse::send($result['body'], $result['http_status']);
} catch (HttpException $exception) {
    JsonResponse::error($exception);
} catch (Throwable $exception) {
    error_log('DGYM payment retry unhandled ' . get_class($exception));
    if (class_exists(JsonResponse::class)) {
        JsonResponse::error(new HttpException(
            503,
            'payment_retry_unavailable',
            'No pudimos preparar el reintento con el mismo u otro medio de pago. Conserva tu referencia y consulta al gimnasio.',
            true,
            'same_idempotency_key'
        ));
    }
    dgym_public_json_failure();
}
