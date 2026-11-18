<?php

declare(strict_types=1);

namespace DemoGym\Infrastructure;

use PDO;

final class WebhookEventRepository
{
    /** @var list<string> */
    private const TERMINAL_STATUSES = [
        'processed',
        'ignored',
        'unmatched',
        'review_required',
        'failed_permanent',
    ];

    public function __construct(private readonly PDO $pdo)
    {
    }

    /** @param array<string, mixed> $event @return array<string, mixed> */
    public function register(string $dedupeKey, array $event): array
    {
        $statement = $this->pdo->prepare(<<<'SQL'
            INSERT INTO webhook_events (
                dedupe_key, event_id, request_id, topic, action_name, resource_id,
                live_mode, status, attempts, payload_json, enrollment_id, received_at, last_received_at
            ) VALUES (
                :dedupe_key, :event_id, :request_id, :topic, :action_name, :resource_id,
                :live_mode, 'received', 1, :payload_json, :enrollment_id, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3)
            )
            ON DUPLICATE KEY UPDATE attempts = attempts + 1, last_received_at = UTC_TIMESTAMP(3)
        SQL);
        $statement->execute([
            'dedupe_key' => $dedupeKey,
            'event_id' => $event['event_id'],
            'request_id' => $event['request_id'],
            'topic' => $event['topic'],
            'action_name' => $event['action'],
            'resource_id' => $event['resource_id'],
            'live_mode' => $event['live_mode'] ? 1 : 0,
            'payload_json' => json_encode($event['payload'], JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            'enrollment_id' => $event['enrollment_id'] ?? null,
        ]);
        $read = $this->pdo->prepare('SELECT * FROM webhook_events WHERE dedupe_key = :key LIMIT 1');
        $read->execute(['key' => $dedupeKey]);
        $row = $read->fetch();
        if (!is_array($row)) {
            throw new \RuntimeException('No se pudo registrar el webhook.');
        }
        return $row;
    }

    public function acquire(int $id): bool
    {
        $statement = $this->pdo->prepare(<<<'SQL'
            UPDATE webhook_events
               SET status = 'processing', processing_started_at = UTC_TIMESTAMP(3)
             WHERE id = :id
               AND (
                    status IN ('received', 'failed_transient')
                    OR (status = 'processing' AND processing_started_at < UTC_TIMESTAMP(3) - INTERVAL 5 MINUTE)
               )
        SQL);
        $statement->execute(['id' => $id]);
        return $statement->rowCount() === 1;
    }

    public function status(int $id): ?string
    {
        $statement = $this->pdo->prepare('SELECT status FROM webhook_events WHERE id = :id LIMIT 1');
        $statement->execute(['id' => $id]);
        $status = $statement->fetchColumn();
        return is_string($status) && $status !== '' ? $status : null;
    }

    public static function isTerminalStatus(?string $status): bool
    {
        return is_string($status) && in_array($status, self::TERMINAL_STATUSES, true);
    }

    /** @param array<string, mixed>|null $snapshot */
    public function finish(int $id, string $status, ?int $enrollmentId = null, ?array $snapshot = null, ?string $errorCode = null): void
    {
        $statement = $this->pdo->prepare(<<<'SQL'
            UPDATE webhook_events
               SET status = :status, enrollment_id = :enrollment_id,
                   resource_snapshot_json = :snapshot, error_code = :error_code,
                   processed_at = UTC_TIMESTAMP(3), processing_started_at = NULL
             WHERE id = :id
        SQL);
        $statement->execute([
            'status' => $status,
            'enrollment_id' => $enrollmentId,
            'snapshot' => $snapshot === null ? null : json_encode($snapshot, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            'error_code' => $errorCode,
            'id' => $id,
        ]);
    }
}
