<?php
require_once __DIR__ . '/../includes/security.php';
security_require_roles(['Admin', 'Staff', 'Coach', 'Member'], false, '../includes/login.php');
security_headers();
require_once __DIR__ . '/../config/database.php';

$targetUserId = filter_input(INPUT_GET, 'user_id', FILTER_VALIDATE_INT);
if (!$targetUserId || $targetUserId <= 0) {
    http_response_code(400);
    exit;
}

$viewerId = (int) $_SESSION['user_id'];
$viewerRole = (string) $_SESSION['role'];

if ($targetUserId !== $viewerId) {
    if ($viewerRole === 'Member') {
        http_response_code(403);
        exit;
    }

    if ($viewerRole === 'Coach') {
        $accessStmt = $conn->prepare("
            SELECT 1
            FROM classenrollments ce
            JOIN classes c ON c.class_id = ce.class_id
            JOIN users u ON u.UserID = ce.user_id AND u.Role = 'Member'
            WHERE ce.user_id = ? AND c.coach_id = ? AND ce.status != 'cancelled'
            LIMIT 1
        ");
        $accessStmt->execute([$targetUserId, $viewerId]);
        if (!$accessStmt->fetchColumn()) {
            http_response_code(403);
            exit;
        }
    }
}

$stmt = $conn->prepare('SELECT ProfileImage FROM users WHERE UserID = ?');
$stmt->execute([$targetUserId]);
$storedName = $stmt->fetchColumn();
$fileName = is_string($storedName) ? basename($storedName) : '';
if ($fileName === '' || !preg_match('/^[A-Za-z0-9._-]+$/', $fileName)) {
    http_response_code(404);
    exit;
}

$privateDirectory = security_private_storage_directory('profile_images');
$candidates = [
    $privateDirectory . DIRECTORY_SEPARATOR . $fileName,
    dirname(__DIR__) . '/uploads/profile_images/' . $fileName,
    dirname(__DIR__) . '/uploads/' . $fileName,
];

$filePath = null;
foreach ($candidates as $candidate) {
    if (is_file($candidate) && is_readable($candidate)) {
        $filePath = $candidate;
        break;
    }
}

if ($filePath === null) {
    http_response_code(404);
    exit;
}

$fileInfo = new finfo(FILEINFO_MIME_TYPE);
$mimeType = $fileInfo->file($filePath);
if (!in_array($mimeType, ['image/jpeg', 'image/png', 'image/gif'], true)) {
    http_response_code(415);
    exit;
}

header('Content-Type: ' . $mimeType);
header('Content-Length: ' . (string) filesize($filePath));
header('Cache-Control: private, max-age=300');
readfile($filePath);
