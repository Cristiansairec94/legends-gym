<?php

declare(strict_types=1);

namespace DemoGym\Domain;

use InvalidArgumentException;

final class Idempotency
{
    public static function validateKey(string $key): string
    {
        $key = trim($key);
        if (strlen($key) < 16 || strlen($key) > 128 || !preg_match('/^[A-Za-z0-9._:-]+$/', $key)) {
            throw new InvalidArgumentException('Idempotency-Key inválida.');
        }
        return $key;
    }

    public static function hashKey(string $key): string
    {
        return hash('sha256', self::validateKey($key));
    }

    /** @param array<string, mixed> $normalizedRequest */
    public static function fingerprint(array $normalizedRequest): string
    {
        self::sortRecursively($normalizedRequest);
        return hash('sha256', json_encode($normalizedRequest, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
    }

    /** @param array<string, mixed> $value */
    private static function sortRecursively(array &$value): void
    {
        foreach ($value as &$item) {
            if (is_array($item)) {
                self::sortRecursively($item);
            }
        }
        unset($item);
        if (!array_is_list($value)) {
            ksort($value);
        }
    }
}
