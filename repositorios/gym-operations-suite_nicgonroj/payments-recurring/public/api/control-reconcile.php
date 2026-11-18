<?php
declare(strict_types=1);

// Server-to-server ONLY. Browser users are authorized by el panel operativo before it signs this POST.
// This endpoint performs provider GETs and local verification only: no monetary mutations.
use DemoGym\Application\ReconciliationService;
use DemoGym\Infrastructure\ManualReconciliationAuth;

ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: private, no-store');
header('X-Content-Type-Options: nosniff');
$authenticated = false; $key = ''; $timestamp = ''; $nonce = ''; $target = '';
$status = 503; $result = ['error' => 'reconciliation_unavailable'];
try {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') { $status = 405; $result = ['error' => 'method']; }
    else {
        $raw = file_get_contents('php://input', false, null, 0, 4097);
        if (!is_string($raw) || strlen($raw) > 4096) { $status = 413; $result = ['error' => 'request_too_large']; }
        else {
            /** @var DemoGym\App $app */
            $app = require dirname(__DIR__) . '/loader.php';
            $decodedKey = base64_decode(strtr((string) (getenv('DGYM_CONTROL_SYNC_KEY') ?: ''), '-_', '+/'), true);
            if (!is_string($decodedKey) || strlen($decodedKey) !== 32) throw new RuntimeException('not_configured');
            $key = $decodedKey;
            $timestamp = (string) ($_SERVER['HTTP_X_DEMOGYM_TIMESTAMP'] ?? '');
            $nonce = (string) ($_SERVER['HTTP_X_DEMOGYM_NONCE'] ?? '');
            $target = (string) ($_SERVER['REQUEST_URI'] ?? '');
            $authenticated = ManualReconciliationAuth::authenticate('POST', $target, $raw, $timestamp, $nonce, (string) ($_SERVER['HTTP_X_DEMOGYM_SIGNATURE'] ?? ''), $key);
            if (!$authenticated) { $status = 401; $result = ['error' => 'authentication']; }
            else {
                $request = ManualReconciliationAuth::payload($raw);
                if (!ManualReconciliationAuth::consumeNonce($appRoot, $nonce)) {
                    $status = 409; $result = ['error' => 'request_replayed'];
                } elseif (!$app->rateLimiter->consume('control-manual-global', $key, 20, 60)) {
                    $status = 429; $result = ['error' => 'rate_limited'];
                } else {
                    if (function_exists('set_time_limit')) @set_time_limit(55);
                    $service = new ReconciliationService($app->config, $app->pdo, $app->enrollments, $app->webhookEvents);
                    $result = $service->run($request['runId'], $request['afterId'], 1, $request['enrollmentPublicId'], 45, 'manual');
                    $status = match ($result['status']) { 'busy' => 409, 'error' => $result['error'] === 'enrollment_not_found' ? 404 : 503, default => 200 };
                }
            }
        }
    }
} catch (InvalidArgumentException) { $status = 400; $result = ['error' => 'invalid_request']; }
catch (Throwable) { $status = 503; $result = ['error' => 'reconciliation_unavailable']; }
http_response_code($status);
$body = json_encode($result, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES);
if ($authenticated) header('X-360-Signature: ' . ManualReconciliationAuth::sign(implode("\n", ['v1', 'response', $target, $timestamp, $nonce, hash('sha256', $body)]), $key));
echo $body;
