<?php

declare(strict_types=1);

namespace DemoGym\Application;

use DemoGym\Config;
use DemoGym\Domain\PriceCatalog;
use DemoGym\Http\HttpException;

final class EnrollmentRequestValidator
{
    /**
     * Versión compilada en el formulario público. Cambiarla exige publicar el
     * mismo identificador en frontend y configurar DGYM_CONSENT_TEXT_VERSION.
     */
    public const PUBLIC_CONSENT_TEXT_VERSION = '2026-09-21-v1';

    public function __construct(private readonly Config $config, private readonly PriceCatalog $catalog)
    {
    }

    /** @param array<string, mixed> $payload @return array<string, mixed> */
    public function validate(array $payload): array
    {
        if (($payload['schema_version'] ?? null) !== PriceCatalog::ENROLLMENT_SCHEMA_VERSION) {
            throw new HttpException(422, 'invalid_request', 'La versión del formulario no está habilitada.');
        }
        $person = $this->object($payload, 'person');
        $selection = $this->object($payload, 'selection');
        $consents = $this->object($payload, 'consents');

        $planCode = strtolower($this->string($selection, 'plan_id', 1, 30));
        if (!in_array($planCode, $this->catalog->planCodes(), true)) {
            throw new HttpException(422, 'invalid_request', 'El plan seleccionado no es válido.');
        }

        $paymentMode = strtolower($this->string($selection, 'payment_mode', 1, 30));
        if (!in_array($paymentMode, $this->catalog->paymentModes(), true)) {
            throw new HttpException(422, 'invalid_payment_mode', 'La modalidad de pago seleccionada no es válida.');
        }
        $duration = $this->integer($selection, 'duration_months');
        if (
            !$this->catalog->supports($planCode, $paymentMode, $duration)
            || !in_array($duration, $this->config->allowedDurationsForMode($paymentMode), true)
        ) {
            throw new HttpException(422, 'payment_combination_not_enabled', 'La combinación de modalidad y duración no está habilitada.');
        }

        // Campo opcional: los formularios anteriores no lo envían y siguen en Mercado Pago.
        $paymentProvider = 'mercadopago';
        if (array_key_exists('payment_provider', $selection)) {
            $paymentProvider = strtolower($this->string($selection, 'payment_provider', 1, 24));
            if (!in_array($paymentProvider, ['mercadopago', 'khipu'], true)) {
                throw new HttpException(422, 'invalid_payment_provider', 'El medio de pago seleccionado no es válido.');
            }
            if ($paymentProvider === 'khipu'
                && (!$this->config->khipuEnabled() || !in_array($paymentMode, $this->config->khipuTransferModes(), true))
            ) {
                throw new HttpException(422, 'payment_provider_not_enabled', 'La transferencia no está disponible para esta forma de pago.');
            }
        }

        if (!self::publicContractIsDeployable(
            $this->config->pricingVersion(),
            $this->config->consentTextVersion(),
            $this->config->appEnvironment()
        )) {
            throw new HttpException(503, 'service_not_configured', 'La configuración pública del formulario requiere revisión.');
        }
        $pricingVersion = $this->string($payload, 'pricing_version', 1, 40);
        if ($pricingVersion !== PriceCatalog::VERSION) {
            throw new HttpException(422, 'pricing_version_not_enabled', 'La oferta cambió; actualiza la página antes de continuar.');
        }

        $fullName = preg_replace('/\s+/u', ' ', trim($this->string($person, 'full_name', 3, 120)));
        if (!is_string($fullName) || preg_match('/[\x00-\x1F\x7F]/u', $fullName)) {
            throw new HttpException(422, 'invalid_request', 'Ingresa un nombre válido.');
        }
        $email = strtolower($this->string($person, 'email', 3, 254));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new HttpException(422, 'invalid_request', 'Ingresa un correo válido.');
        }
        $phone = $this->string($person, 'phone_e164', 8, 16);
        if (!preg_match('/^\+[1-9]\d{7,14}$/', $phone)) {
            throw new HttpException(422, 'invalid_request', 'Ingresa un teléfono válido con código de país.');
        }

