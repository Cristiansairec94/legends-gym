<?php

declare(strict_types=1);

namespace DemoGym;

use RuntimeException;

final class Environment
{
    /**
     * Hostings compartidos suelen permitir definir una sola ruta con SetEnv.
     * El archivo al que apunta debe vivir fuera de public_html y devolver un array.
     */
    public static function loadPrivateFileIfConfigured(): void
    {
        $configuredPath = getenv('DGYM_PRIVATE_CONFIG_FILE');
        if (!is_string($configuredPath) || trim($configuredPath) === '') {
            return;
        }

        $realPath = realpath(trim($configuredPath));
        if ($realPath === false || !is_file($realPath) || !is_readable($realPath)) {
            throw new RuntimeException('No se pudo leer DGYM_PRIVATE_CONFIG_FILE.');
        }
        $permissions = fileperms($realPath);
        if (!is_int($permissions) || ($permissions & 0077) !== 0) {
            throw new RuntimeException('DGYM_PRIVATE_CONFIG_FILE debe tener permisos 0600 o más restrictivos.');
        }

        $publicPath = realpath(dirname(__DIR__) . '/public');
        if ($publicPath !== false && str_starts_with($realPath, $publicPath . DIRECTORY_SEPARATOR)) {
            throw new RuntimeException('La configuración privada no puede vivir dentro de public/.');
        }
        self::assertPrivatePathOutsideDocumentRoot(
            $realPath,
            isset($_SERVER['DOCUMENT_ROOT']) && is_string($_SERVER['DOCUMENT_ROOT'])
                ? $_SERVER['DOCUMENT_ROOT']
                : ''
        );

        $values = require $realPath;
        if (!is_array($values)) {
            throw new RuntimeException('La configuración privada debe devolver un array.');
        }

        foreach ($values as $name => $value) {
            if (!is_string($name) || !preg_match('/^[A-Z][A-Z0-9_]+$/', $name)) {
                throw new RuntimeException('La configuración privada contiene una clave inválida.');
            }
            if (!is_scalar($value) && $value !== null) {
                throw new RuntimeException('La configuración privada contiene un valor inválido.');
            }
            if (getenv($name) !== false) {
                continue;
            }

            $stringValue = $value === null ? '' : (string) $value;
            putenv($name . '=' . $stringValue);
            $_ENV[$name] = $stringValue;
        }
    }

    /**
     * Valida la ubicación ya resuelta antes de ejecutar el archivo. Se expone
     * para poder probar el límite sin abrir ni inspeccionar secretos.
     */
    public static function assertPrivatePathOutsideDocumentRoot(string $realPath, string $documentRootValue): void
    {
        $documentRootValue = trim($documentRootValue);
        if ($documentRootValue === '') {
            return;
        }
        $documentRoot = realpath($documentRootValue);
        if ($documentRoot === false) {
            throw new RuntimeException('DOCUMENT_ROOT no se pudo validar de forma segura.');
        }
        if ($realPath === $documentRoot || str_starts_with($realPath, $documentRoot . DIRECTORY_SEPARATOR)) {
            throw new RuntimeException('La configuración privada no puede vivir dentro de DOCUMENT_ROOT.');
        }
    }
}
