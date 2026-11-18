<?php

declare(strict_types=1);

namespace DemoGym;

use DemoGym\Domain\PriceCatalog;
use RuntimeException;

final class Config
{
    public function appEnvironment(): string
    {
        $environment = strtolower($this->optional('APP_ENV', 'production'));
        if (!in_array($environment, ['development', 'production'], true)) {
            throw new RuntimeException('APP_ENV solo admite development o production.');
        }
        return $environment;
    }

    public function isProduction(): bool
    {
        return $this->appEnvironment() === 'production';
    }

    public function useSandboxCheckoutUrl(): bool
    {
        return !$this->isProduction();
    }

    public function publicBaseUrl(): string
    {
        $url = rtrim($this->required('DGYM_PUBLIC_BASE_URL'), '/');
        $this->assertPublicUrl($url);
        return $url;
    }

    public function returnUrl(string $reference = '', string $result = ''): string
    {
        $url = $this->publicBaseUrl() . '/retorno.php';
        if ($reference === '') {
            return $url;
        }
        if ($result !== '' && !in_array($result, ['approved', 'pending', 'failure'], true)) {
            throw new RuntimeException('Resultado de retorno inválido.');
        }
        $url .= '?ref=' . rawurlencode($reference);
        return $result === '' ? $url : $url . '&result=' . rawurlencode($result);
    }

    public function webhookUrl(): string
    {
        return $this->publicBaseUrl() . '/webhooks/mercadopago.php';
    }

    public function enrollmentUrl(): string
    {
        $url = $this->optional('DGYM_ENROLLMENT_URL', '/');
        if (preg_match('#^https?://#i', $url)) {
            $this->assertPublicUrl($url);
        } elseif (!str_starts_with($url, '/')) {
            throw new RuntimeException('DGYM_ENROLLMENT_URL debe ser una URL HTTPS o una ruta absoluta.');
        }
        return $url;
    }

    public function allowedOrigin(): string
    {
        $configured = $this->optional('DGYM_ALLOWED_ORIGIN', '');
        if ($configured !== '') {
            return rtrim($configured, '/');
        }

        $parts = parse_url($this->publicBaseUrl());
        if (!is_array($parts) || !isset($parts['scheme'], $parts['host'])) {
            throw new RuntimeException('DGYM_PUBLIC_BASE_URL no permite derivar el origen.');
        }
        $port = isset($parts['port']) ? ':' . $parts['port'] : '';
        return strtolower($parts['scheme'] . '://' . $parts['host'] . $port);
    }

    public function databaseDsn(): string
    {
        $dsn = $this->required('DGYM_DB_DSN');
        if (!str_starts_with(strtolower($dsn), 'mysql:')) {
            throw new RuntimeException('DGYM_DB_DSN debe usar PDO MySQL.');
        }
        return $dsn;
    }

    public function databaseUser(): string
    {
        return $this->required('DGYM_DB_USER');
    }

    public function databasePassword(): string
    {
        return $this->required('DGYM_DB_PASSWORD');
    }

    public function mercadoPagoAccessToken(): string
    {
        return $this->required('MP_API_TOKEN');
    }

    public function mercadoPagoWebhookSecret(): string
    {
        return $this->required('MP_WEBHOOK_SECRET');
    }

    public function mercadoPagoCredentialEnvironment(): string
    {
        $environment = $this->required('MP_CREDENTIAL_ENVIRONMENT');
        if (!in_array($environment, ['test', 'production'], true)) {
            throw new RuntimeException('MP_CREDENTIAL_ENVIRONMENT solo admite test o production.');
        }
        return $environment;
    }

    public function mercadoPagoApplicationId(): string
    {
        $applicationId = $this->required('MP_APPLICATION_ID');
        if (preg_match('/^[1-9][0-9]{0,19}$/D', $applicationId) !== 1) {
            throw new RuntimeException('MP_APPLICATION_ID debe ser un identificador numérico canónico.');
        }
        return $applicationId;
    }

