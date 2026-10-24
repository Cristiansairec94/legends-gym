<?php
require_once 'security.php';
security_start_session();
security_headers();
require '../config/database.php';
require_once '../vendor/autoload.php';

// Load API configuration
require_once __DIR__ . '/../config/api_config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    security_json_error(405, 'Method not allowed');
}
security_require_csrf();

// Check if we have required session data
if (!isset($_SESSION['user_data']) || !isset($_SESSION['plan_price'])) {
    error_log('Missing session data in process_payment - user_data: ' . (isset($_SESSION['user_data']) ? 'present' : 'missing'));
    error_log('Missing session data in process_payment - plan_price: ' . (isset($_SESSION['plan_price']) ? 'present' : 'missing'));
    error_log('All session keys in process_payment: ' . json_encode(array_keys($_SESSION)));
    
    $_SESSION['error_message'] = "Missing payment data. Please try again.";
    header("Location: " . security_app_url('includes/register.php'));
    exit;
}

try {
    $planStmt = $conn->prepare('SELECT id, name, price, plan_type FROM membershipplans WHERE id = ? AND is_active = 1');
    $planStmt->execute([$_SESSION['plan_id'] ?? null]);
    $currentPlan = $planStmt->fetch(PDO::FETCH_ASSOC);
    if (!$currentPlan) {
        throw new RuntimeException('Selected membership plan is no longer available');
    }
    $_SESSION['selected_plan'] = $currentPlan['name'];
    $_SESSION['plan_price'] = (float) $currentPlan['price'];
    $_SESSION['plan_type'] = $currentPlan['plan_type'];

    // Discounts are accepted only from a recent server-side OCR verification.
    $originalAmount = $_SESSION['plan_price'];
    $finalAmount = $originalAmount;
    $discountApplied = false;
    $discountType = '';
    $discountAmount = 0;

    $verifiedDiscount = $_SESSION['verified_discount'] ?? null;
    if (is_array($verifiedDiscount)
        && isset($verifiedDiscount['type'], $verifiedDiscount['verified_at'])
        && in_array($verifiedDiscount['type'], ['student', 'senior', 'pwd'], true)
        && is_numeric($verifiedDiscount['verified_at'])
        && (time() - (int) $verifiedDiscount['verified_at']) <= 900) {
        $discountApplied = true;
        $discountType = $verifiedDiscount['type'];
        $discountAmount = round((float) $originalAmount * 0.10, 2);
        $finalAmount = round((float) $originalAmount - $discountAmount, 2);

        // Store discount data in session for later use
        $_SESSION['discount_applied'] = true;
        $_SESSION['discount_type'] = $discountType;
        $_SESSION['discount_amount'] = $discountAmount;
        $_SESSION['original_amount'] = $originalAmount;
        $_SESSION['final_amount'] = $finalAmount;

    } else {
        // Clear any existing discount data
        unset($_SESSION['discount_applied']);
        unset($_SESSION['discount_type']);
        unset($_SESSION['discount_amount']);
        unset($_SESSION['original_amount']);
        $_SESSION['final_amount'] = $originalAmount;
    }

    // Get the payment amount (use final amount after discount)
    $amount = (int) round($finalAmount * 100); // Convert to cents as required by PayMongo

    $baseUrl = security_app_url('includes/');

    // Initialize GuzzleHTTP client for API requests
    $client = new \GuzzleHttp\Client();

    // Create description with discount info if applicable
    $planDescription = $_SESSION['selected_plan'] . ' Membership';
    if ($discountApplied) {
        $planDescription .= ' (with ' . ucfirst($discountType) . ' 10% discount)';
    }

    // Create line items for checkout
    $lineItems = [
        [
            'currency' => 'PHP',
            'amount' => $amount,
            'name' => $planDescription,
            'quantity' => 1,
            'description' => 'Fitness Academy Membership Plan'
        ]
    ];

    // Prepare metadata
    $metadata = [
        'test_mode' => 'true',
        'user_email' => $_SESSION['user_data']['email'],
        'original_amount' => number_format($originalAmount, 2),
        'final_amount' => number_format($finalAmount, 2)
    ];

    if ($discountApplied) {
        $metadata['discount_applied'] = 'true';
        $metadata['discount_type'] = $discountType;
        $metadata['discount_amount'] = number_format($discountAmount, 2);
        $metadata['discount_percentage'] = '10';
    }

    // Create a PayMongo Checkout Session
    $checkoutResponse = $client->request('POST', 'https://api.paymongo.com/v1/checkout_sessions', [
        'headers' => [
            'Authorization' => 'Basic ' . base64_encode(PAYMONGO_SECRET_KEY . ':'),
            'Content-Type' => 'application/json'
        ],
        'json' => [
            'data' => [
                'attributes' => [
                    'line_items' => $lineItems,
                    'payment_method_types' => ['card', 'gcash', 'grab_pay', 'paymaya', 'dob', 'billease'], // All supported payment methods
                    'send_email_receipt' => true,
                    'show_description' => true,
                    'show_line_items' => true,
                    'description' => 'Fitness Academy Membership',
                    'success_url' => $baseUrl . 'payment_success.php',
                    'failure_url' => $baseUrl . 'payment_failed.php',
                    'billing' => [
                        'name' => $_SESSION['user_data']['first_name'] . ' ' . $_SESSION['user_data']['last_name'],
                        'email' => $_SESSION['user_data']['email'],
                        'phone' => $_SESSION['user_data']['phone']
                    ],
                    // Add metadata to help with tracking including discount info
                    'metadata' => $metadata
                ]
            ]
        ]
    ]);

    $checkoutData = json_decode($checkoutResponse->getBody(), true);

    // Check if checkout session was created successfully
    if (isset($checkoutData['data']) && isset($checkoutData['data']['id']) && isset($checkoutData['data']['attributes']['checkout_url'])) {        // Save the checkout session ID in session for later verification
        $_SESSION['paymongo_checkout_id'] = $checkoutData['data']['id'];
        
        // Keep the pending checkout bound to this secure session.
        $_SESSION['payment_in_progress'] = true;
        $_SESSION['payment_timestamp'] = time();
        
        // Get the checkout URL from the response
        $checkoutUrl = $checkoutData['data']['attributes']['checkout_url'];
        $checkoutParts = parse_url($checkoutUrl);
        $checkoutHost = strtolower((string) ($checkoutParts['host'] ?? ''));
        if (($checkoutParts['scheme'] ?? '') !== 'https'
            || ($checkoutHost !== 'paymongo.com' && substr($checkoutHost, -13) !== '.paymongo.com')) {
            throw new RuntimeException('Payment provider returned an invalid checkout URL');
        }

        // Redirect the user to the PayMongo Checkout page
        header("Location: " . $checkoutUrl);
        exit;
    } else {
        throw new RuntimeException("Payment provider did not create a checkout session");
    }
} catch (Exception $e) {
    error_log('Payment initialization failed: ' . $e->getMessage());
    $_SESSION['error_message'] = "Unable to start payment. Please try again.";
    header("Location: " . security_app_url('includes/register.php'));
    exit;
}
