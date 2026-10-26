-- Demo Gym · intentos de pago recuperables · migración aditiva
-- Compatible con MySQL 5.7+/8.0+. Conserva todos los recursos remotos y
-- mantiene una sola fila lógica en enrollments.

SET @dgym_schema = DATABASE();

CREATE TABLE IF NOT EXISTS checkout_payment_attempts (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    enrollment_id BIGINT UNSIGNED NOT NULL,
    attempt_number INT UNSIGNED NOT NULL,
    checkout_type VARCHAR(24) NOT NULL,
    external_reference VARCHAR(64) NOT NULL,
    resource_id VARCHAR(160) NULL,
    checkout_url TEXT NULL,
    provider_status VARCHAR(40) NOT NULL DEFAULT 'unknown',
    lifecycle_status VARCHAR(40) NOT NULL,
    retry_idempotency_key_hash CHAR(64) NULL,
    remote_idempotency_key CHAR(36) NULL,
    replaces_attempt_id BIGINT UNSIGNED NULL,
    creation_started_at DATETIME(3) NULL,
    reconciliation_miss_count INT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_checkout_attempt_number (enrollment_id, attempt_number),
    UNIQUE KEY uq_checkout_attempt_reference (external_reference),
    UNIQUE KEY uq_checkout_attempt_resource (resource_id),
    UNIQUE KEY uq_checkout_attempt_retry_key (retry_idempotency_key_hash),
    KEY idx_checkout_attempt_enrollment_state (enrollment_id, lifecycle_status),
    UNIQUE KEY uq_checkout_attempt_replaces (replaces_attempt_id),
    CONSTRAINT fk_checkout_attempt_enrollment
        FOREIGN KEY (enrollment_id) REFERENCES enrollments (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_checkout_attempt_replaces
        FOREIGN KEY (replaces_attempt_id) REFERENCES checkout_payment_attempts (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @dgym_sql = IF(
    EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@dgym_schema AND TABLE_NAME='checkout_payment_attempts' AND COLUMN_NAME='creation_started_at'),
    'SELECT 1',
    'ALTER TABLE checkout_payment_attempts ADD COLUMN creation_started_at DATETIME(3) NULL AFTER replaces_attempt_id'
);
PREPARE dgym_stmt FROM @dgym_sql; EXECUTE dgym_stmt; DEALLOCATE PREPARE dgym_stmt;

SET @dgym_sql = IF(
    EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@dgym_schema AND TABLE_NAME='checkout_payment_attempts' AND COLUMN_NAME='reconciliation_miss_count'),
    'SELECT 1',
    'ALTER TABLE checkout_payment_attempts ADD COLUMN reconciliation_miss_count INT UNSIGNED NOT NULL DEFAULT 0 AFTER creation_started_at'
);
PREPARE dgym_stmt FROM @dgym_sql; EXECUTE dgym_stmt; DEALLOCATE PREPARE dgym_stmt;

-- Reanudación segura si una versión previa alcanzó creating/creation_uncertain
-- antes de incorporar el marcador. La fecha existente evita repetir el POST y
-- permite que la conciliación termine en revisión tras su ventana conservadora.
UPDATE checkout_payment_attempts
   SET creation_started_at = COALESCE(creation_started_at, updated_at, created_at)
 WHERE lifecycle_status IN ('creating', 'creation_uncertain')
   AND creation_started_at IS NULL;

-- Cada checkout existente pasa a ser el intento 1. La referencia canónica se
-- conserva para que webhooks y conciliaciones históricas sigan siendo trazables.
INSERT INTO checkout_payment_attempts (
    enrollment_id, attempt_number, checkout_type, external_reference,
    resource_id, checkout_url, provider_status, lifecycle_status
)
SELECT enrollments.id, 1, enrollments.checkout_type, enrollments.reference,
       CASE enrollments.checkout_type
           WHEN 'subscription' THEN CAST(enrollments.mp_subscription_id AS BINARY)
           WHEN 'preference' THEN CAST(enrollments.mp_preference_id AS BINARY)
           ELSE NULL
       END, enrollments.checkout_url,
       CASE WHEN enrollments.checkout_type = 'subscription' THEN enrollments.subscription_status ELSE enrollments.status END,
       'active'
  FROM enrollments
  LEFT JOIN checkout_payment_attempts AS existing_attempt
    ON existing_attempt.enrollment_id = enrollments.id
   AND existing_attempt.attempt_number = 1
 WHERE CASE enrollments.checkout_type
           WHEN 'subscription' THEN CAST(enrollments.mp_subscription_id AS BINARY)
           WHEN 'preference' THEN CAST(enrollments.mp_preference_id AS BINARY)
           ELSE NULL
       END IS NOT NULL
   AND existing_attempt.id IS NULL;

SET @dgym_sql = IF(
    EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@dgym_schema AND TABLE_NAME='enrollments' AND COLUMN_NAME='active_checkout_attempt_id'),
    'SELECT 1',
    'ALTER TABLE enrollments ADD COLUMN active_checkout_attempt_id BIGINT UNSIGNED NULL AFTER mp_preference_id'
);
PREPARE dgym_stmt FROM @dgym_sql; EXECUTE dgym_stmt; DEALLOCATE PREPARE dgym_stmt;

