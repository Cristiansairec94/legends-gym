<?php

declare(strict_types=1);

namespace DemoGym\Domain;

final class EnrollmentReference
{
    private const PATTERN = '/^DGYM-\d{8}-[A-F0-9]{32}$/';

    public static function generate(): string
    {
        return 'DGYM-' . gmdate('Ymd') . '-' . strtoupper(bin2hex(random_bytes(16)));
    }

    public static function isValid(string $reference): bool
    {
        return preg_match(self::PATTERN, $reference) === 1;
    }
}
