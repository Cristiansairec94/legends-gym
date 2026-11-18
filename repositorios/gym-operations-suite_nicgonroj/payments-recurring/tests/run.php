<?php

declare(strict_types=1);

use DemoGym\Domain\Idempotency;
use DemoGym\Domain\IdentityFingerprint;
use DemoGym\Domain\EnrollmentReference;
use DemoGym\Domain\PendingSubscriptionRequest;
use DemoGym\Domain\CheckoutPreferenceRequest;
use DemoGym\Domain\PriceCatalog;
use DemoGym\Domain\PaymentTransition;
use DemoGym\Domain\CheckoutGateway;
use DemoGym\Domain\SubscriptionAmountGateway;
use DemoGym\Security\WebhookQuery;
use DemoGym\Security\WebhookDedupe;
use DemoGym\Security\WebhookSignature;
use DemoGym\Application\StatusPresenter;
use DemoGym\Application\CreateEnrollmentService;
use DemoGym\Application\CheckoutPreflight;
use DemoGym\Application\CheckoutRequestFactory;
use DemoGym\Application\CheckoutResponseValidator;
use DemoGym\Application\EnrollmentRequestValidator;
use DemoGym\Application\PaymentRetryService;
use DemoGym\Application\WebhookProcessor;
use DemoGym\Config;
use DemoGym\Environment;
use DemoGym\Http\HttpException;
use DemoGym\Infrastructure\WebhookEventRepository;
use DemoGym\Infrastructure\EnrollmentRepository;
use DemoGym\Infrastructure\MercadoPagoClient;
use DemoGym\Infrastructure\MercadoPagoApiException;
use DemoGym\Infrastructure\RateLimiter;

require_once dirname(__DIR__) . '/autoload.php';

$tests = [];
$test = static function (string $name, callable $callback) use (&$tests): void {
    $tests[] = [$name, $callback];
};
$assertSame = static function (mixed $expected, mixed $actual, string $message = ''): void {
    if ($expected !== $actual) {
        throw new RuntimeException($message !== '' ? $message : sprintf('Esperado %s; recibido %s', var_export($expected, true), var_export($actual, true)));
    }
};
$assertTrue = static function (bool $value, string $message = ''): void {
    if (!$value) {
        throw new RuntimeException($message !== '' ? $message : 'La condición debía ser verdadera.');
    }
};
$assertThrows = static function (callable $callback, string $class = Throwable::class): void {
    try {
        $callback();
    } catch (Throwable $exception) {
        if (!$exception instanceof $class) {
            throw new RuntimeException('Se esperaba ' . $class . '; se recibió ' . get_class($exception));
        }
        return;
    }
    throw new RuntimeException('Se esperaba una excepción ' . $class . '.');
};

$test('catálogo contiene las 14 ofertas canónicas exactas', static function () use ($assertSame, $assertTrue): void {
    $catalog = new PriceCatalog();
    $expected = [
        'inicio' => [
            'regular' => 19990,
            'single' => [1 => [34990, 34990]],
            'automatic' => [3 => [18990, 56970], 6 => [17990, 107940], 12 => [16990, 203880]],
            'prepaid' => [3 => [55170, 55170], 6 => [105540, 105540], 12 => [196680, 196680]],
        ],
        'pro' => [
            'regular' => 29990,
            'single' => [1 => [44990, 44990]],
            'automatic' => [3 => [28490, 85470], 6 => [26990, 161940], 12 => [25490, 305880]],
            'prepaid' => [3 => [82770, 82770], 6 => [158340, 158340], 12 => [295080, 295080]],
        ],
    ];
    $seen = [];
    foreach ($expected as $plan => $definition) {
        foreach (['single', 'automatic', 'prepaid'] as $mode) {
            foreach ($definition[$mode] as $months => [$amount, $totalOrCount]) {
                $offer = $catalog->offer($plan, $mode, $months);
                $assertSame($definition['regular'], $offer['regular_monthly']);
                $expectedCharge = $mode === 'automatic' ? $amount + 15000 : $totalOrCount + 15000;
                if ($mode === 'single') {
                    $expectedCharge = $amount;
                }
                $assertSame($expectedCharge, $offer['charge_amount']);
                $assertSame($mode === 'automatic' ? $months : 1, $offer['charge_count']);
                $expectedPlanAmount = $mode === 'single' ? $definition['regular'] : $totalOrCount;
                $assertSame($expectedPlanAmount + 15000, $offer['total']);
                $assertSame(15000, $offer['enrollment_fee_amount']);
                $assertSame($expectedPlanAmount, $offer['plan_amount']);
                $assertSame($offer['regular_total'] - $offer['plan_amount'], $offer['savings_amount']);
                if ($mode === 'single') {
                    $assertSame($amount, $offer['installment']);
                    $assertSame($definition['regular'], $offer['regular_total']);
                    $assertSame(0, $offer['savings_amount']);
                    $assertSame(0, $offer['discount_percent']);
                }
                $assertSame($offer['charge_amount'], $offer['today_amount']);
                $assertSame('CLP', $offer['currency']);
                $seen[] = $plan . ':' . $mode . ':' . $months;
            }
        }
    }
    $assertSame(14, count($seen));
    $assertSame(14, count(array_unique($seen)));
    $assertSame(14, count($catalog->publicOffers([
        'automatic' => [3, 6, 12],
        'single' => [1],
        'prepaid' => [3, 6, 12],
    ])));
    $assertTrue(!$catalog->supports('inicio', 'single', 3));
});

$test('disponibilidad expone matrícula única en las 14 ofertas', static function () use ($assertSame): void {
    $catalog = new PriceCatalog();
    $offers = $catalog->publicOffers(['automatic' => [3, 6, 12], 'single' => [1], 'prepaid' => [3, 6, 12]]);
    $offerCount = 0;
    foreach ($offers as $offer) {
        $expected = $catalog->offer($offer['plan_id'], $offer['payment_mode'], $offer['duration_months']);
        $assertSame($expected['plan_amount'], $offer['plan_amount']);
        $assertSame($expected['enrollment_fee_amount'], $offer['enrollment_fee_amount']);
        $assertSame($offer['total_amount'], $offer['plan_amount'] + $offer['enrollment_fee_amount']);
        ++$offerCount;
        $assertSame(15000, $offer['enrollment_fee_amount']);
        if ($offer['payment_mode'] === 'single') {
            $assertSame($offer['regular_monthly_amount'] + 15000, $offer['charge_amount']);
            $assertSame($offer['charge_amount'], $offer['installment_amount']);
            $assertSame(0, $offer['savings_amount']);
        } elseif ($offer['payment_mode'] === 'automatic') {
            $assertSame($offer['installment_amount'] + 15000, $offer['charge_amount']);
            $assertSame($offer['plan_amount'] + 15000, $offer['total_amount']);
        } else {
            $assertSame($offer['plan_amount'] + 15000, $offer['charge_amount']);
        }
    }
    $assertSame(14, $offerCount);
});

$test('matrícula usa versión nueva y rechaza formularios con precio anterior', static function () use ($assertSame, $assertTrue): void {
    $environment = [];
    foreach (['APP_ENV', 'DGYM_PRICING_VERSION', 'DGYM_CONSENT_TEXT_VERSION', 'DGYM_ALLOWED_SINGLE_DURATIONS'] as $name) {
        $environment[$name] = getenv($name);
    }
    try {
        putenv('APP_ENV=development');
        putenv('DGYM_PRICING_VERSION');
        putenv('DGYM_CONSENT_TEXT_VERSION=' . EnrollmentRequestValidator::PUBLIC_CONSENT_TEXT_VERSION);
        putenv('DGYM_ALLOWED_SINGLE_DURATIONS=1');
        $assertSame('2026-10-06-v4', PriceCatalog::VERSION);
        $assertSame(PriceCatalog::VERSION, (new Config())->pricingVersion());
        $assertSame(false, EnrollmentRequestValidator::publicContractIsDeployable(
            '2026-09-07-v2', EnrollmentRequestValidator::PUBLIC_CONSENT_TEXT_VERSION, 'production'
        ));
        $payload = [
            'schema_version' => PriceCatalog::ENROLLMENT_SCHEMA_VERSION,
            'pricing_version' => PriceCatalog::VERSION,
            'person' => ['full_name' => 'Prueba Local', 'email' => 'local@example.test', 'phone_e164' => '+56912345678'],
            'selection' => ['plan_id' => 'inicio', 'payment_mode' => 'single', 'duration_months' => 1],
            'consents' => ['necessary_processing' => true, 'marketing' => false, 'text_version' => EnrollmentRequestValidator::PUBLIC_CONSENT_TEXT_VERSION],
        ];
        $validator = new EnrollmentRequestValidator(new Config(), new PriceCatalog());
        $assertSame(PriceCatalog::VERSION, $validator->validate($payload)['pricing_version']);
        $payload['pricing_version'] = '2026-09-07-v2';
        try {
            $validator->validate($payload);
            throw new RuntimeException('El precio anterior debía rechazarse.');
        } catch (HttpException $exception) {
            $assertSame(422, $exception->statusCode);
            $assertSame('pricing_version_not_enabled', $exception->errorCode);
            $assertTrue(!str_contains($exception->getMessage(), '34990'));
        }
    } finally {
        foreach ($environment as $name => $value) {
            $value === false ? putenv($name) : putenv($name . '=' . $value);
        }
    }
});

$test('fingerprint idempotente no depende del orden de las claves', static function () use ($assertSame): void {
    $a = ['person' => ['email' => 'a@example.test', 'name' => 'A'], 'duration' => 12];
    $b = ['duration' => 12, 'person' => ['name' => 'A', 'email' => 'a@example.test']];
    $assertSame(Idempotency::fingerprint($a), Idempotency::fingerprint($b));
    $assertSame(64, strlen(Idempotency::hashKey('browser-request-00000001')));
});

$test('errores JSON declaran estrategia de reintento y conflicto exige clave nueva', static function () use ($assertSame, $assertTrue): void {
    $default = new HttpException(422, 'invalid_request', 'Solicitud inválida.');
    $assertSame(true, $default->retryable);
    $assertSame('same_idempotency_key', $default->retryMode);

    $service = (new ReflectionClass(CreateEnrollmentService::class))->newInstanceWithoutConstructor();
    $method = new ReflectionMethod(CreateEnrollmentService::class, 'existingResponse');
    $method->setAccessible(true);
    try {
        $method->invoke($service, [
            'request_fingerprint' => str_repeat('a', 64),
        ], str_repeat('b', 64));
        throw new RuntimeException('Se esperaba conflicto idempotente.');
    } catch (ReflectionException $exception) {
        throw $exception;
    } catch (Throwable $exception) {
        $actual = $exception instanceof ReflectionException ? $exception : $exception;
        if (!$actual instanceof HttpException && $actual->getPrevious() instanceof HttpException) {
            $actual = $actual->getPrevious();
        }
        $assertTrue($actual instanceof HttpException);
        $assertSame('new_idempotency_key', $actual->retryMode);
    }

    $jsonResponse = file_get_contents(dirname(__DIR__) . '/src/Http/JsonResponse.php');
    $endpoint = file_get_contents(dirname(__DIR__) . '/public/api/inscripciones.php');
    $assertTrue(is_string($jsonResponse) && is_string($endpoint));
    $assertTrue(str_contains($jsonResponse, "'retryable' => \$exception->retryable"));
    $assertTrue(str_contains($jsonResponse, "'retry_mode' => \$exception->retryMode"));
    $assertTrue(str_contains($endpoint, "'reconcile_before_retry'"));
});

$test('suscripción pendiente no usa plan y lleva recurrencia finita calculada', static function () use ($assertSame, $assertTrue): void {
    $catalog = new PriceCatalog();
    $offer = $catalog->automaticOffer('pro', 12);
    $request = PendingSubscriptionRequest::build(
        $offer,
        12,
        'payer@example.test',
        'DGYM-20260827-0123456789ABCDEF0123456789ABCDEF',
        'https://example.test/inscripcion/retorno.php'
    );
    $assertTrue(!array_key_exists('preapproval_plan_id', $request));
    $assertSame('pending', $request['status']);
    $assertSame('Plan Pro · 12 meses', $request['reason']);
    $assertTrue(strlen($request['reason']) <= 32);
    $assertTrue(!array_key_exists('repetitions', $request['auto_recurring']));
    $assertSame('2027-08-26T23:59:59.000Z', $request['auto_recurring']['end_date']);
    $assertSame(40490, $request['auto_recurring']['transaction_amount']);
    $assertSame('CLP', $request['auto_recurring']['currency_id']);
});

$test('las tres duraciones automáticas envían end_date finito y determinista', static function () use ($assertSame, $assertTrue): void {
    $catalog = new PriceCatalog();
    foreach ([
        3 => '2026-11-26T23:59:59.000Z',
        6 => '2027-02-26T23:59:59.000Z',
        12 => '2027-08-26T23:59:59.000Z',
    ] as $months => $expectedEndDate) {
        $offer = $catalog->offer('inicio', 'automatic', $months);
        $request = PendingSubscriptionRequest::build(
            $offer,
            $months,
            'payer@example.test',
            'DGYM-20260827-0123456789ABCDEF0123456789ABCDEF',
            'https://example.test/inscripcion/retorno.php'
        );
        $assertTrue(!array_key_exists('repetitions', $request['auto_recurring']));
        $assertSame($expectedEndDate, $request['auto_recurring']['end_date']);
        $assertSame($offer['charge_amount'], $request['auto_recurring']['transaction_amount']);
    }
});

$test('Checkout Pro cobra single/prepaid completo una sola vez', static function () use ($assertSame, $assertTrue): void {
    $offer = (new PriceCatalog())->offer('pro', 'prepaid', 12);
    $request = CheckoutPreferenceRequest::build(
        $offer,
        'payer@example.test',
        'DGYM-20260827-0123456789ABCDEF0123456789ABCDEF',
        [
            'success' => 'https://example.test/retorno.php?result=approved',
            'pending' => 'https://example.test/retorno.php?result=pending',
            'failure' => 'https://example.test/retorno.php?result=failure',
        ],
        'https://example.test/webhooks/mercadopago.php'
    );
    $assertSame(1, $request['items'][0]['quantity']);
    $assertSame(310080, $request['items'][0]['unit_price']);
    $assertSame(1, $request['payment_methods']['installments']);
    $assertSame('DGYM-20260827-0123456789ABCDEF0123456789ABCDEF', $request['external_reference']);
    $assertTrue(!array_key_exists('auto_recurring', $request));
    $assertTrue(!array_key_exists('preapproval_plan_id', $request));
    $assertTrue(str_contains($request['items'][0]['title'], 'matrícula incluida'));
    foreach (['inicio' => 34990, 'pro' => 44990] as $plan => $total) {
        $monthlyOffer = (new PriceCatalog())->offer($plan, 'single', 1);
        $monthlyRequest = CheckoutPreferenceRequest::build(
            $monthlyOffer,
            'payer@example.test',
            'DGYM-20260827-0123456789ABCDEF0123456789ABCDEF',
            $request['back_urls'],
            $request['notification_url']
        );
        $assertSame(1, count($monthlyRequest['items']));
        $assertSame(1, $monthlyRequest['items'][0]['quantity']);
        $assertSame($total, $monthlyRequest['items'][0]['unit_price']);
        $assertSame('CLP', $monthlyRequest['items'][0]['currency_id']);
        $assertSame(1, $monthlyRequest['payment_methods']['installments']);
        $assertTrue(str_contains($monthlyRequest['items'][0]['title'], 'matrícula incluida'));
    }
});