UPDATE enrollments AS enrollment
JOIN checkout_payment_attempts AS attempt
  ON attempt.enrollment_id = enrollment.id
 AND attempt.attempt_number = 1
 AND attempt.checkout_type = enrollment.checkout_type
 AND attempt.external_reference = enrollment.reference
 AND CAST(attempt.resource_id AS BINARY) <=> CASE enrollment.checkout_type
       WHEN 'subscription' THEN CAST(enrollment.mp_subscription_id AS BINARY)
       WHEN 'preference' THEN CAST(enrollment.mp_preference_id AS BINARY)
       ELSE NULL
     END
SET enrollment.active_checkout_attempt_id = attempt.id
WHERE enrollment.active_checkout_attempt_id IS NULL;

SET @dgym_sql = IF(
    EXISTS(SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=@dgym_schema AND TABLE_NAME='enrollments' AND INDEX_NAME='idx_enrollments_active_checkout_attempt'),
    'SELECT 1',
    'ALTER TABLE enrollments ADD KEY idx_enrollments_active_checkout_attempt (active_checkout_attempt_id)'
);
PREPARE dgym_stmt FROM @dgym_sql; EXECUTE dgym_stmt; DEALLOCATE PREPARE dgym_stmt;

SET @dgym_sql = IF(
    EXISTS(SELECT 1 FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=@dgym_schema AND TABLE_NAME='enrollments' AND CONSTRAINT_NAME='fk_enrollments_active_checkout_attempt'),
    'SELECT 1',
    'ALTER TABLE enrollments ADD CONSTRAINT fk_enrollments_active_checkout_attempt FOREIGN KEY (active_checkout_attempt_id) REFERENCES checkout_payment_attempts (id) ON DELETE RESTRICT ON UPDATE RESTRICT'
);
PREPARE dgym_stmt FROM @dgym_sql; EXECUTE dgym_stmt; DEALLOCATE PREPARE dgym_stmt;

SET @dgym_sql = IF(
    EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@dgym_schema AND TABLE_NAME='payment_records' AND COLUMN_NAME='checkout_attempt_id'),
    'SELECT 1',
    'ALTER TABLE payment_records ADD COLUMN checkout_attempt_id BIGINT UNSIGNED NULL AFTER enrollment_id'
);
PREPARE dgym_stmt FROM @dgym_sql; EXECUTE dgym_stmt; DEALLOCATE PREPARE dgym_stmt;

-- Atribuye evidencia antigua sólo cuando existe un único intento posible. En
-- una reejecución posterior, cualquier pago ambiguo permanece NULL y el
-- preflight bloquea la apertura hasta que una conciliación exacta lo resuelva.
UPDATE payment_records AS payment
JOIN checkout_payment_attempts AS attempt
  ON attempt.enrollment_id = payment.enrollment_id
LEFT JOIN checkout_payment_attempts AS sibling
  ON sibling.enrollment_id = payment.enrollment_id
 AND sibling.id <> attempt.id
SET payment.checkout_attempt_id = attempt.id
WHERE payment.checkout_attempt_id IS NULL
  AND sibling.id IS NULL;

SET @dgym_sql = IF(
    EXISTS(SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=@dgym_schema AND TABLE_NAME='payment_records' AND INDEX_NAME='idx_payment_records_checkout_attempt'),
    'SELECT 1',
    'ALTER TABLE payment_records ADD KEY idx_payment_records_checkout_attempt (checkout_attempt_id)'
);
PREPARE dgym_stmt FROM @dgym_sql; EXECUTE dgym_stmt; DEALLOCATE PREPARE dgym_stmt;

SET @dgym_sql = IF(
    EXISTS(SELECT 1 FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=@dgym_schema AND TABLE_NAME='payment_records' AND CONSTRAINT_NAME='fk_payment_records_checkout_attempt'),
    'SELECT 1',
    'ALTER TABLE payment_records ADD CONSTRAINT fk_payment_records_checkout_attempt FOREIGN KEY (checkout_attempt_id) REFERENCES checkout_payment_attempts (id) ON DELETE RESTRICT ON UPDATE RESTRICT'
);
PREPARE dgym_stmt FROM @dgym_sql; EXECUTE dgym_stmt; DEALLOCATE PREPARE dgym_stmt;

SET @dgym_sql = NULL;
SET @dgym_schema = NULL;
