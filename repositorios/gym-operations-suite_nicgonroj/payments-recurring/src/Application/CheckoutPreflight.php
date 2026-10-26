<?php

declare(strict_types=1);

namespace DemoGym\Application;

use DemoGym\Config;
use PDO;
use Throwable;

final class CheckoutPreflight
{
    /** @var list<string> */
    public const REQUIRED_TABLES = [
        'enrollments',
        'payment_records',
        'webhook_events',
        'rate_limit_buckets',
        'checkout_payment_attempts',
    ];

    /** @var array<string, string> */
    private const TABLE_PROBES = [
        'enrollments' => 'SELECT id, idempotency_key_hash, status, checkout_url, checkout_type, checkout_amount, checkout_charge_count, mp_checkout_id, mp_subscription_id, mp_preference_id, active_checkout_attempt_id FROM enrollments LIMIT 0',
        'payment_records' => 'SELECT id, enrollment_id, checkout_attempt_id, mp_payment_id, checkout_type, mp_preference_id, subscription_link_verified, checkout_link_verified, amount_refunded, ever_accredited FROM payment_records LIMIT 0',
        'webhook_events' => 'SELECT id, dedupe_key, status FROM webhook_events LIMIT 0',
        'rate_limit_buckets' => 'SELECT client_key, bucket_started_at, attempt_count FROM rate_limit_buckets LIMIT 0',
        'checkout_payment_attempts' => 'SELECT id, enrollment_id, attempt_number, checkout_type, external_reference, resource_id, checkout_url, provider_status, lifecycle_status, retry_idempotency_key_hash, remote_idempotency_key, replaces_attempt_id, creation_started_at, reconciliation_miss_count, created_at, updated_at FROM checkout_payment_attempts LIMIT 0',
    ];

    /** @var array<string, array<string, string>> */
    private const REQUIRED_UNIQUE_INDEXES = [
        'enrollments' => [
            'uq_enrollments_public_id' => 'public_id',
            'uq_enrollments_reference' => 'reference',
            'uq_enrollments_idempotency' => 'idempotency_key_hash',
            'uq_enrollments_mp_subscription' => 'mp_subscription_id',
            'uq_enrollments_mp_checkout' => 'mp_checkout_id',
            'uq_enrollments_mp_preference' => 'mp_preference_id',
        ],
        'payment_records' => [
            'uq_payment_records_mp_payment' => 'mp_payment_id',
        ],
        'webhook_events' => [
            'uq_webhook_events_dedupe' => 'dedupe_key',
        ],
        'checkout_payment_attempts' => [
            'uq_checkout_attempt_number' => 'enrollment_id,attempt_number',
            'uq_checkout_attempt_reference' => 'external_reference',
            'uq_checkout_attempt_resource' => 'resource_id',
            'uq_checkout_attempt_retry_key' => 'retry_idempotency_key_hash',
            'uq_checkout_attempt_replaces' => 'replaces_attempt_id',
        ],
    ];

    /** @var array<string, array<string, array{column:string,referenced_table:string,referenced_column:string}>> */
    private const REQUIRED_FOREIGN_KEYS = [
        'checkout_payment_attempts' => [
            'fk_checkout_attempt_enrollment' => [
                'column' => 'enrollment_id',
                'referenced_table' => 'enrollments',
                'referenced_column' => 'id',
            ],
            'fk_checkout_attempt_replaces' => [
                'column' => 'replaces_attempt_id',
                'referenced_table' => 'checkout_payment_attempts',
                'referenced_column' => 'id',
            ],
        ],
        'enrollments' => [
            'fk_enrollments_active_checkout_attempt' => [
                'column' => 'active_checkout_attempt_id',
                'referenced_table' => 'checkout_payment_attempts',
                'referenced_column' => 'id',
            ],
        ],
        'payment_records' => [
            'fk_payment_records_checkout_attempt' => [
                'column' => 'checkout_attempt_id',
                'referenced_table' => 'checkout_payment_attempts',
                'referenced_column' => 'id',
            ],
        ],
    ];

    /** @var list<string> */
    private const SAFE_FAILURE_CODES = [
        'runtime_dependency_missing',
        'local_configuration_invalid',
        'database_schema_unavailable',
    ];

    public function __construct(
        private readonly Config $config,
        private readonly PDO $pdo
    ) {
    }