    public function mercadoPagoSellerId(): string
    {
        $sellerId = $this->required('MP_SELLER_ID');
        if (preg_match('/^[1-9][0-9]{0,19}$/D', $sellerId) !== 1) {
            throw new RuntimeException('MP_SELLER_ID debe ser un identificador numérico válido.');
        }
        return $sellerId;
    }

    public function mercadoPagoApiBaseUrl(): string
    {
        $url = rtrim($this->optional('MP_API_BASE_URL', 'https://api.mercadopago.com'), '/');
        if (
            !filter_var($url, FILTER_VALIDATE_URL)
            || strtolower((string) parse_url($url, PHP_URL_SCHEME)) !== 'https'
            || strtolower((string) parse_url($url, PHP_URL_HOST)) !== 'api.mercadopago.com'
            || parse_url($url, PHP_URL_USER) !== null
            || parse_url($url, PHP_URL_PASS) !== null
            || parse_url($url, PHP_URL_PORT) !== null
            || $url !== 'https://api.mercadopago.com'
        ) {
            throw new RuntimeException('MP_API_BASE_URL inválida.');
        }
        return $url;
    }

    /** @return list<int> */
    public function allowedDurations(): array
    {
        return $this->allowedDurationsForMode('automatic');
    }

    /** @return list<int> */
    public function allowedDurationsForMode(string $paymentMode): array
    {
        $supported = match ($paymentMode) {
            'automatic' => [3, 6, 12],
            'single' => [1],
            'prepaid' => [3, 6, 12],
            default => throw new RuntimeException('Modalidad de pago desconocida.'),
        };
        $variable = match ($paymentMode) {
            'automatic' => 'DGYM_ALLOWED_AUTOMATIC_DURATIONS',
            'single' => 'DGYM_ALLOWED_SINGLE_DURATIONS',
            'prepaid' => 'DGYM_ALLOWED_PREPAID_DURATIONS',
        };
        $default = implode(',', $supported);
        $raw = getenv($variable);
        if (!is_string($raw) || trim($raw) === '') {
            if ($paymentMode === 'automatic') {
                $legacy = getenv('DGYM_ALLOWED_DURATIONS');
                $raw = is_string($legacy) && trim($legacy) !== '' ? $legacy : $default;
            } else {
                $raw = $default;
            }
        }
        $durations = [];
        foreach (explode(',', $raw) as $value) {
            $normalized = trim($value);
            if ($normalized === '' || !ctype_digit($normalized)) {
                throw new RuntimeException($variable . ' debe contener duraciones separadas por coma.');
            }
            $duration = (int) $normalized;
            if (!in_array($duration, $supported, true)) {
                throw new RuntimeException($variable . ' contiene una duración no soportada.');
            }
            $durations[] = $duration;
        }
        $durations = array_values(array_unique($durations));
        sort($durations);
        return $durations;
    }

    /** @return array{automatic:list<int>,single:list<int>,prepaid:list<int>} */
    public function allowedPaymentOptions(): array
    {
        return [
            'automatic' => $this->allowedDurationsForMode('automatic'),
            'single' => $this->allowedDurationsForMode('single'),
            'prepaid' => $this->allowedDurationsForMode('prepaid'),
        ];
    }

    public function pricingVersion(): string
    {
        return $this->optional('DGYM_PRICING_VERSION', PriceCatalog::VERSION);
    }

    public function checkoutEnabled(): bool
    {
        return strtolower($this->optional('DGYM_CHECKOUT_ENABLED', 'false')) === 'true';
    }

    public function consentTextVersion(): string
    {
        return $this->required('DGYM_CONSENT_TEXT_VERSION');
    }

    public function rateLimitSecret(): string
    {
        return $this->required('DGYM_RATE_LIMIT_SECRET');
    }

    /** @deprecated Conservado solo para compatibilidad con herramientas y versiones anteriores. */
    public function identityHmacSecret(): string
    {
        $configuredFile = getenv('DGYM_IDENTITY_HMAC_SECRET_FILE');
        if ($configuredFile !== false) {
            return $this->identityHmacSecretFromFile(trim($configuredFile));
        }

        $secret = $this->required('DGYM_IDENTITY_HMAC_SECRET');
        if (strlen($secret) < 32) {
            throw new RuntimeException('DGYM_IDENTITY_HMAC_SECRET debe tener al menos 32 caracteres.');
        }
        return $secret;
    }

