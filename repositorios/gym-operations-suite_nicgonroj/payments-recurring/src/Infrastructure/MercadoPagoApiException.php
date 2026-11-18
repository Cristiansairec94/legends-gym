<?php

declare(strict_types=1);

namespace DemoGym\Infrastructure;

use RuntimeException;

final class MercadoPagoApiException extends RuntimeException
{
    private const ALLOWED_PROVIDER_ERROR_CODES = [
        'bad_request',
        'forbidden',
        'internal_error',
        'internal_server_error',
        'invalid_credentials',
        'not_found',
        'too_many_requests',
        'unauthorized',
        'unprocessable_entity',
    ];

    public readonly ?string $providerErrorCode;
    public readonly ?string $providerRequestId;

    public function __construct(
        public readonly int $httpStatus,
        public readonly bool $retryable,
        public readonly bool $outcomeUncertain,
        string $message = 'Mercado Pago no pudo procesar la solicitud.',
        mixed $providerErrorCode = null,
        mixed $providerRequestId = null
    ) {
        $this->providerErrorCode = self::allowlistedProviderErrorCode($providerErrorCode);
        $this->providerRequestId = self::safeProviderRequestId($providerRequestId);
        parent::__construct($message);
    }

    public static function allowlistedProviderErrorCode(mixed $value): ?string
    {
        return is_string($value) && in_array(strtolower($value), self::ALLOWED_PROVIDER_ERROR_CODES, true)
            ? strtolower($value)
            : null;
    }

    private static function safeProviderRequestId(mixed $value): ?string
    {
        return is_string($value) && preg_match('/^[A-Za-z0-9][A-Za-z0-9-]{0,79}$/D', $value) === 1
            ? $value
            : null;
    }
}
