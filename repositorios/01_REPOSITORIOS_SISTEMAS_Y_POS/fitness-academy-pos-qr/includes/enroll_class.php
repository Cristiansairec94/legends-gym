<?php
require_once 'security.php';
security_require_roles(['Member'], false, 'login.php');
security_headers();
require '../config/database.php';
require_once '../vendor/autoload.php';

// Load API configuration
require_once __DIR__ . '/../config/api_config.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['class_id'])) {
    security_require_csrf();
    $class_id = filter_input(INPUT_POST, 'class_id', FILTER_VALIDATE_INT);
    $user_id = $_SESSION['user_id'];

    try {
        if (!$class_id || $class_id <= 0) {
            throw new RuntimeException('Invalid class');
        }

        // Get class details
        $stmt = $conn->prepare("SELECT c.*, u.First_Name as coach_name FROM classes c 
                               JOIN users u ON c.coach_id = u.UserID 
                               WHERE c.class_id = ? AND c.is_active = 1 AND c.class_date >= CURDATE()");
        $stmt->execute([$class_id]);
        $class = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$class) {
            throw new Exception('Class not found');
        }

        // Check if user is already enrolled
        $stmt = $conn->prepare("SELECT * FROM classenrollments WHERE class_id = ? AND user_id = ? AND status != 'cancelled'");
        $stmt->execute([$class_id, $user_id]);
        if ($stmt->fetch()) {
            $_SESSION['error_message'] = "You are already enrolled in this class.";
            header('Location: member_class.php');
            exit;
        }

        // Get user details
        $stmt = $conn->prepare("SELECT * FROM users WHERE UserID = ?");
        $stmt->execute([$user_id]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        // If class is free, directly enroll
        if ($class['price'] <= 0) {
            $stmt = $conn->prepare("INSERT INTO classenrollments (class_id, user_id, status, enrollment_date) 
                                  VALUES (?, ?, 'confirmed', NOW())");
            $stmt->execute([$class_id, $user_id]);

            $_SESSION['success_message'] = "Successfully enrolled in " . $class['class_name'];
            header('Location: member_class.php');
            exit;
        }

        // For paid classes, create PayMongo checkout session
        $client = new \GuzzleHttp\Client();

        // Store enrollment details in session
        $_SESSION['class_enrollment'] = [
            'class_id' => $class_id,
            'amount' => $class['price'],
            'class_name' => $class['class_name']
        ];

        // Create line items for checkout
        $lineItems = [
            [
                'currency' => 'PHP',
                'amount' => intval($class['price'] * 100), // Convert to cents
                'name' => $class['class_name'],
                'quantity' => 1,
                'description' => "Class with Coach " . $class['coach_name']
            ]
        ];

        // Create PayMongo checkout session
        $response = $client->request('POST', 'https://api.paymongo.com/v1/checkout_sessions', [
            'headers' => [
                'Authorization' => 'Basic ' . base64_encode(PAYMONGO_SECRET_KEY . ':'),
                'Content-Type' => 'application/json'
            ],
            'json' => [
                'data' => [
                    'attributes' => [
                        'line_items' => $lineItems,
                        'payment_method_types' => ['card', 'gcash', 'grab_pay', 'paymaya'],
                        'send_email_receipt' => true,
                        'show_description' => true,
                        'show_line_items' => true,
                        'description' => 'Class Enrollment - ' . $class['class_name'],
                        'success_url' => security_app_url('includes/class_enrollment_success.php'),
                        'failure_url' => security_app_url('includes/class_enrollment_failed.php'),
                        'billing' => [
                            'name' => $user['First_Name'] . ' ' . $user['Last_Name'],
                            'email' => $user['Email'],
                            'phone' => $user['Phone'] ?? ''
                        ],
                        'metadata' => [
                            'user_id' => $user_id,
                            'class_id' => $class_id
                        ]
                    ]
                ]
            ]
        ]);

        $result = json_decode($response->getBody(), true);

        if (isset($result['data']) && isset($result['data']['attributes']['checkout_url'])) {
            // Store checkout session ID in session for verification
            $_SESSION['paymongo_checkout_id'] = $result['data']['id'];

            $checkoutUrl = $result['data']['attributes']['checkout_url'];
            $checkoutParts = parse_url($checkoutUrl);
            $checkoutHost = strtolower((string) ($checkoutParts['host'] ?? ''));
            if (($checkoutParts['scheme'] ?? '') !== 'https'
                || ($checkoutHost !== 'paymongo.com' && substr($checkoutHost, -13) !== '.paymongo.com')) {
                throw new RuntimeException('Payment provider returned an invalid checkout URL');
            }

            // Redirect to PayMongo checkout
            header('Location: ' . $checkoutUrl);
            exit;
        } else {
            throw new Exception('Failed to create checkout session');
        }
    } catch (Throwable $e) {
        error_log('Class enrollment error: ' . $e->getMessage());
        $_SESSION['error_message'] = 'Unable to process enrollment.';
        header('Location: member_class.php');
        exit;
    }
} else {
    header('Location: member_class.php');
    exit;
}
