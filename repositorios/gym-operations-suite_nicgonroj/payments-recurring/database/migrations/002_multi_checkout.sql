-- Demo Gym · Checkout múltiple · migración aditiva e idempotente
-- Compatible con MySQL 5.7+/8.0+ y reejecutable después de una ejecución parcial.
-- Requiere 001_initial.sql. No elimina ni renombra columnas o datos existentes.

SET @dgym_schema = DATABASE();

SET @dgym_sql = IF(
    EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@dgym_schema AND TABLE_NAME='enrollments' AND COLUMN_NAME='checkout_type'),
    'SELECT 1',
    'ALTER TABLE enrollments ADD COLUMN checkout_type VARCHAR(24) NOT NULL DEFAULT ''subscription'' AFTER payment_mode'
);
PREPARE dgym_stmt FROM @dgym_sql; EXECUTE dgym_stmt; DEALLOCATE PREPARE dgym_stmt;

SET @dgym_sql = IF(
    EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@dgym_schema AND TABLE_NAME='enrollments' AND COLUMN_NAME='checkout_amount'),
    'SELECT 1',
    'ALTER TABLE enrollments ADD COLUMN checkout_amount INT UNSIGNED NOT NULL DEFAULT 0 AFTER contract_total'
);
PREPARE dgym_stmt FROM @dgym_sql; EXECUTE dgym_stmt; DEALLOCATE PREPARE dgym_stmt;

SET @dgym_sql = IF(
    EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@dgym_schema AND TABLE_NAME='enrollments' AND COLUMN_NAME='checkout_charge_count'),
    'SELECT 1',
    'ALTER TABLE enrollments ADD COLUMN checkout_charge_count TINYINT UNSIGNED NOT NULL DEFAULT 1 AFTER checkout_amount'
);
PREPARE dgym_stmt FROM @dgym_sql; EXECUTE dgym_stmt; DEALLOCATE PREPARE dgym_stmt;

SET @dgym_sql = IF(
    EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@dgym_schema AND TABLE_NAME='enrollments' AND COLUMN_NAME='mp_checkout_id'),
    'SELECT 1',
    'ALTER TABLE enrollments ADD COLUMN mp_checkout_id VARCHAR(160) NULL AFTER membership_status'
);
PREPARE dgym_stmt FROM @dgym_sql; EXECUTE dgym_stmt; DEALLOCATE PREPARE dgym_stmt;

SET @dgym_sql = IF(
    EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@dgym_schema AND TABLE_NAME='enrollments' AND COLUMN_NAME='mp_preference_id'),
    'SELECT 1',
    'ALTER TABLE enrollments ADD COLUMN mp_preference_id VARCHAR(160) NULL AFTER mp_subscription_id'
);
PREPARE dgym_stmt FROM @dgym_sql; EXECUTE dgym_stmt; DEALLOCATE PREPARE dgym_stmt;

SET @dgym_sql = IF(
    EXISTS(SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=@dgym_schema AND TABLE_NAME='enrollments' AND INDEX_NAME='uq_enrollments_mp_checkout'),
    'SELECT 1',
    'ALTER TABLE enrollments ADD UNIQUE KEY uq_enrollments_mp_checkout (mp_checkout_id)'
);
PREPARE dgym_stmt FROM @dgym_sql; EXECUTE dgym_stmt; DEALLOCATE PREPARE dgym_stmt;

SET @dgym_sql = IF(
    EXISTS(SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=@dgym_schema AND TABLE_NAME='enrollments' AND INDEX_NAME='uq_enrollments_mp_preference'),
    'SELECT 1',
    'ALTER TABLE enrollments ADD UNIQUE KEY uq_enrollments_mp_preference (mp_preference_id)'
);
PREPARE dgym_stmt FROM @dgym_sql; EXECUTE dgym_stmt; DEALLOCATE PREPARE dgym_stmt;

UPDATE enrollments
   SET checkout_type = 'subscription',
       checkout_amount = installment_amount,
       checkout_charge_count = duration_months,
       mp_checkout_id = mp_subscription_id
 WHERE payment_mode = 'automatic'
   AND checkout_amount = 0;

SET @dgym_sql = IF(
    EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@dgym_schema AND TABLE_NAME='payment_records' AND COLUMN_NAME='checkout_type'),
    'SELECT 1',
    'ALTER TABLE payment_records ADD COLUMN checkout_type VARCHAR(24) NOT NULL DEFAULT ''subscription'' AFTER mp_authorized_payment_id'
);
PREPARE dgym_stmt FROM @dgym_sql; EXECUTE dgym_stmt; DEALLOCATE PREPARE dgym_stmt;

SET @dgym_sql = IF(
    EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@dgym_schema AND TABLE_NAME='payment_records' AND COLUMN_NAME='mp_preference_id'),
    'SELECT 1',
    'ALTER TABLE payment_records ADD COLUMN mp_preference_id VARCHAR(160) NULL AFTER checkout_type'
);
PREPARE dgym_stmt FROM @dgym_sql; EXECUTE dgym_stmt; DEALLOCATE PREPARE dgym_stmt;

