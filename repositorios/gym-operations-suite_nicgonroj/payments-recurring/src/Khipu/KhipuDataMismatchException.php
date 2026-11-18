<?php

declare(strict_types=1);

namespace DemoGym\Khipu;

use RuntimeException;

final class KhipuDataMismatchException extends RuntimeException
{
    public function __construct(public readonly string $field)
    {
        parent::__construct('Khipu data mismatch: ' . $field);
    }
}
