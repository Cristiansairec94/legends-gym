<?php

declare(strict_types=1);

namespace DemoGym\Khipu;

/**
 * Persistencia de las inscripciones pagadas por transferencia Khipu. Vive
 * separada de EnrollmentRepository: una inscripción Khipu no crea filas en
 * checkout_payment_attempts ni en payment_records, que pertenecen a Mercado Pago.
 */
interface KhipuStore
{
    /** payment_provider y khipu_charges existen (003_khipu.sql aplicada). */
    public function schemaReady(): bool;

    /** @return array<string, mixed>|null Cualquier inscripción con esa clave, sea o no Khipu. */
    public function findByIdempotencyHash(string $hash): ?array;

    /** @return array<string, mixed>|null Solo inscripciones Khipu. */
    public function findByReference(string $reference): ?array;

    /**
     * Inserta la inscripción y su cobro por transferencia en una sola transacción.
     *
     * @param array<string, mixed> $input
     * @param array<string, mixed> $offer
     * @return array<string, mixed>
     */
    public function createEnrollment(
        array $input,
        array $offer,
        string $publicId,
        string $reference,
        string $idempotencyHash,
        string $fingerprint
    ): array;

    public function markCheckoutReady(int $enrollmentId, string $paymentId, string $paymentUrl): void;

    public function markCheckoutFailure(int $enrollmentId, string $errorCode): void;

    /** @return array<string, mixed>|null */
    public function findTransferCharge(int $enrollmentId): ?array;

    /** @return list<string> Pagos con enlace entregado que aún no tienen un resultado final. */
    public function pendingPaymentIds(int $limit): array;

    /**
     * Aplica KhipuTransition bajo bloqueo de la inscripción y de su cobro.
     *
     * @return string Estado resultante de la inscripción.
     */
    public function applyPaymentOutcome(int $enrollmentId, string $paymentId, string $outcome, ?string $errorCode = null): string;
}
