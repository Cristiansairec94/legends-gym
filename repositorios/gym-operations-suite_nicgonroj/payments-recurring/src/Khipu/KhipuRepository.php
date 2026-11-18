<?php

declare(strict_types=1);

namespace DemoGym\Khipu;

use PDO;
use RuntimeException;
use Throwable;

final class KhipuRepository implements KhipuStore
{
    public const CHECKOUT_TYPE = 'khipu_transfer';
    public const PROVIDER = 'khipu';

    private const ENROLLMENT_COLUMNS = ['status', 'payment_status', 'membership_status', 'error_code'];
    private const CHARGE_COLUMNS = ['khipu_payment_id', 'status', 'last_error_code'];

    public function __construct(private readonly PDO $pdo)
    {
    }

    public function schemaReady(): bool
    {
        try {
            foreach ([
                'SELECT id, payment_provider, checkout_type, checkout_amount, checkout_url FROM enrollments LIMIT 0',
                'SELECT id, enrollment_id, installment_number, kind, transaction_id, khipu_payment_id, amount, status, due_on, last_error_code, confirmed_at FROM khipu_charges LIMIT 0',
            ] as $probe) {
                $statement = $this->pdo->query($probe);
                if ($statement === false) {
                    return false;
                }
                $statement->closeCursor();
            }
            return true;
        } catch (Throwable) {
            return false;
        }
    }

    public function findByIdempotencyHash(string $hash): ?array
    {
        $statement = $this->pdo->prepare('SELECT * FROM enrollments WHERE idempotency_key_hash = :hash LIMIT 1');
        $statement->execute(['hash' => $hash]);
        $result = $statement->fetch();
        return is_array($result) ? $result : null;
    }

    public function findByReference(string $reference): ?array
    {
        $statement = $this->pdo->prepare(
            "SELECT * FROM enrollments WHERE reference = :reference AND payment_provider = 'khipu' LIMIT 1"
        );
        $statement->execute(['reference' => $reference]);
        $result = $statement->fetch();
        return is_array($result) ? $result : null;
    }

    public function createEnrollment(
        array $input,
        array $offer,
        string $publicId,
        string $reference,
        string $idempotencyHash,
        string $fingerprint
    ): array {
        $this->pdo->beginTransaction();
        try {
            $enrollment = $this->pdo->prepare(<<<'SQL'
                INSERT INTO enrollments (
                    public_id, reference, idempotency_key_hash, request_fingerprint,
                    full_name, email, phone_e164, necessary_consent_at, marketing_consent,
                    consent_text_version, attribution_json, plan_code, plan_name, pricing_version,
                    duration_months, payment_mode, checkout_type, payment_provider,
                    regular_monthly_amount, installment_amount,
                    regular_contract_total, contract_total, checkout_amount, checkout_charge_count,
                    discount_percent, currency,
                    status, subscription_status, payment_status, membership_status
                ) VALUES (
                    :public_id, :reference, :idempotency_key_hash, :request_fingerprint,
                    :full_name, :email, :phone_e164, UTC_TIMESTAMP(3), :marketing_consent,
                    :consent_text_version, :attribution_json, :plan_code, :plan_name, :pricing_version,
                    :duration_months, :payment_mode, :checkout_type, :payment_provider,
                    :regular_monthly_amount, :installment_amount,
                    :regular_contract_total, :contract_total, :checkout_amount, 1,
                    :discount_percent, :currency,
                    'creating_checkout', 'not_applicable', 'not_created', 'not_activated'
                )
            SQL);
            $enrollment->execute([
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
                'checkout_type' => self::CHECKOUT_TYPE,
                'payment_provider' => self::PROVIDER,
                'regular_monthly_amount' => $offer['regular_monthly'],
                'installment_amount' => $offer['installment'],
                'regular_contract_total' => $offer['regular_total'],
                'contract_total' => $offer['total'],
                'checkout_amount' => $offer['today_amount'],
                'discount_percent' => $offer['discount_percent'],
                'currency' => $offer['currency'],
            ]);
            $enrollmentId = (int) $this->pdo->lastInsertId();
            if ($enrollmentId < 1) {
                throw new RuntimeException('No se pudo crear la inscripción Khipu.');
            }
            $charge = $this->pdo->prepare(<<<'SQL'
                INSERT INTO khipu_charges (
                    enrollment_id, installment_number, kind, transaction_id, amount, status, due_on
                ) VALUES (
                    :enrollment_id, 1, 'transfer', :transaction_id, :amount, 'creating', UTC_DATE()
                )
            SQL);
            $charge->execute([
                'enrollment_id' => $enrollmentId,
                'transaction_id' => $reference,
                'amount' => $offer['today_amount'],
            ]);
            $this->pdo->commit();
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $exception;
        }
        $created = $this->findByReference($reference);
        if ($created === null) {
            throw new RuntimeException('No se pudo recuperar la inscripción Khipu creada.');
        }
        return $created;
    }

