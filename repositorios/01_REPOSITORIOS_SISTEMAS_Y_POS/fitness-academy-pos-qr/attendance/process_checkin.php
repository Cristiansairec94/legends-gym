<?php
// Process QR Attendance Check-in
require_once '../includes/security.php';
security_require_roles(['Admin', 'Staff']);
require_once '../config/database.php';
require_once '../config/api_config.php';

header('Content-Type: application/json');
security_headers();

// Set timezone
date_default_timezone_set('Asia/Manila');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

security_require_csrf();

// Get input data
$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    security_json_error(400, 'Invalid JSON request');
}

$qr_code = $input['qr_code'] ?? '';
$user_agent = substr((string) ($input['user_agent'] ?? ''), 0, 512);
$scanner_user_id = (int) $_SESSION['user_id'];
$scanner_role = $_SESSION['role'];

if (empty($qr_code)) {
    echo json_encode(['success' => false, 'message' => 'QR code is required']);
    exit;
}

try {
    // Get scanner's IP address
    $ip_address = $_SERVER['REMOTE_ADDR'] ?? '';

    $member_user_id = security_verify_attendance_token((string) $qr_code);

    // Get the member's information including plan details
    $member_stmt = $conn->prepare("
        SELECT u.UserID, u.First_Name, u.Last_Name, u.Role, u.IsActive, u.account_status, u.ProfileImage,
               u.current_sessions_remaining, u.membership_start_date, u.membership_end_date, u.plan_id,
               mp.plan_type, mp.session_count, mp.duration_months, mp.name as plan_name
        FROM users u
        LEFT JOIN membershipplans mp ON u.plan_id = mp.id
        WHERE u.UserID = ?
    ");
    $member_stmt->execute([$member_user_id]);
    $member = $member_stmt->fetch(PDO::FETCH_ASSOC);

    if (!$member) {
        throw new Exception("Member not found");
    }
    
    // Check if member is inactive but allow check-in with warning
    if ($member['IsActive'] != 1 || $member['account_status'] != 'active') {
        $warning = "WARNING: Member account is inactive. Please verify membership status.";
    } else {
        $warning = "";
    }

    // Validate membership plan and sessions/time
    $plan_valid = true;
    $plan_warning = "";

    if ($member['plan_id']) {
        if ($member['plan_type'] === 'session') {
            // Session-based plan: check remaining sessions
            if ($member['current_sessions_remaining'] <= 0) {
                $plan_valid = false;
                throw new Exception("No sessions remaining. Please renew your membership or purchase additional sessions.");
            } elseif ($member['current_sessions_remaining'] <= 5) {
                $plan_warning = "Low sessions remaining: {$member['current_sessions_remaining']} sessions left.";
            }
        } elseif ($member['plan_type'] === 'monthly') {
            // Monthly plan: check if membership is still valid
            $today = new DateTime();
            $end_date = new DateTime($member['membership_end_date']);
            
            if ($today > $end_date) {
                $plan_valid = false;
                throw new Exception("Membership expired on " . $end_date->format('Y-m-d') . ". Please renew your membership.");
            } else {
                $days_remaining = $today->diff($end_date)->days;
                if ($days_remaining <= 7) {
                    $plan_warning = "Membership expires in {$days_remaining} days on " . $end_date->format('Y-m-d') . ".";
                }
            }
        }
    }

    // Combine warnings
    if (!empty($warning) && !empty($plan_warning)) {
        $warning .= " " . $plan_warning;
    } elseif (!empty($plan_warning)) {
        $warning = $plan_warning;
    }

    $member_name = $member['First_Name'] . ' ' . $member['Last_Name'];// Check if member already checked in today
    $existing_checkin_stmt = $conn->prepare("
        SELECT id, check_in_time, time_out 
        FROM attendance_records 
        WHERE user_id = ? AND DATE(check_in_time) = CURDATE()
        ORDER BY check_in_time DESC 
        LIMIT 1
    ");
    $existing_checkin_stmt->execute([$member_user_id]);
    $existing_checkin = $existing_checkin_stmt->fetch(PDO::FETCH_ASSOC);

    if ($existing_checkin) {
        if (!$existing_checkin['time_out']) {
            throw new Exception("$member_name is already checked in today. Please check out first.");
        }
        
        // If they checked out, allow another check-in
        // But warn if it's been less than 5 minutes
        $checkout_time = new DateTime($existing_checkin['time_out']);
        $current_time = new DateTime();
        $time_diff = $current_time->getTimestamp() - $checkout_time->getTimestamp();
        
        if ($time_diff < 300) { // Less than 5 minutes
            $minutes = ceil($time_diff / 60);
            throw new Exception("$member_name checked out recently ($minutes minutes ago). Please wait a moment before checking in again.");
        }
    }    // Record the check-in
    $checkin_stmt = $conn->prepare("
        INSERT INTO attendance_records (
            user_id, 
            user_type,
            attendance_type,
            check_in_time, 
            location, 
            scanned_by_user_id, 
            ip_address,
            device_info
        ) VALUES (?, ?, 'gym_entry', NOW(), ?, ?, ?, ?)
    ");
    
    $location = 'Main Entrance';
    $checkin_stmt->execute([
        $member_user_id,
        $member['Role'],
        $location,
        $scanner_user_id,
        $ip_address,
        $user_agent
    ]);    $attendance_id = $conn->lastInsertId();

    // Decrement session for session-based plans
    if ($member['plan_type'] === 'session' && $member['current_sessions_remaining'] > 0) {
        $update_sessions_stmt = $conn->prepare("
            UPDATE users 
            SET current_sessions_remaining = current_sessions_remaining - 1 
            WHERE UserID = ?
        ");
        $update_sessions_stmt->execute([$member_user_id]);
        
        $new_sessions_remaining = $member['current_sessions_remaining'] - 1;
        
        // Update the response message if sessions are getting low
        if ($new_sessions_remaining <= 5 && $new_sessions_remaining > 0) {
            $warning = "Session used. {$new_sessions_remaining} sessions remaining.";
        } elseif ($new_sessions_remaining == 0) {
            $warning = "Last session used. Please renew your membership.";
        }
    }

    // Log to audit trail
    if (function_exists('logAuditTrail')) {
        logAuditTrail($conn, $scanner_user_id, 'CHECK_IN', 'attendance_records', $attendance_id, [
            'member_id' => $member_user_id,
            'member_name' => $member_name,
            'location' => $location,
            'scanner_role' => $scanner_role
        ]);
    }    echo json_encode([
        'success' => true,
        'message' => 'Check-in successful' . (!empty($warning) ? " - $warning" : ""),
        'user_name' => $member_name,
        'user_id' => $member_user_id,
        'role' => $member['Role'],
        'profile_image_url' => !empty($member['ProfileImage']) ? '../api/profile_image.php?user_id=' . (int) $member['UserID'] : null,
        'type' => 'checkin',
        'location' => $location,
        'timestamp' => date('Y-m-d H:i:s'),
        'attendance_id' => $attendance_id,
        'warning' => $warning ?? "",
        'is_active' => ($member['IsActive'] == 1 && $member['account_status'] == 'active')
    ]);

} catch (PDOException $e) {
    error_log("Database error in check-in: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error occurred'
    ]);
} catch (RuntimeException $e) {
    error_log("Invalid check-in QR: " . $e->getMessage());
    security_json_error(400, 'Invalid attendance QR code');
} catch (Exception $e) {
    error_log("Check-in error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>
