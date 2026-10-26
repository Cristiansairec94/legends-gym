<?php

declare(strict_types=1);

namespace DemoGym\Domain;

interface CheckoutGateway
{
    /** @param array<string, mixed> $payload @return array<string, mixed> */
    public function createCheckout(string $checkoutType, array $payload, string $idempotencyKey): array;

    /** @return list<array<string, mixed>> */
    public function searchCheckout(
        string $checkoutType,
        string $externalReference,
        string $payerEmail,
        int $expectedAmount
    ): array;

    /** @return array<string, mixed> */
    public function getSubscription(string $id): array;

    /** @return array<string, mixed> */
    public function getPreference(string $id): array;

    /** @return array<string, mixed> */
    public function getPayment(string $id): array;

    /** @return array<string, mixed> */
    public function getMerchantOrder(string $id): array;

    /** @return array<string, mixed> */
    public function getAuthorizedPayment(string $id): array;

    /** @return array<string, mixed> */
    public function getChargeback(string $id): array;

    /** @return array<string, mixed> */
    public function getClaim(string $id): array;
}
