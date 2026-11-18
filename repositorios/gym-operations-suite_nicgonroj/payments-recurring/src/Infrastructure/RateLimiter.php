<?php

declare(strict_types=1);

namespace DemoGym\Infrastructure;

use PDO;

final class RateLimiter
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    public function consume(
        string $clientKeyMaterial,
        string $secret,
        int $limit,
        int $windowSeconds,
        string $namespace = 'default'
    ): bool
    {
        if (preg_match('/^[a-z0-9-]{1,48}$/D', $namespace) !== 1) {
            throw new \InvalidArgumentException('Namespace de rate limit inválido.');
        }
        $bucket = intdiv(time(), $windowSeconds) * $windowSeconds;
        $key = hash_hmac('sha256', $namespace . "\0" . $clientKeyMaterial, $secret);
        $statement = $this->pdo->prepare(<<<'SQL'
            INSERT INTO rate_limit_buckets (client_key, bucket_started_at, attempt_count, expires_at)
            VALUES (:client_key, FROM_UNIXTIME(:bucket), 1, FROM_UNIXTIME(:expires_at))
            ON DUPLICATE KEY UPDATE attempt_count = attempt_count + 1
        SQL);
        $statement->execute([
            'client_key' => $key,
            'bucket' => $bucket,
            'expires_at' => $bucket + ($windowSeconds * 2),
        ]);

        $read = $this->pdo->prepare(<<<'SQL'
            SELECT attempt_count FROM rate_limit_buckets
             WHERE client_key = :client_key AND bucket_started_at = FROM_UNIXTIME(:bucket)
        SQL);
        $read->execute(['client_key' => $key, 'bucket' => $bucket]);
        return (int) $read->fetchColumn() <= $limit;
    }
}
