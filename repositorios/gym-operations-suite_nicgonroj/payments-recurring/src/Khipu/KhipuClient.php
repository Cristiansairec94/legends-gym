<?php

declare(strict_types=1);

namespace DemoGym\Khipu;

use DemoGym\Config;
use RuntimeException;

/**
 * Cliente de Khipu según los OpenAPI oficiales:
 * - Pagos instantáneos v3: POST/GET /v3/payments.
 * - Pagos automáticos v1: /v1/automatic-payment/subscription y /charge-intent.
 *
 * Ningún POST se reintenta automáticamente: un resultado incierto obliga a
 * conciliar por transaction_id antes de crear otro cobro.
 */
final class KhipuClient
{
    private const BASE_URL = 'https://payment-api.khipu.com';

    public function __construct(
        private readonly Config $config,
        private readonly ?\Closure $transport = null
    ) {
    }

    /** @param array<string, mixed> $payload @return array<string, mixed> */
    public function createPayment(array $payload): array
    {
        $response = $this->request('POST', '/v3/payments', $payload);
        foreach (['payment_id', 'payment_url'] as $field) {
            if (!is_string($response[$field] ?? null) || $response[$field] === '') {
                throw new KhipuApiException(200, true, true);
            }
        }
        $this->assertKhipuUrl((string) $response['payment_url']);
        return $response;
    }

    /** @return array<string, mixed> */
    public function getPayment(string $paymentId): array
    {
        return $this->request('GET', '/v3/payments/' . self::safePaymentId($paymentId));
    }

    /** @param array<string, mixed> $payload @return array<string, mixed> */
    public function createSubscription(array $payload): array
    {
        $response = $this->request('POST', '/v1/automatic-payment/subscription', $payload);
        if (!is_string($response['subscription_id'] ?? null) || !is_string($response['redirect_url'] ?? null)) {
            throw new KhipuApiException(200, true, true);
        }
        self::safeSubscriptionId((string) $response['subscription_id']);
        $this->assertKhipuUrl((string) $response['redirect_url']);
        return $response;
    }

    /** @return array<string, mixed> */
    public function getSubscription(string $subscriptionId): array
    {
        return $this->request('GET', '/v1/automatic-payment/subscription/' . self::safeSubscriptionId($subscriptionId));
    }

    /** Baja irreversible del mandato. No extingue la obligación contractual. @return array<string, mixed> */
    public function cancelSubscription(string $subscriptionId): array
    {
        return $this->request('DELETE', '/v1/automatic-payment/subscription/' . self::safeSubscriptionId($subscriptionId));
    }

    /** @param array<string, mixed> $payload @return array<string, mixed> */
    public function createChargeIntent(array $payload): array
    {
        $response = $this->request('POST', '/v1/automatic-payment/charge-intent', $payload);
        self::safePaymentId((string) ($response['payment_id'] ?? ''));
        return $response;
    }

    /** @param array<string, mixed>|null $payload @return array<string, mixed> */
    private function request(string $method, string $path, ?array $payload = null): array
    {
        $this->config->assertKhipuCredentialEnvironment();
        if ($this->transport === null && !function_exists('curl_init')) {
            throw new RuntimeException('La extensión PHP cURL es obligatoria.');
        }
        $result = $this->transport !== null
            ? ($this->transport)($method, $path, $payload)
            : $this->send($method, $path, $payload);
        $body = $result['body'];
        $status = $body === false || (int) $result['transport_code'] !== 0 ? 0 : (int) $result['http_status'];
        $mutating = $method !== 'GET';
        if ($status === 0) {
            throw new KhipuApiException(0, true, $mutating);
        }
        $decoded = null;
        if (is_string($body) && $body !== '') {
            try { $decoded = json_decode($body, true, 64, JSON_THROW_ON_ERROR); } catch (\JsonException) { $decoded = null; }
        }
        if ($status === 422) {
            $code = is_array($decoded) ? ($decoded['error_code'] ?? null) : null;
            throw new KhipuApiException(422, false, false, in_array($code, KhipuApiException::CHARGE_ERROR_CODES, true) ? $code : 'UNKNOWN');
        }
        if ($status < 200 || $status >= 300) {
            $transient = in_array($status, [408, 409, 429], true) || $status >= 500;
            throw new KhipuApiException($status, $transient, $mutating && $transient);
        }
        if (!is_array($decoded)) {
            // Un 2xx ilegible tras un POST pudo crear el recurso: conciliar antes de reintentar.
            throw new KhipuApiException($status, true, $mutating);
        }
        return $decoded;
    }

    /** @param array<string, mixed>|null $payload @return array{body:string|false,transport_code:int,http_status:int} */
    private function send(string $method, string $path, ?array $payload): array
    {
        $curl = curl_init(self::BASE_URL . $path);
        if ($curl === false) throw new RuntimeException('No se pudo inicializar cURL.');
        $options = [
            CURLOPT_RETURNTRANSFER => true, CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => [
                'Accept: application/json',
                'Content-Type: application/json',
                'x-api-key: ' . $this->config->khipuApiKey(),
                'User-Agent: DemoGym-Checkout/2.0',
            ],
            // POST + GET de confirmación deben terminar antes de los 20 s que espera el formulario.
            CURLOPT_CONNECTTIMEOUT_MS => 4000, CURLOPT_TIMEOUT_MS => 8000,
            CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_FOLLOWLOCATION => false, CURLOPT_MAXREDIRS => 0, CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
        ];
        if ($payload !== null) $options[CURLOPT_POSTFIELDS] = json_encode($payload, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        curl_setopt_array($curl, $options);
        $body = curl_exec($curl); $curlError = curl_errno($curl);
        $httpStatus = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE); curl_close($curl);
        return ['body' => $body, 'transport_code' => $curlError, 'http_status' => $httpStatus];
    }

    /** Solo se redirige al pagador a dominios de Khipu por HTTPS. */
    private function assertKhipuUrl(string $url): void
    {
        $host = strtolower((string) parse_url($url, PHP_URL_HOST));
        if (strtolower((string) parse_url($url, PHP_URL_SCHEME)) !== 'https'
            || ($host !== 'khipu.com' && !str_ends_with($host, '.khipu.com'))) {
            throw new KhipuApiException(200, false, true);
        }
    }

    public static function safePaymentId(string $id): string
    {
        if (preg_match('/^[a-z0-9]{12}$/D', $id) !== 1) {
            throw new RuntimeException('Identificador de pago Khipu inválido.');
        }
        return $id;
    }

    public static function safeSubscriptionId(string $id): string
    {
        if (preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/D', strtolower($id)) !== 1) {
            throw new RuntimeException('Identificador de suscripción Khipu inválido.');
        }
        return strtolower($id);
    }
}
