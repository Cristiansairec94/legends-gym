<?php

declare(strict_types=1);

namespace DemoGym\Infrastructure;

use DemoGym\Config;
use DemoGym\Domain\CheckoutGateway;
use DemoGym\Domain\SubscriptionAmountGateway;
use RuntimeException;

final class MercadoPagoClient implements CheckoutGateway, SubscriptionAmountGateway
{
    public function __construct(
        private readonly Config $config,
        private readonly ?ReconciliationReadContext $readContext = null,
        private readonly ?\Closure $transport = null
    )
    {
    }

    /** @param array<string, mixed> $payload @return array<string, mixed> */
    public function createSubscription(array $payload): array
    {
        return $this->request('POST', '/preapproval', $payload);
    }

    /** @param array<string, mixed> $payload @return array<string, mixed> */
    public function createCheckout(string $checkoutType, array $payload, string $idempotencyKey): array
    {
        return match ($checkoutType) {
            'subscription' => $this->createSubscription($payload),
            // La documentación/SDK oficial de Checkout Pro admite esta cabecera
            // para preferencias. /preapproval no la documenta y por eso no se
            // envía allí: ese flujo se protege con la referencia e idempotencia local.
            'preference' => $this->request(
                'POST',
                '/checkout/preferences',
                $payload,
                ['X-Idempotency-Key: ' . $this->safeIdempotencyKey($idempotencyKey)]
            ),
            default => throw new RuntimeException('Tipo de checkout no soportado.'),
        };
    }

    /** @return list<array<string, mixed>> */
    public function searchCheckout(
        string $checkoutType,
        string $externalReference,
        string $payerEmail,
        int $expectedAmount
    ): array
    {
        $reference = trim($externalReference);
        if ($reference === '' || strlen($reference) > 64 || !preg_match('/^[A-Z0-9-]+$/', $reference)) {
            throw new RuntimeException('Referencia externa inválida.');
        }
        $payerEmail = strtolower(trim($payerEmail));
        if (!filter_var($payerEmail, FILTER_VALIDATE_EMAIL) || $expectedAmount < 1) {
            throw new RuntimeException('Criterios de conciliación inválidos.');
        }
        [$path, $resultKey, $criteria] = match ($checkoutType) {
            // /preapproval/search no documenta external_reference como filtro.
            // q, payer_email, transaction_amount, limit y offset sí están en el
            // OpenAPI MLC; la referencia siempre se filtra localmente y exacta.
            'subscription' => ['/preapproval/search', 'results', [
                'q' => $reference,
                'payer_email' => $payerEmail,
                'transaction_amount' => $expectedAmount,
            ]],
            'preference' => ['/checkout/preferences/search', 'elements', [
                'external_reference' => $reference,
            ]],
            default => throw new RuntimeException('Tipo de checkout no soportado.'),
        };
        return $this->searchPaginated($path, $resultKey, $criteria, $reference);
    }

    /**
     * La búsqueda remota es solo conciliación: recorre como máximo 300 filas y
     * falla cerrada si el servidor indica más resultados. Nunca asume que q o
     * external_reference fueron aplicados; vuelve a filtrar con hash_equals.
     *
     * @param array<string, int|string> $criteria
     * @return list<array<string, mixed>>
     */
    private function searchPaginated(string $path, string $resultKey, array $criteria, string $reference): array
    {
        $limit = 30;
        $maxPages = 10;
        $matches = [];
        for ($page = 0; $page < $maxPages; $page++) {
            $offset = $page * $limit;
            $query = http_build_query(
                $criteria + ['limit' => $limit, 'offset' => $offset],
                '',
                '&',
                PHP_QUERY_RFC3986
            );
            $response = $this->request('GET', $path . '?' . $query);
            $candidates = $response[$resultKey] ?? null;
            if (!is_array($candidates) || !array_is_list($candidates)) {
                throw new RuntimeException('Respuesta de búsqueda inválida.');
            }
            foreach ($candidates as $candidate) {
                if (
                    is_array($candidate)
                    && is_string($candidate['external_reference'] ?? null)
                    && hash_equals($reference, trim((string) $candidate['external_reference']))
                ) {
                    $candidateId = trim((string) ($candidate['id'] ?? ''));
                    $matches[$candidateId === '' ? hash('sha256', json_encode($candidate, JSON_THROW_ON_ERROR)) : $candidateId] = $candidate;
                }
            }

            $paging = is_array($response['paging'] ?? null) ? $response['paging'] : [];
            $total = is_numeric($paging['total'] ?? null) ? (int) $paging['total'] : null;
            if ($total !== null && $total <= $offset + count($candidates)) {
                return array_values($matches);
            }
            if (count($candidates) < $limit) {
                return array_values($matches);
            }
        }
        throw new RuntimeException('La búsqueda de conciliación excedió el límite seguro.');
    }