    public function markCheckoutReady(int $enrollmentId, string $paymentId, string $paymentUrl): void
    {
        $paymentId = KhipuClient::safePaymentId($paymentId);
        $this->pdo->beginTransaction();
        try {
            // Mismo orden de bloqueo que applyPaymentOutcome: inscripción y luego cobro.
            $enrollment = $this->pdo->prepare(<<<'SQL'
                UPDATE enrollments
                   SET checkout_url = :checkout_url, status = 'checkout_ready', error_code = NULL,
                       updated_at = UTC_TIMESTAMP(3)
                 WHERE id = :id
                   AND payment_provider = 'khipu'
                   AND status = 'creating_checkout'
            SQL);
            $enrollment->execute(['checkout_url' => $paymentUrl, 'id' => $enrollmentId]);
            if ($enrollment->rowCount() !== 1) {
                throw new RuntimeException('La inscripción cambió de estado antes de guardar el pago Khipu.');
            }
            $charge = $this->pdo->prepare(<<<'SQL'
                UPDATE khipu_charges
                   SET khipu_payment_id = :payment_id, status = 'created', updated_at = UTC_TIMESTAMP(3)
                 WHERE enrollment_id = :enrollment_id
                   AND installment_number = 1
                   AND khipu_payment_id IS NULL
                   AND status = 'creating'
            SQL);
            $charge->execute(['payment_id' => $paymentId, 'enrollment_id' => $enrollmentId]);
            if ($charge->rowCount() !== 1) {
                throw new RuntimeException('El cobro Khipu cambió antes de guardar el pago.');
            }
            $this->pdo->commit();
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $exception;
        }
    }

    public function markCheckoutFailure(int $enrollmentId, string $errorCode): void
    {
        $this->pdo->beginTransaction();
        try {
            $enrollment = $this->pdo->prepare(<<<'SQL'
                UPDATE enrollments
                   SET status = 'checkout_creation_failed', error_code = :error_code, updated_at = UTC_TIMESTAMP(3)
                 WHERE id = :id
                   AND payment_provider = 'khipu'
                   AND status = 'creating_checkout'
            SQL);
            $enrollment->execute(['error_code' => $errorCode, 'id' => $enrollmentId]);
            if ($enrollment->rowCount() !== 1) {
                // Un webhook u otro proceso ya movió la inscripción: no sobrescribir.
                throw new RuntimeException('La inscripción cambió de estado antes de registrar el fallo.');
            }
            $charge = $this->pdo->prepare(<<<'SQL'
                UPDATE khipu_charges
                   SET status = 'failed', last_error_code = :error_code, updated_at = UTC_TIMESTAMP(3)
                 WHERE enrollment_id = :enrollment_id
                   AND installment_number = 1
                   AND status = 'creating'
            SQL);
            $charge->execute(['error_code' => $errorCode, 'enrollment_id' => $enrollmentId]);
            $this->pdo->commit();
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $exception;
        }
    }

