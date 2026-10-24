<?php
require_once 'security.php';
security_start_session();
security_headers();
require '../config/database.php';
require_once '../vendor/autoload.php';
require_once __DIR__ . '/../config/api_config.php';

// Log the failure
// Clear payment session data
unset($_SESSION['paymongo_checkout_id']);
unset($_SESSION['membership_payment_data']);

// Set error message
$_SESSION['error_message'] = "Payment was not completed. Please try again or contact support if the problem persists.";

// Redirect back to membership page
header("Location: " . security_app_url('includes/membership.php'));
exit;
