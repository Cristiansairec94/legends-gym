<?php

/**
 * Run the inactive-member maintenance task.
 *
 * Web requests must be authenticated administrator POST requests with a CSRF
 * token. Scheduled jobs may execute this file directly with PHP CLI.
 */

require_once __DIR__ . '/security.php';

$isCli = PHP_SAPI === 'cli';
if (!$isCli) {
    security_require_roles(['Admin']);
    security_headers();
    header('Content-Type: application/json');
    header('Cache-Control: no-store');

    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        header('Allow: POST');
        security_json_error(405, 'Method not allowed');
    }
    security_require_csrf();
}

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/activity_tracker.php';
date_default_timezone_set('Asia/Manila');

try {
    $deactivatedCount = runAutomaticDeactivation($conn);

    if ($isCli) {
        fwrite(STDOUT, "Automatic deactivation complete: {$deactivatedCount} account(s) updated.\n");
    } else {
        echo json_encode([
            'success' => true,
            'deactivated' => $deactivatedCount,
        ]);
    }
} catch (Throwable $exception) {
    error_log('Automatic deactivation failed: ' . $exception->getMessage());

    if ($isCli) {
        fwrite(STDERR, "Automatic deactivation failed.\n");
        exit(1);
    }

    security_json_error(500, 'Automatic deactivation failed');
}
