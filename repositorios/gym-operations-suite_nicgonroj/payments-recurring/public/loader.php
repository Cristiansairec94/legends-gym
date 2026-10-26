<?php

declare(strict_types=1);

use DemoGym\App;

// Defensa compatible con FPM/Apache: ningún error interno debe renderizarse
// en una respuesta pública, pero sí quedar en el log privado del servidor.
ini_set('display_errors', '0');
ini_set('log_errors', '1');

$dgymLoaderPath = realpath(__FILE__);
$dgymEntryPathValue = (string) ($_SERVER['SCRIPT_FILENAME'] ?? '');
$dgymEntryPath = $dgymEntryPathValue !== '' ? realpath($dgymEntryPathValue) : false;
$dgymDirectByName = basename((string) ($_SERVER['SCRIPT_NAME'] ?? '')) === basename(__FILE__);
if (
    PHP_SAPI !== 'cli'
    && (
        (is_string($dgymLoaderPath) && is_string($dgymEntryPath) && hash_equals($dgymLoaderPath, $dgymEntryPath))
        || $dgymDirectByName
    )
) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    exit;
}

if (!function_exists('dgym_public_json_failure')) {
    function dgym_public_json_failure(): never
    {
        http_response_code(503);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store, max-age=0');
        header('X-Content-Type-Options: nosniff');
        echo '{"error":{"code":"service_not_configured","message":"El servicio no está disponible.","retryable":false,"retry_mode":"reconcile_before_retry"}}';
        exit;
    }
}

if (!function_exists('dgym_public_html_failure')) {
    function dgym_public_html_failure(): never
    {
        http_response_code(503);
        header('Content-Type: text/html; charset=utf-8');
        header('Cache-Control: no-store, max-age=0');
        header('X-Content-Type-Options: nosniff');
        echo '<!doctype html><html lang="es"><meta charset="utf-8"><title>Servicio no disponible</title><body><h1>Servicio temporalmente no disponible</h1><p>Intenta nuevamente más tarde.</p></body></html>';
        exit;
    }
}

$configuredRoot = getenv('DGYM_APP_ROOT');
$candidate = is_string($configuredRoot) ? trim($configuredRoot) : '';
$appRoot = realpath($candidate);
$publicRoot = realpath(__DIR__);
$documentRootValue = isset($_SERVER['DOCUMENT_ROOT']) && is_string($_SERVER['DOCUMENT_ROOT'])
    ? trim($_SERVER['DOCUMENT_ROOT'])
    : '';
$documentRoot = $documentRootValue === '' ? false : realpath($documentRootValue);

if (
    $candidate === ''
    || !str_starts_with($candidate, DIRECTORY_SEPARATOR)
    || $appRoot === false
    || $publicRoot === false
    || ($documentRootValue !== '' && $documentRoot === false)
    || !str_starts_with($appRoot, DIRECTORY_SEPARATOR)
    || ($appRoot === $publicRoot || str_starts_with($appRoot, $publicRoot . DIRECTORY_SEPARATOR))
    || ($documentRoot !== false && ($appRoot === $documentRoot || str_starts_with($appRoot, $documentRoot . DIRECTORY_SEPARATOR)))
    || !is_file($appRoot . '/bootstrap.php')
    || !is_readable($appRoot . '/bootstrap.php')
) {
    throw new RuntimeException('DGYM_APP_ROOT no apunta a una aplicación privada válida.');
}

/** @var App $app */
$autoload = $appRoot . '/autoload.php';
if (!is_file($autoload) || !is_readable($autoload)) {
    throw new RuntimeException('La aplicación privada no contiene autoload.php.');
}
require_once $autoload;
$app = require $appRoot . '/bootstrap.php';
return $app;