$test('oferta persistida permite verificar una preferencia sin recalcular precios', static function () use ($assertSame, $assertThrows): void {
    $factory = new CheckoutRequestFactory(new Config());
    $stored = $factory->buildStoredPreference([
        'checkout_type' => 'preference',
        'payment_mode' => 'prepaid',
        'duration_months' => 12,
        'checkout_amount' => 295080,
        'contract_total' => 295080,
        'checkout_charge_count' => 1,
        'currency' => 'CLP',
        'plan_name' => 'Plan Pro',
    ]);
    $assertSame('preference', $stored['type']);
    $assertSame(295080, $stored['offer']['charge_amount']);
    $assertSame(1, $stored['offer']['charge_count']);

    $assertThrows(static fn () => $factory->buildStoredPreference([
        'checkout_type' => 'preference',
        'payment_mode' => 'prepaid',
        'duration_months' => 12,
        'checkout_amount' => 295080,
        'contract_total' => 305880,
        'checkout_charge_count' => 1,
        'currency' => 'CLP',
        'plan_name' => 'Plan Pro',
    ]), RuntimeException::class);
});

$test('respuesta de suscripción exige eco y GET con end_date exacto', static function () use ($assertSame, $assertThrows): void {
    $offer = (new PriceCatalog())->offer('pro', 'automatic', 6);
    $reference = 'DGYM-20260827-0123456789ABCDEF0123456789ABCDEF';
    $response = [
        'id' => 'subscription-sample-1',
        'collector_id' => 123456,
        'application_id' => 7544371289283496,
        'live_mode' => false,
        'init_point' => 'https://www.mercadopago.cl/subscriptions/checkout/test',
        'external_reference' => $reference,
        'status' => 'pending',
        'auto_recurring' => [
            'frequency' => 1,
            'frequency_type' => 'months',
            'end_date' => '2027-02-26T23:59:59.000Z',
            'transaction_amount' => $offer['charge_amount'],
            'currency_id' => 'CLP',
        ],
    ];
    $validated = CheckoutResponseValidator::validate(
        'subscription', $response, $offer, $reference, true, '123456', '7544371289283496'
    );
    $assertSame('subscription-sample-1', $validated['resource_id']);
    unset($response['auto_recurring']['end_date']);
    $assertThrows(
        static fn () => CheckoutResponseValidator::validate(
            'subscription', $response, $offer, $reference, true, '123456', '7544371289283496'
        ),
        RuntimeException::class
    );

    foreach (['fecha-invalida', '2027-02-27T23:59:59.000Z', '2027-02-26T23:59:58.000Z'] as $nonCanonical) {
        $response['auto_recurring']['end_date'] = $nonCanonical;
        $assertThrows(
            static fn () => CheckoutResponseValidator::validate(
                'subscription', $response, $offer, $reference, true, '123456', '7544371289283496'
            ),
            RuntimeException::class
        );
    }
    $response['auto_recurring']['end_date'] = '2027-02-26T20:59:59-03:00';
    $response['auto_recurring']['frequency'] = '1';
    $assertSame(
        'subscription-sample-1',
        CheckoutResponseValidator::validate(
            'subscription', $response, $offer, $reference, true, '123456', '7544371289283496'
        )['resource_id']
    );
    $response['auto_recurring']['frequency'] = 1.0;
    $assertThrows(
        static fn () => CheckoutResponseValidator::validate(
            'subscription', $response, $offer, $reference, true, '123456', '7544371289283496'
        ),
        RuntimeException::class
    );

    $response['auto_recurring']['frequency'] = 1;
    $response['application_id'] = 1;
    $assertThrows(
        static fn () => CheckoutResponseValidator::validate(
            'subscription', $response, $offer, $reference, true, '123456', '7544371289283496'
        ),
        RuntimeException::class
    );
    $response['application_id'] = 7544371289283496;
    $response['live_mode'] = true;
    $assertThrows(
        static fn () => CheckoutResponseValidator::validate(
            'subscription', $response, $offer, $reference, true, '123456', '7544371289283496'
        ),
        RuntimeException::class
    );
});

$test('lease usa HMAC privado estable de correo normalizado y teléfono', static function () use ($assertSame, $assertTrue): void {
    $secret = str_repeat('s', 32);
    $first = IdentityFingerprint::fromEmailAndPhone(' Persona@Example.Test ', '+56912345678', $secret);
    $second = IdentityFingerprint::fromEmailAndPhone('persona@example.test', '+56912345678', $secret);
    $otherPhone = IdentityFingerprint::fromEmailAndPhone('persona@example.test', '+56987654321', $secret);
    $assertSame($first, $second);
    $assertSame(64, strlen($first));
    $assertTrue(!hash_equals($first, $otherPhone));
    $assertTrue(!str_contains($first, 'persona'));
});

$test('respuesta de preferencia valida referencia, moneda y total', static function () use ($assertSame, $assertThrows): void {
    $offer = (new PriceCatalog())->offer('inicio', 'prepaid', 3);
    $reference = 'DGYM-20260827-0123456789ABCDEF0123456789ABCDEF';
    $response = [
        'id' => 'preference-sample-1',
        'collector_id' => 123456,
        'client_id' => '7544371289283496',
        'live_mode' => false,
        'init_point' => 'https://www.mercadopago.cl/checkout/v1/redirect',
        'external_reference' => $reference,
        'total_amount' => $offer['charge_amount'],
        'items' => [[
            'quantity' => 1,
            'unit_price' => $offer['charge_amount'],
            'currency_id' => 'CLP',
        ]],
        'payment_methods' => ['installments' => 1],
    ];
    $validated = CheckoutResponseValidator::validate(
        'preference', $response, $offer, $reference, true, '123456', '7544371289283496'
    );
    $assertSame($response['init_point'], $validated['checkout_url']);
    $owned = $response;
    $owned['collector_id'] = 123456;
    $assertSame(
        $response['init_point'],
        CheckoutResponseValidator::validate(
            'preference', $owned, $offer, $reference, true, '123456', '7544371289283496'
        )['checkout_url']
    );
    $owned['collector_id'] = 654321;
    $assertThrows(
        static fn () => CheckoutResponseValidator::validate(
            'preference', $owned, $offer, $reference, true, '123456', '7544371289283496'
        ),
        RuntimeException::class
    );
    $response['items'][0]['unit_price'] = 1;
    $assertThrows(
        static fn () => CheckoutResponseValidator::validate(
            'preference', $response, $offer, $reference, true, '123456', '7544371289283496'
        ),
        RuntimeException::class
    );
    $response['items'][0]['unit_price'] = intdiv($offer['charge_amount'], 2);
    $response['items'][0]['quantity'] = 2;
    $assertThrows(
        static fn () => CheckoutResponseValidator::validate(
            'preference', $response, $offer, $reference, true, '123456', '7544371289283496'
        ),
        RuntimeException::class
    );

    $response['items'][0]['unit_price'] = $offer['charge_amount'];
    $response['items'][0]['quantity'] = 1;
    $response['client_id'] = '1';
    $assertThrows(
        static fn () => CheckoutResponseValidator::validate(
            'preference', $response, $offer, $reference, true, '123456', '7544371289283496'
        ),
        RuntimeException::class
    );
});

$test('respuesta single debe incluir matrícula y rechaza el importe mensual base', static function () use ($assertSame, $assertThrows): void {
    $catalog = new PriceCatalog();
    $reference = 'DGYM-20260827-0123456789ABCDEF0123456789ABCDEF';
    foreach ($catalog->planCodes() as $plan) {
        $offer = $catalog->offer($plan, 'single', 1);
        $response = [
            'id' => 'preference-test-' . $plan,
            'collector_id' => 123456,
            'client_id' => '7544371289283496',
            'live_mode' => false,
            'init_point' => 'https://www.mercadopago.cl/checkout/v1/redirect',
            'external_reference' => $reference,
            'total_amount' => $offer['total'],
            'items' => [['quantity' => 1, 'unit_price' => $offer['charge_amount'], 'currency_id' => 'CLP']],
            'payment_methods' => ['installments' => 1],
        ];
        $validated = CheckoutResponseValidator::validate(
            'preference', $response, $offer, $reference, true, '123456', '7544371289283496'
        );
        $assertSame($response['id'], $validated['resource_id']);
        $response['total_amount'] = $offer['regular_monthly'];
        $response['items'][0]['unit_price'] = $offer['regular_monthly'];
        $assertThrows(
            static fn () => CheckoutResponseValidator::validate(
                'preference', $response, $offer, $reference, true, '123456', '7544371289283496'
            ),
            RuntimeException::class
        );
    }
});

$test('política de pago cubre aprobado, rechazo, devolución, contracargo y fuera de orden', static function () use ($assertSame, $assertTrue): void {
    $approvedSingle = PaymentTransition::decide(
        'preference', 'approved', 'accredited', 0, true, false, false,
        'checkout_ready', 'not_activated'
    );
    $assertSame('payment_verified', $approvedSingle['internal_status']);
    $assertSame('pending_manual_activation', $approvedSingle['membership_status']);
    $assertSame('approved_accredited', $approvedSingle['payment_status']);
    $assertTrue($approvedSingle['linked_accredited']);

    $approvedAutomaticBeforeAuthorization = PaymentTransition::decide(
        'subscription', 'approved', 'accredited', 0, true, false, false,
        'checkout_ready', 'not_activated'
    );
    $assertSame('payment_pending', $approvedAutomaticBeforeAuthorization['internal_status']);

    $rejected = PaymentTransition::decide(
        'preference', 'rejected', 'cc_rejected_other_reason', 0, true, false, false,
        'checkout_ready', 'not_activated'
    );
    $assertSame('payment_rejected', $rejected['internal_status']);

    $partialRefund = PaymentTransition::decide(
        'preference', 'approved', 'accredited', 1000, true, false, true,
        'payment_verified', 'pending_manual_activation'
    );
    $assertSame('payment_refunded', $partialRefund['internal_status']);
    $assertSame('manual_review', $partialRefund['membership_status']);
    $assertSame('refunded', $partialRefund['payment_status']);

    $chargeback = PaymentTransition::decide(
        'subscription', 'charged_back', '', 0, true, true, true,
        'payment_verified', 'pending_manual_activation'
    );
    $assertSame('chargeback', $chargeback['internal_status']);
    $assertSame('charged_back', $chargeback['payment_status']);

    $refundCannotDowngradeChargeback = PaymentTransition::decide(
        'subscription', 'refunded', '', 25490, true, true, true,
        'chargeback', 'manual_review'
    );
    $assertSame('chargeback', $refundCannotDowngradeChargeback['internal_status']);
    $assertSame('charged_back', $refundCannotDowngradeChargeback['payment_status']);
    $assertSame('payment_charged_back', $refundCannotDowngradeChargeback['error_code']);

    $olderApprovedCannotClearRefund = PaymentTransition::decide(
        'preference', 'approved', 'accredited', 0, true, false, true,
        'payment_refunded', 'manual_review'
    );
    $assertSame('payment_refunded', $olderApprovedCannotClearRefund['internal_status']);
    $assertSame('manual_review', $olderApprovedCannotClearRefund['membership_status']);

    // COUNT(DISTINCT mp_payment_id) sobre ever_accredited: el mismo webhook/pago
    // sigue en 1; un ID acreditado distinto supera el límite incluso si el
    // primer pago terminó luego reembolsado.
    $assertSame(false, PaymentTransition::chargeLimitExceeded(1, 1));
    $assertSame(true, PaymentTransition::chargeLimitExceeded(2, 1));
    $assertSame(false, PaymentTransition::chargeLimitExceeded(12, 12));
    $assertSame(true, PaymentTransition::chargeLimitExceeded(13, 12));
});

$test('referencia pública incorpora 128 bits aleatorios', static function () use ($assertTrue, $assertSame): void {
    $first = EnrollmentReference::generate();
    $second = EnrollmentReference::generate();
    $assertTrue(EnrollmentReference::isValid($first));
    $assertSame(46, strlen($first));
    $assertTrue($first !== $second);
});

$test('firma HMAC oficial conserva case de data.id y compara en tiempo constante', static function () use ($assertTrue): void {
    $secret = 'test-secret-never-production';
    $requestId = 'request-123';
    $dataId = 'ABC123';
    $timestamp = '1704908010';
    $manifest = 'id:ABC123;request-id:request-123;ts:1704908010;';
    $hash = hash_hmac('sha256', $manifest, $secret);
    $header = 'ts=' . $timestamp . ',v1=' . $hash;
    $assertTrue(WebhookSignature::validate($header, $requestId, $dataId, $secret));
    $lowercaseManifestHash = hash_hmac(
        'sha256',
        'id:abc123;request-id:request-123;ts:1704908010;',
        $secret
    );
    $assertTrue(!WebhookSignature::validate('ts=' . $timestamp . ',v1=' . $lowercaseManifestHash, $requestId, $dataId, $secret));
    $assertTrue(!WebhookSignature::validate($header, $requestId, 'other', $secret));
});

$test('data.id se extrae literalmente sin aceptar data_id ni duplicados', static function () use ($assertSame): void {
    $assertSame('ABC-123', WebhookQuery::dataId('type=payment&data.id=ABC-123'));
    $assertSame(null, WebhookQuery::dataId('type=payment&data_id=ABC-123'));
    $assertSame(null, WebhookQuery::dataId('data.id=one&data.id=two'));
    $assertSame(null, WebhookQuery::dataId('data.id=%20ABC-123%20'));
});

$test('dedupe usa material firmado y conserva el case exacto de data.id', static function () use ($assertTrue): void {
    $assertTrue(
        WebhookDedupe::key('request-123', 'ABC123')
        !== WebhookDedupe::key('request-123', 'abc123')
    );
});

$test('incidencia posterior conserva evidencia del pago inicial sin activar membresía', static function () use ($assertSame, $assertTrue): void {
    $presented = (new StatusPresenter())->present([
        'status' => 'payment_issue_review',
        'reference' => 'DGYM-20260827-0123456789ABCDEF0123456789ABCDEF',
        'plan_name' => 'Plan Inicio',
        'duration_months' => 12,
        'installment_amount' => 16990,
        'currency' => 'CLP',
        'updated_at' => '2026-08-27 12:00:00.000',
        'initial_payment_confirmed_at' => '2026-08-27 11:00:00.000',
        'membership_status' => 'manual_review',
    ]);
    $assertSame('manual_review', $presented['state']);
    $assertTrue($presented['payment_confirmed']);
    $assertSame(false, $presented['membership_active']);
});

$test('revisión manual prevalece aunque un evento concurrente deje status verificado', static function () use ($assertSame, $assertTrue): void {
    $presented = (new StatusPresenter())->present([
        'status' => 'payment_verified',
        'membership_status' => 'manual_review',
        'reference' => 'DGYM-20260827-FEDCBA9876543210FEDCBA9876543210',
        'plan_name' => 'Plan Inicio',
        'duration_months' => 12,
        'installment_amount' => 16990,
        'currency' => 'CLP',
        'updated_at' => '2026-08-27 12:00:00.000',
        'initial_payment_confirmed_at' => '2026-08-27 11:00:00.000',
    ]);
    $assertSame('manual_review', $presented['state']);
    $assertTrue($presented['payment_confirmed']);
});