    public function rateLimitMax(): int
    {
        return $this->positiveInt('DGYM_RATE_LIMIT_MAX', 10);
    }

    public function rateLimitWindowSeconds(): int
    {
        return $this->positiveInt('DGYM_RATE_LIMIT_WINDOW_SECONDS', 900);
    }

    /** Cuatro ciclos completos de tres fases por inscripción e IP. */
    public function paymentRetryRateLimitMax(): int
    {
        return $this->positiveInt('DGYM_PAYMENT_RETRY_RATE_LIMIT_MAX', 12);
    }

    /** Veinte ciclos completos por IP, sin compartir el bucket del alta. */
    public function paymentRetryGlobalRateLimitMax(): int
    {
        return $this->positiveInt('DGYM_PAYMENT_RETRY_GLOBAL_RATE_LIMIT_MAX', 60);
    }

    public function paymentRetryRateLimitWindowSeconds(): int
    {
        return $this->positiveInt('DGYM_PAYMENT_RETRY_RATE_LIMIT_WINDOW_SECONDS', 900);
    }

    /**
     * Valida únicamente presencia y formato local. No devuelve, registra ni
     * transmite credenciales y no realiza solicitudes a Mercado Pago.
     */
    /**
     * Khipu (transferencia simplificada y PAC) queda apagado por defecto. Ningún
     * endpoint público lo expone mientras este gate no sea exactamente "true".
     */
    public function khipuEnabled(): bool
    {
        return strtolower($this->optional('DGYM_KHIPU_ENABLED', 'false')) === 'true';
    }

    public function khipuApiKey(): string
    {
        return $this->required('KHIPU_API_KEY');
    }

    /** Secreto de la cuenta de cobro: firma x-khipu-signature de la API de notificaciones 3.0. */
    public function khipuMerchantSecret(): string
    {
        $secret = $this->required('KHIPU_MERCHANT_SECRET');
        if (strlen($secret) < 20) {
            throw new RuntimeException('KHIPU_MERCHANT_SECRET es demasiado corto.');
        }
        return $secret;
    }

    public function khipuReceiverId(): int
    {
        $receiverId = $this->required('KHIPU_RECEIVER_ID');
        if (preg_match('/^[1-9][0-9]{0,18}$/D', $receiverId) !== 1) {
            throw new RuntimeException('KHIPU_RECEIVER_ID debe ser un identificador numérico.');
        }
        return (int) $receiverId;
    }

    /**
     * Khipu separa cuentas de cobro de desarrollo y de producción con la misma URL de API.
     * La procedencia se declara igual que en Mercado Pago y debe coincidir con APP_ENV.
     */
    public function khipuCredentialEnvironment(): string
    {
        $environment = $this->required('KHIPU_CREDENTIAL_ENVIRONMENT');
        if (!in_array($environment, ['development', 'production'], true)) {
            throw new RuntimeException('KHIPU_CREDENTIAL_ENVIRONMENT solo admite development o production.');
        }
        return $environment;
    }

    public function assertKhipuCredentialEnvironment(): void
    {
        if ($this->khipuCredentialEnvironment() !== $this->appEnvironment()) {
            throw new RuntimeException('La cuenta Khipu no corresponde a APP_ENV.');
        }
    }

    public function khipuPaymentWebhookUrl(): string
    {
        return $this->publicBaseUrl() . '/webhooks/khipu.php';
    }

    public function khipuMandateWebhookUrl(): string
    {
        return $this->publicBaseUrl() . '/webhooks/khipu-mandato.php';
    }

    public function khipuChargeErrorUrl(): string
    {
        return $this->publicBaseUrl() . '/webhooks/khipu-cobro-error.php';
    }

    /**
     * Modalidades que Khipu cobra por transferencia en un solo pago. El cargo
     * automático (PAC) exige convenio y programador de cuotas: no se ofrece aquí.
     *
     * @return list<string>
     */
    public function khipuTransferModes(): array
    {
        return ['single', 'prepaid'];
    }