        if (($consents['necessary_processing'] ?? null) !== true) {
            throw new HttpException(422, 'invalid_request', 'Debes aceptar el tratamiento necesario para inscribirte.');
        }
        $textVersion = $this->string($consents, 'text_version', 1, 80);
        if (
            !hash_equals(self::PUBLIC_CONSENT_TEXT_VERSION, $textVersion)
            || !hash_equals($this->config->consentTextVersion(), $textVersion)
        ) {
            throw new HttpException(422, 'consent_version_not_enabled', 'Los términos cambiaron; actualiza la página antes de continuar.');
        }
        $marketing = $consents['marketing'] ?? false;
        if (!is_bool($marketing)) {
            throw new HttpException(422, 'invalid_request', 'El consentimiento comercial no es válido.');
        }

        $validated = [
            'full_name' => $fullName,
            'email' => $email,
            'phone_e164' => $phone,
            'plan_code' => $planCode,
            'duration' => $duration,
            'payment_mode' => $paymentMode,
            'pricing_version' => $pricingVersion,
            'consent_text_version' => $textVersion,
            'marketing_consent' => $marketing,
            'attribution' => $this->attribution($payload['attribution'] ?? []),
        ];
        // Solo se agrega para Khipu: la huella de idempotencia de una solicitud
        // de Mercado Pago debe seguir siendo idéntica a la de versiones anteriores.
        if ($paymentProvider === 'khipu') {
            $validated['payment_provider'] = 'khipu';
        }
        return $validated;
    }

    public static function publicContractIsDeployable(
        string $configuredPricingVersion,
        string $configuredConsentVersion,
        string $appEnvironment
    ): bool
    {
        $appEnvironment = strtolower(trim($appEnvironment));
        if (!in_array($appEnvironment, ['development', 'production'], true)) {
            return false;
        }
        if (!hash_equals(PriceCatalog::VERSION, trim($configuredPricingVersion))) {
            return false;
        }
        if (!hash_equals(self::PUBLIC_CONSENT_TEXT_VERSION, trim($configuredConsentVersion))) {
            return false;
        }

        $version = strtolower(self::PUBLIC_CONSENT_TEXT_VERSION);
        $isProvisional = str_contains($version, 'draft') || str_contains($version, 'pending');
        return !$isProvisional || $appEnvironment === 'development';
    }

    /** @param mixed $value @return array<string, string|null> */
    private function attribution(mixed $value): array
    {
        if (!is_array($value) || array_is_list($value)) {
            return [];
        }
        $allowed = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid', 'referrer'];
        $result = [];
        foreach ($allowed as $key) {
            $item = $value[$key] ?? null;
            if ($item === null || $item === '') {
                $result[$key] = null;
                continue;
            }
            if (!is_string($item)) {
                throw new HttpException(422, 'invalid_request', 'Los datos de atribución no son válidos.');
            }
            $item = trim($item);
            if (strlen($item) > 500) {
                throw new HttpException(422, 'invalid_request', 'Los datos de atribución superan el tamaño permitido.');
            }
            $result[$key] = $item;
        }
        return $result;
    }

    /** @param array<string, mixed> $source @return array<string, mixed> */
    private function object(array $source, string $key): array
    {
        $value = $source[$key] ?? null;
        if (!is_array($value) || array_is_list($value)) {
            throw new HttpException(422, 'invalid_request', 'Falta la sección ' . $key . '.');
        }
        return $value;
    }

    /** @param array<string, mixed> $source */
    private function string(array $source, string $key, int $min, int $max): string
    {
        $value = $source[$key] ?? null;
        if (!is_string($value)) {
            throw new HttpException(422, 'invalid_request', 'Falta el campo ' . $key . '.');
        }
        $value = trim($value);
        $length = strlen($value);
        if ($length < $min || $length > $max) {
            throw new HttpException(422, 'invalid_request', 'El campo ' . $key . ' no es válido.');
        }
        return $value;
    }

    /** @param array<string, mixed> $source */
    private function integer(array $source, string $key): int
    {
        $value = $source[$key] ?? null;
        if (is_int($value)) {
            return $value;
        }
        if (is_string($value) && ctype_digit($value)) {
            return (int) $value;
        }
        throw new HttpException(422, 'invalid_request', 'El campo ' . $key . ' no es válido.');
    }
}