$test('estado rechazado nunca reutiliza la URL antigua y ofrece reinicio seguro', static function () use ($assertSame): void {
    $base = [
        'status' => 'payment_rejected',
        'membership_status' => 'not_activated',
        'reference' => 'DGYM-20261005-B34EFAB44DDC3247AE971B0AFC30C6E4',
        'plan_name' => 'Plan Pro',
        'duration_months' => 12,
        'payment_mode' => 'automatic',
        'installment_amount' => 25490,
        'currency' => 'CLP',
        'updated_at' => '2026-10-05 14:44:00.000',
        'initial_payment_confirmed_at' => null,
    ];
    $url = 'https://www.mercadopago.cl/subscriptions/checkout/existing';
    $subscription = (new StatusPresenter())->present($base + ['checkout_type' => 'subscription', 'checkout_url' => $url]);
    $assertSame(null, $subscription['retry_checkout_url']);
    $assertSame('restart_payment', $subscription['recovery_action']);

    $preference = (new StatusPresenter())->present($base + ['checkout_type' => 'preference', 'checkout_url' => $url]);
    $assertSame(null, $preference['retry_checkout_url']);
    $assertSame('restart_payment', $preference['recovery_action']);

    $unsafe = (new StatusPresenter())->present($base + ['checkout_type' => 'subscription', 'checkout_url' => 'https://example.com/phishing']);
    $assertSame(null, $unsafe['retry_checkout_url']);
});

$test('rechazo con revisión manual histórica no vuelve a ofrecer reinicio', static function () use ($assertSame): void {
    $presented = (new StatusPresenter())->present([
        'status' => 'payment_rejected',
        'membership_status' => 'manual_review',
        'error_code' => 'historical_attempt_financial_activity',
        'reference' => 'DGYM-20261005-D34EFAB44DDC3247AE971B0AFC30C6E4',
        'plan_name' => 'Plan Pro',
        'duration_months' => 12,
        'payment_mode' => 'automatic',
        'checkout_type' => 'subscription',
        'checkout_url' => 'https://www.mercadopago.cl/subscriptions/checkout/old',
        'installment_amount' => 25490,
        'currency' => 'CLP',
        'updated_at' => '2026-10-05 14:44:00.000',
        'initial_payment_confirmed_at' => null,
    ]);
    $assertSame('manual_review', $presented['state']);
    $assertSame('none', $presented['recovery_action']);
    $assertSame(null, $presented['retry_checkout_url']);
});

$test('suscripción cancelada sin evidencia financiera conserva recuperación y una incidencia la bloquea', static function () use ($assertSame): void {
    $base = [
        'status' => 'subscription_canceled',
        'subscription_status' => 'canceled',
        'payment_status' => 'rejected',
        'membership_status' => 'manual_review',
        'error_code' => null,
        'reference' => 'DGYM-20261005-C34EFAB44DDC3247AE971B0AFC30C6E4',
        'plan_name' => 'Plan Pro',
        'duration_months' => 12,
        'payment_mode' => 'automatic',
        'checkout_type' => 'subscription',
        'checkout_url' => 'https://www.mercadopago.cl/subscriptions/checkout/canceled',
        'installment_amount' => 25490,
        'currency' => 'CLP',
        'updated_at' => '2026-10-05 14:44:00.000',
        'initial_payment_confirmed_at' => null,
    ];

    $recoverable = (new StatusPresenter())->present($base);
    $assertSame('payment_rejected', $recoverable['state']);
    $assertSame('restart_payment', $recoverable['recovery_action']);
    $assertSame(null, $recoverable['retry_checkout_url']);

    $review = (new StatusPresenter())->present(array_replace($base, [
        'error_code' => 'historical_attempt_financial_activity',
    ]));
    $assertSame('manual_review', $review['state']);
    $assertSame('none', $review['recovery_action']);
});

$test('preferencia pendiente exige probe remoto y nunca expone la URL persistida', static function () use ($assertSame): void {
    $url = 'https://www.mercadopago.cl/checkout/v1/redirect?pref_id=existing';
    $presented = (new StatusPresenter())->present([
        'status' => 'checkout_ready',
        'membership_status' => 'not_activated',
        'reference' => 'DGYM-20261005-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        'plan_name' => 'Plan Inicio',
        'duration_months' => 1,
        'payment_mode' => 'single',
        'checkout_type' => 'preference',
        'checkout_url' => $url,
        'installment_amount' => 34990,
        'currency' => 'CLP',
        'updated_at' => '2026-10-05 15:00:00.000',
        'initial_payment_confirmed_at' => null,
    ]);
    $assertSame('checkout_pending', $presented['state']);
    $assertSame('probe_payment', $presented['recovery_action']);
    $assertSame(null, $presented['retry_checkout_url']);
});

$test('preferencia con pago pendiente sigue usando probe remoto', static function () use ($assertSame): void {
    $presented = (new StatusPresenter())->present([
        'status' => 'payment_pending',
        'payment_status' => 'in_process',
        'membership_status' => 'not_activated',
        'reference' => 'DGYM-20261005-ABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        'plan_name' => 'Plan Pro',
        'duration_months' => 6,
        'payment_mode' => 'prepaid',
        'checkout_type' => 'preference',
        'checkout_url' => 'https://www.mercadopago.cl/checkout/v1/redirect?pref_id=pending',
        'installment_amount' => 26390,
        'currency' => 'CLP',
        'updated_at' => '2026-10-05 15:00:00.000',
        'initial_payment_confirmed_at' => null,
    ]);
    $assertSame('payment_pending', $presented['state']);
    $assertSame('probe_payment', $presented['recovery_action']);
    $assertSame(null, $presented['retry_checkout_url']);
});

$test('suscripción pendiente exige probe remoto y no expone la URL persistida', static function () use ($assertSame): void {
    $presented = (new StatusPresenter())->present([
        'status' => 'subscription_pending',
        'subscription_status' => 'pending',
        'membership_status' => 'not_activated',
        'reference' => 'DGYM-20261005-EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE',
        'plan_name' => 'Plan Pro',
        'duration_months' => 12,
        'payment_mode' => 'automatic',
        'checkout_type' => 'subscription',
        'checkout_url' => 'https://www.mercadopago.cl/subscriptions/checkout/pending',
        'installment_amount' => 25490,
        'currency' => 'CLP',
        'updated_at' => '2026-10-05 15:00:00.000',
        'initial_payment_confirmed_at' => null,
    ]);
    $assertSame('payment_pending', $presented['state']);
    $assertSame('probe_payment', $presented['recovery_action']);
    $assertSame(null, $presented['retry_checkout_url']);
});

$test('suscripción autorizada sin pago conserva una acción segura de reverificación', static function () use ($assertSame): void {
    $presented = (new StatusPresenter())->present([
        'status' => 'subscription_authorized',
        'subscription_status' => 'authorized',
        'payment_status' => 'pending',
        'membership_status' => 'not_activated',
        'reference' => 'DGYM-20261005-FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
        'plan_name' => 'Plan Pro',
        'duration_months' => 12,
        'payment_mode' => 'automatic',
        'checkout_type' => 'subscription',
        'checkout_url' => 'https://www.mercadopago.cl/subscriptions/checkout/authorized',
        'installment_amount' => 25490,
        'currency' => 'CLP',
        'updated_at' => '2026-10-05 15:00:00.000',
        'initial_payment_confirmed_at' => null,
    ]);
    $assertSame('payment_pending', $presented['state']);
    $assertSame('probe_payment', $presented['recovery_action']);
    $assertSame(null, $presented['retry_checkout_url']);
});

$test('una solicitud nueva puede crear otra inscripción para la misma identidad', static function () use ($assertTrue): void {
    $source = file_get_contents(dirname(__DIR__) . '/src/Application/CreateEnrollmentService.php');
    $initialMigration = file_get_contents(dirname(__DIR__) . '/database/migrations/001_initial.sql');
    $multiCheckoutMigration = file_get_contents(dirname(__DIR__) . '/database/migrations/002_multi_checkout.sql');
    $assertTrue(is_string($source) && is_string($initialMigration) && is_string($multiCheckoutMigration));
    $assertTrue(str_contains($source, '$this->enrollments->findByIdempotencyHash($idempotencyHash)'));
    $assertTrue(str_contains($source, '$this->enrollments->create('));
    $assertTrue(!str_contains($source, 'IdentityFingerprint::fromEmailAndPhone'));
    $assertTrue(!str_contains($source, '->acquireIdentityLease('));
    $assertTrue(!str_contains($source, '->findByIdentityLease('));
    $assertTrue(!str_contains($source, '->findPotentiallyChargeableByIdentity('));
    $assertTrue(!str_contains($source, 'identity_checkout_conflict'));
    $assertTrue(!str_contains($source, 'identity_checkout_pending'));
    $assertTrue(!preg_match('/UNIQUE\s+KEY[^\n]*\((?:email|phone_e164)\)/i', $initialMigration));
    $assertTrue(!preg_match('/ALTER\s+TABLE\s+enrollments[^;]*(?:email|phone_e164)[^;]*UNIQUE/is', $multiCheckoutMigration));
});

$test('fallo definitivo de checkout permite un nuevo intento con clave nueva', static function () use ($assertSame, $assertTrue): void {
    $service = (new ReflectionClass(CreateEnrollmentService::class))->newInstanceWithoutConstructor();
    $method = new ReflectionMethod(CreateEnrollmentService::class, 'existingResponse');
    $method->setAccessible(true);
    $fingerprint = str_repeat('a', 64);
    $result = $method->invoke($service, [
        'request_fingerprint' => $fingerprint,
        'status' => 'checkout_creation_failed',
        'error_code' => 'service_not_configured',
        'reference' => 'DGYM-20260827-0123456789ABCDEF0123456789ABCDEF',
        'checkout_url' => null,
        'mp_subscription_id' => null,
    ], $fingerprint);

    $assertSame(503, $result['http_status']);
    $assertSame('service_not_configured', $result['body']['error']['code']);
    $assertTrue($result['body']['error']['retryable']);
    $assertSame('new_idempotency_key', $result['body']['error']['retry_mode']);
});

$test('resultado incierto de checkout bloquea una segunda creación automática', static function () use ($assertSame): void {
    $service = (new ReflectionClass(CreateEnrollmentService::class))->newInstanceWithoutConstructor();
    $method = new ReflectionMethod(CreateEnrollmentService::class, 'existingResponse');
    $method->setAccessible(true);
    $fingerprint = str_repeat('b', 64);
    $reference = 'DGYM-20260827-FEDCBA9876543210FEDCBA9876543210';
    $result = $method->invoke($service, [
        'request_fingerprint' => $fingerprint,
        'status' => 'checkout_creation_uncertain',
        'error_code' => 'mercado_pago_unavailable',
        'reference' => $reference,
        'checkout_url' => null,
        'mp_subscription_id' => null,
    ], $fingerprint);

    $assertSame(503, $result['http_status']);
    $assertSame('checkout_creation_uncertain', $result['body']['error']['code']);
    $assertSame(false, $result['body']['error']['retryable']);
    $assertSame('reconcile_before_retry', $result['body']['error']['retry_mode']);
    $assertSame($reference, $result['body']['error']['reference']);
});

$test('crash en creating_checkout entra a conciliación y jamás repite POST', static function () use ($assertSame, $assertTrue): void {
    $service = (new ReflectionClass(CreateEnrollmentService::class))->newInstanceWithoutConstructor();
    $method = new ReflectionMethod(CreateEnrollmentService::class, 'existingResponse');
    $method->setAccessible(true);
    $fingerprint = str_repeat('e', 64);
    $reference = 'DGYM-20260827-CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC';
    $result = $method->invoke($service, [
        'request_fingerprint' => $fingerprint,
        'status' => 'creating_checkout',
        'reference' => $reference,
        'checkout_url' => null,
        'mp_checkout_id' => null,
        'plan_code' => 'inicio',
        'payment_mode' => 'automatic',
        'duration_months' => 3,
    ], $fingerprint);
    $assertSame('checkout_creation_uncertain', $result['body']['error']['code']);

    $source = file_get_contents(dirname(__DIR__) . '/src/Application/CreateEnrollmentService.php');
    $assertTrue(is_string($source));
    $assertTrue(str_contains($source, "in_array(\$status, ['creating_checkout', 'checkout_creation_uncertain'], true)"));
    $assertTrue(str_contains($source, '$this->tryReconcileCheckout($existing, $offer)'));
});

$test('un pago rechazado no reutiliza URL y deriva al estado con su referencia', static function () use ($assertSame, $assertTrue): void {
    $service = (new ReflectionClass(CreateEnrollmentService::class))->newInstanceWithoutConstructor();
    $method = new ReflectionMethod(CreateEnrollmentService::class, 'existingResponse');
    $method->setAccessible(true);
    $fingerprint = str_repeat('f', 64);
    $subscriptionUrl = 'https://www.mercadopago.cl/subscriptions/checkout/existing';
    $subscription = $method->invoke($service, [
        'request_fingerprint' => $fingerprint,
        'status' => 'payment_rejected',
        'reference' => 'DGYM-20260827-DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',
        'checkout_type' => 'subscription',
        'payment_mode' => 'automatic',
        'public_id' => '00000000-0000-4000-8000-000000000099',
        'checkout_url' => $subscriptionUrl,
        'mp_checkout_id' => 'existing-subscription',
    ], $fingerprint);
    $assertSame(409, $subscription['http_status']);
    $assertSame('subscription_payment_rejected', $subscription['body']['error']['code']);
    $assertSame('status_only', $subscription['body']['error']['retry_mode']);
    $assertSame(false, $subscription['body']['error']['retryable']);
    $assertTrue(str_contains($subscription['body']['error']['message'], 'referencia'));
    $assertTrue(!array_key_exists('checkout_url', $subscription['body']['error']));

    $preference = $method->invoke($service, [
        'request_fingerprint' => $fingerprint,
        'status' => 'payment_rejected',
        'reference' => 'DGYM-20260827-DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',
        'checkout_type' => 'preference',
        'checkout_url' => 'https://www.mercadopago.cl/checkout/test',
        'mp_checkout_id' => 'existing-preference',
    ], $fingerprint);
    $assertSame(409, $preference['http_status']);
    $assertSame('payment_rejected', $preference['body']['error']['code']);
    $assertSame('status_only', $preference['body']['error']['retry_mode']);
    $assertTrue(!array_key_exists('checkout_url', $preference['body']['error']));

    $canceled = $method->invoke($service, [
        'request_fingerprint' => $fingerprint,
        'status' => 'subscription_canceled',
        'subscription_status' => 'canceled',
        'membership_status' => 'manual_review',
        'error_code' => null,
        'initial_payment_confirmed_at' => null,
        'reference' => 'DGYM-20261005-C34EFAB44DDC3247AE971B0AFC30C6E4',
        'checkout_type' => 'subscription',
        'payment_mode' => 'automatic',
    ], $fingerprint);
    $assertSame(409, $canceled['http_status']);
    $assertSame('subscription_payment_rejected', $canceled['body']['error']['code']);
    $assertSame('status_only', $canceled['body']['error']['retry_mode']);
    $assertSame(false, $canceled['body']['error']['retryable']);
});

