<?php

declare(strict_types=1);

namespace DemoGym\Khipu;

use RuntimeException;

/**
 * Error de la API de Khipu sin mensajes crudos del proveedor. errorCode solo
 * conserva los códigos documentados de rechazo de cobro (HTTP 422).
 */
final class KhipuApiException extends RuntimeException
{
    public const CHARGE_ERROR_CODES = [
        'MAX_AMOUNT_PER_CHARGE_EXCEEDED',
        'MAX_MONTHLY_AMOUNT_EXCEEDED',
        'SUBSCRIPTION_NOT_CHARGEABLE',
        'CURRENCY_MISMATCH',
        'INVALID_AMOUNT',
        'IDEMPOTENCY_KEY_REUSED',
        'INVALID_PAYLOAD',
        'MERCHANT_ID_NOT_RESOLVED',
    ];

    public function __construct(
        public readonly int $httpStatus,
        public readonly bool $retryable,
        public readonly bool $outcomeUncertain,
        public readonly ?string $errorCode = null
    ) {
        parent::__construct('Khipu API error ' . $httpStatus . ($errorCode !== null ? ' ' . $errorCode : ''));
    }
}
