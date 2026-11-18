<?php

declare(strict_types=1);

use DemoGym\App;
use DemoGym\Domain\EnrollmentReference;

/** @var App $app */
try {
    $app = require __DIR__ . '/loader.php';
} catch (Throwable) {
    if (function_exists('dgym_public_html_failure')) {
        dgym_public_html_failure();
    }
    http_response_code(503);
    exit;
}
$config = $app->config;
$reference = strtoupper(trim((string) ($_GET['ref'] ?? $_GET['external_reference'] ?? '')));
if (!EnrollmentReference::isValid($reference)) {
    $reference = '';
}
$continueCheckout = $reference !== '' && (string) ($_GET['continue'] ?? '') === '1';
header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
header('Cache-Control: no-store, max-age=0');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
?>
<!doctype html>
<html lang="es-CL">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Te llevamos a Mercado Pago · Demo Gym</title>
  <link rel="stylesheet" href="assets/retorno.css">
</head>
<body>
  <main class="card" data-reference="<?= htmlspecialchars($reference, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?>" data-auto-continue="<?= $continueCheckout ? 'true' : 'false' ?>" aria-busy="true">
    <p class="eyebrow">DEMO GYM</p>
    <h1 id="status-title">Te llevamos a Mercado Pago</h1>
    <p id="status-message">Tus datos fueron recibidos. Tu inscripción se completará cuando Mercado Pago confirme el pago.</p>
    <div class="reference" id="reference"<?= $reference === '' ? ' hidden' : '' ?>>
      <span><small>Referencia para soporte</small><?= htmlspecialchars($reference, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?></span>
      <button class="copy-reference" id="copy-reference" type="button" aria-label="Copiar referencia para soporte">Copiar</button>
    </div>
    <div class="status" id="status-indicator" role="status" aria-live="polite" aria-atomic="true">Preparando pago seguro…</div>
    <div class="actions">
      <a class="button" id="retry-payment" href="#" hidden>Continuar a Mercado Pago</a>
      <button class="button" id="restart-payment" type="button" aria-controls="status-indicator" hidden>Reintentar con el mismo u otro medio de pago</button>
      <button class="button" id="retry-status" type="button" aria-controls="status-indicator" hidden disabled>Consultar nuevamente</button>
    </div>
  </main>
  <script src="assets/return-status.js?v=20261009-same-tab1" defer></script>
</body>
</html>