$test('checkout de suscripción listo deriva al probe financiero y no devuelve URL desde el formulario', static function () use ($assertSame, $assertTrue): void {
    $service = (new ReflectionClass(CreateEnrollmentService::class))->newInstanceWithoutConstructor();
    $method = new ReflectionMethod(CreateEnrollmentService::class, 'existingResponse');
    $method->setAccessible(true);
    $fingerprint = str_repeat('c', 64);
    $checkoutUrl = 'https://www.mercadopago.cl/subscriptions/checkout/test';
    $result = $method->invoke($service, [
        'request_fingerprint' => $fingerprint,
        'status' => 'checkout_ready',
        'public_id' => '00000000-0000-4000-8000-000000000000',
        'reference' => 'DGYM-20260827-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        'checkout_url' => $checkoutUrl,
        'mp_subscription_id' => 'test-subscription-id',
        'checkout_type' => 'subscription',
        'payment_mode' => 'automatic',
    ], $fingerprint);

    $assertSame(409, $result['http_status']);
    $assertSame('subscription_payment_status_check', $result['body']['error']['code']);
    $assertSame('status_only', $result['body']['error']['retry_mode']);
    $assertTrue(!array_key_exists('checkout_url', $result['body']['error']));
    $source = file_get_contents(dirname(__DIR__) . '/src/Application/CreateEnrollmentService.php');
    $assertTrue(is_string($source) && str_contains($source, '$this->fetchAndValidateCheckout('));
});

$test('checkout de preferencia listo deriva al probe financiero y no devuelve URL desde el formulario', static function () use ($assertSame, $assertTrue): void {
    $service = (new ReflectionClass(CreateEnrollmentService::class))->newInstanceWithoutConstructor();
    $method = new ReflectionMethod(CreateEnrollmentService::class, 'existingResponse');
    $fingerprint = str_repeat('a', 64);
    $result = $method->invoke($service, [
        'request_fingerprint' => $fingerprint,
        'status' => 'checkout_ready',
        'public_id' => '00000000-0000-4000-8000-000000000002',
        'reference' => 'DGYM-20261006-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        'checkout_url' => 'https://www.mercadopago.cl/checkout/v1/redirect?pref_id=existing',
        'mp_preference_id' => 'existing-preference',
        'checkout_type' => 'preference',
        'payment_mode' => 'prepaid',
    ], $fingerprint);

    $assertSame(409, $result['http_status']);
    $assertSame('preference_payment_status_check', $result['body']['error']['code']);
    $assertSame('status_only', $result['body']['error']['retry_mode']);
    $assertTrue(!array_key_exists('checkout_url', $result['body']['error']));
});

$test('solo estados previos al pago reutilizan el checkout idempotente', static function () use ($assertSame, $assertTrue): void {
    $service = (new ReflectionClass(CreateEnrollmentService::class))->newInstanceWithoutConstructor();
    $method = new ReflectionMethod(CreateEnrollmentService::class, 'existingResponse');
    $method->setAccessible(true);
    $fingerprint = str_repeat('d', 64);
    $reference = 'DGYM-20260827-BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';
    $checkoutUrl = 'https://www.mercadopago.cl/subscriptions/checkout/test';

    $pending = $method->invoke($service, [
        'request_fingerprint' => $fingerprint,
        'status' => 'subscription_pending',
        'public_id' => '00000000-0000-4000-8000-000000000001',
        'reference' => $reference,
        'checkout_url' => $checkoutUrl,
        'mp_subscription_id' => 'test-subscription-id',
        'checkout_type' => 'subscription',
        'payment_mode' => 'automatic',
    ], $fingerprint);
    $assertSame(409, $pending['http_status']);
    $assertSame('subscription_payment_status_check', $pending['body']['error']['code']);
    $assertSame('status_only', $pending['body']['error']['retry_mode']);

    $advanced = $method->invoke($service, [
        'request_fingerprint' => $fingerprint,
        'status' => 'payment_verified',
        'public_id' => '00000000-0000-4000-8000-000000000001',
        'reference' => $reference,
        'checkout_url' => $checkoutUrl,
        'mp_subscription_id' => 'test-subscription-id',
    ], $fingerprint);
    $assertSame(409, $advanced['http_status']);
    $assertSame('checkout_reuse_blocked', $advanced['body']['error']['code']);
    $assertSame('status_only', $advanced['body']['error']['retry_mode']);
    $assertSame($reference, $advanced['body']['error']['reference']);
    $assertTrue(!array_key_exists('checkout_url', $advanced['body']['error']));
});

$test('contrato final aprobado admite producción y rechaza versiones o entornos inválidos', static function () use ($assertSame, $assertTrue): void {
    // Final consent approved by the owner on 2026-09-21, recorded in the
    // canonical project note and secure access manifest. This tests contract
    // compatibility only; checkout still requires its independent gate/preflight.
    $consentVersion = EnrollmentRequestValidator::PUBLIC_CONSENT_TEXT_VERSION;
    $assertSame('2026-09-21-v1', $consentVersion);
    $assertTrue(EnrollmentRequestValidator::publicContractIsDeployable(
        PriceCatalog::VERSION,
        $consentVersion,
        'development'
    ));
    $assertSame(true, EnrollmentRequestValidator::publicContractIsDeployable(
        PriceCatalog::VERSION,
        $consentVersion,
        'production'
    ));
    $assertSame(false, EnrollmentRequestValidator::publicContractIsDeployable(
        PriceCatalog::VERSION,
        $consentVersion,
        'prod'
    ));
    $assertSame(false, EnrollmentRequestValidator::publicContractIsDeployable(
        'pricing-obsoleto',
        $consentVersion,
        'development'
    ));
    $assertSame(false, EnrollmentRequestValidator::publicContractIsDeployable(
        PriceCatalog::VERSION,
        'otra-version',
        'development'
    ));
});

$test('entorno solo acepta development o production y falla cerrado ante errores tipográficos', static function () use ($assertSame, $assertTrue): void {
    $original = getenv('APP_ENV');
    try {
        putenv('APP_ENV=development');
        $assertSame('development', (new Config())->appEnvironment());
        putenv('APP_ENV=production');
        $assertSame('production', (new Config())->appEnvironment());
        putenv('APP_ENV=staging');
        $rejected = false;
        try {
            (new Config())->appEnvironment();
        } catch (RuntimeException) {
            $rejected = true;
        }
        $assertTrue($rejected);
    } finally {
        if ($original === false) {
            putenv('APP_ENV');
        } else {
            putenv('APP_ENV=' . $original);
        }
    }
});

$test('cada acceso al gateway exige alcance explícito alineado con APP_ENV y trata el token como opaco', static function () use ($assertThrows): void {
    $originalEnvironment = getenv('APP_ENV');
    $originalToken = getenv('MP_API_TOKEN');
    $originalCredentialEnvironment = getenv('MP_CREDENTIAL_ENVIRONMENT');
    $originalApplicationId = getenv('MP_APPLICATION_ID');
    try {
        putenv('APP_ENV=development');
        putenv('MP_API_TOKEN=APP_USR_opaque-test-placeholder');
        putenv('MP_CREDENTIAL_ENVIRONMENT=test');
        putenv('MP_APPLICATION_ID=7544371289283496');
        (new Config())->assertMercadoPagoCredentialEnvironment();

        putenv('MP_CREDENTIAL_ENVIRONMENT=production');
        $assertThrows(
            static fn () => (new Config())->assertMercadoPagoCredentialEnvironment(),
            RuntimeException::class
        );

        putenv('APP_ENV=production');
        putenv('MP_CREDENTIAL_ENVIRONMENT=test');
        $assertThrows(
            static fn () => (new Config())->assertMercadoPagoCredentialEnvironment(),
            RuntimeException::class
        );
        putenv('MP_CREDENTIAL_ENVIRONMENT=production');
        (new Config())->assertMercadoPagoCredentialEnvironment();

        putenv('MP_APPLICATION_ID=not-numeric');
        $assertThrows(
            static fn () => (new Config())->assertMercadoPagoCredentialEnvironment(),
            RuntimeException::class
        );
    } finally {
        $originalEnvironment === false ? putenv('APP_ENV') : putenv('APP_ENV=' . $originalEnvironment);
        $originalToken === false ? putenv('MP_API_TOKEN') : putenv('MP_API_TOKEN=' . $originalToken);
        $originalCredentialEnvironment === false
            ? putenv('MP_CREDENTIAL_ENVIRONMENT')
            : putenv('MP_CREDENTIAL_ENVIRONMENT=' . $originalCredentialEnvironment);
        $originalApplicationId === false
            ? putenv('MP_APPLICATION_ID')
            : putenv('MP_APPLICATION_ID=' . $originalApplicationId);
    }
});

$test('archivo privado se rechaza dentro de DOCUMENT_ROOT sin leerlo', static function () use ($assertThrows): void {
    $projectRoot = dirname(__DIR__);
    $inside = realpath(__FILE__);
    if (!is_string($inside)) {
        throw new RuntimeException('No se pudo resolver el archivo de prueba.');
    }
    $assertThrows(
        static fn () => Environment::assertPrivatePathOutsideDocumentRoot($inside, $projectRoot),
        RuntimeException::class
    );
    Environment::assertPrivatePathOutsideDocumentRoot($inside, sys_get_temp_dir());
    $assertThrows(
        static fn () => Environment::assertPrivatePathOutsideDocumentRoot($inside, $projectRoot . '/missing-root'),
        RuntimeException::class
    );
    $source = file_get_contents(dirname(__DIR__) . '/src/Environment.php');
    if (!is_string($source) || !str_contains($source, '($permissions & 0077) !== 0')) {
        throw new RuntimeException('Falta validar permisos del archivo privado.');
    }
});

$test('secreto HMAC admite archivo hexadecimal seguro con precedencia y fallback compatible', static function () use ($assertSame, $assertThrows): void {
    $originalFile = getenv('DGYM_IDENTITY_HMAC_SECRET_FILE');
    $originalDirect = getenv('DGYM_IDENTITY_HMAC_SECRET');
    $originalEnvironmentDocumentRoot = getenv('DOCUMENT_ROOT');
    $originalEnvironmentContextDocumentRoot = getenv('CONTEXT_DOCUMENT_ROOT');
    $hadDocumentRoot = array_key_exists('DOCUMENT_ROOT', $_SERVER);
    $originalDocumentRoot = $_SERVER['DOCUMENT_ROOT'] ?? null;
    $hadContextDocumentRoot = array_key_exists('CONTEXT_DOCUMENT_ROOT', $_SERVER);
    $originalContextDocumentRoot = $_SERVER['CONTEXT_DOCUMENT_ROOT'] ?? null;
    $temporaryRoot = sys_get_temp_dir() . '/dgym-hmac-secret-' . bin2hex(random_bytes(8));
    $secretFile = $temporaryRoot . '/identity.hex';
    $targetFile = $temporaryRoot . '/identity-target.hex';
    $symbolicLink = $temporaryRoot . '/identity-link.hex';
    $publicRoot = $temporaryRoot . '/public';
    $publicFile = $publicRoot . '/identity.hex';
    $hexSecret = str_repeat('aB', 32);
    $decodedSecret = hex2bin($hexSecret);
    if ($decodedSecret === false || !mkdir($temporaryRoot, 0700)) {
        throw new RuntimeException('No se pudo preparar la prueba del secreto HMAC.');
    }

    try {
        if (
            !mkdir($publicRoot, 0700)
            || file_put_contents($secretFile, $hexSecret) !== 64
            || file_put_contents($targetFile, $hexSecret) !== 64
            || file_put_contents($publicFile, $hexSecret) !== 64
            || !chmod($secretFile, 0600)
            || !chmod($targetFile, 0600)
            || !chmod($publicFile, 0600)
            || !symlink($targetFile, $symbolicLink)
        ) {
            throw new RuntimeException('No se pudieron preparar los archivos de prueba HMAC.');
        }

        unset($_SERVER['DOCUMENT_ROOT'], $_SERVER['CONTEXT_DOCUMENT_ROOT']);
        putenv('DOCUMENT_ROOT');
        putenv('CONTEXT_DOCUMENT_ROOT');
        putenv('DGYM_IDENTITY_HMAC_SECRET=secreto-directo-compatible-de-32-caracteres');
        putenv('DGYM_IDENTITY_HMAC_SECRET_FILE=' . $secretFile);
        $assertSame($decodedSecret, (new Config())->identityHmacSecret());
        $assertSame(32, strlen((new Config())->identityHmacSecret()));

        putenv('DGYM_IDENTITY_HMAC_SECRET_FILE');
        $assertSame('secreto-directo-compatible-de-32-caracteres', (new Config())->identityHmacSecret());

        putenv('DGYM_IDENTITY_HMAC_SECRET_FILE=');
        $assertThrows(static fn () => (new Config())->identityHmacSecret(), RuntimeException::class);
        putenv('DGYM_IDENTITY_HMAC_SECRET_FILE=ruta/relativa.hex');
        $assertThrows(static fn () => (new Config())->identityHmacSecret(), RuntimeException::class);
        putenv('DGYM_IDENTITY_HMAC_SECRET_FILE=' . $symbolicLink);
        $assertThrows(static fn () => (new Config())->identityHmacSecret(), RuntimeException::class);
        putenv('DGYM_IDENTITY_HMAC_SECRET_FILE=' . $temporaryRoot);
        $assertThrows(static fn () => (new Config())->identityHmacSecret(), RuntimeException::class);

        chmod($secretFile, 0640);
        clearstatcache(true, $secretFile);
        putenv('DGYM_IDENTITY_HMAC_SECRET_FILE=' . $secretFile);
        $assertThrows(static fn () => (new Config())->identityHmacSecret(), RuntimeException::class);
        chmod($secretFile, 0700);
        clearstatcache(true, $secretFile);
        $assertThrows(static fn () => (new Config())->identityHmacSecret(), RuntimeException::class);
        chmod($secretFile, 0400);
        clearstatcache(true, $secretFile);
        $assertSame($decodedSecret, (new Config())->identityHmacSecret());

        $_SERVER['DOCUMENT_ROOT'] = $publicRoot;
        putenv('DGYM_IDENTITY_HMAC_SECRET_FILE=' . $publicFile);
        $assertThrows(static fn () => (new Config())->identityHmacSecret(), RuntimeException::class);
        $_SERVER['DOCUMENT_ROOT'] = $temporaryRoot . '/document-root-inexistente';
        putenv('DGYM_IDENTITY_HMAC_SECRET_FILE=' . $secretFile);
        $assertThrows(static fn () => (new Config())->identityHmacSecret(), RuntimeException::class);
        unset($_SERVER['DOCUMENT_ROOT']);

        chmod($secretFile, 0600);
        foreach ([str_repeat('a', 63), str_repeat('g', 64), $hexSecret . "\n"] as $invalidContent) {
            file_put_contents($secretFile, $invalidContent);
            clearstatcache(true, $secretFile);
            putenv('DGYM_IDENTITY_HMAC_SECRET_FILE=' . $secretFile);
            $assertThrows(static fn () => (new Config())->identityHmacSecret(), RuntimeException::class);
        }
    } finally {
        $originalFile === false
            ? putenv('DGYM_IDENTITY_HMAC_SECRET_FILE')
            : putenv('DGYM_IDENTITY_HMAC_SECRET_FILE=' . $originalFile);
        $originalDirect === false
            ? putenv('DGYM_IDENTITY_HMAC_SECRET')
            : putenv('DGYM_IDENTITY_HMAC_SECRET=' . $originalDirect);
        $originalEnvironmentDocumentRoot === false
            ? putenv('DOCUMENT_ROOT')
            : putenv('DOCUMENT_ROOT=' . $originalEnvironmentDocumentRoot);
        $originalEnvironmentContextDocumentRoot === false
            ? putenv('CONTEXT_DOCUMENT_ROOT')
            : putenv('CONTEXT_DOCUMENT_ROOT=' . $originalEnvironmentContextDocumentRoot);
        if ($hadDocumentRoot) {
            $_SERVER['DOCUMENT_ROOT'] = $originalDocumentRoot;
        } else {
            unset($_SERVER['DOCUMENT_ROOT']);
        }
        if ($hadContextDocumentRoot) {
            $_SERVER['CONTEXT_DOCUMENT_ROOT'] = $originalContextDocumentRoot;
        } else {
            unset($_SERVER['CONTEXT_DOCUMENT_ROOT']);
        }
        if (is_file($secretFile)) {
            chmod($secretFile, 0600);
        }
        foreach ([$symbolicLink, $secretFile, $targetFile, $publicFile] as $path) {
            if (is_link($path) || is_file($path)) {
                unlink($path);
            }
        }
        if (is_dir($publicRoot)) {
            rmdir($publicRoot);
        }
        if (is_dir($temporaryRoot)) {
            rmdir($temporaryRoot);
        }
    }
});