    /** Horas de vigencia del enlace de transferencia; vencido, el socio inicia otra inscripción. */
    public function khipuPaymentExpiryHours(): int
    {
        $hours = $this->positiveInt('DGYM_KHIPU_PAYMENT_EXPIRY_HOURS', 24);
        if ($hours > 168) {
            throw new RuntimeException('DGYM_KHIPU_PAYMENT_EXPIRY_HOURS no puede superar 168.');
        }
        return $hours;
    }

    /** Presencia y formato local de la cuenta Khipu. No transmite ni registra credenciales. */
    public function assertKhipuLocalConfiguration(): void
    {
        $this->khipuApiKey();
        $this->khipuMerchantSecret();
        $this->khipuReceiverId();
        $this->assertKhipuCredentialEnvironment();
        $this->khipuPaymentWebhookUrl();
        $this->khipuPaymentExpiryHours();
        $this->returnUrl('preflight', 'pending');
    }

    public function assertCheckoutLocalConfiguration(): void
    {
        foreach (['MP_API_TOKEN', 'MP_WEBHOOK_SECRET', 'DGYM_RATE_LIMIT_SECRET'] as $name) {
            $this->required($name);
        }
        $this->mercadoPagoApiBaseUrl();
        $this->assertMercadoPagoCredentialEnvironment();
        $this->mercadoPagoApplicationId();
        $this->mercadoPagoSellerId();
        $this->publicBaseUrl();
        $this->returnUrl('preflight');
        $this->returnUrl('preflight', 'approved');
        $this->webhookUrl();
        $this->allowedOrigin();
        $this->enrollmentUrl();
        $this->allowedPaymentOptions();
    }

    /**
     * Barrera de entorno usada también por cada GET/POST del cliente. El token
     * se trata como un valor opaco: su entorno se declara explícitamente y
     * debe coincidir con APP_ENV antes de cualquier llamada remota.
     */
    public function assertMercadoPagoCredentialEnvironment(): void
    {
        $this->mercadoPagoAccessToken();
        $this->mercadoPagoApplicationId();
        $credentialEnvironment = $this->mercadoPagoCredentialEnvironment();
        $expectedEnvironment = $this->isProduction() ? 'production' : 'test';
        if (!hash_equals($expectedEnvironment, $credentialEnvironment)) {
            throw new RuntimeException('MP_CREDENTIAL_ENVIRONMENT no coincide con APP_ENV.');
        }
    }

    private function assertPublicUrl(string $url): void
    {
        if (!filter_var($url, FILTER_VALIDATE_URL)) {
            throw new RuntimeException('La URL pública configurada es inválida.');
        }
        $scheme = strtolower((string) parse_url($url, PHP_URL_SCHEME));
        $host = strtolower((string) parse_url($url, PHP_URL_HOST));
        if ($this->isProduction() && ($scheme !== 'https' || in_array($host, ['localhost', '127.0.0.1'], true))) {
            throw new RuntimeException('Las URLs públicas deben usar HTTPS y dominio real en producción.');
        }
    }

    private function required(string $name): string
    {
        $value = getenv($name);
        if (!is_string($value) || trim($value) === '') {
            throw new RuntimeException('Falta la variable requerida ' . $name . '.');
        }
        return trim($value);
    }

    private function optional(string $name, string $default): string
    {
        $value = getenv($name);
        return is_string($value) && trim($value) !== '' ? trim($value) : $default;
    }