SET @dgym_sql = IF(
    EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@dgym_schema AND TABLE_NAME='payment_records' AND COLUMN_NAME='checkout_link_verified'),
    'SELECT 1',
    'ALTER TABLE payment_records ADD COLUMN checkout_link_verified TINYINT(1) NOT NULL DEFAULT 0 AFTER subscription_link_verified'
);
PREPARE dgym_stmt FROM @dgym_sql; EXECUTE dgym_stmt; DEALLOCATE PREPARE dgym_stmt;

SET @dgym_sql = IF(
    EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@dgym_schema AND TABLE_NAME='payment_records' AND COLUMN_NAME='amount_refunded'),
    'SELECT 1',
    'ALTER TABLE payment_records ADD COLUMN amount_refunded INT UNSIGNED NOT NULL DEFAULT 0 AFTER amount'
);
PREPARE dgym_stmt FROM @dgym_sql; EXECUTE dgym_stmt; DEALLOCATE PREPARE dgym_stmt;

SET @dgym_sql = IF(
    EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@dgym_schema AND TABLE_NAME='payment_records' AND COLUMN_NAME='ever_accredited'),
    'SELECT 1',
    'ALTER TABLE payment_records ADD COLUMN ever_accredited TINYINT(1) NOT NULL DEFAULT 0 AFTER amount_refunded'
);
PREPARE dgym_stmt FROM @dgym_sql; EXECUTE dgym_stmt; DEALLOCATE PREPARE dgym_stmt;

SET @dgym_sql = IF(
    EXISTS(SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=@dgym_schema AND TABLE_NAME='payment_records' AND INDEX_NAME='idx_payment_records_preference'),
    'SELECT 1',
    'ALTER TABLE payment_records ADD KEY idx_payment_records_preference (mp_preference_id)'
);
PREPARE dgym_stmt FROM @dgym_sql; EXECUTE dgym_stmt; DEALLOCATE PREPARE dgym_stmt;

UPDATE payment_records
   SET checkout_link_verified = GREATEST(checkout_link_verified, subscription_link_verified),
       ever_accredited = GREATEST(
           ever_accredited,
           CASE
               WHEN (status = 'approved' AND status_detail = 'accredited')
                 OR status IN ('refunded', 'charged_back')
               THEN 1 ELSE 0
           END
       )
 WHERE checkout_link_verified = 0
    OR ever_accredited = 0;

-- Lease de identidad: una misma combinación normalizada correo+teléfono solo
-- puede tener un checkout potencialmente cobrable. La aplicación almacena un
-- HMAC SHA-256, nunca la identidad concatenada, y toma este lease antes del POST.
CREATE TABLE IF NOT EXISTS checkout_identity_leases (
    identity_fingerprint CHAR(64) NOT NULL,
    owner_public_id CHAR(36) NOT NULL,
    enrollment_id BIGINT UNSIGNED NULL,
    acquired_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (identity_fingerprint),
    UNIQUE KEY uq_checkout_identity_owner (owner_public_id),
    UNIQUE KEY uq_checkout_identity_enrollment (enrollment_id),
    CONSTRAINT fk_checkout_identity_enrollment
        FOREIGN KEY (enrollment_id) REFERENCES enrollments (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- CREATE TABLE es atómico, y estas guardas permiten reparar índices ausentes
-- si una instalación previa dejó una variante parcial de la tabla.
SET @dgym_sql = IF(
    EXISTS(SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=@dgym_schema AND TABLE_NAME='checkout_identity_leases' AND INDEX_NAME='PRIMARY'),
    'SELECT 1',
    'ALTER TABLE checkout_identity_leases ADD PRIMARY KEY (identity_fingerprint)'
);
PREPARE dgym_stmt FROM @dgym_sql; EXECUTE dgym_stmt; DEALLOCATE PREPARE dgym_stmt;

SET @dgym_sql = IF(
    EXISTS(SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=@dgym_schema AND TABLE_NAME='checkout_identity_leases' AND INDEX_NAME='uq_checkout_identity_owner'),
    'SELECT 1',
    'ALTER TABLE checkout_identity_leases ADD UNIQUE KEY uq_checkout_identity_owner (owner_public_id)'
);
PREPARE dgym_stmt FROM @dgym_sql; EXECUTE dgym_stmt; DEALLOCATE PREPARE dgym_stmt;

SET @dgym_sql = IF(
    EXISTS(SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=@dgym_schema AND TABLE_NAME='checkout_identity_leases' AND INDEX_NAME='uq_checkout_identity_enrollment'),
    'SELECT 1',
    'ALTER TABLE checkout_identity_leases ADD UNIQUE KEY uq_checkout_identity_enrollment (enrollment_id)'
);
PREPARE dgym_stmt FROM @dgym_sql; EXECUTE dgym_stmt; DEALLOCATE PREPARE dgym_stmt;

SET @dgym_sql = NULL;
SET @dgym_schema = NULL;
