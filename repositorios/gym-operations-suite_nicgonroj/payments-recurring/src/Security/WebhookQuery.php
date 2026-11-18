<?php

declare(strict_types=1);

namespace DemoGym\Security;

final class WebhookQuery
{
    /** Extrae el nombre literal data.id sin pasar por parse_str ni la normalización de PHP. */
    public static function dataId(string $queryString): ?string
    {
        $found = null;
        foreach (explode('&', $queryString) as $pair) {
            if ($pair === '') {
                continue;
            }
            $pieces = explode('=', $pair, 2);
            $key = rawurldecode($pieces[0]);
            if ($key !== 'data.id') {
                continue;
            }
            if ($found !== null || !isset($pieces[1])) {
                return null;
            }
            $value = rawurldecode($pieces[1]);
            if (
                $value === ''
                || $value !== trim($value)
                || strlen($value) > 160
                || !preg_match('/^[A-Za-z0-9_-]+$/', $value)
            ) {
                return null;
            }
            $found = $value;
        }
        return $found;
    }
}
