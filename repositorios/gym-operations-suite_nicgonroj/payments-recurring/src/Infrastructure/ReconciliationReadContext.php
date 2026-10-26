<?php
declare(strict_types=1);
namespace DemoGym\Infrastructure;

use Closure;

/** One monotonic deadline shared by discovery and every verification GET. */
final class ReconciliationReadContext
{
    private readonly Closure $clock;
    private readonly Closure $sleep;
    private readonly float $deadline;
    private array $requests = [];
    private int $requestCount = 0;
    private int $retryCount = 0;
    private bool $exhausted = false;

    public function __construct(int $seconds = 45, ?Closure $clock = null, ?Closure $sleep = null)
    {
        if ($seconds < 1 || $seconds > 180) throw new \InvalidArgumentException('Invalid read budget.');
        $this->clock = $clock ?? static fn (): float => hrtime(true) / 1e9;
        $this->sleep = $sleep ?? static function (int $milliseconds): void { usleep($milliseconds * 1000); };
        $this->deadline = ($this->clock)() + $seconds;
    }

    public function timeoutMilliseconds(): int
    {
        $remaining = (int) floor(($this->deadline - ($this->clock)()) * 1000);
        // Reserve a little time for the failure snapshot and signed response.
        if ($remaining < 200) { $this->exhausted = true; throw new ReadBudgetExceeded('read_budget_exceeded'); }
        return min(20000, $remaining - 100);
    }

    /** Reserva tiempo para el GET autenticado que confirma una mutación. */
    public function mutationTimeoutMilliseconds(int $confirmationReserveMs = 5000): int
    {
        if ($confirmationReserveMs < 1000 || $confirmationReserveMs > 15000) {
            throw new \InvalidArgumentException('Invalid mutation confirmation reserve.');
        }
        $remaining = (int) floor(($this->deadline - ($this->clock)()) * 1000);
        if ($remaining < $confirmationReserveMs + 500) {
            $this->exhausted = true;
            throw new ReadBudgetExceeded('mutation_budget_exceeded');
        }
        return min(20000, $remaining - $confirmationReserveMs);
    }

    public function pauseBeforeRetry(?int $retryAfterMilliseconds): bool
    {
        $delay = max(200, $retryAfterMilliseconds ?? 0);
        // Never retry earlier than Retry-After or hold an HTTP worker for a long backoff.
        if ($delay > 2000 || (($this->deadline - ($this->clock)()) * 1000) < $delay + 300) return false;
        ($this->sleep)($delay);
        return true;
    }

    public static function canRetry(string $method, int $status, int $attempt): bool
    {
        return $method === 'GET' && $attempt === 1
            && (in_array($status, [0, 408, 429], true) || ($status >= 500 && $status <= 599));
    }

    public function record(string $endpoint, int $httpStatus, int $transportCode, int $attempt, int $elapsedMs): void
    {
        $this->requestCount++;
        if ($attempt > 1) $this->retryCount++;
        if (count($this->requests) < 100) $this->requests[] = [
            'endpoint' => $endpoint, 'http_status' => $httpStatus,
            'transport_code' => $transportCode, 'attempt' => $attempt, 'elapsed_ms' => max(0, $elapsedMs),
        ];
    }

    public function diagnostics(): array
    {
        return ['schema' => 'dgym-read-diagnostics/1', 'request_count' => $this->requestCount,
            'retry_count' => $this->retryCount, 'budget_exhausted' => $this->exhausted, 'requests' => $this->requests];
    }
}
