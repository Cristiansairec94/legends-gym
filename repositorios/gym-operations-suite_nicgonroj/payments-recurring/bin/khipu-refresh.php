#!/usr/bin/env php
<?php
declare(strict_types=1);
// Respaldo del webhook de Khipu: vuelve a leer por GET los cobros por transferencia
// que siguen abiertos. Pensado para cron cada 10–15 minutos; no crea ni modifica cobros en Khipu.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
ini_set('display_errors', '0');
$options = getopt('', ['limit:', 'help']);
if (isset($options['help'])) {
    echo "php bin/khipu-refresh.php [--limit=50]\n";
    echo "Private DGYM_PRIVATE_CONFIG_FILE. JSON dgym-khipu-refresh/1. Exit 0=ok; 2=some lookups failed; 1=runtime error.\n";
    exit(0);
}
$limit = (string) ($options['limit'] ?? '50');
try {
    if (!preg_match('/^[1-9][0-9]{0,2}$/D', $limit) || (int) $limit > 200) throw new InvalidArgumentException('invalid_arguments');
    $app = require dirname(__DIR__) . '/bootstrap.php';
    // Depende de las credenciales, no del gate: un cobro ya entregado se concilia igual.
    if (!$app->khipuEnrollment->configured()) {
        $result = ['schema' => 'dgym-khipu-refresh/1', 'status' => 'skipped', 'reason' => 'khipu_not_configured', 'checked' => 0, 'failed' => 0, 'outcomes' => []];
        $exit = 0;
    } else {
        $result = ['schema' => 'dgym-khipu-refresh/1', 'status' => 'ok'] + $app->khipuPayments->sweep((int) $limit);
        $exit = $result['failed'] > 0 ? 2 : 0;
        if ($exit === 2) $result['status'] = 'incomplete';
    }
} catch (Throwable $error) {
    $exit = 1;
    $result = ['schema' => 'dgym-khipu-refresh/1', 'status' => 'failed',
        'error' => $error instanceof InvalidArgumentException ? 'invalid_arguments' : 'refresh_unavailable', 'checked' => 0, 'failed' => 0, 'outcomes' => []];
}
$result['finishedAt'] = gmdate('Y-m-d\TH:i:s\Z');
echo json_encode($result, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES) . "\n";
exit($exit);
