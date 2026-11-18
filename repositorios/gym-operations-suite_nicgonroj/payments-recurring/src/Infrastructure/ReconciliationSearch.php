<?php

declare(strict_types=1);

namespace DemoGym\Infrastructure;

use Closure;
use RuntimeException;

/** Bounded, read-only discovery. Search results are never payment approval. */
final class ReconciliationSearch
{
    /** @param Closure(string):array<string,mixed> $get */
    public function __construct(private readonly Closure $get) {}

    /** @return array<string,array{digest:string,payment_id:?string}> */
    public function payments(string $reference, string $begin, string $end): array
    {
        if (!preg_match('/^[A-Z0-9-]{1,64}$/D', $reference)) throw new RuntimeException('Invalid reference.');
        return $this->pages('/v1/payments/search', [
            'external_reference' => $reference, 'sort' => 'id', 'criteria' => 'asc',
            'range' => 'date_created', 'begin_date' => $begin, 'end_date' => $end,
        ], 'external_reference', $reference);
    }

    /** @return array<string,array{digest:string,payment_id:?string}> */
    public function authorizedPayments(string $subscriptionId): array
    {
        if (!preg_match('/^[A-Za-z0-9_-]{1,160}$/D', $subscriptionId)) throw new RuntimeException('Invalid subscription.');
        // The live invoice endpoint rejects limit=20/50; its default page is 12.
        // Omit limit and honor the authenticated response's actual paging limit.
        return $this->pages('/authorized_payments/search', ['preapproval_id' => $subscriptionId], 'preapproval_id', $subscriptionId, null, 100);
    }

    /** @param array<string,string> $criteria @return array<string,array{digest:string,payment_id:?string}> */
    private function pages(string $path, array $criteria, string $linkField, string $expectedLink, ?int $requestedLimit = 50, int $maximumResults = 200): array
    {
        $matches = [];
        $expectedTotal = null;
        $offset = 0;
        for ($page = 0; $page < 20; $page++) {
            $query = $criteria + ['offset' => $offset];
            if ($requestedLimit !== null) $query['limit'] = $requestedLimit;
            $response = ($this->get)($path . '?' . http_build_query($query, '', '&', PHP_QUERY_RFC3986));
            $rows = $response['results'] ?? null;
            $paging = $response['paging'] ?? null;
            if (!is_array($rows) || !array_is_list($rows) || !is_array($paging)
                || !is_int($paging['total'] ?? null) || $paging['total'] < 0 || $paging['total'] > $maximumResults
                || !is_int($paging['offset'] ?? null) || $paging['offset'] !== $offset
                || !is_int($paging['limit'] ?? null) || $paging['limit'] < 1 || $paging['limit'] > 50
                || ($requestedLimit !== null && $paging['limit'] !== $requestedLimit)
                || count($rows) !== min($paging['limit'], max(0, $paging['total'] - $offset))) {
                throw new RuntimeException('Incomplete payment search.');
            }
            if ($expectedTotal !== null && $expectedTotal !== $paging['total']) throw new RuntimeException('Payment search changed.');
            $expectedTotal = $paging['total'];
            foreach ($rows as $row) {
                if (!is_array($row) || !hash_equals($expectedLink, trim((string) ($row[$linkField] ?? '')))) {
                    throw new RuntimeException('Payment search linkage mismatch.');
                }
                $id = trim((string) ($row['id'] ?? ''));
                if (!preg_match('/^[A-Za-z0-9_-]{1,160}$/D', $id) || isset($matches[$id])) throw new RuntimeException('Payment search ID mismatch.');
                // No contact, card or payer information retained in diagnostics.
                $facts = [];
                foreach (['id', 'external_reference', 'preapproval_id', 'status', 'status_detail', 'date_last_updated', 'last_modified', 'transaction_amount', 'transaction_amount_refunded', 'currency_id'] as $key) {
                    $facts[$key] = $row[$key] ?? null;
                }
                $paymentId = isset($row['payment']['id']) ? trim((string) $row['payment']['id']) : null;
                if ($paymentId !== null && !preg_match('/^[A-Za-z0-9_-]{1,160}$/D', $paymentId)) throw new RuntimeException('Invalid related payment.');
                $facts['payment_id'] = $paymentId;
                $matches[$id] = ['digest' => hash('sha256', json_encode($facts, JSON_THROW_ON_ERROR)), 'payment_id' => $paymentId];
            }
            if (count($matches) === $expectedTotal) { ksort($matches, SORT_STRING); return $matches; }
            $offset += count($rows);
        }
        throw new RuntimeException('Payment search exceeded safe limit.');
    }
}
