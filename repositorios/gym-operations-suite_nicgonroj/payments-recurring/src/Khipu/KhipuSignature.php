<?php

declare(strict_types=1);

namespace DemoGym\Khipu;

/**
 * Firma de la API de notificaciones 3.0 de Khipu:
 * x-khipu-signature: t=<unix ms>,s=<base64(HMAC-SHA256(secreto, t + "." + cuerpo crudo))>
 *
 * El cuerpo se usa exactamente como llegó; decodificarlo o reserializarlo rompe la firma.
 * La notificación de mandato PAC no viene firmada: su estado siempre se consulta por GET.
 */
final class KhipuSignature
{
    public const DEFAULT_TOLERANCE_MS = 300000;

    public static function validate(
        string $header,
        string $rawBody,
        string $secret,
        int $nowMs,
        int $toleranceMs = self::DEFAULT_TOLERANCE_MS
    ): bool {
        if ($secret === '' || $rawBody === '') {
            return false;
        }
        $parts = [];
        foreach (explode(',', $header) as $part) {
            $pieces = explode('=', trim($part), 2);
            if (count($pieces) === 2) {
                $parts[trim($pieces[0])] = trim($pieces[1]);
            }
        }
        $timestamp = $parts['t'] ?? '';
        $received = $parts['s'] ?? '';
        if (!ctype_digit($timestamp) || strlen($timestamp) > 16 || preg_match('#^[A-Za-z0-9+/]{43}=$#D', $received) !== 1) {
            return false;
        }
        if (abs($nowMs - (int) $timestamp) > $toleranceMs) {
            return false;
        }
        $expected = base64_encode(hash_hmac('sha256', $timestamp . '.' . $rawBody, $secret, true));
        return hash_equals($expected, $received);
    }
}
