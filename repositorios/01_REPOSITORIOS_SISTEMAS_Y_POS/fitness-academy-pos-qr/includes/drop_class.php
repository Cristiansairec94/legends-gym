<?php
require_once 'security.php';
security_require_roles(['Member'], false, 'login.php');
security_headers();
require '../config/database.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['class_id'])) {
    security_require_csrf();
    $class_id = filter_input(INPUT_POST, 'class_id', FILTER_VALIDATE_INT);
    $user_id = $_SESSION['user_id'];

    if (!$class_id || $class_id <= 0) {
        $_SESSION['error_message'] = 'Invalid class.';
        header('Location: member_class.php');
        exit;
    }

    try {
        // Start transaction
        $conn->beginTransaction();

        // Get class details first
        $stmt = $conn->prepare("SELECT c.*, ce.payment_status 
                               FROM classes c 
                               JOIN classenrollments ce ON c.class_id = ce.class_id 
                               WHERE c.class_id = ? AND ce.user_id = ?");
        $stmt->execute([$class_id, $user_id]);
        $enrollment = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$enrollment) {
            throw new Exception('Enrollment not found');
        }

        // Update enrollment status to cancelled
        $stmt = $conn->prepare("UPDATE classenrollments 
                              SET status = 'cancelled'
                              WHERE class_id = ? AND user_id = ?");
        $stmt->execute([$class_id, $user_id]);

        $conn->commit();
        $_SESSION['success_message'] = "Successfully dropped out from " . $enrollment['class_name'] .
            ". Note: Class fees are non-refundable.";
    } catch (Throwable $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }
        error_log('Drop class error: ' . $e->getMessage());
        $_SESSION['error_message'] = 'Unable to drop the class.';
    }
} else {
    $_SESSION['error_message'] = "Invalid request";
}

header('Location: member_class.php');
exit;
