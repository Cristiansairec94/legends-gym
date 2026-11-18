<?php

declare(strict_types=1);

namespace DemoGym;

use DemoGym\Application\CreateEnrollmentService;
use DemoGym\Application\CheckoutPreflight;
use DemoGym\Application\CheckoutRequestFactory;
use DemoGym\Application\EnrollmentRequestValidator;
use DemoGym\Application\PaymentRetryService;
use DemoGym\Application\StatusPresenter;
use DemoGym\Application\WebhookProcessor;
use DemoGym\Domain\PriceCatalog;
use DemoGym\Infrastructure\Database;
use DemoGym\Infrastructure\EnrollmentRepository;
use DemoGym\Infrastructure\MercadoPagoClient;
use DemoGym\Infrastructure\RateLimiter;
use DemoGym\Infrastructure\ReconciliationReadContext;
use DemoGym\Infrastructure\WebhookEventRepository;
use DemoGym\Khipu\KhipuClient;
use DemoGym\Khipu\KhipuEnrollmentService;
use DemoGym\Khipu\KhipuPaymentProcessor;
use DemoGym\Khipu\KhipuRepository;
use DemoGym\Khipu\KhipuRequestFactory;
use PDO;

final class App
{
    public readonly Config $config;
    public readonly PDO $pdo;
    public readonly EnrollmentRepository $enrollments;
    public readonly WebhookEventRepository $webhookEvents;
    public readonly RateLimiter $rateLimiter;
    public readonly CheckoutPreflight $checkoutPreflight;
    public readonly CreateEnrollmentService $createEnrollment;
    public readonly PaymentRetryService $paymentRetry;
    public readonly WebhookProcessor $webhookProcessor;
    public readonly StatusPresenter $statusPresenter;
    public readonly KhipuPaymentProcessor $khipuPayments;
    public readonly KhipuEnrollmentService $khipuEnrollment;

    public function __construct()
    {
        $this->config = new Config();
        $this->pdo = Database::connect($this->config);
        $this->enrollments = new EnrollmentRepository($this->pdo);
        $this->webhookEvents = new WebhookEventRepository($this->pdo);
        $this->rateLimiter = new RateLimiter($this->pdo);
        $this->checkoutPreflight = new CheckoutPreflight($this->config, $this->pdo);
        $catalog = new PriceCatalog();
        $client = new MercadoPagoClient($this->config);
        $validator = new EnrollmentRequestValidator($this->config, $catalog);
        $requestFactory = new CheckoutRequestFactory($this->config);
        // Khipu no lee configuración al construirse: sin credenciales queda inerte.
        $khipuStore = new KhipuRepository($this->pdo);
        $khipuClient = new KhipuClient($this->config);
        $this->khipuPayments = new KhipuPaymentProcessor($this->config, $khipuStore, $khipuClient);
        $this->khipuEnrollment = new KhipuEnrollmentService(
            $this->config,
            $catalog,
            $khipuStore,
            $khipuClient,
            new KhipuRequestFactory($this->config),
            $this->khipuPayments
        );
        $this->createEnrollment = new CreateEnrollmentService(
            $this->config,
            $catalog,
            $validator,
            $this->enrollments,
            $client,
            $requestFactory,
            $this->checkoutPreflight,
            $this->khipuEnrollment
        );
        $this->paymentRetry = new PaymentRetryService(
            $this->config,
            $this->enrollments,
            new MercadoPagoClient($this->config, new ReconciliationReadContext(40)),
            $requestFactory,
            $this->checkoutPreflight,
            $this->webhookEvents
        );
        $this->webhookProcessor = new WebhookProcessor($this->config, $this->enrollments, $this->webhookEvents, $client);
        $this->statusPresenter = new StatusPresenter();
    }
}
