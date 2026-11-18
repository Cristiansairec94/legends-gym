<?php

declare(strict_types=1);

namespace DemoGym\Domain;

use InvalidArgumentException;

final class IdentityFingerprint
{
    public static function fromEmailAndPhone(string $email, string $phoneE164, string $secret): string
    {
        $email = strtolower(trim($email));
        $phoneE164 = trim($phoneE164);
        if ($email === '' || $phoneE164 === '' || strlen($secret) < 32) {
            throw new InvalidArgumentException('No se pudo construir la huella privada de identidad.');
        }

        // El prefijo versionado separa este HMAC de cualquier otro uso. Ni el
        // correo ni el teléfono quedan recuperables desde la huella almacenada.
        return hash_hmac('sha256', "dgym-checkout-identity-v1\0" . $email . "\0" . $phoneE164, $secret);
    }
}
