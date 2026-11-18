<?php

declare(strict_types=1);

use DemoGym\App;
use DemoGym\Domain\EnrollmentReference;
use DemoGym\Http\HttpException;
use DemoGym\Http\JsonResponse;
use DemoGym\Http\Request;

try {
    /** @var App $app */
    $app = require dirname(__DIR__) . '/loader.php';
    Request::assertMethod('GET');
    Request::assertSameOrigin($app->config->allowedOrigin());
    $reference = strtoupper(trim((string) ($_GET['ref'] ?? '')));
    if (!EnrollmentReference::isValid($reference)) {
        throw new HttpException(422, 'invalid_request', 'La referencia no es válida.');
    }
    $enrollment = $app->enrollments->findByReference($reference);
    if ($enrollment === null) {
        throw new HttpException(404, 'not_found', 'No encontramos esa inscripción.');
    }
    JsonResponse::send($app->statusPresenter->present($enrollment));
} catch (HttpException $exception) {
    JsonResponse::error($exception);
} catch (Throwable $exception) {
    error_log('DGYM estado unhandled ' . get_class($exception));
    if (class_exists(JsonResponse::class)) {
        JsonResponse::error(new HttpException(503, 'service_not_configured', 'No pudimos consultar el estado.'));
    }
    dgym_public_json_failure();
}