    /** @return array<string, mixed> */
    public function getSubscription(string $id): array
    {
        return $this->request('GET', '/preapproval/' . rawurlencode($this->safeResourceId($id)));
    }

    /** @return array<string,mixed> */
    public function cancelSubscription(string $id): array
    {
        // Mercado Pago recibe "canceled" en la API de preapproval. El PUT nunca
        // se reintenta automáticamente: ante una respuesta incierta se confirma
        // con un GET en una llamada posterior antes de crear otro recurso.
        return $this->request(
            'PUT',
            '/preapproval/' . rawurlencode($this->safeResourceId($id)),
            ['status' => 'canceled']
        );
    }

    /** @return array<string,mixed> */
    public function updateSubscriptionAmount(string $id, int $amount, string $currency): array
    {
        if ($amount < 1 || $currency !== 'CLP') {
            throw new RuntimeException('Monto recurrente inválido.');
        }
        $this->assertMutationBudget();
        return $this->request(
            'PUT',
            '/preapproval/' . rawurlencode($this->safeResourceId($id)),
            ['auto_recurring' => ['transaction_amount' => $amount, 'currency_id' => $currency]]
        );
    }

    /** @return array<string, mixed> */
    public function getPreference(string $id): array
    {
        return $this->request('GET', '/checkout/preferences/' . rawurlencode($this->safeResourceId($id)));
    }

    /** @return array<string, mixed> */
    public function getPayment(string $id): array
    {
        return $this->request('GET', '/v1/payments/' . rawurlencode($this->safeResourceId($id)));
    }

    /** @return array<string, mixed> */
    public function getMerchantOrder(string $id): array
    {
        $id = trim($id);
        if (preg_match('/^[1-9][0-9]{0,19}$/D', $id) !== 1) {
            throw new RuntimeException('Identificador de orden comercial inválido.');
        }
        return $this->request('GET', '/merchant_orders/' . rawurlencode($id));
    }

    public function reconciliationSearch(): ReconciliationSearch
    {
        return new ReconciliationSearch(fn (string $path): array => $this->request('GET', $path));
    }

    /** Falla antes de enviar PUT/POST si no queda tiempo para su GET confirmatorio. */
    public function assertMutationBudget(): void
    {
        if ($this->readContext !== null) {
            $this->readContext->mutationTimeoutMilliseconds();
        }
    }

    /** @return array<string, mixed> */
    public function getAuthorizedPayment(string $id): array
    {
        return $this->request('GET', '/authorized_payments/' . rawurlencode($this->safeResourceId($id)));
    }

    /** @return array<string, mixed> */
    public function getChargeback(string $id): array
    {
        return $this->request(
            'GET',
            '/v1/chargebacks/' . rawurlencode($this->safeResourceId($id)),
            null,
            ['X-Caller-Id: ' . $this->config->mercadoPagoSellerId()]
        );
    }

    /** @return array<string, mixed> */
    public function getClaim(string $id): array
    {
        return $this->request('GET', '/post-purchase/v1/claims/' . rawurlencode($this->safeResourceId($id)));
    }