    /** @return array{ready:bool,code:string,failure_class:string} */
    public function inspect(): array
    {
        $runtimeReady = extension_loaded('curl') && function_exists('curl_init');
        if (!$runtimeReady) {
            return self::classify(false, false, false);
        }

        try {
            $this->config->assertCheckoutLocalConfiguration();
        } catch (Throwable) {
            return self::classify(true, false, false);
        }

        try {
            $connectionProbe = $this->pdo->query('SELECT 1');
            if ($connectionProbe === false) {
                return self::classify(true, true, false);
            }
            $connectionProbe->closeCursor();

            foreach (self::TABLE_PROBES as $probe) {
                $statement = $this->pdo->query($probe);
                if ($statement === false) {
                    return self::classify(true, true, false);
                }
                $statement->closeCursor();
            }

            $indexProbe = $this->pdo->prepare(<<<'SQL'
                SELECT COLUMN_NAME, NON_UNIQUE
                  FROM information_schema.STATISTICS
                 WHERE TABLE_SCHEMA = DATABASE()
                   AND TABLE_NAME = :table_name
                   AND INDEX_NAME = :index_name
                 ORDER BY SEQ_IN_INDEX
            SQL);
            foreach (self::REQUIRED_UNIQUE_INDEXES as $table => $indexes) {
                foreach ($indexes as $index => $column) {
                    $indexProbe->execute(['table_name' => $table, 'index_name' => $index]);
                    $rows = $indexProbe->fetchAll(PDO::FETCH_ASSOC);
                    $indexProbe->closeCursor();
                    $expectedColumns = explode(',', $column);
                    if (
                        count($rows) !== count($expectedColumns)
                        || array_map(
                            static fn (array $row): string => (string) ($row['COLUMN_NAME'] ?? ''),
                            $rows
                        ) !== $expectedColumns
                        || array_filter(
                            $rows,
                            static fn (array $row): bool => (int) ($row['NON_UNIQUE'] ?? 1) !== 0
                        ) !== []
                    ) {
                        return self::classify(true, true, false);
                    }
                }
            }

            $engineProbe = $this->pdo->prepare(<<<'SQL'
                SELECT ENGINE
                  FROM information_schema.TABLES
                 WHERE TABLE_SCHEMA = DATABASE()
                   AND TABLE_NAME = :table_name
                 LIMIT 1
            SQL);
            $engineProbe->execute(['table_name' => 'checkout_payment_attempts']);
            if (strtoupper((string) $engineProbe->fetchColumn()) !== 'INNODB') {
                return self::classify(true, true, false);
            }
            $engineProbe->closeCursor();

            $foreignKeyProbe = $this->pdo->prepare(<<<'SQL'
                SELECT kcu.COLUMN_NAME, kcu.REFERENCED_TABLE_NAME, kcu.REFERENCED_COLUMN_NAME,
                       rc.DELETE_RULE, rc.UPDATE_RULE
                  FROM information_schema.KEY_COLUMN_USAGE AS kcu
                  JOIN information_schema.REFERENTIAL_CONSTRAINTS AS rc
                    ON rc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA
                   AND rc.TABLE_NAME = kcu.TABLE_NAME
                   AND rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
                 WHERE kcu.CONSTRAINT_SCHEMA = DATABASE()
                   AND kcu.TABLE_NAME = :table_name
                   AND kcu.CONSTRAINT_NAME = :constraint_name
            SQL);
            foreach (self::REQUIRED_FOREIGN_KEYS as $table => $constraints) {
                foreach ($constraints as $constraint => $expected) {
                    $foreignKeyProbe->execute([
                        'table_name' => $table,
                        'constraint_name' => $constraint,
                    ]);
                    $row = $foreignKeyProbe->fetch(PDO::FETCH_ASSOC);
                    $foreignKeyProbe->closeCursor();
                    if (!is_array($row)
                        || (string) ($row['COLUMN_NAME'] ?? '') !== $expected['column']
                        || (string) ($row['REFERENCED_TABLE_NAME'] ?? '') !== $expected['referenced_table']
                        || (string) ($row['REFERENCED_COLUMN_NAME'] ?? '') !== $expected['referenced_column']
                        || strtoupper((string) ($row['DELETE_RULE'] ?? '')) !== 'RESTRICT'
                        || strtoupper((string) ($row['UPDATE_RULE'] ?? '')) !== 'RESTRICT'
                    ) {
                        return self::classify(true, true, false);
                    }
                }
            }

            // La migración es reanudable, pero nunca debe considerarse lista si
            // una colisión dejó recursos o pagos sin un intento exacto. Sólo se
            // leen conteos y claves técnicas; no se leen datos personales.
            $integrityProbe = $this->pdo->query(<<<'SQL'
                SELECT
                    (
                        SELECT COUNT(*)
                          FROM enrollments AS enrollment
                          LEFT JOIN checkout_payment_attempts AS attempt
                            ON attempt.id = enrollment.active_checkout_attempt_id
                           AND attempt.enrollment_id = enrollment.id
                         WHERE (
                               enrollment.active_checkout_attempt_id IS NOT NULL
                               OR enrollment.mp_checkout_id IS NOT NULL
                               OR enrollment.mp_subscription_id IS NOT NULL
                               OR enrollment.mp_preference_id IS NOT NULL
                           )
                           AND (
                               enrollment.active_checkout_attempt_id IS NULL
                               OR attempt.id IS NULL
                               OR attempt.checkout_type <> enrollment.checkout_type
                               OR CASE enrollment.checkout_type
                                   WHEN 'subscription' THEN CAST(enrollment.mp_subscription_id AS BINARY)
                                   WHEN 'preference' THEN CAST(enrollment.mp_preference_id AS BINARY)
                                   ELSE NULL
                               END IS NULL
                               OR NOT (
                                   CAST(enrollment.mp_checkout_id AS BINARY) <=> CASE enrollment.checkout_type
                                       WHEN 'subscription' THEN CAST(enrollment.mp_subscription_id AS BINARY)
                                       WHEN 'preference' THEN CAST(enrollment.mp_preference_id AS BINARY)
                                       ELSE NULL
                                   END
                               )
                               OR NOT (
                                   CAST(attempt.resource_id AS BINARY) <=> CASE enrollment.checkout_type
                                       WHEN 'subscription' THEN CAST(enrollment.mp_subscription_id AS BINARY)
                                       WHEN 'preference' THEN CAST(enrollment.mp_preference_id AS BINARY)
                                       ELSE NULL
                                   END
                               )
                               OR (enrollment.checkout_type = 'subscription' AND enrollment.mp_preference_id IS NOT NULL)
                               OR (enrollment.checkout_type = 'preference' AND enrollment.mp_subscription_id IS NOT NULL)
                           )
                    )
                    +
                    (
                        SELECT COUNT(*)
                          FROM payment_records AS payment
                          LEFT JOIN checkout_payment_attempts AS attempt
                            ON attempt.id = payment.checkout_attempt_id
                           AND attempt.enrollment_id = payment.enrollment_id
                         WHERE attempt.id IS NULL
                    )
                    +
                    (
                        SELECT COUNT(*)
                          FROM (
                              SELECT enrollment_id
                                FROM checkout_payment_attempts
                               GROUP BY enrollment_id
                              HAVING SUM(lifecycle_status = 'active') > 1
                          ) AS duplicated_active_attempts
                    )
                    +
                    (
                        SELECT COUNT(*)
                          FROM checkout_payment_attempts AS child
                          JOIN checkout_payment_attempts AS parent
                            ON parent.id = child.replaces_attempt_id
                         WHERE child.id = parent.id
                            OR child.enrollment_id <> parent.enrollment_id
                    )
                    +
                    (
                        SELECT COUNT(*)
                          FROM checkout_payment_attempts AS attempt
                          JOIN enrollments AS enrollment ON enrollment.id = attempt.enrollment_id
                         WHERE attempt.checkout_type <> enrollment.checkout_type
                            OR (attempt.attempt_number = 1 AND attempt.external_reference <> enrollment.reference)
                    ) AS integrity_errors
            SQL);
            if ($integrityProbe === false || (int) $integrityProbe->fetchColumn() !== 0) {
                return self::classify(true, true, false);
            }
            $integrityProbe->closeCursor();
        } catch (Throwable) {
            return self::classify(true, true, false);
        }

        return self::classify(true, true, true);
    }

    /** @return array{ready:bool,code:string,failure_class:string} */
    public static function classify(bool $runtimeReady, bool $configurationReady, bool $databaseReady): array
    {
        if (!$runtimeReady) {
            return ['ready' => false, 'code' => 'runtime_dependency_missing', 'failure_class' => 'local_definitive'];
        }
        if (!$configurationReady) {
            return ['ready' => false, 'code' => 'local_configuration_invalid', 'failure_class' => 'local_definitive'];
        }
        if (!$databaseReady) {
            return ['ready' => false, 'code' => 'database_schema_unavailable', 'failure_class' => 'local_definitive'];
        }
        return ['ready' => true, 'code' => 'ready', 'failure_class' => 'none'];
    }

    /** @param array{ready?:mixed,code?:mixed} $result */
    public static function publicStatus(array $result, string $appEnvironment): string
    {
        if (($result['ready'] ?? false) === true) {
            return 'ready';
        }

        $code = is_string($result['code'] ?? null) ? $result['code'] : '';
        if (
            strtolower(trim($appEnvironment)) === 'development'
            && in_array($code, self::SAFE_FAILURE_CODES, true)
        ) {
            return $code;
        }
        return 'unavailable';
    }
}
