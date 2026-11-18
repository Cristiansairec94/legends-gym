<?php

declare(strict_types=1);

namespace DemoGym\Infrastructure;

use PDO;
use PDOException;

final class EnrollmentRepository
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    /** @return array<string, mixed>|null */
    public function findByIdempotencyHash(string $hash): ?array
    {
        $statement = $this->pdo->prepare('SELECT * FROM enrollments WHERE idempotency_key_hash = :hash LIMIT 1');
        $statement->execute(['hash' => $hash]);
        $result = $statement->fetch();
        return is_array($result) ? $result : null;
    }

    /**
     * Reserva atómicamente una identidad antes de cualquier POST remoto. Un
     * lease huérfano sin enrollment puede reemplazarse. También se recupera el
     * único crash seguro con fila: lease antiguo todavía sin enlazar y enrollment
     * en creating_checkout sin ningún artefacto remoto. Por el orden del servicio,
     * el POST al gateway ocurre exclusivamente después de enlazar el lease.
     */
    public function acquireIdentityLease(string $fingerprint, string $ownerPublicId): bool
    {
        $ownsTransaction = !$this->pdo->inTransaction();
        if ($ownsTransaction) {
            $this->pdo->beginTransaction();
        }
        try {
            $retireEnrollment = $this->pdo->prepare(<<<'SQL'
                UPDATE enrollments AS enrollment
                JOIN checkout_identity_leases AS lease
                  ON enrollment.public_id = lease.owner_public_id
                   SET enrollment.status = 'checkout_creation_failed',
                       enrollment.error_code = 'abandoned_before_checkout',
                       enrollment.updated_at = UTC_TIMESTAMP(3)
                 WHERE lease.identity_fingerprint = :fingerprint
                   AND lease.enrollment_id IS NULL
                   AND lease.acquired_at < UTC_TIMESTAMP(3) - INTERVAL 10 MINUTE
                   AND enrollment.status = 'creating_checkout'
                   AND enrollment.mp_checkout_id IS NULL
                   AND enrollment.mp_subscription_id IS NULL
                   AND enrollment.mp_preference_id IS NULL
                   AND (enrollment.checkout_url IS NULL OR enrollment.checkout_url = '')
            SQL);
            $retireEnrollment->execute(['fingerprint' => $fingerprint]);

            $cleanup = $this->pdo->prepare(<<<'SQL'
                DELETE lease
                  FROM checkout_identity_leases AS lease
                  LEFT JOIN enrollments AS enrollment
                    ON enrollment.public_id = lease.owner_public_id
                 WHERE lease.identity_fingerprint = :fingerprint
                   AND lease.enrollment_id IS NULL
                   AND lease.acquired_at < UTC_TIMESTAMP(3) - INTERVAL 10 MINUTE
                   AND (
                       enrollment.id IS NULL
                       OR (
                           enrollment.status = 'checkout_creation_failed'
                           AND enrollment.mp_checkout_id IS NULL
                           AND enrollment.mp_subscription_id IS NULL
                           AND enrollment.mp_preference_id IS NULL
                           AND (enrollment.checkout_url IS NULL OR enrollment.checkout_url = '')
                       )
                   )
            SQL);
            $cleanup->execute(['fingerprint' => $fingerprint]);

            $statement = $this->pdo->prepare(<<<'SQL'
                INSERT INTO checkout_identity_leases (identity_fingerprint, owner_public_id)
                VALUES (:fingerprint, :owner_public_id)
            SQL);
            try {
                $statement->execute(['fingerprint' => $fingerprint, 'owner_public_id' => $ownerPublicId]);
                $acquired = true;
            } catch (PDOException $exception) {
                if (!self::isUniqueViolation($exception)) {
                    throw $exception;
                }
                $acquired = false;
            }

            if ($ownsTransaction) {
                $this->pdo->commit();
            }
            return $acquired;
        } catch (\Throwable $exception) {
            if ($ownsTransaction && $this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $exception;
        }
    }

    /** @return array<string, mixed>|null */
    public function findByIdentityLease(string $fingerprint): ?array
    {
        $statement = $this->pdo->prepare(<<<'SQL'
            SELECT enrollment.*,
                   lease.owner_public_id AS identity_lease_owner_public_id,
                   lease.enrollment_id AS identity_lease_enrollment_id
              FROM checkout_identity_leases AS lease
              JOIN enrollments AS enrollment
                ON enrollment.id = lease.enrollment_id
                OR (lease.enrollment_id IS NULL AND enrollment.public_id = lease.owner_public_id)
             WHERE lease.identity_fingerprint = :fingerprint
             LIMIT 1
        SQL);
        $statement->execute(['fingerprint' => $fingerprint]);
        $result = $statement->fetch();
        return is_array($result) ? $result : null;
    }

    /** @return array<string, mixed>|null */
    public function findPotentiallyChargeableByIdentity(string $email, string $phoneE164): ?array
    {
        $statement = $this->pdo->prepare(<<<'SQL'
            SELECT *
              FROM enrollments
             WHERE email = :email
               AND phone_e164 = :phone_e164
               AND NOT (
                   status = 'checkout_creation_failed'
                   AND mp_checkout_id IS NULL
                   AND mp_subscription_id IS NULL
                   AND mp_preference_id IS NULL
                   AND (checkout_url IS NULL OR checkout_url = '')
               )
               AND NOT (
                   checkout_type = 'subscription'
                   AND subscription_status IN ('cancelled', 'canceled')
               )
             ORDER BY created_at DESC, id DESC
             LIMIT 1
        SQL);
        $statement->execute(['email' => $email, 'phone_e164' => $phoneE164]);
        $result = $statement->fetch();
        return is_array($result) ? $result : null;
    }

    public function bindIdentityLease(string $fingerprint, string $ownerPublicId, int $enrollmentId): void
    {
        $statement = $this->pdo->prepare(<<<'SQL'
            UPDATE checkout_identity_leases
               SET enrollment_id = :enrollment_id,
                   updated_at = UTC_TIMESTAMP(3)
             WHERE identity_fingerprint = :fingerprint
               AND owner_public_id = :owner_public_id
               AND (enrollment_id IS NULL OR enrollment_id = :same_enrollment_id)
        SQL);
        $statement->execute([
            'enrollment_id' => $enrollmentId,
            'fingerprint' => $fingerprint,
            'owner_public_id' => $ownerPublicId,
            'same_enrollment_id' => $enrollmentId,
        ]);
        if ($statement->rowCount() === 1) {
            return;
        }
        $check = $this->pdo->prepare(<<<'SQL'
            SELECT COUNT(*)
              FROM checkout_identity_leases
             WHERE identity_fingerprint = :fingerprint
               AND owner_public_id = :owner_public_id
               AND enrollment_id = :enrollment_id
        SQL);
        $check->execute([
            'fingerprint' => $fingerprint,
            'owner_public_id' => $ownerPublicId,
            'enrollment_id' => $enrollmentId,
        ]);
        if ((int) $check->fetchColumn() !== 1) {
            throw new \RuntimeException('No se pudo enlazar el lease de identidad a la inscripción.');
        }
    }

    /**
     * Solo se invoca antes del primer POST: deja trazabilidad local y libera el
     * lease, porque por construcción aún no puede existir un checkout remoto.
     */
    public function abortIdentityLeaseBeforeCheckout(string $fingerprint, string $ownerPublicId): void
    {
        $ownsTransaction = !$this->pdo->inTransaction();
        if ($ownsTransaction) {
            $this->pdo->beginTransaction();
        }
        try {
            $mark = $this->pdo->prepare(<<<'SQL'
                UPDATE enrollments
                   SET status = 'checkout_creation_failed',
                       error_code = 'local_checkout_preparation_failed',
                       updated_at = UTC_TIMESTAMP(3)
                 WHERE public_id = :owner_public_id
                   AND status = 'creating_checkout'
                   AND mp_checkout_id IS NULL
                   AND mp_subscription_id IS NULL
                   AND mp_preference_id IS NULL
                   AND (checkout_url IS NULL OR checkout_url = '')
            SQL);
            $mark->execute(['owner_public_id' => $ownerPublicId]);

            $release = $this->pdo->prepare(<<<'SQL'
                DELETE FROM checkout_identity_leases
                 WHERE identity_fingerprint = :fingerprint
                   AND owner_public_id = :owner_public_id
                   AND (
                       enrollment_id IS NULL
                       OR enrollment_id IN (
                           SELECT id
                             FROM enrollments
                            WHERE public_id = :enrollment_owner_public_id
                              AND status = 'checkout_creation_failed'
                              AND mp_checkout_id IS NULL
                              AND mp_subscription_id IS NULL
                              AND mp_preference_id IS NULL
                              AND (checkout_url IS NULL OR checkout_url = '')
                       )
                   )
            SQL);
            $release->execute([
                'fingerprint' => $fingerprint,
                'owner_public_id' => $ownerPublicId,
                'enrollment_owner_public_id' => $ownerPublicId,
            ]);
            if ($ownsTransaction) {
                $this->pdo->commit();
            }
        } catch (\Throwable $exception) {
            if ($ownsTransaction && $this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $exception;
        }
    }

    public function releaseIdentityLeaseForCanceledSubscription(int $enrollmentId): void
    {
        $statement = $this->pdo->prepare(<<<'SQL'
            DELETE lease
              FROM checkout_identity_leases AS lease
              JOIN enrollments AS enrollment ON enrollment.id = lease.enrollment_id
              JOIN checkout_payment_attempts AS active_attempt
                ON active_attempt.id = enrollment.active_checkout_attempt_id
               AND active_attempt.enrollment_id = enrollment.id
               AND active_attempt.resource_id = enrollment.mp_subscription_id
             WHERE enrollment.id = :enrollment_id
               AND enrollment.checkout_type = 'subscription'
               AND enrollment.initial_payment_confirmed_at IS NOT NULL
               AND enrollment.subscription_status IN ('cancelled', 'canceled')
               AND active_attempt.provider_status IN ('cancelled', 'canceled')
               AND NOT EXISTS (
                   SELECT 1
                     FROM checkout_payment_attempts AS retry
                    WHERE retry.enrollment_id = enrollment.id
                      AND retry.replaces_attempt_id = active_attempt.id
                      AND retry.lifecycle_status IN (
                          'awaiting_cancellation', 'cancel_uncertain',
                          'ready_to_create', 'creating', 'creation_uncertain', 'confirmed'
                      )
               )
        SQL);
        $statement->execute(['enrollment_id' => $enrollmentId]);
    }

    /** @return array<string, mixed>|null */
    public function findById(int $id): ?array
    {
        $statement = $this->pdo->prepare('SELECT * FROM enrollments WHERE id = :id LIMIT 1');
        $statement->execute(['id' => $id]);
        $result = $statement->fetch();
        return is_array($result) ? $result : null;
    }

    /**
     * Serializa transiciones distintas sobre la misma inscripción. El GET al
     * gateway ocurre antes; dentro del lock solo se decide y persiste el estado.
     *
     * @template T
     * @param callable(array<string, mixed>):T $callback
     * @return T
     */
    public function withLockedEnrollment(int $id, callable $callback): mixed
    {
        $ownsTransaction = !$this->pdo->inTransaction();
        if ($ownsTransaction) {
            $this->pdo->beginTransaction();
        }
        try {
            $statement = $this->pdo->prepare('SELECT * FROM enrollments WHERE id = :id LIMIT 1 FOR UPDATE');
            $statement->execute(['id' => $id]);
            $enrollment = $statement->fetch();
            if (!is_array($enrollment)) {
                throw new \RuntimeException('La inscripción no existe al adquirir el lock.');
            }
            $result = $callback($enrollment);
            if ($ownsTransaction) {
                $this->pdo->commit();
            }
            return $result;
        } catch (\Throwable $exception) {
            if ($ownsTransaction && $this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $exception;
        }
    }

    /** @return array<string, mixed>|null */
    public function findByReference(string $reference): ?array
    {
        $statement = $this->pdo->prepare(<<<'SQL'
            SELECT enrollment.*
              FROM enrollments AS enrollment
              LEFT JOIN checkout_payment_attempts AS attempt
                ON attempt.enrollment_id = enrollment.id
               AND attempt.external_reference = :attempt_reference
             WHERE enrollment.reference = :reference
                OR attempt.id IS NOT NULL
             ORDER BY (enrollment.reference = :canonical_reference) DESC
             LIMIT 1
        SQL);
        $statement->execute([
            'reference' => $reference,
            'attempt_reference' => $reference,
            'canonical_reference' => $reference,
        ]);
        $result = $statement->fetch();
        return is_array($result) ? $result : null;
    }

    /** @return array<string, mixed>|null */
    public function findBySubscriptionId(string $subscriptionId): ?array
    {
        $statement = $this->pdo->prepare(<<<'SQL'
            SELECT enrollment.*
              FROM enrollments AS enrollment
              LEFT JOIN checkout_payment_attempts AS attempt
                ON attempt.enrollment_id = enrollment.id
               AND attempt.checkout_type = 'subscription'
               AND attempt.resource_id = :attempt_id
             WHERE enrollment.mp_subscription_id = :id
                OR attempt.id IS NOT NULL
             ORDER BY (enrollment.mp_subscription_id = :current_id) DESC
             LIMIT 1
        SQL);
        $statement->execute(['id' => $subscriptionId, 'attempt_id' => $subscriptionId, 'current_id' => $subscriptionId]);
        $result = $statement->fetch();
        return is_array($result) ? $result : null;
    }

    /** @return array<string, mixed>|null */
    public function findByCheckoutId(string $checkoutId): ?array
    {
        $statement = $this->pdo->prepare(<<<'SQL'
            SELECT enrollment.*
              FROM enrollments AS enrollment
              LEFT JOIN checkout_payment_attempts AS attempt
                ON attempt.enrollment_id = enrollment.id
               AND attempt.resource_id = :attempt_id
             WHERE enrollment.mp_checkout_id = :id
                OR attempt.id IS NOT NULL
             ORDER BY (enrollment.mp_checkout_id = :current_id) DESC
             LIMIT 1
        SQL);
        $statement->execute(['id' => $checkoutId, 'attempt_id' => $checkoutId, 'current_id' => $checkoutId]);
        $result = $statement->fetch();
        return is_array($result) ? $result : null;
    }

    /** @return array<string, mixed>|null */
    public function findByPreferenceId(string $preferenceId): ?array
    {
        $statement = $this->pdo->prepare(<<<'SQL'
            SELECT enrollment.*
              FROM enrollments AS enrollment
              LEFT JOIN checkout_payment_attempts AS attempt
                ON attempt.enrollment_id = enrollment.id
               AND attempt.checkout_type = 'preference'
               AND attempt.resource_id = :attempt_id
             WHERE enrollment.mp_preference_id = :id
                OR attempt.id IS NOT NULL
             ORDER BY (enrollment.mp_preference_id = :current_id) DESC
             LIMIT 1
        SQL);
        $statement->execute(['id' => $preferenceId, 'attempt_id' => $preferenceId, 'current_id' => $preferenceId]);
        $result = $statement->fetch();
        return is_array($result) ? $result : null;
    }

    /** @return array<string,mixed>|null */
    public function findCheckoutAttemptByResourceId(string $resourceId): ?array
    {
        $statement = $this->pdo->prepare(<<<'SQL'
            SELECT attempt.*,
                   (enrollment.active_checkout_attempt_id = attempt.id) AS is_active
              FROM checkout_payment_attempts AS attempt
              JOIN enrollments AS enrollment ON enrollment.id = attempt.enrollment_id
             WHERE attempt.resource_id = :resource_id
             LIMIT 1
        SQL);
        $statement->execute(['resource_id' => $resourceId]);
        $result = $statement->fetch();
        return is_array($result) ? $result : null;
    }

    /** @return array<string,mixed>|null */
    public function findCheckoutAttemptByReference(string $reference): ?array
    {
        $statement = $this->pdo->prepare(<<<'SQL'
            SELECT attempt.*,
                   (enrollment.active_checkout_attempt_id = attempt.id) AS is_active
              FROM checkout_payment_attempts AS attempt
              JOIN enrollments AS enrollment ON enrollment.id = attempt.enrollment_id
             WHERE attempt.external_reference = :reference
             LIMIT 1
        SQL);
        $statement->execute(['reference' => $reference]);
        $result = $statement->fetch();
        return is_array($result) ? $result : null;
    }

    /** @return array<string,mixed>|null */
    public function findCheckoutAttemptForEnrollment(int $enrollmentId, ?string $resourceId = null, ?string $reference = null): ?array
    {
        $where = ['attempt.enrollment_id = :enrollment_id'];
        $params = ['enrollment_id' => $enrollmentId];
        if ($resourceId !== null && trim($resourceId) !== '') {
            $where[] = 'attempt.resource_id = :resource_id';
            $params['resource_id'] = trim($resourceId);
        }
        if ($reference !== null && trim($reference) !== '') {
            $where[] = 'attempt.external_reference = :reference';
            $params['reference'] = trim($reference);
        }
        $statement = $this->pdo->prepare(
            'SELECT attempt.*, (enrollment.active_checkout_attempt_id = attempt.id) AS is_active '
            . 'FROM checkout_payment_attempts AS attempt '
            . 'JOIN enrollments AS enrollment ON enrollment.id = attempt.enrollment_id '
            . 'WHERE ' . implode(' AND ', $where)
            . ' ORDER BY attempt.attempt_number DESC LIMIT 1'
        );
        $statement->execute($params);
        $result = $statement->fetch();
        return is_array($result) ? $result : null;
    }

    /** @return list<array<string,mixed>> */
    public function checkoutAttemptReferences(int $enrollmentId): array
    {
        $statement = $this->pdo->prepare(<<<'SQL'
            SELECT attempt.*,
                   (enrollment.active_checkout_attempt_id = attempt.id) AS is_active
              FROM checkout_payment_attempts AS attempt
              JOIN enrollments AS enrollment ON enrollment.id = attempt.enrollment_id
             WHERE attempt.enrollment_id = :enrollment_id
             ORDER BY attempt.attempt_number ASC
        SQL);
        $statement->execute(['enrollment_id' => $enrollmentId]);
        return array_values(array_filter($statement->fetchAll(), 'is_array'));
    }

    public function updateCheckoutAttemptGatewayStatus(int $attemptId, string $status): void
    {
        $statement = $this->pdo->prepare(<<<'SQL'
            UPDATE checkout_payment_attempts
               SET provider_status = :status,
                   updated_at = UTC_TIMESTAMP(3)
             WHERE id = :id
        SQL);
        $statement->execute(['status' => strtolower(trim($status)), 'id' => $attemptId]);
    }

    /** @return array<string,mixed>|null */
    public function findPaymentRetryByIdempotencyHash(string $hash): ?array
    {
        $statement = $this->pdo->prepare(<<<'SQL'
            SELECT attempt.*,
                   (enrollment.active_checkout_attempt_id = attempt.id) AS is_active
              FROM checkout_payment_attempts AS attempt
              JOIN enrollments AS enrollment ON enrollment.id = attempt.enrollment_id
             WHERE attempt.retry_idempotency_key_hash = :hash
             LIMIT 1
        SQL);
        $statement->execute(['hash' => $hash]);
        $result = $statement->fetch();
        return is_array($result) ? $result : null;
    }

    /** @return array<string,mixed>|null */
    public function findPaymentRetryByReplacedAttempt(int $attemptId): ?array
    {
        $statement = $this->pdo->prepare(<<<'SQL'
            SELECT attempt.*,
                   (enrollment.active_checkout_attempt_id = attempt.id) AS is_active
              FROM checkout_payment_attempts AS attempt
              JOIN enrollments AS enrollment ON enrollment.id = attempt.enrollment_id
             WHERE attempt.replaces_attempt_id = :attempt_id
             LIMIT 1
        SQL);
        $statement->execute(['attempt_id' => $attemptId]);
        $result = $statement->fetch();
        return is_array($result) ? $result : null;
    }

    /**
     * @return array{acquired:bool,result:mixed}
     */
    public function withPaymentRetryLock(int $enrollmentId, callable $callback): array
    {
        $lockName = 'dgym-payment-retry:' . $enrollmentId;
        $statement = $this->pdo->prepare('SELECT GET_LOCK(:lock_name, 0)');
        $statement->execute(['lock_name' => $lockName]);
        if ((int) $statement->fetchColumn() !== 1) {
            return ['acquired' => false, 'result' => null];
        }
        try {
            return ['acquired' => true, 'result' => $callback()];
        } finally {
            try {
                $release = $this->pdo->prepare('SELECT RELEASE_LOCK(:lock_name)');
                $release->execute(['lock_name' => $lockName]);
            } catch (\Throwable) {
                // La conexión cerrará el advisory lock si RELEASE_LOCK falla.
            }
        }
    }

    /** @return array<string,mixed> */
    public function preparePaymentRetryAttempt(
        int $enrollmentId,
        string $externalReference,
        string $idempotencyHash,
        string $remoteIdempotencyKey,
        int $replacesAttemptId
    ): array {
        return $this->withLockedEnrollment($enrollmentId, function (array $enrollment) use (
            $externalReference,
            $idempotencyHash,
            $remoteIdempotencyKey,
            $replacesAttemptId
        ): array {
            $existing = $this->findPaymentRetryByIdempotencyHash($idempotencyHash);
            if ($existing !== null) {
                if ((int) $existing['enrollment_id'] !== (int) $enrollment['id']) {
                    throw new \RuntimeException('La clave de reintento pertenece a otra inscripción.');
                }
                return $existing;
            }
            if ((int) ($enrollment['active_checkout_attempt_id'] ?? 0) !== $replacesAttemptId) {
                throw new \RuntimeException('El checkout activo cambió antes de preparar el reintento.');
            }
            $replacement = $this->findPaymentRetryByReplacedAttempt($replacesAttemptId);
            if ($replacement !== null) {
                return $replacement;
            }
            $number = $this->pdo->prepare(
                'SELECT COALESCE(MAX(attempt_number), 0) + 1 FROM checkout_payment_attempts WHERE enrollment_id = :enrollment_id'
            );
            $number->execute(['enrollment_id' => (int) $enrollment['id']]);
            $attemptNumber = (int) $number->fetchColumn();
            $insert = $this->pdo->prepare(<<<'SQL'
                INSERT INTO checkout_payment_attempts (
                    enrollment_id, attempt_number, checkout_type, external_reference,
                    provider_status, lifecycle_status, retry_idempotency_key_hash,
                    remote_idempotency_key, replaces_attempt_id
                ) VALUES (
                    :enrollment_id, :attempt_number, 'subscription', :external_reference,
                    'not_created', 'awaiting_cancellation', :retry_hash,
                    :remote_key, :replaces_attempt_id
                )
            SQL);
            try {
                $insert->execute([
                    'enrollment_id' => (int) $enrollment['id'],
                    'attempt_number' => $attemptNumber,
                    'external_reference' => $externalReference,
                    'retry_hash' => $idempotencyHash,
                    'remote_key' => $remoteIdempotencyKey,
                    'replaces_attempt_id' => $replacesAttemptId,
                ]);
            } catch (PDOException $exception) {
                if (!self::isUniqueViolation($exception)) {
                    throw $exception;
                }
                $winner = $this->findPaymentRetryByReplacedAttempt($replacesAttemptId);
                if ($winner !== null) {
                    return $winner;
                }
                throw $exception;
            }
            $created = $this->findPaymentRetryByIdempotencyHash($idempotencyHash);
            if ($created === null) {
                throw new \RuntimeException('No se pudo recuperar el intento de pago preparado.');
            }
            return $created;
        });
    }

    public function transitionPaymentRetryAttempt(int $attemptId, array $fromStates, string $toState): bool
    {
        if ($fromStates === []) {
            return false;
        }
        $params = ['id' => $attemptId, 'to_state' => $toState];
        $placeholders = [];
        foreach (array_values($fromStates) as $index => $state) {
            $key = 'from_' . $index;
            $params[$key] = $state;
            $placeholders[] = ':' . $key;
        }
        $statement = $this->pdo->prepare(
            'UPDATE checkout_payment_attempts SET lifecycle_status = :to_state, updated_at = UTC_TIMESTAMP(3) '
            . 'WHERE id = :id AND lifecycle_status IN (' . implode(',', $placeholders) . ')'
        );
        $statement->execute($params);
        return $statement->rowCount() === 1;
    }

    public function markPaymentRetryCreationStarted(int $attemptId): bool
    {
        $statement = $this->pdo->prepare(<<<'SQL'
            UPDATE checkout_payment_attempts
               SET lifecycle_status = 'creating',
                   creation_started_at = UTC_TIMESTAMP(3),
                   reconciliation_miss_count = 0,
                   updated_at = UTC_TIMESTAMP(3)
             WHERE id = :id
               AND lifecycle_status = 'ready_to_create'
        SQL);
        $statement->execute(['id' => $attemptId]);
        return $statement->rowCount() === 1;
    }

    /** @return array{state:string,count:int,age_seconds:int}|null */
    public function recordPaymentRetryReconciliationMiss(int $attemptId): ?array
    {
        $statement = $this->pdo->prepare(<<<'SQL'
            UPDATE checkout_payment_attempts
               SET reconciliation_miss_count = reconciliation_miss_count + 1,
                   updated_at = UTC_TIMESTAMP(3)
             WHERE id = :id
               AND lifecycle_status IN ('creating', 'creation_uncertain')
               AND creation_started_at IS NOT NULL
        SQL);
        $statement->execute(['id' => $attemptId]);
        if ($statement->rowCount() !== 1) {
            return null;
        }
        $read = $this->pdo->prepare(<<<'SQL'
            SELECT lifecycle_status,
                   reconciliation_miss_count,
                   TIMESTAMPDIFF(SECOND, creation_started_at, UTC_TIMESTAMP(3)) AS age_seconds
              FROM checkout_payment_attempts
             WHERE id = :id
               AND lifecycle_status IN ('creating', 'creation_uncertain')
             LIMIT 1
        SQL);
        $read->execute(['id' => $attemptId]);
        $row = $read->fetch();
        return is_array($row) ? [
            'state' => (string) $row['lifecycle_status'],
            'count' => (int) $row['reconciliation_miss_count'],
            'age_seconds' => max(0, (int) $row['age_seconds']),
        ] : null;
    }

    /**
     * Aplica en una transacción el estado financiero ya verificado del intento
     * activo. Si existe un sucesor pre-cancelación, también lo bloquea y, para
     * un pago acreditado, lo terminaliza sólo después de fijar el pago inicial.
     *
     * @param array<string,mixed> $changes
     */
    public function applyActivePaymentStateBeforeRetry(
        int $enrollmentId,
        int $attemptId,
        string $subscriptionStatus,
        string $paymentId,
        string $paymentStatus,
        string $paymentStatusDetail,
        array $changes,
        ?int $successorId = null,
        ?string $successorTerminalState = null
    ): void {
        if (!in_array($subscriptionStatus, ['pending', 'authorized'], true)
            || $enrollmentId < 1
            || $attemptId < 1
            || trim($paymentId) === ''
            || ($successorTerminalState !== null
                && $successorTerminalState !== 'payment_received_before_cancellation')
        ) {
            throw new \InvalidArgumentException('Transición financiera de retry inválida.');
        }
        $ownsTransaction = !$this->pdo->inTransaction();
        if ($ownsTransaction) {
            $this->pdo->beginTransaction();
        }
        try {
            $enrollmentRead = $this->pdo->prepare(
                'SELECT * FROM enrollments WHERE id=:id FOR UPDATE'
            );
            $enrollmentRead->execute(['id' => $enrollmentId]);
            $enrollment = $enrollmentRead->fetch();
            $attemptRead = $this->pdo->prepare(
                'SELECT * FROM checkout_payment_attempts WHERE id=:id AND enrollment_id=:enrollment_id FOR UPDATE'
            );
            $attemptRead->execute(['id' => $attemptId, 'enrollment_id' => $enrollmentId]);
            $attempt = $attemptRead->fetch();
            $paymentRead = $this->pdo->prepare(<<<'SQL'
                SELECT checkout_attempt_id, status, status_detail, amount_refunded,
                       ever_accredited, checkout_link_verified
                  FROM payment_records
                 WHERE enrollment_id=:enrollment_id
                   AND mp_payment_id=:payment_id
                 LIMIT 1
                 FOR UPDATE
            SQL);
            $paymentRead->execute(['enrollment_id' => $enrollmentId, 'payment_id' => $paymentId]);
            $payment = $paymentRead->fetch();
            if (!is_array($enrollment)
                || !is_array($attempt)
                || !is_array($payment)
                || (int) ($enrollment['active_checkout_attempt_id'] ?? 0) !== $attemptId
                || (string) ($attempt['lifecycle_status'] ?? '') !== 'active'
                || !hash_equals(
                    trim((string) ($enrollment['mp_subscription_id'] ?? '')),
                    trim((string) ($attempt['resource_id'] ?? ''))
                )
                || (int) ($payment['checkout_attempt_id'] ?? 0) !== $attemptId
                || (int) ($payment['checkout_link_verified'] ?? 0) !== 1
                || !hash_equals(strtolower((string) $payment['status']), $paymentStatus)
                || !hash_equals(strtolower((string) ($payment['status_detail'] ?? '')), $paymentStatusDetail)
                || (int) ($payment['amount_refunded'] ?? 0) !== 0
            ) {
                throw new \RuntimeException('La evidencia financiera cambió antes de aplicarla.');
            }
            $isAccredited = $paymentStatus === 'approved' && $paymentStatusDetail === 'accredited';
            if ($isAccredited !== ((int) ($payment['ever_accredited'] ?? 0) === 1)) {
                throw new \RuntimeException('La evidencia histórica del pago es inconsistente.');
            }

            if ($successorId !== null) {
                $successorRead = $this->pdo->prepare(
                    'SELECT * FROM checkout_payment_attempts WHERE id=:id AND enrollment_id=:enrollment_id FOR UPDATE'
                );
                $successorRead->execute(['id' => $successorId, 'enrollment_id' => $enrollmentId]);
                $successor = $successorRead->fetch();
                if (!is_array($successor)
                    || (int) ($successor['replaces_attempt_id'] ?? 0) !== $attemptId
                    || (string) ($successor['lifecycle_status'] ?? '') !== 'awaiting_cancellation'
                    || trim((string) ($successor['resource_id'] ?? '')) !== ''
                    || trim((string) ($successor['checkout_url'] ?? '')) !== ''
                ) {
                    throw new \RuntimeException('El reemplazo cambió antes de aplicar el pago.');
                }
            }

            $this->updateCheckoutAttemptGatewayStatus($attemptId, $subscriptionStatus);
            $this->updateGatewayState($enrollmentId, $changes);
            $this->reconcileInitialPayment($enrollmentId);
            if ($successorId !== null && $successorTerminalState !== null) {
                if (!$this->transitionPaymentRetryAttempt(
                    $successorId,
                    ['awaiting_cancellation'],
                    $successorTerminalState
                )) {
                    throw new \RuntimeException('No se pudo cerrar el reemplazo después del pago.');
                }
            }
            if ($ownsTransaction) {
                $this->pdo->commit();
            }
        } catch (\Throwable $exception) {
            if ($ownsTransaction && $this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $exception;
        }
    }

    /** @return array{initial_payment:bool,ever_accredited:int,incidents:int,payments:int} */
    public function paymentRetryEvidence(int $enrollmentId): array
    {
        $statement = $this->pdo->prepare(<<<'SQL'
            SELECT (enrollment.initial_payment_confirmed_at IS NOT NULL) AS initial_payment,
                   COALESCE(SUM(payment.ever_accredited = 1), 0) AS ever_accredited,
                   COALESCE(SUM(
                       payment.amount_refunded > 0
                       OR payment.status IN ('refunded', 'charged_back')
                   ), 0) AS incidents,
                   COUNT(payment.id) AS payments
              FROM enrollments AS enrollment
              LEFT JOIN payment_records AS payment ON payment.enrollment_id = enrollment.id
             WHERE enrollment.id = :enrollment_id
             GROUP BY enrollment.id, enrollment.initial_payment_confirmed_at
        SQL);
        $statement->execute(['enrollment_id' => $enrollmentId]);
        $row = $statement->fetch();
        if (!is_array($row)) {
            throw new \RuntimeException('No se pudo leer la evidencia financiera de la inscripción.');
        }
        return [
            'initial_payment' => (bool) $row['initial_payment'],
            'ever_accredited' => (int) $row['ever_accredited'],
            'incidents' => (int) $row['incidents'],
            'payments' => (int) $row['payments'],
        ];
    }

    /**
     * Decide bajo bloqueos de fila si una preferencia puede volver a abrirse.
     * El conjunto remoto ya verificado debe coincidir exactamente con las filas
     * locales; cualquier movimiento distinto de un rechazo terminal bloquea.
     *
     * @param list<string> $expectedPaymentIds
     * @return array{ready:bool,reason:string,payments:int}
     */
    public function preferenceRetryDecision(
        int $enrollmentId,
        int $attemptId,
        array $expectedPaymentIds
    ): array {
        $expectedPaymentIds = array_values(array_unique(array_map('strval', $expectedPaymentIds)));
        sort($expectedPaymentIds, SORT_STRING);
        if ($enrollmentId < 1 || $attemptId < 1 || count($expectedPaymentIds) > 100) {
            throw new \InvalidArgumentException('Decisión de preferencia inválida.');
        }
        foreach ($expectedPaymentIds as $paymentId) {
            if (preg_match('/^[A-Za-z0-9_-]{1,160}$/D', $paymentId) !== 1) {
                throw new \InvalidArgumentException('Identificador de pago inválido.');
            }
        }

        $ownsTransaction = !$this->pdo->inTransaction();
        if ($ownsTransaction) {
            $this->pdo->beginTransaction();
        }
        try {
            $enrollmentRead = $this->pdo->prepare(<<<'SQL'
                SELECT id, reference, checkout_type, active_checkout_attempt_id, mp_preference_id,
                       status, membership_status, error_code, initial_payment_confirmed_at
                  FROM enrollments
                 WHERE id = :id
                 LIMIT 1
                 FOR UPDATE
            SQL);
            $enrollmentRead->execute(['id' => $enrollmentId]);
            $enrollment = $enrollmentRead->fetch();

            $attemptRead = $this->pdo->prepare(<<<'SQL'
                SELECT id, enrollment_id, checkout_type, external_reference, resource_id, lifecycle_status
                  FROM checkout_payment_attempts
                 WHERE id = :id
                   AND enrollment_id = :enrollment_id
                 LIMIT 1
                 FOR UPDATE
            SQL);
            $attemptRead->execute(['id' => $attemptId, 'enrollment_id' => $enrollmentId]);
            $attempt = $attemptRead->fetch();

            $paymentsRead = $this->pdo->prepare(<<<'SQL'
                SELECT mp_payment_id, checkout_attempt_id, checkout_link_verified,
                       status, amount_refunded, ever_accredited
                  FROM payment_records
                 WHERE enrollment_id = :enrollment_id
                 ORDER BY mp_payment_id
                 FOR UPDATE
            SQL);
            $paymentsRead->execute(['enrollment_id' => $enrollmentId]);
            $payments = array_values(array_filter($paymentsRead->fetchAll(), 'is_array'));
            $actualPaymentIds = array_map(
                static fn (array $payment): string => (string) $payment['mp_payment_id'],
                $payments
            );

            $reason = 'ready';
            if (!is_array($enrollment) || !is_array($attempt)) {
                $reason = 'missing_context';
            } elseif ((string) $enrollment['checkout_type'] !== 'preference'
                || (int) ($enrollment['active_checkout_attempt_id'] ?? 0) !== $attemptId
                || trim((string) ($enrollment['mp_preference_id'] ?? '')) === ''
                || (string) $attempt['checkout_type'] !== 'preference'
                || (string) $attempt['lifecycle_status'] !== 'active'
                || !hash_equals(
                    trim((string) $enrollment['mp_preference_id']),
                    trim((string) $attempt['resource_id'])
                )
            ) {
                $reason = 'checkout_changed';
            } elseif (!in_array(
                (string) ($enrollment['status'] ?? ''),
                ['checkout_ready', 'payment_pending', 'payment_rejected'],
                true
            ) || (string) ($enrollment['membership_status'] ?? '') === 'manual_review'
                || !in_array(
                    trim((string) ($enrollment['error_code'] ?? '')),
                    ['', 'payment_rejected'],
                    true
                )
                || !hash_equals(
                    (string) ($enrollment['reference'] ?? ''),
                    (string) ($attempt['external_reference'] ?? '')
                )
            ) {
                $reason = 'enrollment_not_retryable';
            } elseif ($enrollment['initial_payment_confirmed_at'] !== null) {
                $reason = 'initial_payment_confirmed';
            } elseif ($actualPaymentIds !== $expectedPaymentIds) {
                $reason = 'payment_set_changed';
            } else {
                foreach ($payments as $payment) {
                    if ((int) ($payment['checkout_attempt_id'] ?? 0) !== $attemptId) {
                        $reason = 'payment_attempt_mismatch';
                        break;
                    }
                    if ((int) ($payment['checkout_link_verified'] ?? 0) !== 1) {
                        $reason = 'payment_link_unverified';
                        break;
                    }
                    if ((int) ($payment['ever_accredited'] ?? 0) !== 0
                        || (int) ($payment['amount_refunded'] ?? 0) !== 0
                    ) {
                        $reason = 'financial_incident';
                        break;
                    }
                    if (!in_array(
                        strtolower((string) ($payment['status'] ?? '')),
                        ['rejected', 'canceled', 'cancelled'],
                        true
                    )) {
                        $reason = 'payment_not_terminal_rejected';
                        break;
                    }
                }
            }
            if ($ownsTransaction) {
                $this->pdo->commit();
            }
            return [
                'ready' => $reason === 'ready',
                'reason' => $reason,
                'payments' => count($payments),
            ];
        } catch (\Throwable $exception) {
            if ($ownsTransaction && $this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $exception;
        }
    }

    public function markPaymentRetryReadyToCreate(int $attemptId, int $replacedAttemptId, string $providerStatus): void
    {
        $ownsTransaction = !$this->pdo->inTransaction();
        if ($ownsTransaction) {
            $this->pdo->beginTransaction();
        }
        try {
            $old = $this->pdo->prepare(<<<'SQL'
                UPDATE checkout_payment_attempts
                   SET provider_status = :provider_status,
                       lifecycle_status = 'canceled_for_retry',
                       updated_at = UTC_TIMESTAMP(3)
                 WHERE id = :old_id
            SQL);
            $old->execute(['provider_status' => $providerStatus, 'old_id' => $replacedAttemptId]);
            $next = $this->pdo->prepare(<<<'SQL'
                UPDATE checkout_payment_attempts
                   SET lifecycle_status = 'ready_to_create',
                       updated_at = UTC_TIMESTAMP(3)
                 WHERE id = :attempt_id
                   AND replaces_attempt_id = :old_id
                   AND lifecycle_status IN ('awaiting_cancellation', 'cancel_uncertain')
            SQL);
            $next->execute(['attempt_id' => $attemptId, 'old_id' => $replacedAttemptId]);
            if ($next->rowCount() !== 1) {
                throw new \RuntimeException('El intento cambió antes de confirmar la cancelación.');
            }
            if ($ownsTransaction) {
                $this->pdo->commit();
            }
        } catch (\Throwable $exception) {
            if ($ownsTransaction && $this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $exception;
        }
    }

    public function recordPaymentRetryResource(
        int $attemptId,
        string $resourceId,
        string $checkoutUrl,
        string $providerStatus
    ): void {
        $statement = $this->pdo->prepare(<<<'SQL'
            UPDATE checkout_payment_attempts
               SET resource_id = :resource_id,
                   checkout_url = :checkout_url,
                   provider_status = :provider_status,
                   lifecycle_status = 'confirmed',
                   updated_at = UTC_TIMESTAMP(3)
             WHERE id = :attempt_id
               AND lifecycle_status IN ('creating', 'creation_uncertain')
               AND resource_id IS NULL
        SQL);
        $statement->execute([
            'resource_id' => $resourceId,
            'checkout_url' => $checkoutUrl,
            'provider_status' => $providerStatus,
            'attempt_id' => $attemptId,
        ]);
        if ($statement->rowCount() !== 1) {
            $existing = $this->findCheckoutAttemptByResourceId($resourceId);
            if ($existing === null || (int) $existing['id'] !== $attemptId) {
                throw new \RuntimeException('El intento cambió antes de guardar el checkout nuevo.');
            }
        }
    }

    public function activatePaymentRetryAttempt(int $enrollmentId, int $attemptId): void
    {
        $ownsTransaction = !$this->pdo->inTransaction();
        if ($ownsTransaction) {
            $this->pdo->beginTransaction();
        }
        try {
            $attemptStatement = $this->pdo->prepare(
                "SELECT * FROM checkout_payment_attempts WHERE id = :id AND enrollment_id = :enrollment_id FOR UPDATE"
            );
            $attemptStatement->execute(['id' => $attemptId, 'enrollment_id' => $enrollmentId]);
            $attempt = $attemptStatement->fetch();
            if (!is_array($attempt)
                || (string) $attempt['lifecycle_status'] !== 'confirmed'
                || trim((string) ($attempt['resource_id'] ?? '')) === ''
                || trim((string) ($attempt['checkout_url'] ?? '')) === ''
            ) {
                throw new \RuntimeException('El intento nuevo no está confirmado.');
            }
            $update = $this->pdo->prepare(<<<'SQL'
                UPDATE enrollments
                   SET active_checkout_attempt_id = :attempt_id,
                       mp_checkout_id = :resource_id,
                       mp_subscription_id = :resource_id,
                       mp_preference_id = NULL,
                       checkout_url = :checkout_url,
                       status = 'checkout_ready',
                       subscription_status = 'pending',
                       payment_status = 'not_created',
                       membership_status = 'not_activated',
                       error_code = NULL,
                       updated_at = UTC_TIMESTAMP(3)
                 WHERE id = :enrollment_id
                   AND initial_payment_confirmed_at IS NULL
                   AND active_checkout_attempt_id = :replaced_attempt_id
                   AND (
                       membership_status <> 'manual_review'
                       OR (status = 'subscription_canceled' AND (error_code IS NULL OR error_code = ''))
                   )
                   AND NOT EXISTS (
                       SELECT 1
                         FROM payment_records AS payment
                        WHERE payment.enrollment_id = enrollments.id
                          AND (
                              payment.ever_accredited = 1
                              OR payment.amount_refunded > 0
                              OR payment.status IN ('refunded', 'charged_back')
                          )
                   )
            SQL);
            $update->execute([
                'attempt_id' => $attemptId,
                'resource_id' => (string) $attempt['resource_id'],
                'checkout_url' => (string) $attempt['checkout_url'],
                'enrollment_id' => $enrollmentId,
                'replaced_attempt_id' => (int) $attempt['replaces_attempt_id'],
            ]);
            if ($update->rowCount() !== 1) {
                throw new \RuntimeException('La inscripción cambió antes de activar el nuevo checkout.');
            }
            $active = $this->pdo->prepare(
                "UPDATE checkout_payment_attempts SET lifecycle_status='active', updated_at=UTC_TIMESTAMP(3) WHERE id=:id AND lifecycle_status='confirmed'"
            );
            $active->execute(['id' => $attemptId]);
            if ($active->rowCount() !== 1) {
                throw new \RuntimeException('No se pudo activar el intento nuevo.');
            }
            if ($ownsTransaction) {
                $this->pdo->commit();
            }
        } catch (\Throwable $exception) {
            if ($ownsTransaction && $this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $exception;
        }
    }

    /** @return array<string, mixed>|null */
    public function findByPaymentId(string $paymentId): ?array
    {
        $statement = $this->pdo->prepare(<<<'SQL'
            SELECT enrollment.*
              FROM payment_records AS payment
              JOIN enrollments AS enrollment ON enrollment.id = payment.enrollment_id
             WHERE payment.mp_payment_id = :id
             LIMIT 1
        SQL);
        $statement->execute(['id' => $paymentId]);
        $result = $statement->fetch();
        return is_array($result) ? $result : null;
    }

    /** @return array<string,mixed>|null */
    public function paymentFacts(int $enrollmentId, string $paymentId): ?array
    {
        $statement = $this->pdo->prepare('SELECT checkout_attempt_id,mp_payment_id,mp_authorized_payment_id,status,status_detail,amount,amount_refunded,currency,checkout_link_verified,paid_at,last_gateway_update_at FROM payment_records WHERE enrollment_id=? AND mp_payment_id=? LIMIT 1');
        $statement->execute([$enrollmentId, $paymentId]);
        $result = $statement->fetch();
        return is_array($result) ? $result : null;
    }

    /** @return list<array{mp_payment_id:string,checkout_attempt_id:?int}> */
    public function paymentIdsForEnrollment(int $enrollmentId): array
    {
        $statement = $this->pdo->prepare(<<<'SQL'
            SELECT mp_payment_id, checkout_attempt_id
              FROM payment_records
             WHERE enrollment_id = :enrollment_id
             ORDER BY mp_payment_id
             LIMIT 201
        SQL);
        $statement->execute(['enrollment_id' => $enrollmentId]);
        $rows = $statement->fetchAll();
        if (count($rows) > 200) {
            throw new \RuntimeException('La evidencia de pagos excede el límite seguro.');
        }
        return array_map(static fn (array $row): array => [
            'mp_payment_id' => (string) $row['mp_payment_id'],
            'checkout_attempt_id' => isset($row['checkout_attempt_id']) ? (int) $row['checkout_attempt_id'] : null,
        ], array_values(array_filter($rows, 'is_array')));
    }

    /**
     * @param array<string, mixed> $input
     * @param array<string, mixed> $offer
     * @return array<string, mixed>
     */
    public function create(array $input, array $offer, string $publicId, string $reference, string $idempotencyHash, string $fingerprint): array
    {
        $sql = <<<'SQL'
            INSERT INTO enrollments (
                public_id, reference, idempotency_key_hash, request_fingerprint,
                full_name, email, phone_e164, necessary_consent_at, marketing_consent,
                consent_text_version, attribution_json, plan_code, plan_name, pricing_version,
                duration_months, payment_mode, checkout_type, regular_monthly_amount, installment_amount,
                regular_contract_total, contract_total, checkout_amount, checkout_charge_count,
                discount_percent, currency,
                status, subscription_status, payment_status, membership_status
            ) VALUES (
                :public_id, :reference, :idempotency_key_hash, :request_fingerprint,
                :full_name, :email, :phone_e164, UTC_TIMESTAMP(3), :marketing_consent,
                :consent_text_version, :attribution_json, :plan_code, :plan_name, :pricing_version,
                :duration_months, :payment_mode, :checkout_type, :regular_monthly_amount, :installment_amount,
                :regular_contract_total, :contract_total, :checkout_amount, :checkout_charge_count,
                :discount_percent, :currency,
                'creating_checkout', :subscription_status, 'not_created', 'not_activated'
            )
        SQL;
        $statement = $this->pdo->prepare($sql);
        $statement->execute([
            'public_id' => $publicId,
            'reference' => $reference,
            'idempotency_key_hash' => $idempotencyHash,
            'request_fingerprint' => $fingerprint,
            'full_name' => $input['full_name'],
            'email' => $input['email'],
            'phone_e164' => $input['phone_e164'],
            'marketing_consent' => $input['marketing_consent'] ? 1 : 0,
            'consent_text_version' => $input['consent_text_version'],
            'attribution_json' => json_encode($input['attribution'], JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            'plan_code' => $input['plan_code'],
            'plan_name' => $offer['name'],
            'pricing_version' => $offer['pricing_version'],
            'duration_months' => $input['duration'],
            'payment_mode' => $input['payment_mode'],
            'checkout_type' => $offer['checkout_type'],
            'regular_monthly_amount' => $offer['regular_monthly'],
            'installment_amount' => $offer['installment'],
            'regular_contract_total' => $offer['regular_total'],
            'contract_total' => $offer['total'],
            'checkout_amount' => $offer['charge_amount'],
            'checkout_charge_count' => $offer['charge_count'],
            'discount_percent' => $offer['discount_percent'],
            'currency' => $offer['currency'],
            'subscription_status' => $offer['checkout_type'] === 'subscription' ? 'not_created' : 'not_applicable',
        ]);
        $created = $this->findByReference($reference);
        if ($created === null) {
            throw new \RuntimeException('No se pudo recuperar la inscripción creada.');
        }
        return $created;
    }

    public function markCheckoutReady(int $id, string $checkoutType, string $resourceId, string $checkoutUrl): void
    {
        if (!in_array($checkoutType, ['subscription', 'preference'], true)) {
            throw new \InvalidArgumentException('Tipo de checkout no permitido.');
        }
        $subscriptionId = $checkoutType === 'subscription' ? $resourceId : null;
        $preferenceId = $checkoutType === 'preference' ? $resourceId : null;
        $subscriptionStatus = $checkoutType === 'subscription' ? 'pending' : 'not_applicable';
        $ownsTransaction = !$this->pdo->inTransaction();
        if ($ownsTransaction) {
            $this->pdo->beginTransaction();
        }
        try {
            $read = $this->pdo->prepare('SELECT reference FROM enrollments WHERE id=:id FOR UPDATE');
            $read->execute(['id' => $id]);
            $reference = $read->fetchColumn();
            if (!is_string($reference) || $reference === '') {
                throw new \RuntimeException('La inscripción no existe.');
            }
            $attempt = $this->pdo->prepare(<<<'SQL'
                INSERT INTO checkout_payment_attempts (
                    enrollment_id, attempt_number, checkout_type, external_reference,
                    resource_id, checkout_url, provider_status, lifecycle_status
                ) VALUES (
                    :enrollment_id, 1, :checkout_type, :external_reference,
                    :resource_id, :checkout_url, :provider_status, 'active'
                )
                ON DUPLICATE KEY UPDATE
                    id = LAST_INSERT_ID(id),
                    resource_id = IF(resource_id IS NULL, VALUES(resource_id), resource_id),
                    checkout_url = IF(checkout_url IS NULL OR checkout_url='', VALUES(checkout_url), checkout_url),
                    provider_status = VALUES(provider_status),
                    updated_at = UTC_TIMESTAMP(3)
            SQL);
            $attempt->execute([
                'enrollment_id' => $id,
                'checkout_type' => $checkoutType,
                'external_reference' => $reference,
                'resource_id' => $resourceId,
                'checkout_url' => $checkoutUrl,
                'provider_status' => $subscriptionStatus,
            ]);
            $attemptId = (int) $this->pdo->lastInsertId();
            if ($attemptId < 1) {
                $stored = $this->findCheckoutAttemptForEnrollment($id, $resourceId, $reference);
                $attemptId = (int) ($stored['id'] ?? 0);
            }
            $storedAttempt = $this->findCheckoutAttemptByResourceId($resourceId);
            if ($attemptId < 1
                || $storedAttempt === null
                || (int) $storedAttempt['id'] !== $attemptId
                || (int) $storedAttempt['enrollment_id'] !== $id
                || !hash_equals($reference, (string) $storedAttempt['external_reference'])
                || !hash_equals($checkoutType, (string) $storedAttempt['checkout_type'])
            ) {
                throw new \RuntimeException('No se pudo conservar el intento de checkout.');
            }
            $statement = $this->pdo->prepare(<<<'SQL'
                UPDATE enrollments
                   SET mp_checkout_id = :resource_id,
                       mp_subscription_id = :subscription_id,
                       mp_preference_id = :preference_id,
                       active_checkout_attempt_id = :attempt_id,
                       checkout_url = :checkout_url,
                       status = 'checkout_ready',
                       subscription_status = :subscription_status,
                       error_code = NULL,
                       updated_at = UTC_TIMESTAMP(3)
                 WHERE id = :id
                   AND status IN ('creating_checkout', 'checkout_creation_uncertain')
            SQL);
            $statement->execute([
                'resource_id' => $resourceId,
                'subscription_id' => $subscriptionId,
                'preference_id' => $preferenceId,
                'attempt_id' => $attemptId,
                'subscription_status' => $subscriptionStatus,
                'checkout_url' => $checkoutUrl,
                'id' => $id,
            ]);
            if ($statement->rowCount() !== 1) {
                throw new \RuntimeException('La inscripción cambió de estado antes de guardar el checkout.');
            }
            if ($ownsTransaction) {
                $this->pdo->commit();
            }
        } catch (\Throwable $exception) {
            if ($ownsTransaction && $this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $exception;
        }
    }

    public function markCheckoutFailure(int $id, string $status, string $errorCode): void
    {
        $ownsTransaction = !$this->pdo->inTransaction();
        if ($ownsTransaction) {
            $this->pdo->beginTransaction();
        }
        try {
            $statement = $this->pdo->prepare(<<<'SQL'
                UPDATE enrollments
                   SET status = :status, error_code = :error_code, updated_at = UTC_TIMESTAMP(3)
                 WHERE id = :id AND status = 'creating_checkout'
            SQL);
            $statement->execute(['status' => $status, 'error_code' => $errorCode, 'id' => $id]);
            if ($statement->rowCount() !== 1) {
                throw new \RuntimeException('La inscripción cambió de estado antes de registrar el fallo.');
            }
            if ($ownsTransaction) {
                $this->pdo->commit();
            }
        } catch (\Throwable $exception) {
            if ($ownsTransaction && $this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $exception;
        }
    }

    /**
     * Reconciles the initial payment from fresh database state. The verified-link
     * predicate prevents an external-reference-only payment from activating an
     * enrollment, even if webhooks are processed out of order.
     */
    public function reconcileInitialPayment(int $id): bool
    {
        $statement = $this->pdo->prepare(<<<'SQL'
            UPDATE enrollments AS enrollment
               SET initial_payment_confirmed_at = UTC_TIMESTAMP(3),
                   initial_mp_payment_id = mp_last_payment_id,
                   status = CASE
                       WHEN membership_status = 'manual_review'
                         OR status IN ('payment_refunded', 'chargeback', 'review_required', 'payment_issue_review')
                       THEN status
                       ELSE 'payment_verified'
                   END,
                   membership_status = CASE
                       WHEN membership_status = 'manual_review' THEN 'manual_review'
                       WHEN membership_status = 'not_activated' THEN 'pending_manual_activation'
                       ELSE membership_status
                   END,
                   error_code = CASE
                       WHEN membership_status = 'manual_review'
                         OR status IN ('payment_refunded', 'chargeback', 'review_required', 'payment_issue_review')
                       THEN error_code
                       ELSE NULL
                   END,
                   updated_at = UTC_TIMESTAMP(3)
             WHERE enrollment.id = :id
               AND (
                    (checkout_type = 'subscription' AND subscription_status = 'authorized')
                    OR checkout_type = 'preference'
               )
               AND payment_status = 'approved_accredited'
               AND mp_last_payment_id IS NOT NULL
               AND mp_last_payment_id <> ''
               AND initial_payment_confirmed_at IS NULL
               AND EXISTS (
                   SELECT 1
                     FROM payment_records AS payment
                    WHERE payment.enrollment_id = enrollment.id
                      AND payment.mp_payment_id = enrollment.mp_last_payment_id
                      AND payment.checkout_link_verified = 1
                      AND payment.status = 'approved'
                      AND payment.status_detail = 'accredited'
                      AND payment.amount_refunded = 0
               )
        SQL);
        $statement->execute(['id' => $id]);
        return $statement->rowCount() === 1;
    }

    /** @param array<string, mixed> $changes */
    public function updateGatewayState(int $id, array $changes): void
    {
        $allowed = [
            'status', 'subscription_status', 'payment_status', 'membership_status',
            'mp_last_payment_id', 'error_code',
        ];
        $sets = [];
        $params = ['id' => $id];
        $reviewStatuses = [
            'payment_refunded', 'chargeback', 'review_required', 'payment_issue_review',
            'subscription_paused', 'subscription_canceled',
        ];
        foreach ($changes as $column => $value) {
            if (!in_array($column, $allowed, true)) {
                throw new \InvalidArgumentException('Columna no permitida.');
            }
            if ($column === 'membership_status') {
                $sets[] = "membership_status = CASE WHEN membership_status = 'manual_review' THEN 'manual_review' ELSE :membership_status END";
            } elseif ($column === 'status') {
                $sets[] = "status = CASE
                    WHEN status = 'chargeback' AND :incoming_status_against_chargeback <> 'chargeback' THEN status
                    WHEN status = 'payment_refunded'
                         AND :incoming_status_against_refund NOT IN ('payment_refunded', 'chargeback')
                    THEN status
                    WHEN membership_status = 'manual_review' AND :incoming_status_is_review = 0 THEN status
                    ELSE :status
                END";
                $params['incoming_status_against_chargeback'] = (string) $value;
                $params['incoming_status_against_refund'] = (string) $value;
                $params['incoming_status_is_review'] = in_array((string) $value, $reviewStatuses, true) ? 1 : 0;
            } elseif ($column === 'error_code') {
                $sets[] = "error_code = CASE
                    WHEN status = 'chargeback'
                         AND COALESCE(:incoming_error_against_chargeback, '')
                             NOT IN ('payment_charged_back', 'chargeback_received')
                    THEN error_code
                    WHEN status = 'payment_refunded'
                         AND COALESCE(:incoming_error_against_refund, '')
                             NOT IN ('payment_refunded', 'chargeback_received')
                    THEN error_code
                    WHEN membership_status = 'manual_review' AND :incoming_error_is_null = 1 THEN error_code
                    ELSE :error_code
                END";
                $params['incoming_error_against_chargeback'] = $value;
                $params['incoming_error_against_refund'] = $value;
                $params['incoming_error_is_null'] = $value === null ? 1 : 0;
            } else {
                $sets[] = $column . ' = :' . $column;
            }
            $params[$column] = $value;
        }
        if ($sets === []) {
            return;
        }
        $sets[] = 'updated_at = UTC_TIMESTAMP(3)';
        $statement = $this->pdo->prepare('UPDATE enrollments SET ' . implode(', ', $sets) . ' WHERE id = :id');
        $statement->execute($params);
    }

    /**
     * @param array<string, mixed> $payment
     * @return array{checkout_attempt_id:?int,checkout_link_verified:bool,status:string,status_detail:string,amount_refunded:int,ever_accredited:bool,last_gateway_update_at:?string}
     */
    public function upsertPayment(int $enrollmentId, array $payment): array
    {
        $attemptId = isset($payment['checkout_attempt_id']) ? (int) $payment['checkout_attempt_id'] : null;
        if ($attemptId !== null) {
            $found = false;
            foreach ($this->checkoutAttemptReferences($enrollmentId) as $candidate) {
                if ((int) $candidate['id'] === $attemptId) {
                    $found = true;
                    break;
                }
            }
            if (!$found) {
                throw new PaymentAttemptBindingMismatchException('checkout_attempt_not_owned');
            }
            $existingBinding = $this->pdo->prepare(
                'SELECT enrollment_id, checkout_attempt_id FROM payment_records WHERE mp_payment_id=:payment_id LIMIT 1'
            );
            $existingBinding->execute(['payment_id' => (string) $payment['mp_payment_id']]);
            $existingPayment = $existingBinding->fetch();
            if (is_array($existingPayment)
                && ((int) $existingPayment['enrollment_id'] !== $enrollmentId
                    || (isset($existingPayment['checkout_attempt_id'])
                        && (int) $existingPayment['checkout_attempt_id'] !== $attemptId))
            ) {
                throw new PaymentAttemptBindingMismatchException(
                    (int) $existingPayment['enrollment_id'] !== $enrollmentId
                        ? 'payment_bound_to_other_enrollment'
                        : 'payment_bound_to_other_attempt'
                );
            }
        }
        $statement = $this->pdo->prepare(<<<'SQL'
            INSERT INTO payment_records (
                enrollment_id, checkout_attempt_id, mp_payment_id, mp_authorized_payment_id, checkout_type,
                mp_preference_id, status, status_detail, amount, amount_refunded, ever_accredited, currency,
                subscription_link_verified, checkout_link_verified, paid_at, last_gateway_update_at
            ) VALUES (
                :enrollment_id, :checkout_attempt_id, :mp_payment_id, :mp_authorized_payment_id, :checkout_type,
                :mp_preference_id, :status, :status_detail, :amount, :amount_refunded, :ever_accredited, :currency,
                :subscription_link_verified, :checkout_link_verified, :paid_at, :last_gateway_update_at
            )
            ON DUPLICATE KEY UPDATE
                checkout_attempt_id = IF(
                    payment_records.enrollment_id = VALUES(enrollment_id),
                    COALESCE(payment_records.checkout_attempt_id, VALUES(checkout_attempt_id)),
                    payment_records.checkout_attempt_id
                ),
                mp_authorized_payment_id = IF(
                    payment_records.enrollment_id = VALUES(enrollment_id),
                    COALESCE(VALUES(mp_authorized_payment_id), mp_authorized_payment_id),
                    mp_authorized_payment_id
                ),
                mp_preference_id = IF(
                    payment_records.enrollment_id = VALUES(enrollment_id),
                    COALESCE(VALUES(mp_preference_id), mp_preference_id),
                    mp_preference_id
                ),
                status = IF(
                    payment_records.enrollment_id = VALUES(enrollment_id),
                    CASE
                        WHEN payment_records.status = 'charged_back'
                             AND VALUES(status) <> 'charged_back'
                        THEN payment_records.status
                        WHEN payment_records.status = 'refunded'
                             AND VALUES(status) NOT IN ('refunded', 'charged_back')
                        THEN payment_records.status
                        WHEN payment_records.last_gateway_update_at IS NOT NULL
                             AND VALUES(last_gateway_update_at) IS NULL
                        THEN payment_records.status
                        WHEN payment_records.last_gateway_update_at IS NOT NULL
                             AND VALUES(last_gateway_update_at) IS NOT NULL
                             AND VALUES(last_gateway_update_at) < payment_records.last_gateway_update_at
                        THEN payment_records.status
                        ELSE VALUES(status)
                    END,
                    payment_records.status
                ),
                status_detail = IF(
                    payment_records.enrollment_id = VALUES(enrollment_id),
                    CASE
                        WHEN payment_records.status = 'charged_back'
                             AND VALUES(status) <> 'charged_back'
                        THEN payment_records.status_detail
                        WHEN payment_records.status = 'refunded'
                             AND VALUES(status) NOT IN ('refunded', 'charged_back')
                        THEN payment_records.status_detail
                        WHEN payment_records.last_gateway_update_at IS NOT NULL
                             AND VALUES(last_gateway_update_at) IS NULL
                        THEN payment_records.status_detail
                        WHEN payment_records.last_gateway_update_at IS NOT NULL
                             AND VALUES(last_gateway_update_at) IS NOT NULL
                             AND VALUES(last_gateway_update_at) < payment_records.last_gateway_update_at
                        THEN payment_records.status_detail
                        ELSE VALUES(status_detail)
                    END,
                    payment_records.status_detail
                ),
                amount = IF(payment_records.enrollment_id = VALUES(enrollment_id), VALUES(amount), amount),
                currency = IF(payment_records.enrollment_id = VALUES(enrollment_id), VALUES(currency), currency),
                amount_refunded = IF(
                    payment_records.enrollment_id = VALUES(enrollment_id),
                    GREATEST(amount_refunded, VALUES(amount_refunded)),
                    amount_refunded
                ),
                ever_accredited = IF(
                    payment_records.enrollment_id = VALUES(enrollment_id),
                    GREATEST(ever_accredited, VALUES(ever_accredited)),
                    ever_accredited
                ),
                paid_at = IF(
                    payment_records.enrollment_id = VALUES(enrollment_id),
                    COALESCE(VALUES(paid_at), paid_at),
                    paid_at
                ),
                subscription_link_verified = IF(
                    payment_records.enrollment_id = VALUES(enrollment_id),
                    GREATEST(subscription_link_verified, VALUES(subscription_link_verified)),
                    subscription_link_verified
                ),
                checkout_link_verified = IF(
                    payment_records.enrollment_id = VALUES(enrollment_id),
                    GREATEST(checkout_link_verified, VALUES(checkout_link_verified)),
                    checkout_link_verified
                ),
                last_gateway_update_at = IF(
                    payment_records.enrollment_id = VALUES(enrollment_id),
                    CASE
                        WHEN last_gateway_update_at IS NULL THEN VALUES(last_gateway_update_at)
                        WHEN VALUES(last_gateway_update_at) IS NULL THEN last_gateway_update_at
                        ELSE GREATEST(last_gateway_update_at, VALUES(last_gateway_update_at))
                    END,
                    last_gateway_update_at
                ),
                updated_at = IF(
                    payment_records.enrollment_id = VALUES(enrollment_id),
                    UTC_TIMESTAMP(3),
                    updated_at
                )
        SQL);
        $statement->execute([
            'enrollment_id' => $enrollmentId,
            'checkout_attempt_id' => $attemptId,
            'mp_payment_id' => $payment['mp_payment_id'],
            'mp_authorized_payment_id' => $payment['mp_authorized_payment_id'] ?? null,
            'checkout_type' => $payment['checkout_type'],
            'mp_preference_id' => $payment['mp_preference_id'] ?? null,
            'status' => $payment['status'],
            'status_detail' => $payment['status_detail'] ?? null,
            'amount' => $payment['amount'],
            'amount_refunded' => $payment['amount_refunded'] ?? 0,
            'ever_accredited' => !empty($payment['ever_accredited']) ? 1 : 0,
            'currency' => $payment['currency'],
            'subscription_link_verified' => !empty($payment['subscription_link_verified']) ? 1 : 0,
            'checkout_link_verified' => !empty($payment['checkout_link_verified']) ? 1 : 0,
            'paid_at' => $payment['paid_at'] ?? null,
            'last_gateway_update_at' => $payment['last_gateway_update_at'] ?? null,
        ]);

        $read = $this->pdo->prepare(<<<'SQL'
            SELECT checkout_attempt_id, checkout_link_verified, status, status_detail,
                   amount_refunded, ever_accredited, last_gateway_update_at
              FROM payment_records
             WHERE enrollment_id = :enrollment_id
               AND mp_payment_id = :mp_payment_id
             LIMIT 1
        SQL);
        $read->execute([
            'enrollment_id' => $enrollmentId,
            'mp_payment_id' => $payment['mp_payment_id'],
        ]);
        $effective = $read->fetch();
        if (!is_array($effective)) {
            throw new PaymentAttemptBindingMismatchException('payment_not_recoverable_for_enrollment');
        }
        if ($attemptId !== null && (int) ($effective['checkout_attempt_id'] ?? 0) !== $attemptId) {
            throw new PaymentAttemptBindingMismatchException('payment_effective_attempt_mismatch');
        }
        return [
            'checkout_attempt_id' => isset($effective['checkout_attempt_id'])
                ? (int) $effective['checkout_attempt_id']
                : null,
            'checkout_link_verified' => (int) $effective['checkout_link_verified'] === 1,
            'status' => strtolower((string) $effective['status']),
            'status_detail' => strtolower((string) ($effective['status_detail'] ?? '')),
            'amount_refunded' => (int) $effective['amount_refunded'],
            'ever_accredited' => (int) ($effective['ever_accredited'] ?? 0) === 1,
            'last_gateway_update_at' => isset($effective['last_gateway_update_at'])
                ? (string) $effective['last_gateway_update_at']
                : null,
        ];
    }

    public function markPaymentIncident(
        int $enrollmentId,
        string $paymentId,
        string $status,
        ?string $gatewayUpdatedAt
    ): void {
        if (!in_array($status, ['refunded', 'charged_back'], true)) {
            throw new \InvalidArgumentException('Incidencia de pago no permitida.');
        }
        $statement = $this->pdo->prepare(<<<'SQL'
            UPDATE payment_records
               SET status = :status,
                   last_gateway_update_at = CASE
                       WHEN :gateway_updated_at IS NULL THEN last_gateway_update_at
                       WHEN last_gateway_update_at IS NULL THEN :gateway_updated_at_value
                       ELSE GREATEST(last_gateway_update_at, :gateway_updated_at_max)
                   END,
                   updated_at = UTC_TIMESTAMP(3)
             WHERE enrollment_id = :enrollment_id
               AND mp_payment_id = :payment_id
               AND checkout_link_verified = 1
        SQL);
        $statement->execute([
            'status' => $status,
            'gateway_updated_at' => $gatewayUpdatedAt,
            'gateway_updated_at_value' => $gatewayUpdatedAt,
            'gateway_updated_at_max' => $gatewayUpdatedAt,
            'enrollment_id' => $enrollmentId,
            'payment_id' => $paymentId,
        ]);
        if ($statement->rowCount() !== 1) {
            $check = $this->pdo->prepare(<<<'SQL'
                SELECT status
                  FROM payment_records
                 WHERE enrollment_id = :enrollment_id
                   AND mp_payment_id = :payment_id
                   AND checkout_link_verified = 1
                 LIMIT 1
            SQL);
            $check->execute(['enrollment_id' => $enrollmentId, 'payment_id' => $paymentId]);
            if ((string) $check->fetchColumn() !== $status) {
                throw new \RuntimeException('No se pudo fijar la incidencia sobre un pago verificado.');
            }
        }
    }

    public function countVerifiedAccreditedPayments(int $enrollmentId): int
    {
        $statement = $this->pdo->prepare(<<<'SQL'
            SELECT COUNT(DISTINCT mp_payment_id)
              FROM payment_records
             WHERE enrollment_id = :enrollment_id
               AND checkout_link_verified = 1
               AND ever_accredited = 1
        SQL);
        $statement->execute(['enrollment_id' => $enrollmentId]);
        return (int) $statement->fetchColumn();
    }

    public static function isUniqueViolation(PDOException $exception): bool
    {
        return $exception->getCode() === '23000';
    }
}