    private function identityHmacSecretFromFile(string $configuredPath): string
    {
        if ($configuredPath === '' || !str_starts_with($configuredPath, DIRECTORY_SEPARATOR)) {
            throw new RuntimeException('DGYM_IDENTITY_HMAC_SECRET_FILE debe ser una ruta absoluta.');
        }
        clearstatcache(true, $configuredPath);
        if (is_link($configuredPath)) {
            throw new RuntimeException('DGYM_IDENTITY_HMAC_SECRET_FILE no puede ser un enlace simbólico.');
        }

        $realPath = realpath($configuredPath);
        if ($realPath === false || !is_file($realPath) || is_link($realPath)) {
            throw new RuntimeException('DGYM_IDENTITY_HMAC_SECRET_FILE debe ser un archivo regular.');
        }
        $this->assertIdentitySecretOutsidePublicPaths($realPath);

        clearstatcache(true, $realPath);
        if (!is_readable($realPath)) {
            throw new RuntimeException('DGYM_IDENTITY_HMAC_SECRET_FILE no es legible.');
        }
        $pathStat = @lstat($realPath);
        if (!is_array($pathStat) || (($pathStat['mode'] ?? 0) & 0170000) !== 0100000) {
            throw new RuntimeException('DGYM_IDENTITY_HMAC_SECRET_FILE debe ser un archivo regular.');
        }
        if ((($pathStat['mode'] ?? 0) & 07177) !== 0) {
            throw new RuntimeException('DGYM_IDENTITY_HMAC_SECRET_FILE debe tener permisos 0600 o más restrictivos.');
        }

        $handle = @fopen($realPath, 'rb');
        if ($handle === false) {
            throw new RuntimeException('DGYM_IDENTITY_HMAC_SECRET_FILE no es legible.');
        }
        try {
            $openedStat = fstat($handle);
            if (
                !is_array($openedStat)
                || (($openedStat['mode'] ?? 0) & 0170000) !== 0100000
                || (($openedStat['mode'] ?? 0) & 07177) !== 0
                || ($openedStat['dev'] ?? null) !== ($pathStat['dev'] ?? null)
                || ($openedStat['ino'] ?? null) !== ($pathStat['ino'] ?? null)
            ) {
                throw new RuntimeException('DGYM_IDENTITY_HMAC_SECRET_FILE cambió durante la validación.');
            }
            $encodedSecret = stream_get_contents($handle, 65);
        } finally {
            fclose($handle);
        }

        if (!is_string($encodedSecret) || preg_match('/\A[0-9a-fA-F]{64}\z/D', $encodedSecret) !== 1) {
            throw new RuntimeException('DGYM_IDENTITY_HMAC_SECRET_FILE debe contener exactamente 64 caracteres hexadecimales.');
        }
        $secret = hex2bin($encodedSecret);
        if ($secret === false || strlen($secret) !== 32) {
            throw new RuntimeException('DGYM_IDENTITY_HMAC_SECRET_FILE no representa un secreto de 32 bytes.');
        }
        return $secret;
    }

    private function assertIdentitySecretOutsidePublicPaths(string $realPath): void
    {
        $publicPaths = [];
        $applicationPublicPath = realpath(dirname(__DIR__) . '/public');
        if ($applicationPublicPath !== false) {
            $publicPaths[] = $applicationPublicPath;
        }

        foreach (['DOCUMENT_ROOT', 'CONTEXT_DOCUMENT_ROOT'] as $name) {
            $configuredRoots = [];
            if (isset($_SERVER[$name]) && is_string($_SERVER[$name]) && trim($_SERVER[$name]) !== '') {
                $configuredRoots[] = trim($_SERVER[$name]);
            }
            $environmentRoot = getenv($name);
            if (is_string($environmentRoot) && trim($environmentRoot) !== '') {
                $configuredRoots[] = trim($environmentRoot);
            }
            foreach (array_unique($configuredRoots) as $configuredRoot) {
                $documentRoot = realpath($configuredRoot);
                if ($documentRoot === false || !is_dir($documentRoot)) {
                    throw new RuntimeException('No se pudo validar un DocumentRoot para DGYM_IDENTITY_HMAC_SECRET_FILE.');
                }
                $publicPaths[] = $documentRoot;
            }
        }

        foreach (array_unique($publicPaths) as $publicPath) {
            if ($realPath === $publicPath || str_starts_with($realPath, $publicPath . DIRECTORY_SEPARATOR)) {
                throw new RuntimeException('DGYM_IDENTITY_HMAC_SECRET_FILE debe vivir fuera de DocumentRoot y public/.');
            }
        }
    }

    private function positiveInt(string $name, int $default): int
    {
        $raw = $this->optional($name, (string) $default);
        if (!ctype_digit($raw) || (int) $raw < 1) {
            throw new RuntimeException($name . ' debe ser un entero positivo.');
        }
        return (int) $raw;
    }
}
