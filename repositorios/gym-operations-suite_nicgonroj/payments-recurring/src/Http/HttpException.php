<?php

declare(strict_types=1);

namespace DemoGym\Http;

use RuntimeException;

final class HttpException extends RuntimeException
{
    public function __construct(
        public readonly int $statusCode,
        public readonly string $errorCode,
        string $message,
        public readonly bool $retryable = true,
        public readonly string $retryMode = 'same_idempotency_key'
    ) {
        parent::__construct($message);
    }
}