    public function findTransferCharge(int $enrollmentId): ?array
    {
        $statement = $this->pdo->prepare(
            'SELECT * FROM khipu_charges WHERE enrollment_id = :enrollment_id AND installment_number = 1 LIMIT 1'
        );
        $statement->execute(['enrollment_id' => $enrollmentId]);
        $result = $statement->fetch();
        return is_array($result) ? $result : null;
    }

    public function pendingPaymentIds(int $limit): array
    {
        $limit = max(1, min(200, $limit));
        // Solo cobros con enlace entregado y sin resultado final. Tras siete días un
        // cobro abandonado deja de consultarse; su enlace venció mucho antes.
        $statement = $this->pdo->query(
            "SELECT khipu_payment_id FROM khipu_charges"
            . " WHERE installment_number = 1 AND kind = 'transfer' AND khipu_payment_id IS NOT NULL"
            . " AND status IN ('created', 'verifying') AND created_at > UTC_TIMESTAMP(3) - INTERVAL 7 DAY"
            . ' ORDER BY updated_at, id LIMIT ' . $limit
        );
        return $statement === false ? [] : array_map('strval', $statement->fetchAll(PDO::FETCH_COLUMN));
    }

    public function applyPaymentOutcome(int $enrollmentId, string $paymentId, string $outcome, ?string $errorCode = null): string
    {
        $this->pdo->beginTransaction();
        try {
            $read = $this->pdo->prepare(
                "SELECT * FROM enrollments WHERE id = :id AND payment_provider = 'khipu' LIMIT 1 FOR UPDATE"
            );
            $read->execute(['id' => $enrollmentId]);
            $enrollment = $read->fetch();
            $readCharge = $this->pdo->prepare(
                'SELECT * FROM khipu_charges WHERE enrollment_id = :enrollment_id AND installment_number = 1 LIMIT 1 FOR UPDATE'
            );
            $readCharge->execute(['enrollment_id' => $enrollmentId]);
            $charge = $readCharge->fetch();
            if (!is_array($enrollment) || !is_array($charge)) {
                throw new RuntimeException('La inscripción Khipu o su cobro no existen.');
            }
            $decision = KhipuTransition::decide($enrollment, $charge, $paymentId, $outcome, $errorCode);

            $this->update(
                'khipu_charges',
                self::CHARGE_COLUMNS,
                $decision['charge'],
                $decision['charge_confirmed'] ? 'confirmed_at = COALESCE(confirmed_at, UTC_TIMESTAMP(3))' : null,
                (int) $charge['id']
            );
            $this->update(
                'enrollments',
                self::ENROLLMENT_COLUMNS,
                $decision['enrollment'],
                $decision['enrollment_confirmed']
                    ? 'initial_payment_confirmed_at = COALESCE(initial_payment_confirmed_at, UTC_TIMESTAMP(3))'
                    : null,
                $enrollmentId
            );
            $this->pdo->commit();
            return $decision['state'];
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $exception;
        }
    }

    /**
     * @param list<string> $allowed
     * @param array<string, string|null> $changes
     */
    private function update(string $table, array $allowed, array $changes, ?string $extraSet, int $id): void
    {
        $sets = [];
        $params = ['id' => $id];
        foreach ($changes as $column => $value) {
            if (!in_array($column, $allowed, true)) {
                throw new RuntimeException('Columna Khipu no permitida.');
            }
            $sets[] = $column . ' = :' . $column;
            $params[$column] = $value;
        }
        if ($extraSet !== null) {
            $sets[] = $extraSet;
        }
        if ($sets === []) {
            return;
        }
        $sets[] = 'updated_at = UTC_TIMESTAMP(3)';
        $statement = $this->pdo->prepare('UPDATE ' . $table . ' SET ' . implode(', ', $sets) . ' WHERE id = :id');
        $statement->execute($params);
    }
}
