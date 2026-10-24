<?php
require_once '../includes/security.php';
security_require_roles(['Admin']);
require_once '../config/database.php';

security_headers();
header('Cache-Control: private, no-store, max-age=0');

$applicationId = filter_input(INPUT_GET, 'application_id', FILTER_VALIDATE_INT);
if (!$applicationId || $applicationId <= 0) {
    security_json_error(400, 'Invalid application');
}

try {
    $stmt = $conn->prepare('SELECT resume_path FROM coach_applications WHERE id = ?');
    $stmt->execute([$applicationId]);
    $resumePath = $stmt->fetchColumn();

    if (!is_string($resumePath) || $resumePath === '') {
        security_json_error(404, 'Resume not found');
    }

    $fileName = basename($resumePath);
    $filePath = security_private_storage_directory('coach_resumes') . DIRECTORY_SEPARATOR . $fileName;

    // Read-only compatibility for resumes created before private storage was
    // introduced. Deployments should migrate these files and then remove them
    // from the public uploads directory.
    if (!is_file($filePath)) {
        $legacyPath = dirname(__DIR__) . '/uploads/coach_resumes/' . $fileName;
        if (is_file($legacyPath)) {
            $filePath = $legacyPath;
        }
    }

    if (!is_file($filePath) || !is_readable($filePath)) {
        security_json_error(404, 'Resume not found');
    }

    $mimeType = (new finfo(FILEINFO_MIME_TYPE))->file($filePath);
    $allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
    ];
    if (!is_string($mimeType) || !in_array($mimeType, $allowedTypes, true)) {
        security_json_error(415, 'Resume type is not supported');
    }

    $disposition = in_array($mimeType, ['application/pdf', 'image/jpeg', 'image/png'], true)
        ? 'inline'
        : 'attachment';
    header('Content-Type: ' . $mimeType);
    header('Content-Length: ' . filesize($filePath));
    header('Content-Disposition: ' . $disposition . '; filename="coach-resume.' . pathinfo($fileName, PATHINFO_EXTENSION) . '"');
    readfile($filePath);
} catch (PDOException $e) {
    error_log('Unable to download coach resume: ' . $e->getMessage());
    security_json_error(500, 'Unable to load resume');
}
