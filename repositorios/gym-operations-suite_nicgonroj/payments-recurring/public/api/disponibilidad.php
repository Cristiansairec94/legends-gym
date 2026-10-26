<?php

declare(strict_types=1);

use DemoGym\App;
use DemoGym\Application\CheckoutPreflight;
use DemoGym\Application\EnrollmentRequestValidator;
use DemoGym\Domain\PriceCatalog;
use DemoGym\Http\HttpException;
use DemoGym\Http\JsonResponse;
use DemoGym\Http\Request;

try {
    /** @var App $app */
    $app = require dirname(__DIR__) . '/loader.php';
    Request::assertMethod('GET');
    Request::assertSameOrigin($app->config->allowedOrigin());

    $publicContractIsDeployable = EnrollmentRequestValidator::publicContractIsDeployable(
        $app->config->pricingVersion(),
        $app->config->consentTextVersion(),
        $app->config->appEnvironment()
    );
    $preflight = $app->checkoutPreflight->inspect();
    $preflightPublicStatus = CheckoutPreflight::publicStatus($preflight, $app->config->appEnvironment());
    $catalog = new PriceCatalog();
    $allowed = $app->config->allowedPaymentOptions();
    $canonical = $catalog->paymentOptions();
    $paymentOptions = [];
    $allCanonicalOffersEnabled = true;
    foreach ($canonical as $mode => $definition) {
        $durations = $allowed[$mode] ?? [];
        $paymentOptions[$mode] = [
            'checkout_type' => $definition['checkout_type'],
            'durations' => $durations,
        ];
        if ($durations !== $definition['durations']) {
            $allCanonicalOffersEnabled = false;
        }
    }

    $checkoutEnabled = $app->config->checkoutEnabled()
        && $publicContractIsDeployable
        && $preflight['ready']
        && $allCanonicalOffersEnabled;
    // Campo aditivo: un formulario anterior lo ignora y sigue ofreciendo solo Mercado Pago.
    $khipuModes = $checkoutEnabled && $app->khipuEnrollment->available()
        ? array_values(array_filter(
            $app->config->khipuTransferModes(),
            static fn (string $mode): bool => ($paymentOptions[$mode]['durations'] ?? []) !== []
        ))
        : [];

    JsonResponse::send([
        'schema_version' => PriceCatalog::AVAILABILITY_SCHEMA_VERSION,
        'checkout_enabled' => $checkoutEnabled,
        'pricing_version' => PriceCatalog::VERSION,
        'consent_text_version' => EnrollmentRequestValidator::PUBLIC_CONSENT_TEXT_VERSION,
        'payment_options' => $paymentOptions,
        'offers' => $catalog->publicOffers($allowed),
        'payment_providers' => [
            'mercadopago' => ['enabled' => $checkoutEnabled, 'payment_modes' => array_keys($paymentOptions)],
            'khipu' => ['enabled' => $khipuModes !== [], 'payment_modes' => $khipuModes],
        ],
        'preflight' => [
            'ready' => $preflight['ready'],
            'status' => $preflightPublicStatus,
        ],
    ]);
} catch (HttpException $exception) {
    JsonResponse::error($exception);
} catch (Throwable $exception) {
    error_log('DGYM disponibilidad unhandled ' . get_class($exception));
    if (class_exists(JsonResponse::class)) {
        JsonResponse::error(new HttpException(503, 'service_not_configured', 'El servicio de inscripción no está disponible.'));
    }
    dgym_public_json_failure();
}
