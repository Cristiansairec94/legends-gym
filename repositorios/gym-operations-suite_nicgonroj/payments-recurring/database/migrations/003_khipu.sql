-- Demo Gym · Khipu (transferencia simplificada + PAC) · migración aditiva e idempotente
-- Requiere 002_multi_checkout.sql. No modifica filas existentes: toda inscripción previa
-- queda con payment_provider = 'mercadopago'. Aplicar con DGYM_KHIPU_ENABLED=false.

SET @dgym_schema = DATABASE();

SET @dgym_sql = IF(
    EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@dgym_schema AND TABLE_NAME='enrollments' AND COLUMN_NAME='payment_provider'),
    'SELECT 1',
    'ALTER TABLE enrollments ADD COLUMN payment_provider VARCHAR(24) NOT NULL DEFAULT ''mercadopago'' AFTER checkout_type'
);
PREPARE dgym_stmt FROM @dgym_sql; EXECUTE dgym_stmt; DEALLOCATE PREPARE dgym_stmt;

SET @dgym_sql = IF(
    EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@dgym_schema AND TABLE_NAME='enrollments' AND COLUMN_NAME='khipu_subscription_id'),
    'SELECT 1',
    'ALTER TABLE enrollments ADD COLUMN khipu_subscription_id CHAR(36) NULL AFTER mp_preference_id, ADD UNIQUE KEY uq_enrollments_khipu_subscription (khipu_subscription_id)'
);
PREPARE dgym_stmt FROM @dgym_sql; EXECUTE dgym_stmt; DEALLOCATE PREPARE dgym_stmt;

SET @dgym_sql = IF(
    EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@dgym_schema AND TABLE_NAME='enrollments' AND COLUMN_NAME='khipu_subscription_status'),
    'SELECT 1',
    'ALTER TABLE enrollments ADD COLUMN khipu_subscription_status VARCHAR(16) NULL AFTER khipu_subscription_id'
);
PREPARE dgym_stmt FROM @dgym_sql; EXECUTE dgym_stmt; DEALLOCATE PREPARE dgym_stmt;

-- Una fila por cuota. La cuota 1 es la transferencia inicial; las siguientes, cargos PAC.
-- transaction_id es la llave de idempotencia enviada a Khipu y no se reutiliza.
CREATE TABLE IF NOT EXISTS khipu_charges (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    enrollment_id BIGINT UNSIGNED NOT NULL,
    installment_number TINYINT UNSIGNED NOT NULL,
    kind VARCHAR(16) NOT NULL,
    transaction_id VARCHAR(80) NOT NULL,
    khipu_payment_id CHAR(12) NULL,
    amount INT UNSIGNED NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'scheduled',
    due_on DATE NOT NULL,
    attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
    last_error_code VARCHAR(40) NULL,
    confirmed_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_khipu_charges_installment (enrollment_id, installment_number),
    UNIQUE KEY uq_khipu_charges_transaction (transaction_id),
    UNIQUE KEY uq_khipu_charges_payment (khipu_payment_id),
    KEY idx_khipu_charges_due (status, due_on),
    CONSTRAINT fk_khipu_charges_enrollment FOREIGN KEY (enrollment_id) REFERENCES enrollments (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
