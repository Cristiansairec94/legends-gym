<?php

declare(strict_types=1);

namespace DemoGym\Security;

final class WebhookSignature
{
    public static function validate(string $signatureHeader, string $requestId, string $dataId, string $secret): bool
    {
        if ($secret === '' || trim($requestId) === '' || trim($dataId) === '') {
            return false;
        }

        $parts = self::parse($signatureHeader);
        $timestamp = $parts['ts'] ?? '';
        $received = $parts['v1'] ?? '';
        if ($timestamp === '' || !ctype_digit($timestamp) || !preg_match('/^[a-f0-9]{64}$/i', $received)) {
            return false;
        }

        // Fórmula oficial vigente: data.id se conserva exactamente como llegó
        // en el query. Alterar mayúsculas/minúsculas cambia el manifiesto.
        $manifest = sprintf(
            'id:%s;request-id:%s;ts:%s;',
            trim($dataId),
            trim($requestId),
            $timestamp
        );
        $expected = hash_hmac('sha256', $manifest, $secret);
        return hash_equals($expected, strtolower($received));
    }

    /** @return array<string, string> */
    public static function parse(string $header): array
    {
        $values = [];
        foreach (explode(',', $header) as $part) {
            $pieces = explode('=', trim($part), 2);
            if (count($pieces) !== 2) {
                continue;
            }
            $key = strtolower(trim($pieces[0]));
            $value = trim($pieces[1]);
            if ($key !== '' && $value !== '') {
                $values[$key] = $value;
            }
        }
        return $values;
    }
}
