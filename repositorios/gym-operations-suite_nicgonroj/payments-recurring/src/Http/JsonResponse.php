<?php

declare(strict_types=1);

namespace DemoGym\Http;

final class JsonResponse
{
    /** @param array<string, mixed> $payload */
    public static function send(array $payload, int $status = 200): never
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store, max-age=0');
        header('X-Content-Type-Options: nosniff');
        header('Referrer-Policy: no-referrer');
        echo json_encode($payload, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }

    public static function error(HttpException $exception): never
    {
        self::send([
            'error' => [
                'code' => $exception->errorCode,
                'message' => $exception->getMessage(),
                'retryable' => $exception->retryable,
                'retry_mode' => $exception->retryMode,
            ],
        ], $exception->statusCode);
    }
}
