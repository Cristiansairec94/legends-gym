<?php
require_once 'security.php';
security_start_session();
require_once '../config/database.php';

security_headers();
header('Cache-Control: private, no-store, max-age=0');

$videoId = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
if (!$videoId || $videoId <= 0) {
    security_json_error(400, 'Invalid video');
}

try {
    $stmt = $conn->prepare("
        SELECT cv.video_path, cv.coach_id, cv.status, cv.access_type,
               CASE
                   WHEN cv.access_type = 'free' THEN 1
                   WHEN cv.access_type = 'paid' AND EXISTS (
                       SELECT 1 FROM coach_subscriptions cs
                       WHERE cs.member_id = ?
                         AND cs.coach_id = cv.coach_id
                         AND cs.status = 'active'
                   ) THEN 1
                   ELSE 0
               END AS can_access
        FROM coach_videos cv
        WHERE cv.id = ?
    ");
    $stmt->execute([$_SESSION['user_id'], $videoId]);
    $video = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$video) {
        security_json_error(404, 'Video not found');
    }
    $viewerRole = (string) ($_SESSION['role'] ?? '');
    $viewerId = (int) ($_SESSION['user_id'] ?? 0);
    $isOwner = $viewerRole === 'Coach' && (int) $video['coach_id'] === $viewerId;
    $canManage = $viewerRole === 'Admin' || $isOwner;
    if (!$canManage && $video['status'] !== 'approved') {
        security_json_error(404, 'Video not found');
    }
    if (!$canManage && $video['access_type'] !== 'free' && !(bool) $video['can_access']) {
        security_json_error(403, 'Subscription required');
    }

    $fileName = basename((string) $video['video_path']);
    if ($fileName === '' || !preg_match('/^[A-Za-z0-9._-]+$/', $fileName)) {
        security_json_error(404, 'Video file not found');
    }
    $filePath = dirname(__DIR__) . '/uploads/coach_videos/' . $fileName;
    if (!is_file($filePath) || !is_readable($filePath)) {
        security_json_error(404, 'Video file not found');
    }

    $mimeType = (new finfo(FILEINFO_MIME_TYPE))->file($filePath);
    $allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/avi'];
    if (!is_string($mimeType) || !in_array($mimeType, $allowedTypes, true)) {
        security_json_error(415, 'Video type is not supported');
    }

    $fileSize = filesize($filePath);
    if ($fileSize === false || $fileSize <= 0) {
        security_json_error(404, 'Video file is empty');
    }

    $start = 0;
    $end = $fileSize - 1;
    $range = $_SERVER['HTTP_RANGE'] ?? '';
    if (is_string($range) && $range !== '') {
        if (!preg_match('/^bytes=(\d*)-(\d*)$/', $range, $matches)) {
            header('Content-Range: bytes */' . $fileSize);
            http_response_code(416);
            exit;
        }

        if ($matches[1] === '' && $matches[2] !== '') {
            $suffixLength = min((int) $matches[2], $fileSize);
            $start = $fileSize - $suffixLength;
        } else {
            $start = (int) $matches[1];
            if ($matches[2] !== '') {
                $end = min((int) $matches[2], $end);
            }
        }

        if ($start < 0 || $start > $end || $start >= $fileSize) {
            header('Content-Range: bytes */' . $fileSize);
            http_response_code(416);
            exit;
        }

        http_response_code(206);
        header("Content-Range: bytes {$start}-{$end}/{$fileSize}");
    }

    $length = $end - $start + 1;
    header('Content-Type: ' . $mimeType);
    header('Accept-Ranges: bytes');
    header('Content-Length: ' . $length);
    header('Content-Disposition: inline; filename="fitness-video.' . pathinfo($filePath, PATHINFO_EXTENSION) . '"');

    session_write_close();
    $handle = fopen($filePath, 'rb');
    if ($handle === false) {
        exit;
    }
    fseek($handle, $start);
    $remaining = $length;
    while ($remaining > 0 && !feof($handle)) {
        $chunk = fread($handle, min(8192, $remaining));
        if ($chunk === false) {
            break;
        }
        echo $chunk;
        $remaining -= strlen($chunk);
        flush();
    }
    fclose($handle);
} catch (Throwable $e) {
    error_log('Unable to stream video: ' . $e->getMessage());
    security_json_error(500, 'Unable to load video');
}
