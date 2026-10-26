<?php

declare(strict_types=1);

use DemoGym\App;
use DemoGym\Http\HttpException;
use DemoGym\Http\JsonResponse;
use DemoGym\Http\Request;
use DemoGym\Infrastructure\WebhookEventRepository;
use DemoGym\Khipu\KhipuApiException;
use DemoGym\Khipu\KhipuClient;
use DemoGym\Khipu\KhipuPaymentProcessor;
use DemoGym\Khipu\KhipuSignature;
use DemoGym\Khipu\KhipuTransition;

$eventRow = null;
$app = null;

try {
    /** @var App $app */
    $app = require dirname(__DIR__) . '/loader.php';
    Request::assertMethod('POST');
    // Depende de las credenciales, no del gate: cerrar DGYM_KHIPU_ENABLED deja de
    // crear cobros, pero una transferencia ya iniciada debe seguir conciliándose.
    if (!$app->khipuEnrollment->configured()) {
        throw new HttpException(404, 'not_found', 'Recurso no disponible.', false);
    }

    $maxBytes = 65536;
    if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > $maxBytes) {
        throw new HttpException(413, 'invalid_request', 'La solicitud supera el tamaño permitido.', false);
    }
    // La firma cubre el cuerpo exactamente como llegó: se valida antes de decodificarlo.
    $rawBody = file_get_contents('php://input', false, null, 0, $maxBytes + 1);
    $signature = Request::header('X-Khipu-Signature');
    // Khipu reintenta hasta por dos días y no documenta si vuelve a firmar. Un aviso
    // repetido solo dispara un GET autenticado, así que la ventana cubre todo ese plazo.
    $toleranceMs = (48 * 3600 + 600) * 1000;
    if (!is_string($rawBody)
        || strlen($rawBody) > $maxBytes
        || !KhipuSignature::validate($signature, $rawBody, $app->config->khipuMerchantSecret(), (int) floor(microtime(true) * 1000), $toleranceMs)
    ) {
        error_log('DGYM khipu webhook invalid signature');
        throw new HttpException(401, 'invalid_signature', 'Notificación no autorizada.', false);
    }

    try {
        $payload = json_decode($rawBody, true, 16, JSON_THROW_ON_ERROR);
        $paymentId = KhipuClient::safePaymentId(is_array($payload) ? (string) ($payload['payment_id'] ?? '') : '');
    } catch (Throwable) {
        throw new HttpException(400, 'invalid_request', 'La notificación no es válida.', false);
    }

    // Cada entrega firmada trae su propio timestamp; un reintento de Khipu reutiliza
    // la misma fila y un aviso posterior del mismo pago vuelve a consultarlo.
    $signatureDigest = hash('sha256', $signature);
    $eventRow = $app->webhookEvents->register(hash('sha256', "dgym-khipu-webhook/1\n" . $paymentId . "\n" . $signatureDigest), [
        'event_id' => null,
        'request_id' => 'khipu-' . substr($signatureDigest, 0, 32),
        'topic' => 'khipu.payment',
        'action' => 'khipu.payment.notification',
        'resource_id' => $paymentId,
        'live_mode' => $app->config->khipuCredentialEnvironment() === 'production',
        'payload' => ['source' => 'khipu_webhook', 'payment_id' => $paymentId, 'signature_verified' => true],
    ]);

    if (!$app->webhookEvents->acquire((int) $eventRow['id'])) {
        if (WebhookEventRepository::isTerminalStatus($app->webhookEvents->status((int) $eventRow['id']))) {
            JsonResponse::send(['received' => true]);
        }
        // Khipu reintenta hasta por dos días mientras no reciba 200.
        JsonResponse::send(['error' => ['code' => 'event_processing', 'message' => 'Reintentar notificación.']], 503);
    }

    $result = $app->khipuPayments->refresh($paymentId, 'webhook');
    $eventStatus = match ($result['outcome']) {
        KhipuPaymentProcessor::UNMATCHED => 'unmatched',
        KhipuTransition::REVIEW => 'review_required',
        default => $result['state'] === 'review_required' ? 'review_required' : 'processed',
    };
    $app->webhookEvents->finish(
        (int) $eventRow['id'],
        $eventStatus,
        $result['enrollment_id'],
        $result['snapshot'],
        $eventStatus === 'processed' ? null : ($result['snapshot']['error_code'] ?? $result['snapshot']['reason'] ?? 'khipu_review_required')
    );
    JsonResponse::send(['received' => true]);
} catch (HttpException $exception) {
    JsonResponse::error($exception);
} catch (KhipuApiException $exception) {
    $permanent = in_array($exception->httpStatus, [400, 422], true);
    if ($app instanceof App && is_array($eventRow)) {
        $app->webhookEvents->finish(
            (int) $eventRow['id'],
            $permanent ? 'failed_permanent' : 'failed_transient',
            null,
            null,
            match ($exception->httpStatus) {
                401, 403 => 'gateway_authentication_failed',
                404 => 'gateway_resource_not_ready',
                400, 422 => 'gateway_request_rejected',
                default => 'gateway_query_failed',
            }
        );
    }
    error_log('DGYM khipu webhook gateway query failed http=' . $exception->httpStatus);
    if ($permanent) {
        JsonResponse::send(['received' => true]);
    }
    JsonResponse::send(['error' => ['code' => 'temporary_failure', 'message' => 'Reintentar notificación.']], 503);
} catch (Throwable $exception) {
    if ($app instanceof App && is_array($eventRow)) {
        $app->webhookEvents->finish((int) $eventRow['id'], 'failed_transient', null, null, 'internal_error');
    }
    error_log('DGYM khipu webhook unhandled ' . get_class($exception));
    if (class_exists(JsonResponse::class)) {
        JsonResponse::send(['error' => ['code' => 'temporary_failure', 'message' => 'Reintentar notificación.']], 500);
    }
    dgym_public_json_failure();
}
