-- Demo Gym · Mercado Pago · MySQL 5.7+/8.0+
-- Ejecutar con una cuenta de despliegue; la cuenta usada por PHP solo necesita DML.

CREATE TABLE IF NOT EXISTS enrollments (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    reference VARCHAR(64) NOT NULL,
    idempotency_key_hash CHAR(64) NOT NULL,
    request_fingerprint CHAR(64) NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(254) NOT NULL,
    phone_e164 VARCHAR(16) NOT NULL,
    necessary_consent_at DATETIME(3) NOT NULL,
    marketing_consent TINYINT(1) NOT NULL DEFAULT 0,
    consent_text_version VARCHAR(80) NOT NULL,
    attribution_json JSON NULL,
    plan_code VARCHAR(24) NOT NULL,
    plan_name VARCHAR(80) NOT NULL,
    pricing_version VARCHAR(40) NOT NULL,
    duration_months TINYINT UNSIGNED NOT NULL,
    payment_mode VARCHAR(24) NOT NULL,
    regular_monthly_amount INT UNSIGNED NOT NULL,
    installment_amount INT UNSIGNED NOT NULL,
    regular_contract_total INT UNSIGNED NOT NULL,
    contract_total INT UNSIGNED NOT NULL,
    discount_percent TINYINT UNSIGNED NOT NULL,
    currency CHAR(3) NOT NULL,
    status VARCHAR(64) NOT NULL,
    subscription_status VARCHAR(40) NOT NULL,
    payment_status VARCHAR(40) NOT NULL,
    membership_status VARCHAR(40) NOT NULL,
    mp_subscription_id VARCHAR(160) NULL,
    initial_mp_payment_id VARCHAR(160) NULL,
    initial_payment_confirmed_at DATETIME(3) NULL,
    mp_last_payment_id VARCHAR(160) NULL,
    checkout_url TEXT NULL,
    error_code VARCHAR(80) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_enrollments_public_id (public_id),
    UNIQUE KEY uq_enrollments_reference (reference),
    UNIQUE KEY uq_enrollments_idempotency (idempotency_key_hash),
    UNIQUE KEY uq_enrollments_mp_subscription (mp_subscription_id),
    UNIQUE KEY uq_enrollments_initial_payment (initial_mp_payment_id),
    KEY idx_enrollments_status_updated (status, updated_at),
    KEY idx_enrollments_email_created (email, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payment_records (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    enrollment_id BIGINT UNSIGNED NOT NULL,
    mp_payment_id VARCHAR(160) NOT NULL,
    mp_authorized_payment_id VARCHAR(160) NULL,
    status VARCHAR(40) NOT NULL,
    status_detail VARCHAR(80) NULL,
    amount INT UNSIGNED NOT NULL,
    currency CHAR(3) NOT NULL,
    subscription_link_verified TINYINT(1) NOT NULL DEFAULT 0,
    paid_at DATETIME(3) NULL,
    last_gateway_update_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_payment_records_mp_payment (mp_payment_id),
    KEY idx_payment_records_enrollment (enrollment_id, created_at),
    KEY idx_payment_records_authorized_payment (mp_authorized_payment_id),
    CONSTRAINT fk_payment_records_enrollment
        FOREIGN KEY (enrollment_id) REFERENCES enrollments (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS webhook_events (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    dedupe_key CHAR(64) NOT NULL,
    event_id VARCHAR(160) NULL,
    request_id VARCHAR(160) NOT NULL,
    topic VARCHAR(80) NOT NULL,
    action_name VARCHAR(120) NOT NULL,
    resource_id VARCHAR(160) NOT NULL,
    live_mode TINYINT(1) NOT NULL DEFAULT 0,
    status VARCHAR(40) NOT NULL,
    attempts INT UNSIGNED NOT NULL DEFAULT 1,
    enrollment_id BIGINT UNSIGNED NULL,
    payload_json JSON NOT NULL,
    resource_snapshot_json JSON NULL,
    error_code VARCHAR(80) NULL,
    received_at DATETIME(3) NOT NULL,
    last_received_at DATETIME(3) NOT NULL,
    processing_started_at DATETIME(3) NULL,
    processed_at DATETIME(3) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_webhook_events_dedupe (dedupe_key),
    KEY idx_webhook_events_status_received (status, received_at),
    KEY idx_webhook_events_resource (topic, resource_id),
    KEY idx_webhook_events_enrollment (enrollment_id),
    CONSTRAINT fk_webhook_events_enrollment
        FOREIGN KEY (enrollment_id) REFERENCES enrollments (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rate_limit_buckets (
    client_key CHAR(64) NOT NULL,
    bucket_started_at DATETIME NOT NULL,
    attempt_count INT UNSIGNED NOT NULL DEFAULT 1,
    expires_at DATETIME NOT NULL,
    PRIMARY KEY (client_key, bucket_started_at),
    KEY idx_rate_limit_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