$test('loader falla cerrado si DOCUMENT_ROOT configurado no se puede resolver', static function () use ($assertTrue): void {
    $source = file_get_contents(dirname(__DIR__) . '/public/loader.php');
    $assertTrue(is_string($source));
    $assertTrue(str_contains($source, "ini_set('display_errors', '0')"));
    $assertTrue(str_contains($source, "ini_set('log_errors', '1')"));
    $assertTrue(str_contains($source, "PHP_SAPI !== 'cli'"));
    $assertTrue(str_contains($source, "basename((string) (\$_SERVER['SCRIPT_NAME'] ?? ''))"));
    $assertTrue(str_contains($source, 'hash_equals($dgymLoaderPath, $dgymEntryPath)'));
    $assertTrue(str_contains($source, 'http_response_code(404)'));
    $assertTrue(str_contains($source, "\$documentRootValue !== '' && \$documentRoot === false"));
    $assertTrue(str_contains($source, '$appRoot === $documentRoot'));
    $assertTrue(str_contains($source, 'str_starts_with($appRoot, $documentRoot . DIRECTORY_SEPARATOR)'));
});

$test('preflight clasifica fallos locales en orden y cierra producción sin detalles', static function () use ($assertSame): void {
    $runtimeFailure = CheckoutPreflight::classify(false, false, false);
    $configFailure = CheckoutPreflight::classify(true, false, false);
    $databaseFailure = CheckoutPreflight::classify(true, true, false);
    $ready = CheckoutPreflight::classify(true, true, true);

    $assertSame('runtime_dependency_missing', $runtimeFailure['code']);
    $assertSame('local_configuration_invalid', $configFailure['code']);
    $assertSame('database_schema_unavailable', $databaseFailure['code']);
    $assertSame('local_definitive', $databaseFailure['failure_class']);
    $assertSame(true, $ready['ready']);
    $assertSame('ready', CheckoutPreflight::publicStatus($ready, 'production'));
    $assertSame('local_configuration_invalid', CheckoutPreflight::publicStatus($configFailure, 'development'));
    $assertSame('unavailable', CheckoutPreflight::publicStatus($configFailure, 'production'));
    $assertSame('unavailable', CheckoutPreflight::publicStatus($configFailure, 'staging'));
    $assertSame('unavailable', CheckoutPreflight::publicStatus([
        'ready' => false,
        'code' => 'detalle_no_permitido',
    ], 'development'));
});

$test('preflight cubre tablas, índices e integridad técnica sin leer datos personales', static function () use ($assertSame, $assertTrue): void {
    $assertSame([
        'enrollments',
        'payment_records',
        'webhook_events',
        'rate_limit_buckets',
        'checkout_payment_attempts',
    ], CheckoutPreflight::REQUIRED_TABLES);
    $source = file_get_contents(dirname(__DIR__) . '/src/Application/CheckoutPreflight.php');
    $assertTrue(is_string($source));
    $assertTrue(str_contains($source, 'LIMIT 0'));
    $assertTrue(substr_count($source, 'CAST(enrollment.mp_checkout_id AS BINARY)') === 1);
    $assertTrue(substr_count($source, 'CAST(attempt.resource_id AS BINARY)') === 1);
    $assertTrue(substr_count($source, 'CAST(enrollment.mp_subscription_id AS BINARY)') >= 3);
    $assertTrue(substr_count($source, 'CAST(enrollment.mp_preference_id AS BINARY)') >= 3);
    $assertTrue(!str_contains($source, 'curl_exec'));
});

$test('fallo local definitivo conserva la clave y no simula resultado de Mercado Pago', static function () use ($assertSame, $assertTrue): void {
    $service = (new ReflectionClass(CreateEnrollmentService::class))->newInstanceWithoutConstructor();
    $method = new ReflectionMethod(CreateEnrollmentService::class, 'localDefinitiveFailureResponse');
    $method->setAccessible(true);
    $result = $method->invoke($service);

    $assertSame(503, $result['http_status']);
    $assertSame('local_checkout_unavailable', $result['body']['error']['code']);
    $assertSame(true, $result['body']['error']['retryable']);
    $assertSame('same_idempotency_key', $result['body']['error']['retry_mode']);
    $assertTrue(!array_key_exists('reference', $result['body']['error']));
});

$test('factory se prepara, la inscripción se persiste y después se crea el checkout', static function () use ($assertTrue): void {
    $source = file_get_contents(dirname(__DIR__) . '/src/Application/CreateEnrollmentService.php');
    $assertTrue(is_string($source));
    $requestPosition = strpos($source, '$checkoutRequest = $this->requestFactory->build(');
    $insertPosition = strpos($source, '$this->enrollments->create(');
    $gatewayPostPosition = strpos($source, '->createCheckout(');
    $assertTrue(is_int($requestPosition) && is_int($insertPosition) && $requestPosition < $insertPosition);
    $assertTrue(is_int($gatewayPostPosition) && $insertPosition < $gatewayPostPosition);
    $assertTrue(!str_contains($source, 'IdentityFingerprint::fromEmailAndPhone'));
    $assertTrue(!str_contains($source, '->acquireIdentityLease('));
    $assertTrue(str_contains($source, '->createCheckout('));
    $assertTrue(str_contains($source, '->searchCheckout('));
    $assertTrue(str_contains($source, 'fetchAndValidateCheckout'));
});

$test('disponibilidad combina gate contractual con preflight seguro', static function () use ($assertTrue): void {
    $source = file_get_contents(dirname(__DIR__) . '/public/api/disponibilidad.php');
    $assertTrue(is_string($source));
    $assertTrue(str_contains($source, "&& \$preflight['ready']"));
    $assertTrue(str_contains($source, "'preflight' => ["));
    $assertTrue(str_contains($source, "'status' => \$preflightPublicStatus"));
    $assertTrue(str_contains($source, "'schema_version' => PriceCatalog::AVAILABILITY_SCHEMA_VERSION"));
    $assertTrue(str_contains($source, "'payment_options' => \$paymentOptions"));
    $assertTrue(str_contains($source, "'offers' => \$catalog->publicOffers(\$allowed)"));
    $assertTrue(!str_contains($source, 'MP_API_TOKEN'));
    $assertTrue(!str_contains($source, 'MP_WEBHOOK_SECRET'));
});

$test('preflight exige todas las columnas de la migración 002', static function () use ($assertTrue): void {
    $source = file_get_contents(dirname(__DIR__) . '/src/Application/CheckoutPreflight.php');
    $assertTrue(is_string($source));
    foreach ([
        'checkout_type', 'checkout_amount', 'checkout_charge_count', 'mp_checkout_id',
        'mp_preference_id', 'checkout_link_verified', 'amount_refunded', 'ever_accredited',
    ] as $column) {
        $assertTrue(str_contains($source, $column), 'Falta sonda de ' . $column);
    }
    foreach ([
        'uq_enrollments_reference', 'uq_enrollments_idempotency',
        'uq_enrollments_mp_checkout', 'uq_enrollments_mp_preference',
        'uq_payment_records_mp_payment', 'uq_webhook_events_dedupe',
        'uq_checkout_attempt_number', 'uq_checkout_attempt_replaces',
    ] as $index) {
        $assertTrue(str_contains($source, $index), 'Falta sonda de ' . $index);
    }
    $assertTrue(str_contains($source, 'information_schema.STATISTICS'));
    $assertTrue(str_contains($source, 'NON_UNIQUE'));
});

$test('repositorio persiste modalidad real y permite CAS de conciliación incierta', static function () use ($assertTrue): void {
    $source = file_get_contents(dirname(__DIR__) . '/src/Infrastructure/EnrollmentRepository.php');
    $assertTrue(is_string($source));
    $assertTrue(str_contains($source, "'payment_mode' => \$input['payment_mode']"));
    $assertTrue(str_contains($source, "'checkout_type' => \$offer['checkout_type']"));
    $assertTrue(str_contains($source, "status IN ('creating_checkout', 'checkout_creation_uncertain')"));
    $assertTrue(str_contains($source, 'SELECT * FROM enrollments WHERE id = :id LIMIT 1 FOR UPDATE'));
    $assertTrue(str_contains($source, 'beginTransaction()'));
    $assertTrue(str_contains($source, 'payment.amount_refunded = 0'));
    $assertTrue(str_contains($source, 'payment.checkout_link_verified = 1'));
    $assertTrue(str_contains($source, 'COUNT(DISTINCT mp_payment_id)'));
    $assertTrue(str_contains($source, 'ever_accredited = 1'));
    $assertTrue(str_contains($source, 'VALUES(last_gateway_update_at) IS NULL'));
    $assertTrue(str_contains($source, "payment_records.status = 'charged_back'"));
    $assertTrue(str_contains($source, "payment_records.status = 'refunded'"));
    $assertTrue(substr_count($source, 'payment_records.enrollment_id = VALUES(enrollment_id)') >= 10);
    $assertTrue(str_contains($source, 'SELECT checkout_attempt_id, checkout_link_verified, status, status_detail,'));
    $assertTrue(str_contains($source, 'amount_refunded, ever_accredited, last_gateway_update_at'));
    $assertTrue(str_contains($source, 'INSERT INTO checkout_identity_leases'));
    $assertTrue(str_contains($source, 'DELETE lease'));
    $failureStart = strpos($source, 'public function markCheckoutFailure(');
    $failureEnd = strpos($source, 'public function reconcileInitialPayment(', is_int($failureStart) ? $failureStart : 0);
    $assertTrue(is_int($failureStart) && is_int($failureEnd) && $failureStart < $failureEnd);
    $failureBlock = substr($source, $failureStart, $failureEnd - $failureStart);
    $assertTrue(!str_contains($failureBlock, 'checkout_identity_leases'));
    $processor = file_get_contents(dirname(__DIR__) . '/src/Application/WebhookProcessor.php');
    $assertTrue(is_string($processor));
    $assertTrue(!str_contains($processor, 'releaseIdentityLeaseForCanceledSubscription('));
    $effectivePosition = strpos($processor, "\$status = \$effectivePayment['status'];");
    $transitionPosition = strpos($processor, '$transition = PaymentTransition::decide(');
    $assertTrue(is_int($effectivePosition) && is_int($transitionPosition) && $effectivePosition < $transitionPosition);
});

$test('migración 002 es aditiva, reejecutable y conserva rollback lógico', static function () use ($assertTrue): void {
    $migration = file_get_contents(dirname(__DIR__) . '/database/migrations/002_multi_checkout.sql');
    $rollback = file_get_contents(dirname(__DIR__) . '/database/migrations/002_multi_checkout_rollback.sql');
    $assertTrue(is_string($migration) && is_string($rollback));
    $assertTrue(str_contains($migration, 'information_schema.COLUMNS'));
    $assertTrue(str_contains($migration, 'information_schema.STATISTICS'));
    $assertTrue(str_contains($migration, 'ADD COLUMN checkout_type'));
    $assertTrue(str_contains($migration, 'CREATE TABLE IF NOT EXISTS checkout_identity_leases'));
    $assertTrue(str_contains($migration, 'PRIMARY KEY (identity_fingerprint)'));
    $assertTrue(!preg_match('/DROP\s+(TABLE|COLUMN)/i', $migration));
    $assertTrue(str_contains($rollback, 'Rollback lógico'));
});

$test('cliente usa idempotencia remota solo en preferencias', static function () use ($assertTrue): void {
    $source = file_get_contents(dirname(__DIR__) . '/src/Infrastructure/MercadoPagoClient.php');
    $assertTrue(is_string($source));
    $preferencePosition = strpos($source, "'preference' => \$this->request(");
    $headerPosition = strpos($source, 'X-Idempotency-Key: ');
    $subscriptionPosition = strpos($source, "'subscription' => \$this->createSubscription(\$payload)");
    $assertTrue(is_int($preferencePosition) && is_int($headerPosition) && $headerPosition > $preferencePosition);
    $assertTrue(is_int($subscriptionPosition) && $subscriptionPosition < $preferencePosition);
    $assertTrue(str_contains($source, '[408, 409, 429]'));
    $assertTrue(str_contains($source, "in_array(\$method, ['POST', 'PUT'], true)"));
    $assertTrue(str_contains($source, "['status' => 'canceled']"));
    $assertTrue(str_contains($source, "\$status >= 200 && \$status < 300"));
    $assertTrue(str_contains($source, 'invalidGatewayBody'));
});

$test('cliente conserva solo códigos seguros del error de Mercado Pago', static function () use ($assertSame, $assertTrue): void {
    $environment = [];
    foreach (['APP_ENV' => 'production', 'MP_CREDENTIAL_ENVIRONMENT' => 'production', 'MP_API_TOKEN' => 'token-test', 'MP_SELLER_ID' => '42', 'MP_APPLICATION_ID' => '43'] as $name => $value) {
        $environment[$name] = getenv($name);
        putenv($name . '=' . $value);
    }
    try {
        $transport = static fn (): array => [
            'body' => json_encode([
                'error' => 'bad_request',
                'message' => 'payer@example.test secret detail',
                'cause' => [
                    ['code' => 'invalid_transaction_amount', 'description' => 'payer@example.test'],
                    ['code' => 2001, 'data' => ['email' => 'payer@example.test']],
                    ['code' => 'unsafe@email.test'],
                ],
            ], JSON_THROW_ON_ERROR),
            'transport_code' => 0,
            'http_status' => 400,
            'provider_request_id' => 'abc123-request-456',
        ];
        $client = new MercadoPagoClient(new Config(), null, $transport);
        try {
            $client->createSubscription(['status' => 'pending']);
            throw new RuntimeException('Se esperaba un rechazo del proveedor.');
        } catch (MercadoPagoApiException $exception) {
            $assertSame(400, $exception->httpStatus);
            $assertSame('bad_request', $exception->providerErrorCode);
            $assertSame('abc123-request-456', $exception->providerRequestId);
            $assertTrue(!str_contains((string) $exception->providerErrorCode, 'payer'));
            $assertTrue(!str_contains((string) $exception->providerErrorCode, '@'));
            $unsafe = new MercadoPagoApiException(400, false, false, providerErrorCode: 'token-or-unknown-code', providerRequestId: "bad\nheader");
            $assertSame(null, $unsafe->providerErrorCode);
            $assertSame(null, $unsafe->providerRequestId);
        }
    } finally {
        foreach ($environment as $name => $value) {
            $value === false ? putenv($name) : putenv($name . '=' . $value);
        }
    }
});

