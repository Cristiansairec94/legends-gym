<?php
// Static QR Code Generator - Generates permanent user-specific QR codes
require_once '../includes/security.php';
security_require_roles(['Admin', 'Staff', 'Coach', 'Member']);
require_once '../config/database.php';
require_once '../config/api_config.php';

header('Content-Type: application/json');
security_headers();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    security_json_error(405, 'Method not allowed');
}

security_require_csrf();
$user_id = $_SESSION['user_id'];

// Simple rate limiting to prevent abuse
$rate_limit_key = 'qr_gen_' . session_id();
$rate_limit_file = sys_get_temp_dir() . '/' . $rate_limit_key;

if (file_exists($rate_limit_file)) {
    $last_request = filemtime($rate_limit_file);
    if (time() - $last_request < 2) { // 2 second cooldown
        http_response_code(429); // Too Many Requests
        echo json_encode([
            'success' => false,
            'message' => 'Please wait before generating another QR code',
            'retry_after' => 2
        ]);
        exit;
    }
}

// Update rate limit timestamp
touch($rate_limit_file);

try {    // Get user details - removed active status restriction
    $user_stmt = $conn->prepare("
        SELECT UserID, First_Name, Last_Name, Role, IsActive, account_status 
        FROM users 
        WHERE UserID = ?
    ");
    $user_stmt->execute([$user_id]);
    $user = $user_stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        throw new Exception("User not found");
    }
    
    // Optional: Add a warning if user is inactive (but still generate the QR)
    $is_inactive = ($user['IsActive'] != 1 || $user['account_status'] != 'active');
    $inactive_warning = $is_inactive ? "Note: Your account appears to be inactive. Please contact staff." : "";

    // Sign the user identifier so clients cannot forge another member's QR.
    // The browser renders this locally; do not send this bearer token to a
    // third-party QR image service.
    $qr_code_text = security_create_attendance_token((int) $user_id);

    echo json_encode([
        'success' => true,
        'qr_data' => $qr_code_text,
        'user_id' => $user_id,
        'user_name' => $user['First_Name'] . ' ' . $user['Last_Name'],
        'role' => $user['Role'],
        'is_static' => true,
        'is_active' => ($user['IsActive'] == 1 && $user['account_status'] == 'active'),
        'message' => 'Static QR code generated successfully',
        'instructions' => 'This signed QR code is permanent. Use it for attendance check-in and check-out.' .
                         ($inactive_warning ? ' ' . $inactive_warning : ''),
        'generation_timestamp' => date('Y-m-d H:i:s')
    ]);

} catch (PDOException $e) {
    error_log("Database error in static QR generation: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error occurred'
    ]);
} catch (Throwable $e) {
    error_log("Static QR generation error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Unable to generate attendance QR code'
    ]);
}
?>
