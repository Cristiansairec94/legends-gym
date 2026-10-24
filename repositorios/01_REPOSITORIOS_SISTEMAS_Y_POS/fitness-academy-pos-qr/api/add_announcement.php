<?php
require_once '../includes/security.php';
security_require_roles(['Coach']);
header('Content-Type: application/json');
security_headers();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    security_json_error(405, 'Method not allowed');
}

security_require_csrf();
require_once '../config/database.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $coach_id = $_SESSION['user_id'];
    $announcement = trim($_POST['announcement'] ?? '');
    
    // Validate announcement
    if (empty($announcement)) {
        echo json_encode(['success' => false, 'message' => 'Announcement cannot be empty']);
        exit;
    }
    
    if (strlen($announcement) > 500) {
        echo json_encode(['success' => false, 'message' => 'Announcement cannot exceed 500 characters']);
        exit;
    }
    
    try {
        // Insert announcement into database
        $stmt = $conn->prepare("INSERT INTO coach_announcements (coach_id, announcement, created_at) VALUES (?, ?, NOW())");
        $stmt->execute([$coach_id, $announcement]);
        
        echo json_encode([
            'success' => true, 
            'message' => 'Announcement added successfully',
            'announcement' => $announcement,
            'created_at' => date('Y-m-d H:i:s')
        ]);
    } catch (PDOException $e) {
        error_log("Failed to add announcement: " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => 'Failed to add announcement. Please try again.']);
    }
}
?>