    public static function assertSafeCheckoutUrl(string $url): void
    {
        if (!filter_var($url, FILTER_VALIDATE_URL) || strtolower((string) parse_url($url, PHP_URL_SCHEME)) !== 'https') {
            throw new RuntimeException('Mercado Pago devolvió una URL de checkout inválida.');
        }

        $host = strtolower((string) parse_url($url, PHP_URL_HOST));
        if (
            parse_url($url, PHP_URL_USER) !== null
            || parse_url($url, PHP_URL_PASS) !== null
            || parse_url($url, PHP_URL_PORT) !== null
        ) {
            throw new RuntimeException('Mercado Pago devolvió una URL de checkout inválida.');
        }
        $allowedSuffixes = [
            'mercadopago.cl',
            'mercadopago.com',
            'mercadopago.com.ar',
            'mercadopago.com.br',
            'mercadopago.com.mx',
            'mercadopago.com.co',
            'mercadopago.com.pe',
            'mercadopago.com.uy',
        ];
        foreach ($allowedSuffixes as $suffix) {
            if ($host === $suffix || str_ends_with($host, '.' . $suffix)) {
                return;
            }
        }
        throw new RuntimeException('Mercado Pago devolvió un dominio de checkout no permitido.');
    }

    /** @param array<string, mixed>|null $payload @return array<string, mixed> */
    /** @param array<string> $extraHeaders */
    private function request(string $method, string $path, ?array $payload = null, array $extraHeaders = []): array
    {
        $this->config->assertMercadoPagoCredentialEnvironment();
        if ($this->transport === null && !function_exists('curl_init')) {
            throw new RuntimeException('La extensión PHP cURL es obligatoria.');
        }

        $headers = [
            'Accept: application/json',
            'Authorization: Bearer ' . $this->config->mercadoPagoAccessToken(),
            'Content-Type: application/json',
            'User-Agent: DemoGym-Checkout/2.0',
        ];
        foreach ($extraHeaders as $header) {
            if (preg_match('/[\r\n]/', $header)) throw new RuntimeException('Cabecera de Mercado Pago inválida.');
            $headers[] = $header;
        }
        // POST behavior is intentionally unchanged: no automatic retry of checkout creation.
        for ($attempt = 1; $attempt <= 2; $attempt++) {
            $mutation = in_array($method, ['POST', 'PUT'], true);
            $timeout = $this->readContext === null
                ? 20000
                : ($mutation
                    ? $this->readContext->mutationTimeoutMilliseconds()
                    : $this->readContext->timeoutMilliseconds());
            $started = hrtime(true);
            $result = $this->transport !== null
                ? ($this->transport)($method, $path, $payload, $timeout)
                : $this->send($method, $path, $payload, $headers, $timeout);
            $body = $result['body']; $curlError = (int) $result['transport_code'];
            $httpStatus = $body === false || $curlError !== 0 ? 0 : (int) $result['http_status'];
            if ($this->readContext !== null) {
                $this->readContext->record(self::endpointLabel($path), $httpStatus, $curlError, $attempt, (int) ((hrtime(true) - $started) / 1000000));
                if (ReconciliationReadContext::canRetry($method, $httpStatus, $attempt)
                    && $this->readContext->pauseBeforeRetry($result['retry_after_ms'] ?? null)) continue;
            }
            if ($body === false || $curlError !== 0 || $httpStatus === 0) throw new MercadoPagoApiException(0, true, $mutation);
            // Transient non-JSON errors are handled by their HTTP status, never by a raw provider message.
            if ($httpStatus < 200 || $httpStatus >= 300) {
                $retryable = self::isTransientHttpStatus($httpStatus);
                throw new MercadoPagoApiException(
                    $httpStatus,
                    $retryable,
                    $mutation && $retryable,
                    providerErrorCode: self::safeProviderErrorCode((string) $body),
                    providerRequestId: $result['provider_request_id'] ?? null
                );
            }
            try { $decoded = json_decode((string) $body, true, 64, JSON_THROW_ON_ERROR); }
            catch (\JsonException) { throw self::invalidGatewayBody($method, $httpStatus); }
            if (!is_array($decoded)) throw self::invalidGatewayBody($method, $httpStatus);
            return $decoded;
        }
        throw new RuntimeException('Gateway read unavailable.');
    }

