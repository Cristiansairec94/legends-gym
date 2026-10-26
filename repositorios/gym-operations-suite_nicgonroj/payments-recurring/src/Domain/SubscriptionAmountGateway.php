<?php

declare(strict_types=1);

namespace DemoGym\Domain;

interface SubscriptionAmountGateway
{
    /** @return array<string, mixed> */
    public function updateSubscriptionAmount(string $id, int $amount, string $currency): array;
}
