<?php

/**
 * Shared security helpers for authenticated web and JSON endpoints.
 */

function security_is_https(): bool
{
    if (!empty($_SERVER['HTTPS']) && strtolower((string) $_SERVER['HTTPS']) !== 'off') {
        return true;
    }

    return strtolower((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https';
}

function security_start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => security_is_https(),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

function security_headers(): void
{
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Referrer-Policy: same-origin');
    header('Permissions-Policy: camera=(self), microphone=(), geolocation=()');
    if (security_is_https()) {
        header('Strict-Transport-Security: max-age=31536000');
    }
}

function security_json_error(int $status, string $message): void
{
    http_response_code($status);
    header('Content-Type: application/json');
    security_headers();
    echo json_encode([
        'success' => false,
        'message' => $message,
    ]);
    exit;
}

function security_require_roles(array $roles, bool $json = true, string $loginPath = '../includes/login.php'): void
{
    security_start_session();

    $userId = $_SESSION['user_id'] ?? null;
    $role = $_SESSION['role'] ?? null;
    if ($userId && is_string($role) && in_array($role, $roles, true)) {
        header('Cache-Control: private, no-store, max-age=0');
        return;
    }

    if ($json) {
        security_json_error($userId ? 403 : 401, $userId ? 'Forbidden' : 'Authentication required');
    }

    header('Location: ' . $loginPath);
    exit;
}

function security_csrf_token(): string
{
    security_start_session();

    if (empty($_SESSION['csrf_token']) || !is_string($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }

    return $_SESSION['csrf_token'];
}

function security_require_csrf(): void
{
    security_start_session();

    $expected = $_SESSION['csrf_token'] ?? '';
    $provided = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($_POST['csrf_token'] ?? '');
    if (!is_string($expected) || $expected === '' || !is_string($provided) || !hash_equals($expected, $provided)) {
        security_json_error(403, 'Invalid security token');
    }
}

/**
 * Validate an HTTP upload using server-observed MIME and size, then return a
 * canonical extension selected by the application (never by the client).
 */
function security_validate_uploaded_file(array $file, array $allowedMimeExtensions, int $maxBytes): string
{
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        throw new RuntimeException('The file upload did not complete');
    }

    $temporaryPath = $file['tmp_name'] ?? '';
    if (!is_string($temporaryPath) || !is_uploaded_file($temporaryPath)) {
        throw new RuntimeException('Invalid uploaded file');
    }

    $actualSize = filesize($temporaryPath);
    if ($actualSize === false || $actualSize <= 0 || $actualSize > $maxBytes) {
        throw new RuntimeException('Uploaded file size is not allowed');
    }

    $fileInfo = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = $fileInfo->file($temporaryPath);
    if (!is_string($mimeType) || !isset($allowedMimeExtensions[$mimeType])) {
        throw new RuntimeException('Uploaded file type is not allowed');
    }

    $extension = $allowedMimeExtensions[$mimeType];
    if (!is_string($extension) || !preg_match('/^[a-z0-9]+$/', $extension)) {
        throw new RuntimeException('Invalid server upload configuration');
    }

    return $extension;
}

function security_private_storage_directory(string $name): string
{
    if (!preg_match('/^[a-z0-9_-]+$/', $name)) {
        throw new InvalidArgumentException('Invalid private storage directory');
    }

    $configuredBase = getenv('PRIVATE_STORAGE_PATH');
    $base = is_string($configuredBase) && $configuredBase !== ''
        ? rtrim($configuredBase, DIRECTORY_SEPARATOR)
        : dirname(__DIR__) . '/storage/private';
    $directory = $base . DIRECTORY_SEPARATOR . $name;

    if (!is_dir($directory) && !mkdir($directory, 0750, true) && !is_dir($directory)) {
        throw new RuntimeException('Unable to create private storage directory');
    }

    return $directory;
}

function security_app_url(string $path = ''): string
{
    if (!defined('APP_DOMAIN')) {
        throw new RuntimeException('Application domain is not configured');
    }

    $baseUrl = rtrim((string) APP_DOMAIN, '/');
    $parts = parse_url($baseUrl);
    $host = strtolower((string) ($parts['host'] ?? ''));
    $scheme = strtolower((string) ($parts['scheme'] ?? ''));
    $localHosts = ['localhost', '127.0.0.1', '::1'];
    if (!filter_var($baseUrl, FILTER_VALIDATE_URL)
        || $host === ''
        || strpos(strtolower($baseUrl), 'yourdomain') !== false
        || ($scheme !== 'https' && !($scheme === 'http' && in_array($host, $localHosts, true)))) {
        throw new RuntimeException('Application domain must be a valid HTTPS URL');
    }

    return $baseUrl . '/' . ltrim($path, '/');
}

function security_base64url_encode(string $value): string
{
    return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
}

function security_base64url_decode(string $value): string
{
    $padding = strlen($value) % 4;
    if ($padding !== 0) {
        $value .= str_repeat('=', 4 - $padding);
    }

    $decoded = base64_decode(strtr($value, '-_', '+/'), true);
    if ($decoded === false) {
        throw new RuntimeException('Invalid encoded value');
    }

    return $decoded;
}

function security_attendance_secret(): string
{
    if (!defined('ATTENDANCE_QR_SECRET')) {
        throw new RuntimeException('Attendance QR signing is not configured');
    }

    $secret = (string) ATTENDANCE_QR_SECRET;
    if (strlen($secret) < 32 || stripos($secret, 'change_me') !== false || stripos($secret, 'your_') !== false) {
        throw new RuntimeException('Attendance QR signing secret is not secure');
    }

    return $secret;
}

function security_create_attendance_token(int $userId): string
{
    if ($userId <= 0) {
        throw new InvalidArgumentException('Invalid user ID');
    }

    $payload = security_base64url_encode(json_encode([
        'v' => 1,
        'purpose' => 'attendance',
        'user_id' => $userId,
    ], JSON_UNESCAPED_SLASHES));
    $signature = security_base64url_encode(hash_hmac('sha256', $payload, security_attendance_secret(), true));

    return $payload . '.' . $signature;
}

function security_verify_attendance_token(string $token): int
{
    $parts = explode('.', trim($token));
    if (count($parts) !== 2) {
        throw new RuntimeException('Invalid attendance QR code');
    }

    [$payload, $providedSignature] = $parts;
    $expectedSignature = security_base64url_encode(hash_hmac('sha256', $payload, security_attendance_secret(), true));
    if (!hash_equals($expectedSignature, $providedSignature)) {
        throw new RuntimeException('Invalid attendance QR code');
    }

    $data = json_decode(security_base64url_decode($payload), true);
    if (!is_array($data)
        || ($data['v'] ?? null) !== 1
        || ($data['purpose'] ?? null) !== 'attendance'
        || !isset($data['user_id'])
        || !is_numeric($data['user_id'])
        || (int) $data['user_id'] <= 0) {
        throw new RuntimeException('Invalid attendance QR code');
    }

    return (int) $data['user_id'];
}