    /** cURL transport. Response headers and body never enter diagnostics. */
    private function send(string $method, string $path, ?array $payload, array $headers, int $timeoutMs): array
    {
        $curl = curl_init($this->config->mercadoPagoApiBaseUrl() . $path);
        if ($curl === false) throw new RuntimeException('No se pudo inicializar cURL.');
        $retryAfter = null;
        $providerRequestId = null;
        $options = [
            CURLOPT_RETURNTRANSFER => true, CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_CONNECTTIMEOUT_MS => min(5000, $timeoutMs), CURLOPT_TIMEOUT_MS => $timeoutMs,
            CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_FOLLOWLOCATION => false, CURLOPT_MAXREDIRS => 0, CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
            CURLOPT_HEADERFUNCTION => static function ($handle, string $line) use (&$retryAfter, &$providerRequestId): int {
                if (preg_match('/^Retry-After:\s*([0-9]{1,8})\s*$/iD', trim($line), $match)) $retryAfter = (int) $match[1] * 1000;
                elseif (preg_match('/^Retry-After:\s*(.{1,80})$/iD', trim($line), $match)) {
                    $date = strtotime($match[1]);
                    if ($date !== false) $retryAfter = max(0, $date - time()) * 1000;
                }
                elseif (preg_match('/^X-Request-Id:\s*([A-Za-z0-9][A-Za-z0-9-]{0,79})\s*$/iD', trim($line), $match)) {
                    $providerRequestId = $match[1];
                }
                return strlen($line);
            },
        ];
        if ($payload !== null) $options[CURLOPT_POSTFIELDS] = json_encode($payload, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        curl_setopt_array($curl, $options);
        $body = curl_exec($curl); $curlError = curl_errno($curl);
        $httpStatus = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE); curl_close($curl);
        return [
            'body' => $body,
            'transport_code' => $curlError,
            'http_status' => $httpStatus,
            'retry_after_ms' => $retryAfter,
            'provider_request_id' => $providerRequestId,
        ];
    }

    private static function endpointLabel(string $path): string
    {
        $path = explode('?', $path, 2)[0];
        return match (true) {
            $path === '/v1/payments/search' => 'payments_search',
            $path === '/authorized_payments/search' => 'invoices_search',
            str_starts_with($path, '/v1/payments/') => 'payment',
            str_starts_with($path, '/merchant_orders/') => 'merchant_order',
            str_starts_with($path, '/authorized_payments/') => 'invoice',
            str_starts_with($path, '/preapproval/') => 'subscription',
            str_starts_with($path, '/checkout/preferences/') => 'preference',
            default => 'other_get',
        };
    }

    private static function isTransientHttpStatus(int $status): bool
    {
        // 409 puede significar que una operación con la misma idempotency key
        // sigue en curso. Para POST su resultado se considera incierto y obliga
        // a conciliar antes de permitir otra creación.
        return in_array($status, [408, 409, 429], true) || $status >= 500 || $status === 0;
    }

    /**
     * Extrae solo identificadores de máquina documentados por el proveedor.
     * Nunca conserva message, description, data, URLs, correos ni el body crudo.
     */
    private static function safeProviderErrorCode(string $body): ?string
    {
        if ($body === '' || strlen($body) > 16384) {
            return null;
        }
        try {
            $decoded = json_decode($body, true, 8, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return null;
        }
        if (!is_array($decoded)) {
            return null;
        }

        return MercadoPagoApiException::allowlistedProviderErrorCode($decoded['error'] ?? null);
    }

    private static function invalidGatewayBody(string $method, int $status): MercadoPagoApiException
    {
        $transient = self::isTransientHttpStatus($status);
        // Un 2xx sin JSON utilizable después de un POST puede haber creado el
        // recurso. Se concilia por referencia antes de considerar otro intento.
        $outcomeUncertain = in_array($method, ['POST', 'PUT'], true)
            && ($transient || ($status >= 200 && $status < 300));
        return new MercadoPagoApiException(
            $status,
            $transient || $outcomeUncertain,
            $outcomeUncertain
        );
    }

    private function safeResourceId(string $id): string
    {
        $id = trim($id);
        if ($id === '' || strlen($id) > 160 || !preg_match('/^[A-Za-z0-9_-]+$/', $id)) {
            throw new RuntimeException('Identificador de recurso inválido.');
        }
        return $id;
    }

    private function safeIdempotencyKey(string $key): string
    {
        $key = trim($key);
        if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $key)) {
            throw new RuntimeException('Clave de idempotencia remota inválida.');
        }
        return strtolower($key);
    }
}