$test('HTTP 400 se clasifica como solicitud rechazada y nunca como configuración', static function () use ($assertTrue): void {
    $service = file_get_contents(dirname(__DIR__) . '/src/Application/CreateEnrollmentService.php');
    $frontend = file_get_contents(dirname(__DIR__) . '/public/index.html');
    $assertTrue(is_string($service) && is_string($frontend));
    $assertTrue(str_contains($service, "[400, 422], true) => 'mercado_pago_request_rejected'"));
    $assertTrue(str_contains($service, '[401, 403]'));
    $assertTrue(str_contains($service, 'provider_code=%s request_id=%s'));
    $assertTrue(str_contains($frontend, 'mercado_pago_request_rejected'));
});

$test('cliente reduce el monto recurrente con un PUT mínimo y exacto', static function () use ($assertSame): void {
    $environment = [];
    foreach (['APP_ENV' => 'production', 'MP_CREDENTIAL_ENVIRONMENT' => 'production', 'MP_API_TOKEN' => 'token-test', 'MP_SELLER_ID' => '42', 'MP_APPLICATION_ID' => '43'] as $name => $value) {
        $environment[$name] = getenv($name);
        putenv($name . '=' . $value);
    }
    try {
        $calls = [];
        $transport = static function (string $method, string $path, ?array $payload, int $timeout) use (&$calls): array {
            $calls[] = compact('method', 'path', 'payload', 'timeout');
            return ['body' => json_encode(['id' => 'sub-test'], JSON_THROW_ON_ERROR), 'transport_code' => 0, 'http_status' => 200];
        };
        $client = new MercadoPagoClient(new Config(), null, $transport);
        $client->updateSubscriptionAmount('sub-test', 25490, 'CLP');
        $assertSame('PUT', $calls[0]['method']);
        $assertSame('/preapproval/sub-test', $calls[0]['path']);
        $assertSame(['auto_recurring' => ['transaction_amount' => 25490, 'currency_id' => 'CLP']], $calls[0]['payload']);
    } finally {
        foreach ($environment as $name => $value) {
            $value === false ? putenv($name) : putenv($name . '=' . $value);
        }
    }
});

$test('matrícula automática solo normaliza el contrato v4 exacto una vez después del pago inicial', static function () use ($assertSame, $assertThrows): void {
    $environment = [];
    foreach (['APP_ENV' => 'production', 'MP_CREDENTIAL_ENVIRONMENT' => 'production', 'MP_SELLER_ID' => '42', 'MP_APPLICATION_ID' => '43'] as $name => $value) {
        $environment[$name] = getenv($name);
        putenv($name . '=' . $value);
    }
    try {
        $reference = 'DGYM-20261006-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
        $enrollment = [
            'id' => 1,
            'pricing_version' => '2026-10-06-v4',
            'plan_code' => 'pro',
            'payment_mode' => 'automatic',
            'duration_months' => 12,
            'checkout_type' => 'subscription',
            'checkout_amount' => 40490,
            'checkout_charge_count' => 12,
            'installment_amount' => 25490,
            'contract_total' => 320880,
            'initial_payment_confirmed_at' => '2026-10-06 12:00:00.000',
            'mp_subscription_id' => 'sub-test',
            'reference' => $reference,
            'currency' => 'CLP',
        ];
        $pdo = new class($enrollment) extends PDO {
            public function __construct(public array $enrollment) {}
            public function prepare(string $query, array $options = []): PDOStatement|false {
                return new class($this) extends PDOStatement {
                    public function __construct(private PDO $database) {}
                    public function execute(?array $params = null): bool { return true; }
                    public function fetch(int $mode = PDO::FETCH_DEFAULT, int $cursorOrientation = PDO::FETCH_ORI_NEXT, int $cursorOffset = 0): mixed {
                        return $this->database->enrollment;
                    }
                };
            }
        };
        $gateway = new class($reference) implements CheckoutGateway, SubscriptionAmountGateway {
            public int $updates = 0;
            public array $subscription;
            public function __construct(string $reference) {
                $this->subscription = [
                    'id' => 'sub-test', 'external_reference' => $reference,
                    'collector_id' => 42, 'application_id' => 43,
                    'status' => 'authorized',
                    'auto_recurring' => ['transaction_amount' => 40490, 'currency_id' => 'CLP'],
                ];
            }
            public function updateSubscriptionAmount(string $id, int $amount, string $currency): array {
                ++$this->updates;
                $this->subscription['auto_recurring']['transaction_amount'] = $amount;
                return $this->subscription;
            }
            public function createCheckout(string $checkoutType, array $payload, string $idempotencyKey): array { throw new RuntimeException('Unexpected mutation.'); }
            public function searchCheckout(string $checkoutType, string $externalReference, string $payerEmail, int $expectedAmount): array { return []; }
            public function getSubscription(string $id): array { return $this->subscription; }
            public function getPreference(string $id): array { throw new RuntimeException('Unexpected preference.'); }
            public function getPayment(string $id): array { throw new RuntimeException('Unexpected payment.'); }
            public function getMerchantOrder(string $id): array { throw new RuntimeException('Unexpected order.'); }
            public function getAuthorizedPayment(string $id): array { throw new RuntimeException('Unexpected invoice.'); }
            public function getChargeback(string $id): array { throw new RuntimeException('Unexpected chargeback.'); }
            public function getClaim(string $id): array { throw new RuntimeException('Unexpected claim.'); }
        };
        $processor = new WebhookProcessor(new Config(), new EnrollmentRepository($pdo), new WebhookEventRepository($pdo), $gateway);
        $terms = new ReflectionMethod(WebhookProcessor::class, 'enrollmentFeeSubscriptionTerms');
        $assertSame(['checkout' => 40490, 'installment' => 25490], $terms->invoke($processor, $enrollment));

        // Las versiones que nunca incluyeron matrícula quedan excluidas por
        // identidad de contrato, aunque una fila corrupta tenga diferencia de
        // $15.000. Una versión futura tampoco hereda esta mutación financiera.
        $legacy = array_replace($enrollment, [
            'pricing_version' => '2026-09-07-v2',
            'checkout_amount' => 25490,
            'installment_amount' => 19080,
            'contract_total' => 228960,
        ]);
        $assertSame(null, $terms->invoke($processor, $legacy));
        $assertSame(null, $terms->invoke($processor, array_replace($enrollment, ['pricing_version' => 'future-version'])));
        $paymentMoney = new ReflectionMethod(WebhookProcessor::class, 'assertPaymentMoney');
        $subscriptionMoney = new ReflectionMethod(WebhookProcessor::class, 'assertSubscriptionRecurringAmount');
        $paymentMoney->invoke($processor, $enrollment, 25490, 'CLP', null);
        $subscriptionMoney->invoke($processor, $enrollment, 25490, 'CLP');
        $assertThrows(
            static fn () => $paymentMoney->invoke($processor, $legacy, 19080, 'CLP', null),
            Throwable::class
        );
        $assertThrows(
            static fn () => $subscriptionMoney->invoke($processor, $legacy, 19080, 'CLP'),
            Throwable::class
        );
        $assertThrows(
            static fn () => $terms->invoke($processor, array_replace($enrollment, ['contract_total' => 305880])),
            Throwable::class
        );

        $normalize = new ReflectionMethod(WebhookProcessor::class, 'normalizeRecurringAmountAfterEnrollmentFee');
        $normalize->invoke($processor, 1);
        $normalize->invoke($processor, 1);
        $assertSame(1, $gateway->updates);
        $assertSame(25490, $gateway->subscription['auto_recurring']['transaction_amount']);

        $pdo->enrollment = $legacy;
        $normalize->invoke($processor, 1);
        $assertSame(1, $gateway->updates, 'Un contrato histórico nunca debe descontar matrícula.');
    } finally {
        foreach ($environment as $name => $value) {
            $value === false ? putenv($name) : putenv($name . '=' . $value);
        }
    }
});

$test('conciliación preapproval usa filtros oficiales, paginación y filtro local exacto', static function () use ($assertTrue): void {
    $source = file_get_contents(dirname(__DIR__) . '/src/Infrastructure/MercadoPagoClient.php');
    $assertTrue(is_string($source));
    $assertTrue(!str_contains($source, "'/preapproval/search?external_reference='"));
    $assertTrue(str_contains($source, "'q' => \$reference"));
    $assertTrue(str_contains($source, "'payer_email' => \$payerEmail"));
    $assertTrue(str_contains($source, "'transaction_amount' => \$expectedAmount"));
    $assertTrue(str_contains($source, "'limit' => \$limit"));
    $assertTrue(str_contains($source, "'offset' => \$offset"));
    $assertTrue(str_contains($source, 'hash_equals($reference'));
    $assertTrue(str_contains($source, 'La búsqueda de conciliación excedió el límite seguro.'));
});

$test('sandbox exige alcance declarado y acredita entorno, seller y aplicación por GET autenticado', static function () use ($assertTrue): void {
    $config = file_get_contents(dirname(__DIR__) . '/src/Config.php');
    $processor = file_get_contents(dirname(__DIR__) . '/src/Application/WebhookProcessor.php');
    $assertTrue(is_string($config) && is_string($processor));
    $assertTrue(str_contains($config, "required('MP_CREDENTIAL_ENVIRONMENT')"));
    $assertTrue(str_contains($config, "required('MP_APPLICATION_ID')"));
    $assertTrue(!str_contains($config, "str_starts_with(\$accessToken"));
    $assertTrue(str_contains($processor, 'assertMercadoPagoCredentialEnvironment'));
    $assertTrue(str_contains($processor, 'authenticatedResourceMatchesEnvironment'));
    $assertTrue(!str_contains($processor, 'gateway_environment_mismatch'));
    $assertTrue(str_contains($processor, 'No se pudo acreditar entorno, collector y aplicación del recurso.'));
    $assertTrue(str_contains($processor, 'mercadoPagoApplicationId'));
    $assertTrue(!str_contains($processor, 'bool $liveMode'));
    $client = file_get_contents(dirname(__DIR__) . '/src/Infrastructure/MercadoPagoClient.php');
    $assertTrue(is_string($client));
    $assertTrue(str_contains($client, '$this->config->assertMercadoPagoCredentialEnvironment();'));
    $assertTrue(str_contains($client, "'X-Caller-Id: ' . \$this->config->mercadoPagoSellerId()"));
    $assertTrue(str_contains($config, "required('MP_SELLER_ID')"));
});

$test('webhook reconoce pago, suscripción, devolución parcial, contracargo y reclamo', static function () use ($assertSame, $assertTrue): void {
    $processor = (new ReflectionClass(WebhookProcessor::class))->newInstanceWithoutConstructor();
    $kind = new ReflectionMethod(WebhookProcessor::class, 'resourceKind');
    $kind->setAccessible(true);
    $assertSame('payment', $kind->invoke($processor, 'payment'));
    $assertSame('subscription', $kind->invoke($processor, 'subscription_preapproval'));
    $assertSame('authorized_payment', $kind->invoke($processor, 'subscription_authorized_payment'));
    $assertSame('chargeback', $kind->invoke($processor, 'chargebacks'));
    $assertSame('chargeback', $kind->invoke($processor, 'topic_chargebacks_wh'));
    $assertSame('claim', $kind->invoke($processor, 'claims'));
    $assertSame('claim', $kind->invoke($processor, 'topic_claims_integration_wh'));

    $paymentIds = new ReflectionMethod(WebhookProcessor::class, 'relatedPaymentIds');
    $paymentIds->setAccessible(true);
    $assertSame(['pay-A', 'pay-B'], $paymentIds->invoke($processor, [
        'payments' => [['id' => 'pay-A'], ['payment_id' => 'pay-B']],
    ]));
    $assertSame([], $paymentIds->invoke($processor, ['payments' => []]));

    $source = file_get_contents(dirname(__DIR__) . '/src/Application/WebhookProcessor.php');
    $transitionSource = file_get_contents(dirname(__DIR__) . '/src/Domain/PaymentTransition.php');
    $assertTrue(is_string($source) && is_string($transitionSource));
    $assertTrue(str_contains($source, 'transaction_amount_refunded'));
    $assertTrue(str_contains($transitionSource, 'payment_refunded'));
    $assertTrue(str_contains($source, 'chargeback_received'));
    $assertTrue(str_contains($source, 'duplicate_payment_detected'));
    $assertTrue(str_contains($source, 'charge_count_exceeded'));
    $assertTrue(str_contains($source, 'authorized_payment_link_missing'));
    $assertTrue(str_contains($source, 'authorizedOwnershipSubscription'));
    $assertTrue(str_contains($source, 'getSubscription($authorizedSubscriptionId)'));
    $assertTrue(str_contains($source, 'ownership mediante su suscripción'));
    $assertTrue(str_contains($source, 'authorized_payment_subscription_link_missing'));
    $assertTrue(str_contains($source, "['scheduled', 'recycling']"));
    $assertTrue(str_contains($source, 'timestamp de actualización válido'));
    $assertTrue(str_contains($source, "['creating_checkout', 'checkout_creation_uncertain']"));
    $assertTrue(str_contains($source, 'GatewayStateNotReadyException'));
    $assertTrue(str_contains($source, 'withLockedEnrollment'));
    $assertTrue(str_contains($source, 'reviewAmbiguousChargeback'));
    $assertTrue(str_contains($source, 'chargeback_multiple_payments'));
    $assertTrue(str_contains($source, 'chargeback_payment_link_ambiguous'));
});

$test('webhook trata 404 como propagación transitoria y solo acusa 400 422', static function () use ($assertSame, $assertTrue): void {
    $source = file_get_contents(dirname(__DIR__) . '/public/webhooks/mercadopago.php');
    $assertTrue(is_string($source));
    $matched = preg_match(
        '/permanentGatewayFailure = in_array\(\$exception->httpStatus, \[([0-9, ]+)\], true\)/',
        $source,
        $parts
    );
    $assertSame(1, $matched);
    $statuses = array_map('intval', array_map('trim', explode(',', $parts[1])));
    $assertSame([400, 422], $statuses);
    $assertTrue(str_contains($source, "401, 403 => 'gateway_authentication_failed'"));
    $assertTrue(str_contains($source, "404 => 'gateway_resource_not_ready'"));
});

$test('dedupe solo acusa terminales y conserva reintento mientras existe lease', static function () use ($assertSame, $assertTrue): void {
    foreach (['processed', 'ignored', 'unmatched', 'review_required', 'failed_permanent'] as $status) {
        $assertSame(true, WebhookEventRepository::isTerminalStatus($status));
    }
    foreach (['received', 'processing', 'failed_transient', null] as $status) {
        $assertSame(false, WebhookEventRepository::isTerminalStatus($status));
    }
    $repository = file_get_contents(dirname(__DIR__) . '/src/Infrastructure/WebhookEventRepository.php');
    $receiver = file_get_contents(dirname(__DIR__) . '/public/webhooks/mercadopago.php');
    $assertTrue(is_string($repository) && is_string($receiver));
    $assertTrue(str_contains($repository, "status IN ('received', 'failed_transient')"));
    $assertTrue(str_contains($repository, "status = 'processing' AND processing_started_at <"));
    $assertTrue(str_contains($receiver, 'WebhookEventRepository::isTerminalStatus'));
    $assertTrue(str_contains($receiver, "'event_processing'"));
    $assertTrue(str_contains($receiver, 'catch (GatewayStateNotReadyException'));
    $assertTrue(str_contains($receiver, "'gateway_state_not_ready'"));
    $assertTrue(str_contains($receiver, '], 503)'));
});

