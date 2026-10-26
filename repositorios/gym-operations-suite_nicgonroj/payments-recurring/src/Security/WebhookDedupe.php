<?php

declare(strict_types=1);

namespace DemoGym\Security;

final class WebhookDedupe
{
    public static function key(string $requestId, string $dataId): string
    {
        // Ambos valores forman parte del manifiesto HMAC ya validado. No depende del body mutable.
        return hash('sha256', trim($dataId) . '|' . trim($requestId));
    }
}
