<?php
declare(strict_types=1);
namespace DemoGym\Infrastructure;

use DemoGym\Application\ReconciliationService;

/** HMAC has the existing exporter format; POST additionally persists every nonce. */
final class ManualReconciliationAuth
{
    public const PATH = '/inscripcion/api/control-reconcile.php';

    public static function sign(string $canonical, string $key): string
    {
        return rtrim(strtr(base64_encode(hash_hmac('sha256', $canonical, $key, true)), '+/', '-_'), '=');
    }

    public static function authenticate(string $method, string $target, string $body, string $timestamp, string $nonce, string $signature, string $key, ?int $now = null): bool
    {
        if ($method !== 'POST' || $target !== self::PATH || strlen($key) !== 32 || strlen($body) > 4096
            || !preg_match('/^[0-9]{10}$/D', $timestamp) || abs(($now ?? time()) - (int) $timestamp) > 300
            || !preg_match('/^[a-zA-Z0-9-]{20,80}$/D', $nonce) || !preg_match('/^[A-Za-z0-9_-]{43}$/D', $signature)) return false;
        return hash_equals(self::sign(implode("\n", ['v1', $method, $target, $timestamp, $nonce, hash('sha256', $body)]), $key), $signature);
    }

    public static function payload(string $raw): array
    {
        if (strlen($raw) > 4096) throw new \InvalidArgumentException('invalid_request');
        try { $data = json_decode($raw, true, 8, JSON_THROW_ON_ERROR); }
        catch (\JsonException) { throw new \InvalidArgumentException('invalid_request'); }
        if (!is_array($data) || array_is_list($data)
            || array_diff(array_keys($data), ['schema', 'runId', 'afterId', 'enrollmentPublicId']) !== []
            || ($data['schema'] ?? '') !== 'dgym-manual-reconciliation/1'
            || !is_string($data['runId'] ?? null) || !preg_match('/^[A-Za-z0-9_-]{8,80}$/D', $data['runId'])) throw new \InvalidArgumentException('invalid_request');
        $target = $data['enrollmentPublicId'] ?? null;
        if (array_key_exists('enrollmentPublicId', $data) && (!is_string($target) || !ReconciliationService::validPublicId($target) || array_key_exists('afterId', $data))) throw new \InvalidArgumentException('invalid_request');
        $after = array_key_exists('afterId', $data) ? $data['afterId'] : 0;
        if (!is_int($after) || $after < 0 || $after > 999999999999999) throw new \InvalidArgumentException('invalid_request');
        return ['runId' => $data['runId'], 'afterId' => $after, 'enrollmentPublicId' => $target === null ? null : strtolower($target)];
    }

    /** Root must already be the private application root. No key, body or PII is written. */
    public static function consumeNonce(string $privateRoot, string $nonce, ?int $now = null): bool
    {
        if (!preg_match('/^[a-zA-Z0-9-]{20,80}$/D', $nonce) || is_link($privateRoot) || realpath($privateRoot) !== $privateRoot) throw new \RuntimeException('nonce_store_unavailable');
        $directory = $privateRoot;
        foreach (['var', 'control-manual-nonces'] as $component) {
            $directory .= '/' . $component;
            if (is_link($directory) || (!is_dir($directory) && !@mkdir($directory, 0700) && !is_dir($directory))) throw new \RuntimeException('nonce_store_unavailable');
            if (!@chmod($directory, 0700)) throw new \RuntimeException('nonce_store_unavailable');
        }
        $path = $directory . '/' . hash('sha256', $nonce) . '.nonce';
        if (is_link($path)) throw new \RuntimeException('nonce_store_unavailable');
        $handle = @fopen($path, 'xb');
        if ($handle === false) {
            if (is_file($path)) return false;
            throw new \RuntimeException('nonce_store_unavailable');
        }
        try { if (!chmod($path, 0600) || fwrite($handle, 'used') !== 4 || !fflush($handle)) throw new \RuntimeException('nonce_store_unavailable'); }
        finally { fclose($handle); }
        // Requests may use a timestamp 300s in the future. Keep consumed nonces
        // beyond the whole 600s acceptance interval; cleanup is bounded.
        $checked = 0; $cutoff = ($now ?? time()) - 900;
        foreach (new \DirectoryIterator($directory) as $entry) {
            if (++$checked > 200) break;
            if (!$entry->isLink() && $entry->isFile() && preg_match('/^[a-f0-9]{64}\.nonce$/D', $entry->getFilename()) && $entry->getMTime() < $cutoff) @unlink($entry->getPathname());
        }
        return true;
    }
}