$test('redirección canónica conserva URI y no reemplaza el query string', static function () use ($assertTrue): void {
    $rules = file_get_contents(dirname(__DIR__) . '/public/.htaccess');
    $productionRules = file_get_contents(dirname(__DIR__) . '/deploy/public-production.htaccess');
    $assertTrue(is_string($rules));
    $assertTrue(is_string($productionRules));
    $assertTrue(str_contains($rules, 'RewriteCond %{HTTP_HOST} ^www\\.demogym\\.example(?::[0-9]+)?$ [NC]'));
    $assertTrue(str_contains($rules, 'https://demogym.example%{REQUEST_URI}'));
    $assertTrue(!str_contains($rules, '[QSD'));
    $assertTrue(str_contains($productionRules, 'SetEnv APP_ENV production'));
    // The production profile opens the gate only after explicit approval. The base public
    // profile remains closed for sandbox; never deploy it over production.
    $assertTrue(str_contains($productionRules, 'SetEnv DGYM_CHECKOUT_ENABLED true'));
    $assertTrue(str_contains($rules, 'SetEnv APP_ENV development'));
    $assertTrue(str_contains($rules, 'SetEnv DGYM_CHECKOUT_ENABLED false'));
    $assertTrue(str_contains($productionRules, 'SetEnv DGYM_ALLOWED_AUTOMATIC_DURATIONS 3,6,12'));
    $assertTrue(str_contains($productionRules, 'SetEnv DGYM_ALLOWED_SINGLE_DURATIONS 1'));
    $assertTrue(str_contains($productionRules, 'SetEnv DGYM_ALLOWED_PREPAID_DURATIONS 3,6,12'));
    $assertTrue(str_contains($productionRules, 'RewriteCond %{HTTPS} !=on [OR]'));
    $assertTrue(str_contains($productionRules, 'RewriteCond %{HTTP_HOST} !^demogym\\.example(?::443)?$ [NC]'));
    $assertTrue(str_contains($productionRules, 'https://demogym.example%{REQUEST_URI}'));
    $assertTrue(str_contains($productionRules, '[R=308,L,NE]'));
    $assertTrue(!str_contains($productionRules, '[QSD'));
    $assertTrue(str_contains($productionRules, 'Header always set Strict-Transport-Security'));
    $assertTrue(str_contains($productionRules, 'Header always set Content-Security-Policy'));
    $assertTrue(str_contains($productionRules, 'frame-ancestors'));
    $assertTrue(str_contains($productionRules, 'Header always set X-Frame-Options "DENY"'));
    $assertTrue(str_contains($productionRules, 'Header always set Cache-Control "no-store'));
});

$test('inscripciones exige Origin explícito y same-origin antes de consumir rate limit', static function () use ($assertTrue): void {
    $endpoint = file_get_contents(dirname(__DIR__) . '/public/api/inscripciones.php');
    $request = file_get_contents(dirname(__DIR__) . '/src/Http/Request.php');
    $assertTrue(is_string($endpoint) && is_string($request));

    $missingOrigin = strpos($endpoint, "Request::header('Origin') === ''");
    $sameOrigin = strpos($endpoint, 'Request::assertSameOrigin($app->config->allowedOrigin())');
    $rateLimit = strpos($endpoint, '$app->rateLimiter->consume(');
    $assertTrue(is_int($missingOrigin) && is_int($sameOrigin) && is_int($rateLimit));
    $assertTrue($missingOrigin < $sameOrigin && $sameOrigin < $rateLimit);
    $assertTrue(str_contains($endpoint, "new HttpException(403, 'invalid_origin'"));
    $assertTrue(str_contains($request, "throw new HttpException(403, 'invalid_origin'"));
});

$test('lease abandonado pre-POST se retira y reemplaza de forma atómica', static function () use ($assertTrue): void {
    $repository = file_get_contents(dirname(__DIR__) . '/src/Infrastructure/EnrollmentRepository.php');
    $assertTrue(is_string($repository));
    $start = strpos($repository, 'public function acquireIdentityLease(');
    $end = strpos($repository, 'public function findByIdentityLease(', is_int($start) ? $start : 0);
    $assertTrue(is_int($start) && is_int($end) && $start < $end);
    $block = substr($repository, $start, $end - $start);

    $retire = strpos($block, "enrollment.error_code = 'abandoned_before_checkout'");
    $cleanup = strpos($block, 'DELETE lease');
    $insert = strpos($block, 'INSERT INTO checkout_identity_leases');
    $assertTrue(is_int($retire) && is_int($cleanup) && is_int($insert));
    $assertTrue($retire < $cleanup && $cleanup < $insert);
    $assertTrue(str_contains($block, "enrollment.status = 'creating_checkout'"));
    $assertTrue(str_contains($block, 'lease.enrollment_id IS NULL'));
    $assertTrue(str_contains($block, 'lease.acquired_at < UTC_TIMESTAMP(3) - INTERVAL 10 MINUTE'));
    foreach (['mp_checkout_id IS NULL', 'mp_subscription_id IS NULL', 'mp_preference_id IS NULL', "checkout_url = ''"] as $guard) {
        $assertTrue(str_contains($block, $guard), 'Falta guarda pre-POST: ' . $guard);
    }
    $assertTrue(str_contains($block, 'beginTransaction()'));
    $assertTrue(str_contains($block, 'commit()'));
    $assertTrue(str_contains($block, 'rollBack()'));
});

$test('reintento de pago conserva una sola inscripción y todos los recursos históricos', static function () use ($assertTrue): void {
    $migration = file_get_contents(dirname(__DIR__) . '/database/migrations/004_payment_retry_attempts.sql');
    $repository = file_get_contents(dirname(__DIR__) . '/src/Infrastructure/EnrollmentRepository.php');
    $assertTrue(is_string($migration) && is_string($repository));
    $assertTrue(str_contains($migration, 'CREATE TABLE IF NOT EXISTS checkout_payment_attempts'));
    $assertTrue(str_contains($migration, 'UNIQUE KEY uq_checkout_attempt_replaces (replaces_attempt_id)'));
    $assertTrue(str_contains($migration, 'UNIQUE KEY uq_checkout_attempt_number (enrollment_id, attempt_number)'));
    $assertTrue(!str_contains($migration, 'INSERT IGNORE INTO checkout_payment_attempts'));
    $assertTrue(str_contains($migration, 'existing_attempt.id IS NULL'));
    $assertTrue(str_contains($migration, 'ADD COLUMN active_checkout_attempt_id'));
    $assertTrue(str_contains($migration, 'ADD COLUMN checkout_attempt_id'));
    $assertTrue(str_contains($migration, 'CAST(attempt.resource_id AS BINARY) <=> CASE'));
    $assertTrue(substr_count($migration, 'CAST(enrollments.mp_subscription_id AS BINARY)') >= 2);
    $assertTrue(substr_count($migration, 'CAST(enrollments.mp_preference_id AS BINARY)') >= 2);
    $assertTrue(str_contains($migration, 'CAST(enrollment.mp_subscription_id AS BINARY)'));
    $assertTrue(str_contains($migration, 'CAST(enrollment.mp_preference_id AS BINARY)'));
    $assertTrue(str_contains($repository, 'findCheckoutAttemptByResourceId'));
    $assertTrue(str_contains($repository, 'findCheckoutAttemptByReference'));
    $assertTrue(str_contains($repository, 'payment.ever_accredited = 1'));
    $assertTrue(str_contains($repository, "payment.status IN ('refunded', 'charged_back')"));
});

$test('preferencia solo se reabre vigente después de conciliación doble y decisión bloqueada', static function () use ($assertTrue): void {
    $service = file_get_contents(dirname(__DIR__) . '/src/Application/PaymentRetryService.php');
    $repository = file_get_contents(dirname(__DIR__) . '/src/Infrastructure/EnrollmentRepository.php');
    $assertTrue(is_string($service) && is_string($repository));

    $start = strpos($service, 'private function resumePreferenceCheckout(');
    $end = strpos($service, 'private function validatedPreference(', is_int($start) ? $start : 0);
    $assertTrue(is_int($start) && is_int($end) && $start < $end);
    $block = substr($service, $start, $end - $start);
    $assertTrue(substr_count($block, '$this->validatedPreference(') === 2);
    $assertTrue(str_contains($block, 'new ReconciliationScan('));
    $assertTrue(str_contains($block, '$this->mercadoPago->getPayment('));
    $assertTrue(str_contains($block, '$this->verifyAndPersistPayment('));
    $assertTrue(str_contains($block, '$this->enrollments->preferenceRetryDecision('));
    $assertTrue(str_contains($block, "'search_passes' => 2"));
    $assertTrue(str_contains($service, "hash_equals(\$expectedId, (string) \$validated['resource_id'])"));
    $assertTrue(!str_contains($block, 'createCheckout('));
    $assertTrue(!str_contains($block, 'cancelSubscription('));
    $assertTrue(!str_contains($block, 'preparePaymentRetryAttempt('));

    $decisionStart = strpos($repository, 'public function preferenceRetryDecision(');
    $decisionEnd = strpos($repository, 'public function ', is_int($decisionStart) ? $decisionStart + 20 : 0);
    $assertTrue(is_int($decisionStart) && is_int($decisionEnd) && $decisionStart < $decisionEnd);
    $decision = substr($repository, $decisionStart, $decisionEnd - $decisionStart);
    $assertTrue(substr_count($decision, 'FOR UPDATE') >= 3);
    $assertTrue(str_contains($decision, '$actualPaymentIds !== $expectedPaymentIds'));
    $assertTrue(str_contains($decision, "['rejected', 'canceled', 'cancelled']"));
    foreach (['checkout_link_verified', 'ever_accredited', 'amount_refunded', 'initial_payment_confirmed_at', 'membership_status', 'enrollment_not_retryable'] as $guard) {
        $assertTrue(str_contains($decision, $guard), 'Falta guarda financiera: ' . $guard);
    }
});

$test('webhook de preferencia exige vínculo nativo u orden comercial autenticada', static function () use ($assertTrue): void {
    $processor = file_get_contents(dirname(__DIR__) . '/src/Application/WebhookProcessor.php');
    $proof = file_get_contents(dirname(__DIR__) . '/src/Application/CheckoutPaymentVerification.php');
    $gateway = file_get_contents(dirname(__DIR__) . '/src/Domain/CheckoutGateway.php');
    $assertTrue(is_string($processor) && is_string($proof) && is_string($gateway));
    $assertTrue(str_contains($processor, "=== 'preference'"));
    $assertTrue(str_contains($processor, '$this->verifyPaymentCheckout('));
    $assertTrue(str_contains($processor, '$this->mercadoPago->getMerchantOrder('));
    $assertTrue(str_contains($processor, "['native_preference', 'merchant_order']"));
    $assertTrue(!str_contains($processor, '$checkoutLinkVerified = true;'));
    $assertTrue(str_contains($proof, 'merchantOrderPaymentIds('));
    $assertTrue(str_contains($proof, 'Invalid merchant order ownership proof.'));
    $assertTrue(str_contains($gateway, 'getMerchantOrder(string $id)'));
});

$test('vigencia declarada de preferencia se valida en UTC y falla cerrado', static function () use ($assertThrows): void {
    $service = (new ReflectionClass(PaymentRetryService::class))->newInstanceWithoutConstructor();
    $method = new ReflectionMethod(PaymentRetryService::class, 'assertPreferenceActive');

    $method->invoke($service, []);
    $method->invoke($service, ['expires' => false]);
    $method->invoke($service, [
        'expires' => true,
        'expiration_date_from' => gmdate('c', time() - 3600),
        'expiration_date_to' => gmdate('c', time() + 3600),
    ]);
    $assertThrows(static fn () => $method->invoke($service, [
        'expires' => true,
        'expiration_date_from' => gmdate('c', time() - 7200),
        'expiration_date_to' => gmdate('c', time() - 3600),
    ]), RuntimeException::class);
    $assertThrows(static fn () => $method->invoke($service, ['expires' => 'false']), RuntimeException::class);
    $assertThrows(static fn () => $method->invoke($service, ['expires' => true]), RuntimeException::class);
});

$test('reintento separa cancelación creación y activación y nunca repite un POST incierto', static function () use ($assertTrue): void {
    $service = file_get_contents(dirname(__DIR__) . '/src/Application/PaymentRetryService.php');
    $client = file_get_contents(dirname(__DIR__) . '/src/Infrastructure/MercadoPagoClient.php');
    $assertTrue(is_string($service) && is_string($client));
    $cancelMethod = strpos($service, 'private function cancelOldAttempt');
    $cancel = strpos($service, 'cancelSubscription(', is_int($cancelMethod) ? $cancelMethod : 0);
    $ready = strpos($service, 'markPaymentRetryReadyToCreate(', is_int($cancel) ? $cancel : 0);
    $continue = strpos($service, 'return $this->continueResponse', is_int($ready) ? $ready : 0);
    $create = strpos($service, 'private function createNewAttempt');
    $assertTrue(is_int($cancel) && is_int($ready) && is_int($continue) && is_int($create));
    $assertTrue($cancel < $ready && $ready < $continue && $continue < $create);
    $assertTrue(str_contains($service, "['creating', 'creation_uncertain']"));
    $assertTrue(str_contains($service, '$this->mercadoPago->searchCheckout('));
    $assertTrue(str_contains($service, '$this->enrollments->findPaymentRetryByReplacedAttempt('));
    $confirm = strpos($service, 'private function confirmNewAttempt');
    $activateMethod = strpos($service, 'private function activateConfirmedAttempt');
    $finalCheck = strpos($service, 'freshFinancialCheck(', is_int($activateMethod) ? $activateMethod : 0);
    $activate = strpos($service, 'activatePaymentRetryAttempt(', is_int($finalCheck) ? $finalCheck : 0);
    $assertTrue(is_int($confirm) && is_int($activateMethod) && is_int($finalCheck) && is_int($activate));
    $confirmBlock = substr($service, $confirm, $activateMethod - $confirm);
    $assertTrue(!str_contains($confirmBlock, 'activatePaymentRetryAttempt('));
    $assertTrue($finalCheck < $activate);
    $assertTrue(str_contains($service, '$this->enrollments->upsertPayment('));
    $assertTrue(str_contains($service, 'CheckoutPaymentVerification::proof('));
    $assertTrue(str_contains($client, "['status' => 'canceled']"));
    $assertTrue(str_contains($service, "in_array(\$retryState, ['creating', 'creation_uncertain'], true)"));
    $assertTrue(str_contains($service, "\$retryState === 'creating' ? 3 : 6"));
    $assertTrue(str_contains($service, "\$retryState === 'creating' ? 120 : 600"));
});

$test('reintento registra evidencia estable por fase sin payload financiero crudo', static function () use ($assertTrue): void {
    $service = file_get_contents(dirname(__DIR__) . '/src/Application/PaymentRetryService.php');
    $assertTrue(is_string($service));
    foreach (['initial-precheck', 'cancellation-precheck', 'cancellation-confirmed', 'creation-precheck', 'checkout-confirmed', 'activation-precheck'] as $phase) {
        $assertTrue(str_contains($service, "'" . $phase . "'"), 'Falta evidencia de fase ' . $phase);
    }
    $assertTrue(str_contains($service, "'schema' => 'dgym-payment-retry-evidence/1'"));
    $assertTrue(str_contains($service, "'payment_id_digests'"));
    $assertTrue(str_contains($service, "'invoice_id_digests'"));
    $assertTrue(!str_contains($service, "'payment_payload'"));
});

