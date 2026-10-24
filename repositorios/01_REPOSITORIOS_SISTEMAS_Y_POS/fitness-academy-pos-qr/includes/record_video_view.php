<?php
require_once 'security.php';
security_require_roles(['Member']);
security_headers();
header('Content-Type: application/json');
require_once '../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    security_json_error(405, 'Method not allowed');
}
security_require_csrf();

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    security_json_error(400, 'Invalid JSON request');
}
$video_id = filter_var($input['video_id'] ?? null, FILTER_VALIDATE_INT);
$member_id = $_SESSION['user_id'];

if (!$video_id || $video_id <= 0) {
    security_json_error(400, 'Video ID required');
}

try {
    // Check if video exists and member has access
    $stmt = $conn->prepare("
        SELECT cv.id, cv.access_type, cv.coach_id,
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
        echo json_encode(['success' => false, 'message' => 'Access denied']);
        exit;
    }

    // Record the view
    $stmt = $conn->prepare("
        INSERT INTO video_views (video_id, member_id, view_date)
        VALUES (?, ?, NOW())
    ");
    $stmt->execute([$video_id, $member_id]);

    echo json_encode(['success' => true, 'message' => 'View recorded']);
} catch (Exception $e) {
    error_log('Unable to record video view: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error']);
}
