<?php

declare(strict_types=1);

namespace DemoGym\Infrastructure;

final class PaymentAttemptBindingMismatchException extends \RuntimeException
{
    public function __construct(public readonly string $reasonCode)
    {
        parent::__construct('Conflicto técnico al vincular evidencia de pago.');
    }
}
