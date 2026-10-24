<?php
require_once 'security.php';
security_start_session();
security_headers();
require '../config/database.php';
require_once '../vendor/autoload.php';

// Enable error display for debugging
ini_set('display_errors', '0');
ini_set('display_startup_errors', '0');
error_reporting(E_ALL);

// Load API configuration
require_once __DIR__ . '/../config/api_config.php';

// Check if we have the checkout session ID and required session data
if (!isset($_SESSION['paymongo_checkout_id']) || !isset($_SESSION['user_data'])) {
    $_SESSION['error_message'] = "The payment session expired. Please contact support with your receipt if you were charged.";
    header("Location: " . security_app_url('includes/register.php?reset=true'));
    exit;
}

try {
    // Get checkout session ID from session
    $checkoutSessionId = $_SESSION['paymongo_checkout_id'];
    if (!is_string($checkoutSessionId) || !preg_match('/^[A-Za-z0-9_-]{8,128}$/', $checkoutSessionId)) {
        throw new RuntimeException('Invalid checkout session ID');
    }

    $client = new \GuzzleHttp\Client();
    $sessionResponse = $client->request(
        'GET',
        'https://api.paymongo.com/v1/checkout_sessions/' . rawurlencode($checkoutSessionId),
        [
            'headers' => [
                'Authorization' => 'Basic ' . base64_encode(PAYMONGO_SECRET_KEY . ':'),
            ],
        ]
    );

    $checkoutData = json_decode($sessionResponse->getBody(), true);
    $attributes = $checkoutData['data']['attributes'] ?? [];
    $paymentIntent = $attributes['payment_intent'] ?? [];
    $checkoutStatus = strtolower((string) ($attributes['status'] ?? ''));
    $paymentStatus = strtolower((string) ($paymentIntent['status'] ?? ''));
    $validStatuses = ['completed', 'paid', 'succeeded', 'payment_completed'];
    $proceedWithRegistration = in_array($checkoutStatus, $validStatuses, true)
        || in_array($paymentStatus, $validStatuses, true);

    if (!$proceedWithRegistration) {
        throw new RuntimeException('Payment has not completed');
    }

    $paymentMethodType = (string) ($attributes['payment_method_used'] ?? 'online payment');
    $paymentIntentId = (string) ($paymentIntent['id'] ?? $checkoutSessionId);
    $sessionData = [
        'checkout_status' => $checkoutStatus,
        'payment_status' => $paymentStatus,
        'payment_method' => $paymentMethodType,
        'test_mode' => strpos(PAYMONGO_SECRET_KEY, 'sk_test_') === 0,
    ];

    if ($proceedWithRegistration) {
        // Payment is successful, proceed with user registration

        // Start database transaction
        $conn->beginTransaction();

        // Get user data from session
        $userData = $_SESSION['user_data'];
        $hashed_password = $userData['password_hash'] ?? '';
        $passwordInfo = is_string($hashed_password) ? password_get_info($hashed_password) : ['algo' => 0];
        if (!is_string($hashed_password) || $hashed_password === '' || empty($passwordInfo['algo'])) {
            throw new RuntimeException('Registration password hash is missing');
        }

        // Generate email token
        $email_token = bin2hex(random_bytes(32));

        // Get plan details to set membership fields
        $planStmt = $conn->prepare("SELECT plan_type, session_count, duration_months FROM membershipplans WHERE id = ?");
        $planStmt->execute([$_SESSION['plan_id']]);
        $planDetails = $planStmt->fetch(PDO::FETCH_ASSOC);

        // Calculate membership dates and sessions based on plan type
        $membershipStartDate = date('Y-m-d');
        $membershipEndDate = null;
        $currentSessionsRemaining = null;

        if ($planDetails && $planDetails['plan_type'] === 'session') {
            // Session-based plan: set sessions, no end date
            $currentSessionsRemaining = $planDetails['session_count'];
        } elseif ($planDetails && $planDetails['plan_type'] === 'monthly') {
            // Monthly plan: set end date, no sessions
            $membershipEndDate = date('Y-m-d', strtotime("+{$planDetails['duration_months']} months"));
        }

        // Insert user into database
        $stmt = $conn->prepare("INSERT INTO users (            Username, PasswordHash, Role, First_Name, Last_Name, Email, DateOfBirth, 
            Phone, Address, emergency_contact, ProfileImage, is_approved, email_confirmed, email_token, 
            membership_plan, membership_price, plan_id, current_sessions_remaining, 
            membership_start_date, membership_end_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?, ?, ?, ?, ?, ?)");

        try {
            $stmt->execute([
                $userData['username'],
                $hashed_password,
                $userData['role'],
                $userData['first_name'],
                $userData['last_name'],
                $userData['email'],
                $userData['date_of_birth'],
                $userData['phone'],
                $userData['address'],
                $userData['emergency_contact'],
                $userData['profile_image'] ?? null,
                $email_token,
                $_SESSION['selected_plan'],
                $_SESSION['plan_price'],
                $_SESSION['plan_id'],
                $currentSessionsRemaining,
                $membershipStartDate,
                $membershipEndDate
            ]);        } catch (PDOException $e) {
            // If UserID field error, try with explicit UserID
            if (strpos($e->getMessage(), 'UserID') !== false) {
                // Get next available UserID (ensure it's never 0)
                $userIdStmt = $conn->prepare("SELECT GREATEST(COALESCE(MAX(UserID), 0) + 1, 1) as next_id FROM users");
                $userIdStmt->execute();
                $nextUserId = $userIdStmt->fetch(PDO::FETCH_ASSOC)['next_id'];
                
                // Double check that UserID is not 0
                if ($nextUserId <= 0) {
                    $nextUserId = 1;
                }
                
                $stmtWithId = $conn->prepare("INSERT INTO users (
                    UserID, Username, PasswordHash, Role, First_Name, Last_Name, Email, DateOfBirth, 
                    Phone, Address, emergency_contact, ProfileImage, is_approved, email_confirmed, email_token, 
                    membership_plan, membership_price, plan_id, current_sessions_remaining, 
                    membership_start_date, membership_end_date
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?, ?, ?, ?, ?, ?)");

                $stmtWithId->execute([
                    $nextUserId,
                    $userData['username'],
                    $hashed_password,
                    $userData['role'],
                    $userData['first_name'],
                    $userData['last_name'],
                    $userData['email'],
                    $userData['date_of_birth'],
                    $userData['phone'],
                    $userData['address'],
                    $userData['emergency_contact'],
                    $userData['profile_image'] ?? null,
                    $email_token,
                    $_SESSION['selected_plan'],
                    $_SESSION['plan_price'],
                    $_SESSION['plan_id'],
                    $currentSessionsRemaining,
                    $membershipStartDate,
                    $membershipEndDate                ]);
            } else {
                throw $e; // Re-throw if it's a different error
            }
        }

        $user_id = $conn->lastInsertId();

        // Get the final amount to charge (considering discounts)
        $finalAmount = $_SESSION['final_amount'] ?? $_SESSION['plan_price'];
        $originalAmount = $_SESSION['plan_price'];

        // Handle discount information
        $discountData = [];
        if (isset($_SESSION['discount_applied']) && $_SESSION['discount_applied'] === true) {
            $discountData = [
                'discount_applied' => true,
                'discount_type' => $_SESSION['discount_type'],
                'discount_amount' => $_SESSION['discount_amount'],
                'original_amount' => $originalAmount,
                'final_amount' => $finalAmount,
                'discount_percentage' => 10
            ];

            // Save discount record to database
            try {
                $discountStmt = $conn->prepare("INSERT INTO user_discounts (
                    user_id, user_email, discount_type, discount_percentage, 
                    original_amount, discount_amount, final_amount, applied_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())");

                $discountStmt->execute([
                    $user_id,
                    $userData['email'],
                    $_SESSION['discount_type'],
                    10.00,
                    $originalAmount,
                    $_SESSION['discount_amount'],
                    $finalAmount
                ]);

                error_log("Discount record saved for user {$user_id}: {$_SESSION['discount_type']} discount");
            } catch (Exception $e) {
                error_log("Error saving discount record: " . $e->getMessage());
                // Don't fail the whole process for discount record error
            }
        }        // Store payment record with final amount
        $stmt = $conn->prepare("INSERT INTO payments (
            user_id, amount, payment_date, status, payment_method, 
            transaction_id, payment_details
        ) VALUES (?, ?, NOW(), ?, ?, ?, ?)");

        // Merge discount data with session data for payment details
        $paymentDetails = $sessionData;
        if (!empty($discountData)) {
            $paymentDetails['discount_info'] = $discountData;
        }

        $stmt->execute([
            $user_id,
            $finalAmount, // Use final amount after discount
            'completed',
            $paymentMethodType,
            $paymentIntentId,
            json_encode($paymentDetails)
        ]);

        // Log payment in audit trail
        $payment_id = $conn->lastInsertId();
        $audit_stmt = $conn->prepare("INSERT INTO audit_trail (username, action, timestamp) VALUES (?, ?, NOW())");

        // Create a more descriptive audit entry including discount info
        $paymentDetails = "payment completed: ₱" . number_format($finalAmount, 2);
        if (isset($_SESSION['discount_applied']) && $_SESSION['discount_applied'] === true) {
            $paymentDetails .= " (originally ₱" . number_format($originalAmount, 2) .
                " with " . $_SESSION['discount_type'] . " 10% discount of ₱" .
                number_format($_SESSION['discount_amount'], 2) . ")";
        }
        $paymentDetails .= " for " . $_SESSION['selected_plan'] .
            " membership via " . $paymentMethodType;

        $audit_stmt->execute([
            $userData['username'],
            $paymentDetails
        ]);

        // Commit the transaction
        $conn->commit();

        // Clear session data including discount information        unset($_SESSION['registration_step']);
        unset($_SESSION['verification_code']);
        unset($_SESSION['email']);
        unset($_SESSION['selected_plan']);
        unset($_SESSION['plan_price']);
        unset($_SESSION['plan_id']);
        unset($_SESSION['user_data']);
        unset($_SESSION['paymongo_checkout_id']);
        unset($_SESSION['discount_applied']);
        unset($_SESSION['discount_type']);
        unset($_SESSION['discount_amount']);
        unset($_SESSION['original_amount']);
        unset($_SESSION['final_amount']);
        unset($_SESSION['verified_discount']);

        // Set success message and redirect to success page
        $_SESSION['registration_success'] = true;

        header("Location: " . security_app_url('includes/registration_success.php'));
        exit;
    } else {
        // Payment not successful
        throw new Exception("Payment was not successful: payment verification failed");
    }
} catch (Exception $e) {
    error_log("Payment Error: " . $e->getMessage());
    $_SESSION['error_message'] = "Unable to complete registration. Please contact support with your payment receipt.";
    header("Location: " . security_app_url('includes/register.php'));
    exit;
}
