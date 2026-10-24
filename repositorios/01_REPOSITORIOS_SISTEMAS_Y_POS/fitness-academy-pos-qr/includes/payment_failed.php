<?php
require_once 'security.php';
security_start_session();
security_headers();
require '../config/database.php';
require_once '../vendor/autoload.php';

// Load API configuration
require_once __DIR__ . '/../config/api_config.php';

// Check if there's a receipt in the session
if (isset($_SESSION['payment_receipt'])) {
    // If we have a receipt, the payment might have succeeded but callback failed
    error_log('Payment has receipt but failed callback - checking status');

    try {
        if (isset($_SESSION['paymongo_checkout_id'])) {
            $client = new \GuzzleHttp\Client();
            $checkoutSessionId = (string) $_SESSION['paymongo_checkout_id'];
            if (!preg_match('/^[A-Za-z0-9_-]{8,128}$/', $checkoutSessionId)) {
                throw new RuntimeException('Invalid checkout session ID');
            }
            $sessionResponse = $client->request('GET', 'https://api.paymongo.com/v1/checkout_sessions/' . rawurlencode($checkoutSessionId), [
                'headers' => [
                    'Authorization' => 'Basic ' . base64_encode(PAYMONGO_SECRET_KEY . ':'),
                ]
            ]);

            $sessionData = json_decode($sessionResponse->getBody(), true);
            if (
                isset($sessionData['data']['attributes']['status']) &&
                in_array($sessionData['data']['attributes']['status'], ['completed', 'paid', 'succeeded'])
            ) {
                // Payment actually succeeded - redirect to success
                header("Location: " . security_app_url('includes/payment_success.php'));
                exit;
            }
        }
    } catch (Exception $e) {
        error_log('Error checking payment status: ' . $e->getMessage());
    }
}

// If we get here, payment truly failed
$_SESSION['error_message'] = "Your payment was not completed. If you received a payment receipt, please contact support with your receipt details.";

// Redirect back to payment page
$_SESSION['registration_step'] = 4;
header("Location: " . security_app_url('includes/register.php'));
exit;
