<?php
require_once 'security.php';
security_require_roles(['Member'], false, 'login.php');
security_headers();
require '../config/database.php';
require_once '../vendor/autoload.php';

if (!isset($_SESSION['paymongo_checkout_id'])) {
    header('Location: member_class.php');
    exit;
}

// Load API configuration
require_once __DIR__ . '/../config/api_config.php';

try {
    // Get checkout session ID from session
    $checkoutSessionId = $_SESSION['paymongo_checkout_id'];
    if (!is_string($checkoutSessionId) || !preg_match('/^[A-Za-z0-9_-]{8,128}$/', $checkoutSessionId)) {
        throw new RuntimeException('Invalid checkout session ID');
    }

    // Initialize GuzzleHTTP client
    $client = new \GuzzleHttp\Client();

    // Verify the payment status
    $sessionResponse = $client->request('GET', 'https://api.paymongo.com/v1/checkout_sessions/' . rawurlencode($checkoutSessionId), [
        'headers' => [
            'Authorization' => 'Basic ' . base64_encode(PAYMONGO_SECRET_KEY . ':'),
        ]
    ]);

    $sessionData = json_decode($sessionResponse->getBody(), true);
    $attributes = $sessionData['data']['attributes'] ?? [];
    $paymentIntent = $attributes['payment_intent'] ?? [];
    $checkoutStatus = strtolower((string) ($attributes['status'] ?? ''));
    $paymentStatus = strtolower((string) ($paymentIntent['status'] ?? ''));

    $validStatuses = ['succeeded', 'paid', 'payment_completed', 'completed'];
    if (!in_array($checkoutStatus, $validStatuses, true)
        && !in_array($paymentStatus, $validStatuses, true)) {
        throw new RuntimeException('Payment is not complete');
    }

    // Check payment type from URL parameter
    $paymentType = $_GET['type'] ?? 'class';
    
    if ($paymentType === 'subscription') {
        // Handle subscription payment
        if (!isset($_SESSION['subscription_payment'])) {
            throw new Exception('Subscription payment data not found in session');
        }
        
        $subscriptionData = $_SESSION['subscription_payment'];
        $userId = $_SESSION['user_id'];
        $videoId = filter_var($subscriptionData['video_id'] ?? null, FILTER_VALIDATE_INT);
        $coachId = filter_var($subscriptionData['coach_id'] ?? null, FILTER_VALIDATE_INT);
        if (!$videoId || !$coachId) {
            throw new RuntimeException('Invalid subscription data');
        }

        // Re-resolve the price and coach at fulfillment time. Session values are
        // never treated as authority for a paid entitlement.
        $stmt = $conn->prepare("
            SELECT cv.coach_id, cv.subscription_price, u.First_Name, u.Last_Name
            FROM coach_videos cv
            JOIN users u ON u.UserID = cv.coach_id AND u.Role = 'Coach'
            WHERE cv.id = ? AND cv.coach_id = ? AND cv.status = 'approved' AND cv.access_type = 'paid'
        ");
        $stmt->execute([$videoId, $coachId]);
        $video = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$video) {
            throw new RuntimeException('Subscription is no longer available');
        }
        $price = (float) $video['subscription_price'];
        if ($price < 20 || abs($price - (float) ($subscriptionData['price'] ?? -1)) > 0.001) {
            throw new RuntimeException('Subscription price changed during checkout');
        }
        $coachName = $video['First_Name'] . ' ' . $video['Last_Name'];
        
        // Check if user is already subscribed to this coach
        $stmt = $conn->prepare("
            SELECT id FROM coach_subscriptions 
            WHERE member_id = ? AND coach_id = ? AND status = 'active'
        ");
        $stmt->execute([$userId, $coachId]);
        if ($stmt->fetch()) {
            throw new Exception('You are already subscribed to this coach');
        }
        
        // Start transaction
        $conn->beginTransaction();
        
        // Insert subscription record
        $stmt = $conn->prepare("
            INSERT INTO coach_subscriptions (
                member_id, coach_id, subscription_price, status, 
                start_date, end_date, payment_id, created_at, updated_at
            ) VALUES (?, ?, ?, 'active', NOW(), DATE_ADD(NOW(), INTERVAL 1 MONTH), ?, NOW(), NOW())
        ");
        
        $stmt->execute([
            $userId,
            $coachId,
            $price,
            $checkoutSessionId
        ]);
        
        // Insert into payments table
        $stmt = $conn->prepare("
            INSERT INTO payments (
                user_id, amount, payment_date, status, payment_method,
                transaction_id, payment_details, created_at
            ) VALUES (?, ?, NOW(), ?, ?, ?, ?, NOW())
        ");

        $stmt->execute([
            $userId,
            $price,
            'completed',
            $attributes['payment_method_used'] ?? 'online',
            $checkoutSessionId,
            json_encode([
                'type' => 'subscription',
                'coach_id' => $coachId,
                'coach_name' => $coachName
            ])
        ]);

        // Commit transaction
        $conn->commit();

        // Clear payment session data
        unset($_SESSION['paymongo_checkout_id']);
        unset($_SESSION['subscription_payment']);

        // Set success message
        $_SESSION['success_message'] = "Subscription successful! You now have access to premium content from " . $coachName;

        // Redirect to courses page
        header('Location: member_online_courses.php');
        exit;
        
    } else {
        // Handle class enrollment payment (existing logic)
        if (!isset($_SESSION['class_enrollment'])) {
            throw new Exception('Class enrollment data not found in session');
        }
        
        $enrollmentData = $_SESSION['class_enrollment'];
        $userId = $_SESSION['user_id'];
        $classId = filter_var($enrollmentData['class_id'] ?? null, FILTER_VALIDATE_INT);
        if (!$classId) {
            throw new RuntimeException('Invalid class enrollment data');
        }

        // Start transaction
        $conn->beginTransaction();

        // Check if class is still available (not full)
        $stmt = $conn->prepare("
            SELECT c.*, COUNT(ce.id) as enrolled_count 
            FROM classes c 
            LEFT JOIN classenrollments ce ON c.class_id = ce.class_id AND ce.status != 'cancelled'
            WHERE c.class_id = ? AND c.is_active = 1 AND c.class_date >= CURDATE()
            GROUP BY c.class_id
        ");
        $stmt->execute([$classId]);
        $classInfo = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$classInfo) {
            throw new RuntimeException('Class is no longer available');
        }

        $amount = (float) $classInfo['price'];
        if ($amount <= 0 || abs($amount - (float) ($enrollmentData['amount'] ?? -1)) > 0.001) {
            throw new RuntimeException('Class price changed during checkout');
        }

        // If class has a capacity limit, check if it's full
        if ($classInfo['capacity'] && $classInfo['enrolled_count'] >= $classInfo['capacity']) {
            throw new Exception('Sorry, this class is now full.');
        }

        // Insert into classenrollments
        $stmt = $conn->prepare("
            INSERT INTO classenrollments (
                class_id, user_id, status, enrollment_date, 
                payment_amount, payment_reference, payment_status
            ) VALUES (?, ?, 'confirmed', NOW(), ?, ?, 'completed')
        ");

        $stmt->execute([
            $classId,
            $userId,
            $amount,
            $checkoutSessionId
        ]);

        // Insert into payments table
        $stmt = $conn->prepare("
            INSERT INTO payments (
                user_id, amount, payment_date, status, payment_method,
                transaction_id, payment_details, created_at
            ) VALUES (?, ?, NOW(), ?, ?, ?, ?, NOW())
        ");

        $stmt->execute([
            $userId,
            $amount,
            'completed',
            $attributes['payment_method_used'] ?? 'online',
            $checkoutSessionId,
            json_encode([
                'type' => 'class_enrollment',
                'class_id' => $classId,
                'class_name' => $classInfo['class_name']
            ])
        ]);

        // Commit transaction
        $conn->commit();

        // Clear payment session data
        unset($_SESSION['paymongo_checkout_id']);
        unset($_SESSION['class_enrollment']);

        // Set success message
        $_SESSION['success_message'] = "Payment successful! You are now enrolled in " . $classInfo['class_name'];

        // Redirect back to classes page
        header('Location: member_class.php');
        exit;
    }
} catch (Throwable $e) {
    // Rollback transaction if started
    if ($conn->inTransaction()) {
        $conn->rollBack();
    }

    error_log('Class Enrollment Payment Error: ' . $e->getMessage());
    $_SESSION['error_message'] = 'Unable to verify or complete the payment. Please contact support if you were charged.';
    header('Location: member_class.php');
    exit;
}
