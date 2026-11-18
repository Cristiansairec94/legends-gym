<?php

declare(strict_types=1);

namespace DemoGym\Http;

final class Request
{
    /** @return array<string, mixed> */
    public static function jsonBody(int $maxBytes = 32768): array
    {
        $contentLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
        if ($contentLength > $maxBytes) {
            throw new HttpException(413, 'invalid_request', 'La solicitud supera el tamaño permitido.');
        }

        $raw = file_get_contents('php://input', false, null, 0, $maxBytes + 1);
        if (!is_string($raw) || $raw === '' || strlen($raw) > $maxBytes) {
            throw new HttpException(400, 'invalid_request', 'El cuerpo JSON es obligatorio.');
        }
        try {
            $decoded = json_decode($raw, true, 32, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            throw new HttpException(400, 'invalid_request', 'El cuerpo JSON no es válido.');
        }
        if (!is_array($decoded) || array_is_list($decoded)) {
            throw new HttpException(400, 'invalid_request', 'El cuerpo JSON debe ser un objeto.');
        }
        return $decoded;
    }

    public static function header(string $name): string
    {
        $serverName = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
        $value = $_SERVER[$serverName] ?? '';
        return is_string($value) ? trim($value) : '';
    }

    public static function assertMethod(string $expected): void
    {
        $actual = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? ''));
        if ($actual !== strtoupper($expected)) {
            header('Allow: ' . strtoupper($expected));
            throw new HttpException(405, 'method_not_allowed', 'Método no permitido.');
        }
    }

    public static function assertSameOrigin(string $allowedOrigin): void
    {
        $origin = self::header('Origin');
        if ($origin === '') {
            return;
        }
        if (!hash_equals(strtolower(rtrim($allowedOrigin, '/')), strtolower(rtrim($origin, '/')))) {
            throw new HttpException(403, 'invalid_origin', 'Origen no permitido.');
        }
    }

    public static function clientIp(): string
    {
        // REMOTE_ADDR es la única fuente no manipulable por el cliente sin una lista de proxies confiables.
        $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
        return filter_var($ip, FILTER_VALIDATE_IP) ? $ip : '0.0.0.0';
    }
}
