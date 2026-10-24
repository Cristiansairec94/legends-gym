<?php
require_once 'security.php';
security_require_roles(['Member']);
security_headers();
header('Content-Type: application/json');
require_once '../config/database.php';

$video_id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
$member_id = $_SESSION['user_id'];

if (!$video_id || $video_id <= 0) {
    security_json_error(400, 'Video ID required');
}

try {
    // Get video details and check access
    $stmt = $conn->prepare("
        SELECT cv.*, 
               CASE 
                   WHEN cv.access_type = 'free' THEN 1
                   WHEN cv.access_type = 'paid' AND EXISTS (
                       SELECT 1 FROM coach_subscriptions cs 
                       WHERE cs.member_id = ? AND cs.coach_id = cv.coach_id AND cs.status = 'active'
                   ) THEN 1
                   ELSE 0
               END as can_access
        FROM coach_videos cv
        WHERE cv.id = ? AND cv.status = 'approved'
    ");
    $stmt->execute([$member_id, $video_id]);
    $video = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$video) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Video not found']);
        exit;
    }

    if (!$video['can_access']) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Access denied. Subscription required.']);
        exit;
    }

    echo json_encode([
        'success' => true,
        'video_path' => 'stream_video.php?id=' . rawurlencode((string) $video_id),
        'title' => $video['title']
    ]);
} catch (Exception $e) {
    error_log('Unable to resolve video path: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error']);
}
