<?php

declare(strict_types=1);

use DemoGym\App;
use DemoGym\Application\GatewayStateNotReadyException;
use DemoGym\Http\HttpException;
use DemoGym\Http\JsonResponse;
use DemoGym\Http\Request;
use DemoGym\Infrastructure\MercadoPagoApiException;
use DemoGym\Infrastructure\WebhookEventRepository;
use DemoGym\Security\WebhookQuery;
use DemoGym\Security\WebhookDedupe;
use DemoGym\Security\WebhookSignature;

$eventRow = null;
$app = null;

try {
    /** @var App $app */
    $app = require dirname(__DIR__) . '/loader.php';
    Request::assertMethod('POST');

    $dataId = WebhookQuery::dataId((string) ($_SERVER['QUERY_STRING'] ?? ''));
    $signature = Request::header('X-Signature');
    $requestId = Request::header('X-Request-Id');
    if ($dataId === null || !WebhookSignature::validate($signature, $requestId, $dataId, $app->config->mercadoPagoWebhookSecret())) {
        error_log('DGYM webhook invalid signature request_id=' . substr($requestId, 0, 100));
        throw new HttpException(401, 'invalid_signature', 'Notificación no autorizada.');
    }

    $payload = Request::jsonBody(65536);
    $topic = strtolower(trim((string) ($payload['type'] ?? $_GET['type'] ?? $_GET['topic'] ?? '')));
    $action = trim((string) ($payload['action'] ?? ''));
    $eventId = trim((string) ($payload['id'] ?? ''));
    $liveMode = ($payload['live_mode'] ?? false) === true;
    $safePayload = [
        'id' => $eventId === '' ? null : $eventId,
        'type' => $topic,
        'action' => $action,
        'live_mode' => $liveMode,
        'date_created' => isset($payload['date_created']) ? (string) $payload['date_created'] : null,
        'data' => ['id' => $dataId],
    ];
    $eventRow = $app->webhookEvents->register(WebhookDedupe::key($requestId, $dataId), [
        'event_id' => $eventId === '' ? null : substr($eventId, 0, 160),
        'request_id' => substr($requestId, 0, 160),
        'topic' => substr($topic, 0, 80),
        'action' => substr($action, 0, 120),
        'resource_id' => $dataId,
        'live_mode' => $liveMode,
        'payload' => $safePayload,
    ]);

    if (!$app->webhookEvents->acquire((int) $eventRow['id'])) {
        $eventStatus = $app->webhookEvents->status((int) $eventRow['id']);
        if (WebhookEventRepository::isTerminalStatus($eventStatus)) {
            JsonResponse::send(['received' => true]);
        }
        // Un proceso conserva el lease o falló antes de cerrarlo. Un 503 hace
        // que Mercado Pago reintente; acusar 200 aquí podría perder el evento.
        JsonResponse::send([
            'error' => ['code' => 'event_processing', 'message' => 'Reintentar notificación.'],
        ], 503);
    }
    $app->webhookProcessor->process((int) $eventRow['id'], $topic, $dataId);
    JsonResponse::send(['received' => true]);
} catch (HttpException $exception) {
    JsonResponse::error($exception);
} catch (GatewayStateNotReadyException $exception) {
    if ($app instanceof App && is_array($eventRow)) {
        $app->webhookEvents->finish(
            (int) $eventRow['id'],
            'failed_transient',
            null,
            null,
            'gateway_state_not_ready'
        );
    }
    error_log('DGYM webhook gateway state not ready');
    JsonResponse::send([
        'error' => ['code' => 'temporary_failure', 'message' => 'Reintentar notificación.'],
    ], 503);
} catch (MercadoPagoApiException $exception) {
    $permanentGatewayFailure = in_array($exception->httpStatus, [400, 422], true);
    $gatewayErrorCode = match ($exception->httpStatus) {
        401, 403 => 'gateway_authentication_failed',
        404 => 'gateway_resource_not_ready',
        400, 422 => 'gateway_request_rejected',
        default => 'gateway_query_failed',
    };
    if ($app instanceof App && is_array($eventRow)) {
        $app->webhookEvents->finish(
            (int) $eventRow['id'],
            $permanentGatewayFailure ? 'failed_permanent' : 'failed_transient',
            null,
            null,
            $gatewayErrorCode
        );
    }
    error_log('DGYM webhook gateway query failed http=' . $exception->httpStatus);
    if ($permanentGatewayFailure) {
        // 400/422 son solicitudes inválidas ya auditadas. Un 404 puede ser una
        // demora de propagación del recurso y se mantiene como transitorio.
        JsonResponse::send(['received' => true]);
    }
    // Incluye 401/403: la notificación debe reintentarse después de corregir las
    // credenciales y nunca acusarse como procesada por un fallo de autenticación.
    JsonResponse::send(['error' => ['code' => 'temporary_failure', 'message' => 'Reintentar notificación.']], 503);
} catch (Throwable $exception) {
    if ($app instanceof App && is_array($eventRow)) {
        $app->webhookEvents->finish((int) $eventRow['id'], 'failed_transient', null, null, 'internal_error');
    }
    error_log('DGYM webhook unhandled ' . get_class($exception));
    if (class_exists(JsonResponse::class)) {
        JsonResponse::send(['error' => ['code' => 'temporary_failure', 'message' => 'Reintentar notificación.']], 500);
    }
    dgym_public_json_failure();
}
