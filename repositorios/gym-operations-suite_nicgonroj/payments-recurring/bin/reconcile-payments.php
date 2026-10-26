#!/usr/bin/env php
<?php
declare(strict_types=1);
// Private CLI adapter: identical verifier, lock and idempotency as the signed manual endpoint.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
ini_set('display_errors', '0');
use DemoGym\Application\ReconciliationService;
$options = getopt('', ['after-id:', 'limit:', 'run-id:', 'help']);
if (isset($options['help'])) {
    echo "php bin/reconcile-payments.php --run-id=RUN_ID [--after-id=0] [--limit=10]\n";
    echo "Private DGYM_PRIVATE_CONFIG_FILE. JSON dgym-payment-reconciliation/1. Exit 0=success; 2=incomplete; 1=runtime error.\n";
    exit(0);
}
$runId = (string) ($options['run-id'] ?? gmdate('Ymd\THi', (int) (floor(time() / 300) * 300)));
$after = (string) ($options['after-id'] ?? '0'); $limit = (string) ($options['limit'] ?? '10');
try {
    if (!preg_match('/^(0|[1-9][0-9]{0,14})$/D', $after) || !preg_match('/^[1-9][0-9]?$/D', $limit) || (int) $limit > 50
        || !preg_match('/^[A-Za-z0-9_-]{8,80}$/D', $runId)) throw new InvalidArgumentException('invalid_arguments');
    $app = require dirname(__DIR__) . '/bootstrap.php';
    $result = (new ReconciliationService($app->config, $app->pdo, $app->enrollments, $app->webhookEvents))->run($runId, (int) $after, (int) $limit, null, 165, 'cli');
    $exit = in_array($result['status'], ['complete', 'replayed'], true) ? 0 : ($result['status'] === 'incomplete' ? 2 : 1);
    $result['schema'] = 'dgym-payment-reconciliation/1';
    $result['status'] = $exit === 0 ? 'ok' : ($exit === 2 ? 'incomplete' : 'failed');
} catch (Throwable $error) {
    $exit = 1; $result = ['schema'=>'dgym-payment-reconciliation/1','runId'=>$runId,'status'=>'failed',
        'error'=>$error instanceof InvalidArgumentException ? 'invalid_arguments' : 'reconciliation_unavailable',
        'processed'=>0,'complete'=>0,'incomplete'=>0,'replayed'=>0,'nextAfterId'=>0,'hasMore'=>false,'finishedAt'=>gmdate('Y-m-d\TH:i:s\Z')];
}
echo json_encode($result, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES) . "\n";
exit($exit);
