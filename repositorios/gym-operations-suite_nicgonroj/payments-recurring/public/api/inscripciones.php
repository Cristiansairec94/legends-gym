<?php

declare(strict_types=1);

use DemoGym\App;
use DemoGym\Http\HttpException;
use DemoGym\Http\JsonResponse;
use DemoGym\Http\Request;

try {
    /** @var App $app */
    $app = require dirname(__DIR__) . '/loader.php';
    Request::assertMethod('POST');
    // Los navegadores modernos envían Origin también en POST same-origin. Exigirlo
    // evita que formularios cross-site y clientes sin contexto de origen alcancen
    // el rate limiter o el flujo que crea un checkout.
    if (Request::header('Origin') === '') {
        throw new HttpException(403, 'invalid_origin', 'Origen no permitido.');
    }
    Request::assertSameOrigin($app->config->allowedOrigin());
    if (!$app->rateLimiter->consume(
        Request::clientIp(),
        $app->config->rateLimitSecret(),
        $app->config->rateLimitMax(),
        $app->config->rateLimitWindowSeconds(),
        'enrollment-create'
    )) {
        throw new HttpException(429, 'rate_limited', 'Demasiados intentos. Espera unos minutos antes de reintentar.');
    }

    $payload = Request::jsonBody();
    $idempotencyKey = Request::header('X-Idempotency-Key');
    $result = $app->createEnrollment->create($payload, $idempotencyKey);
    JsonResponse::send($result['body'], $result['http_status']);
} catch (HttpException $exception) {
    JsonResponse::error($exception);
} catch (Throwable $exception) {
    error_log('DGYM inscripciones unhandled ' . get_class($exception));
    if (class_exists(JsonResponse::class)) {
        JsonResponse::error(new HttpException(
            503,
            'service_not_configured',
            'El servicio de inscripción no está disponible.',
            false,
            'reconcile_before_retry'
        ));
    }
    dgym_public_json_failure();
}