$test('pago acreditado activo se aplica sin cancelar y acreditación tardía pasa a revisión', static function () use ($assertTrue): void {
    $service = file_get_contents(dirname(__DIR__) . '/src/Application/PaymentRetryService.php');
    $repository = file_get_contents(dirname(__DIR__) . '/src/Infrastructure/EnrollmentRepository.php');
    $assertTrue(is_string($service) && is_string($repository));
    $start = strpos($service, 'private function resolveAccreditedPaymentBeforeRetry(');
    $end = strpos($service, 'private function validateRetryCheckout(', is_int($start) ? $start : 0);
    $assertTrue(is_int($start) && is_int($end) && $start < $end);
    $block = substr($service, $start, $end - $start);
    $assertTrue(str_contains($block, "(string) (\$attempt['lifecycle_status'] ?? '') === 'active'"));
    $assertTrue(str_contains($block, '$successorStillPreCancellation'));
    $assertTrue(str_contains($block, "=== 'awaiting_cancellation'"));
    $assertTrue(str_contains($block, "=== 'payment_received_before_cancellation'"));
    $assertTrue(str_contains($block, "'payment_received_before_cancellation'"));
    $assertTrue(str_contains($block, "'historical_attempt_financial_activity'"));
    $assertTrue(str_contains($block, 'PaymentTransition::decide('));
    $assertTrue(str_contains($block, '$this->enrollments->applyActivePaymentStateBeforeRetry('));
    $assertTrue(str_contains($block, "'payment_already_received'"));
    $assertTrue(!str_contains($block, 'cancelSubscription('));
    $assertTrue(!str_contains($block, 'createCheckout('));
    $assertTrue(str_contains($service, "'local_financial_evidence_before_retry'"));
    $assertTrue(str_contains($service, '$this->markEnrollmentReview('));
    $atomicStart = strpos($repository, 'public function applyActivePaymentStateBeforeRetry(');
    $atomicEnd = strpos($repository, '/** @return array{initial_payment:', is_int($atomicStart) ? $atomicStart : 0);
    $assertTrue(is_int($atomicStart) && is_int($atomicEnd) && $atomicStart < $atomicEnd);
    $atomic = substr($repository, $atomicStart, $atomicEnd - $atomicStart);
    $update = strpos($atomic, '$this->updateGatewayState(');
    $reconcile = strpos($atomic, '$this->reconcileInitialPayment(');
    $terminal = strpos($atomic, '$this->transitionPaymentRetryAttempt(');
    $assertTrue(str_contains($atomic, 'beginTransaction()'));
    $assertTrue(str_contains($atomic, 'FOR UPDATE'));
    $assertTrue(str_contains($atomic, 'commit()'));
    $assertTrue(str_contains($atomic, 'rollBack()'));
    $assertTrue(is_int($update) && is_int($reconcile) && is_int($terminal));
    $assertTrue($update < $reconcile && $reconcile < $terminal);
});

$test('pago en proceso activo bloquea otro checkout sin convertirlo en revisión manual', static function () use ($assertTrue): void {
    $service = file_get_contents(dirname(__DIR__) . '/src/Application/PaymentRetryService.php');
    $assertTrue(is_string($service));
    $start = strpos($service, 'private function resolvePendingPaymentBeforeRetry(');
    $end = strpos($service, 'private function validateRetryCheckout(', is_int($start) ? $start : 0);
    $assertTrue(is_int($start) && is_int($end) && $start < $end);
    $block = substr($service, $start, $end - $start);
    $assertTrue(str_contains($service, "in_array(\$status, ['pending', 'in_process'], true)"));
    $assertTrue(str_contains($block, '$this->enrollments->applyActivePaymentStateBeforeRetry('));
    $assertTrue(str_contains($block, "'payment_confirmation_pending'"));
    $assertTrue(str_contains($block, "'historical_attempt_financial_activity'"));
    $assertTrue(!str_contains($block, 'cancelSubscription('));
    $assertTrue(!str_contains($block, 'createCheckout('));
});

$test('pago acreditado con preapproval pendiente conserva probe resumible sin revisión', static function () use ($assertSame, $assertTrue): void {
    $presented = (new StatusPresenter())->present([
        'status' => 'payment_pending',
        'subscription_status' => 'pending',
        'payment_status' => 'approved_accredited',
        'membership_status' => 'not_activated',
        'reference' => 'DGYM-20261005-ABABABABABABABABABABABABABABABAB',
        'plan_name' => 'Plan Pro',
        'duration_months' => 12,
        'payment_mode' => 'automatic',
        'checkout_type' => 'subscription',
        'checkout_url' => 'https://www.mercadopago.cl/subscriptions/checkout/pending-accredited',
        'installment_amount' => 25490,
        'currency' => 'CLP',
        'updated_at' => '2026-10-05 15:00:00.000',
        'initial_payment_confirmed_at' => null,
    ]);
    $assertSame('payment_pending', $presented['state']);
    $assertSame('probe_payment', $presented['recovery_action']);
    $assertSame(null, $presented['retry_checkout_url']);

    $service = file_get_contents(dirname(__DIR__) . '/src/Application/PaymentRetryService.php');
    $assertTrue(is_string($service));
    $terminal = strpos($service, "if (\$state === 'payment_received_before_cancellation')");
    $review = strpos($service, "if (in_array(\$state, ['cancel_failed'", is_int($terminal) ? $terminal : 0);
    $assertTrue(is_int($terminal) && is_int($review) && $terminal < $review);
    $terminalBlock = substr($service, $terminal, $review - $terminal);
    $assertTrue(str_contains($terminalBlock, '$this->freshFinancialCheck('));
    $assertTrue(!str_contains($terminalBlock, 'cancelSubscription('));
    $assertTrue(!str_contains($terminalBlock, 'createCheckout('));
});

$test('retry activo cancelado o autorizado se sincroniza sin URL ni revisión artificial', static function () use ($assertTrue): void {
    $service = file_get_contents(dirname(__DIR__) . '/src/Application/PaymentRetryService.php');
    $assertTrue(is_string($service));
    $start = strpos($service, 'private function resumeActiveAttempt(');
    $end = strpos($service, 'private function cancelOldAttempt(', is_int($start) ? $start : 0);
    $assertTrue(is_int($start) && is_int($end) && $start < $end);
    $block = substr($service, $start, $end - $start);
    $assertTrue(str_contains($block, "['canceled', 'cancelled']"));
    $assertTrue(str_contains($block, "'status' => 'subscription_canceled'"));
    $assertTrue(str_contains($block, "'payment_retry_cycle_finished'"));
    $assertTrue(str_contains($block, "\$providerStatus === 'authorized'"));
    $assertTrue(str_contains($block, "'status' => 'subscription_authorized'"));
    $assertTrue(str_contains($block, "'payment_authorization_pending'"));
});

$test('probe pendiente decide con conciliación estable antes de devolver o reemplazar checkout', static function () use ($assertTrue): void {
    $service = file_get_contents(dirname(__DIR__) . '/src/Application/PaymentRetryService.php');
    $presenter = file_get_contents(dirname(__DIR__) . '/src/Application/StatusPresenter.php');
    $assertTrue(is_string($service) && is_string($presenter));
    $locked = strpos($service, 'private function retryLocked(');
    $cancel = strpos($service, 'private function cancelOldAttempt(', is_int($locked) ? $locked : 0);
    $block = substr($service, $locked, $cancel - $locked);
    $stable = strpos($block, '$this->freshFinancialCheck(');
    $rejected = strpos($block, "isset(\$facts['rejected_attempts']");
    $sameUrl = strpos($block, '$this->validateRetryCheckout(');
    $prepare = strpos($block, '$this->enrollments->preparePaymentRetryAttempt(');
    $assertTrue(is_int($stable) && is_int($rejected) && is_int($sameUrl) && is_int($prepare));
    $assertTrue($stable < $sameUrl && $sameUrl < $prepare);
    $assertTrue(str_contains($block, "'status' => 'payment_rejected'"));
    $assertTrue(str_contains($block, "\$providerStatus === 'authorized'"));
    $rejected = strpos($block, "\$activeRejected = isset(\$facts['rejected_attempts']");
    $authorized = strpos($block, "\$providerStatus === 'authorized'");
    $assertTrue(is_int($rejected) && is_int($authorized) && $rejected < $authorized);
    $assertTrue(str_contains($block, "'payment_authorization_pending'"));
    $assertTrue(str_contains($service, 'resolveAccreditedPaymentBeforeRetry('));
    $assertTrue(str_contains($service, "'pending-probe'"));
    $assertTrue(str_contains($presenter, "\$recoveryAction = 'probe_payment'"));
});

$test('reintento valida habilitación y preflight antes de cualquier mutación', static function () use ($assertTrue): void {
    $service = file_get_contents(dirname(__DIR__) . '/src/Application/PaymentRetryService.php');
    $app = file_get_contents(dirname(__DIR__) . '/src/App.php');
    $assertTrue(is_string($service) && is_string($app));
    $ready = strpos($service, '$this->assertServiceReady();');
    $lookup = strpos($service, '$this->enrollments->findByReference(');
    $lock = strpos($service, '$this->enrollments->withPaymentRetryLock(');
    $assertTrue(is_int($ready) && is_int($lookup) && is_int($lock));
    $assertTrue($ready < $lookup && $lookup < $lock);
    $assertTrue(str_contains($service, '$this->config->checkoutEnabled()'));
    $assertTrue(str_contains($service, '$this->preflight->inspect()'));
    $assertTrue(!str_contains($service, 'IdentityFingerprint::fromEmailAndPhone'));
    $assertTrue(!str_contains($service, '$this->ensureIdentityLease('));
    $assertTrue(!str_contains($service, '->acquireIdentityLease('));
    $assertTrue(str_contains($app, '$this->checkoutPreflight'));
});

$test('API de lease legacy se conserva sin gobernar altas ni reintentos', static function () use ($assertTrue): void {
    $repository = file_get_contents(dirname(__DIR__) . '/src/Infrastructure/EnrollmentRepository.php');
    $create = file_get_contents(dirname(__DIR__) . '/src/Application/CreateEnrollmentService.php');
    $retry = file_get_contents(dirname(__DIR__) . '/src/Application/PaymentRetryService.php');
    $config = file_get_contents(dirname(__DIR__) . '/src/Config.php');
    $preflight = file_get_contents(dirname(__DIR__) . '/src/Application/CheckoutPreflight.php');
    $assertTrue(is_string($repository) && is_string($create) && is_string($retry) && is_string($config) && is_string($preflight));
    $start = strpos($repository, 'public function releaseIdentityLeaseForCanceledSubscription(');
    $end = strpos($repository, 'public function findById(', is_int($start) ? $start : 0);
    $assertTrue(is_int($start) && is_int($end));
    $block = substr($repository, $start, $end - $start);
    $assertTrue(str_contains($block, 'enrollment.initial_payment_confirmed_at IS NOT NULL'));
    $assertTrue(str_contains($block, 'retry.replaces_attempt_id = active_attempt.id'));
    $assertTrue(str_contains($block, "'awaiting_cancellation', 'cancel_uncertain'"));
    $assertTrue(str_contains($block, "'ready_to_create', 'creating', 'creation_uncertain', 'confirmed'"));
    $assertTrue(!str_contains($create, '->acquireIdentityLease('));
    $assertTrue(!str_contains($create, '->findByIdentityLease('));
    $assertTrue(!str_contains($retry, '->acquireIdentityLease('));
    $assertTrue(!str_contains($retry, '->findByIdentityLease('));
    $configurationStart = strpos($config, 'public function assertCheckoutLocalConfiguration(): void');
    $configurationEnd = strpos($config, 'public function assertMercadoPagoCredentialEnvironment(): void', is_int($configurationStart) ? $configurationStart : 0);
    $assertTrue(is_int($configurationStart) && is_int($configurationEnd));
    $configurationBlock = substr($config, $configurationStart, $configurationEnd - $configurationStart);
    $assertTrue(!str_contains($configurationBlock, 'identityHmacSecret('));
    $assertTrue(!str_contains($preflight, "'checkout_identity_leases'"));
});

$test('endpoint de reintento exige POST, Origin, rate limit e idempotencia antes del servicio', static function () use ($assertTrue): void {
    $endpoint = file_get_contents(dirname(__DIR__) . '/public/api/reintentar-pago.php');
    $assertTrue(is_string($endpoint));
    $method = strpos($endpoint, "Request::assertMethod('POST')");
    $origin = strpos($endpoint, "Request::header('Origin') === ''");
    $sameOrigin = strpos($endpoint, 'Request::assertSameOrigin(');
    $rate = strpos($endpoint, '$app->rateLimiter->consume(');
    $key = strpos($endpoint, "Request::header('X-Idempotency-Key')");
    $assertTrue(is_int($method) && is_int($origin) && is_int($sameOrigin) && is_int($rate) && is_int($key));
    $assertTrue($method < $origin && $origin < $sameOrigin && $sameOrigin < $rate && $rate < $key);
    $assertTrue(str_contains($endpoint, 'set_time_limit(45)'));
    $assertTrue(str_contains($endpoint, "'payment-retry-global'"));
    $assertTrue(str_contains($endpoint, "'payment-retry-reference'"));
    $assertTrue(str_contains($endpoint, "hash('sha256', strtoupper(trim(\$reference)))"));
});

$test('rate limit permite tres fases y aísla alta referencia y retry', static function () use ($assertSame): void {
    $pdo = new class extends PDO {
        /** @var array<string,int> */
        public array $counts = [];
        public function __construct() {}
        public function prepare(string $query, array $options = []): PDOStatement|false
        {
            return new class($this, $query) extends PDOStatement {
                private array $params = [];
                public function __construct(private readonly PDO $db, private readonly string $sql) {}
                public function execute(?array $params = null): bool
                {
                    $this->params = $params ?? [];
                    $key = ($this->params['client_key'] ?? '') . '|' . ($this->params['bucket'] ?? '');
                    if (str_contains($this->sql, 'INSERT INTO rate_limit_buckets')) {
                        $this->db->counts[$key] = ($this->db->counts[$key] ?? 0) + 1;
                    }
                    return true;
                }
                public function fetchColumn(int $column = 0): mixed
                {
                    $key = ($this->params['client_key'] ?? '') . '|' . ($this->params['bucket'] ?? '');
                    return $this->db->counts[$key] ?? 0;
                }
            };
        }
    };
    $limiter = new RateLimiter($pdo);
    $secret = str_repeat('r', 32);
    $assertSame(true, $limiter->consume('127.0.0.1', $secret, 1, 900, 'enrollment-create'));
    for ($phase = 0; $phase < 3; $phase++) {
        $assertSame(true, $limiter->consume('127.0.0.1|reference-a', $secret, 3, 900, 'payment-retry-reference'));
    }
    $assertSame(false, $limiter->consume('127.0.0.1|reference-a', $secret, 3, 900, 'payment-retry-reference'));
    $assertSame(true, $limiter->consume('127.0.0.1|reference-b', $secret, 3, 900, 'payment-retry-reference'));
    $assertSame(false, $limiter->consume('127.0.0.1', $secret, 1, 900, 'enrollment-create'));
});

$failures = 0;
foreach ($tests as [$name, $callback]) {
    try {
        $callback();
        fwrite(STDOUT, "PASS {$name}\n");
    } catch (Throwable $exception) {
        $failures++;
        fwrite(STDERR, "FAIL {$name}: {$exception->getMessage()}\n");
    }
}
fwrite(STDOUT, sprintf("%d prueba(s), %d falla(s).\n", count($tests), $failures));
exit($failures === 0 ? 0 : 1);
