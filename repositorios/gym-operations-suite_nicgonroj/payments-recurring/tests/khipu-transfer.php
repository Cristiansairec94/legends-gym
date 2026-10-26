<?php

declare(strict_types=1);

// Flujo completo de transferencia Khipu sin red ni base de datos: Khipu se simula
// con un transporte en memoria y la persistencia aplica la misma KhipuTransition
// que usa KhipuRepository. Ejecutar: php tests/khipu-transfer.php

use DemoGym\Application\EnrollmentRequestValidator;
use DemoGym\Application\StatusPresenter;
use DemoGym\Config;
use DemoGym\Domain\Idempotency;
use DemoGym\Domain\PriceCatalog;
use DemoGym\Http\HttpException;
use DemoGym\Khipu\KhipuClient;
use DemoGym\Khipu\KhipuEnrollmentService;
use DemoGym\Khipu\KhipuPaymentProcessor;
use DemoGym\Khipu\KhipuRequestFactory;
use DemoGym\Khipu\KhipuStore;
use DemoGym\Khipu\KhipuTransition;

require_once dirname(__DIR__) . '/autoload.php';

$tests = [];
$test = static function (string $name, callable $callback) use (&$tests): void { $tests[] = [$name, $callback]; };
$eq = static function (mixed $expected, mixed $actual, string $label = ''): void {
    if ($expected !== $actual) {
        throw new RuntimeException(($label !== '' ? $label . ': ' : '') . var_export($expected, true) . ' !== ' . var_export($actual, true));
    }
};
$throws = static function (string $class, callable $callback): Throwable {
    try { $callback(); } catch (Throwable $e) {
        if (!$e instanceof $class) throw new RuntimeException('Se esperaba ' . $class . '; llegó ' . get_class($e) . ': ' . $e->getMessage());
        return $e;
    }
    throw new RuntimeException('Se esperaba ' . $class);
};
$env = static function (array $values): void {
    foreach ($values as $name => $value) putenv($value === null ? $name : $name . '=' . $value);
};
$baseEnv = [
    'APP_ENV' => 'development',
    'DGYM_PUBLIC_BASE_URL' => 'https://demogym.example/inscripcion',
    'DGYM_CHECKOUT_ENABLED' => 'true',
    'DGYM_PRICING_VERSION' => PriceCatalog::VERSION,
    'DGYM_CONSENT_TEXT_VERSION' => EnrollmentRequestValidator::PUBLIC_CONSENT_TEXT_VERSION,
    'DGYM_KHIPU_ENABLED' => 'true',
    'DGYM_KHIPU_PAYMENT_EXPIRY_HOURS' => null,
    'KHIPU_API_KEY' => 'khipu-test-placeholder',
    'KHIPU_MERCHANT_SECRET' => 'placeholder-secret-0123456789',
    'KHIPU_RECEIVER_ID' => '990939',
    'KHIPU_CREDENTIAL_ENVIRONMENT' => 'development',
];
$env($baseEnv);

/** Persistencia en memoria con las mismas guardas de estado que KhipuRepository. */
final class InMemoryKhipuStore implements KhipuStore
{
    /** @var array<int, array<string, mixed>> */
    public array $enrollments = [];
    /** @var array<int, array<string, mixed>> */
    public array $charges = [];
    public bool $schema = true;

    public function schemaReady(): bool { return $this->schema; }

    public function findByIdempotencyHash(string $hash): ?array
    {
        foreach ($this->enrollments as $row) if ($row['idempotency_key_hash'] === $hash) return $row;
        return null;
    }

    public function findByReference(string $reference): ?array
    {
        foreach ($this->enrollments as $row) {
            if ($row['reference'] === $reference && $row['payment_provider'] === 'khipu') return $row;
        }
        return null;
    }

    public function createEnrollment(array $input, array $offer, string $publicId, string $reference, string $idempotencyHash, string $fingerprint): array
    {
        if ($this->findByIdempotencyHash($idempotencyHash) !== null) {
            throw new PDOException('Duplicate entry', 23000);
        }
        $id = count($this->enrollments) + 1;
        $this->enrollments[$id] = [
            'id' => $id, 'public_id' => $publicId, 'reference' => $reference,
            'idempotency_key_hash' => $idempotencyHash, 'request_fingerprint' => $fingerprint,
            'plan_name' => $offer['name'], 'duration_months' => $input['duration'], 'payment_mode' => $input['payment_mode'],
            'checkout_type' => 'khipu_transfer', 'payment_provider' => 'khipu',
            'installment_amount' => $offer['installment'], 'contract_total' => $offer['total'],
            'checkout_amount' => $offer['today_amount'], 'checkout_charge_count' => 1, 'currency' => $offer['currency'],
            'status' => 'creating_checkout', 'payment_status' => 'not_created', 'membership_status' => 'not_activated',
            'checkout_url' => null, 'error_code' => null, 'initial_payment_confirmed_at' => null, 'updated_at' => '2026-10-06 12:00:00.000',
        ];
        $this->charges[$id] = [
            'id' => $id, 'enrollment_id' => $id, 'installment_number' => 1, 'kind' => 'transfer', 'transaction_id' => $reference,
            'khipu_payment_id' => null, 'amount' => $offer['today_amount'], 'status' => 'creating', 'last_error_code' => null, 'confirmed_at' => null,
        ];
        return $this->enrollments[$id];
    }

    public function markCheckoutReady(int $enrollmentId, string $paymentId, string $paymentUrl): void
    {
        if ($this->charges[$enrollmentId]['status'] !== 'creating' || $this->enrollments[$enrollmentId]['status'] !== 'creating_checkout') {
            throw new RuntimeException('estado cambiado');
        }
        $this->charges[$enrollmentId] = ['khipu_payment_id' => $paymentId, 'status' => 'created'] + $this->charges[$enrollmentId];
        $this->enrollments[$enrollmentId] = ['checkout_url' => $paymentUrl, 'status' => 'checkout_ready', 'error_code' => null] + $this->enrollments[$enrollmentId];
    }

    public function markCheckoutFailure(int $enrollmentId, string $errorCode): void
    {
        if ($this->enrollments[$enrollmentId]['status'] !== 'creating_checkout') throw new RuntimeException('estado cambiado');
        $this->enrollments[$enrollmentId] = ['status' => 'checkout_creation_failed', 'error_code' => $errorCode] + $this->enrollments[$enrollmentId];
        $this->charges[$enrollmentId] = ['status' => 'failed', 'last_error_code' => $errorCode] + $this->charges[$enrollmentId];
    }

    public function findTransferCharge(int $enrollmentId): ?array { return $this->charges[$enrollmentId] ?? null; }

    public function pendingPaymentIds(int $limit): array
    {
        $ids = [];
        foreach ($this->charges as $charge) {
            if ($charge['khipu_payment_id'] !== null && in_array($charge['status'], ['created', 'verifying'], true)) $ids[] = (string) $charge['khipu_payment_id'];
        }
        return array_slice($ids, 0, $limit);
    }

    public function applyPaymentOutcome(int $enrollmentId, string $paymentId, string $outcome, ?string $errorCode = null): string
    {
        $decision = KhipuTransition::decide($this->enrollments[$enrollmentId], $this->charges[$enrollmentId], $paymentId, $outcome, $errorCode);
        $this->charges[$enrollmentId] = $decision['charge'] + $this->charges[$enrollmentId];
        if ($decision['charge_confirmed']) $this->charges[$enrollmentId]['confirmed_at'] ??= '2026-10-06 12:05:00.000';
        $this->enrollments[$enrollmentId] = $decision['enrollment'] + $this->enrollments[$enrollmentId];
        if ($decision['enrollment_confirmed']) $this->enrollments[$enrollmentId]['initial_payment_confirmed_at'] ??= '2026-10-06 12:05:00.000';
        return $decision['state'];
    }
}

/** Khipu simulado: POST crea un cobro pendiente y GET devuelve su estado actual. */
final class FakeKhipu
{
    /** @var array<string, array<string, mixed>> */
    public array $payments = [];
    /** @var list<array{0:string,1:string}> */
    public array $calls = [];
    public ?array $failNextPost = null;
    public int $receiverId = 990939;
    private int $sequence = 0;

    public function transport(): Closure
    {
        return function (string $method, string $path, ?array $payload): array {
            $this->calls[] = [$method, $path];
            if ($method === 'POST' && $path === '/v3/payments') {
                if ($this->failNextPost !== null) {
                    [$response, $this->failNextPost] = [$this->failNextPost, null];
                    return $response;
                }
                $id = 'khipu' . str_pad((string) ++$this->sequence, 7, '0', STR_PAD_LEFT);
                $this->payments[$id] = [
                    'payment_id' => $id, 'payment_url' => 'https://khipu.com/payment/info/' . $id,
                    'receiver_id' => $this->receiverId, 'transaction_id' => $payload['transaction_id'],
                    'amount' => number_format((float) $payload['amount'], 4, '.', ''), 'currency' => $payload['currency'],
                    'status' => 'pending', 'status_detail' => 'pending', 'expires_date' => $payload['expires_date'] ?? null,
                    'payer_name' => 'Nombre Privado', 'payer_email' => 'privado@example.test', 'personal_identifier' => '11.111.111-1',
                ];
                return self::json(200, ['payment_id' => $id, 'payment_url' => $this->payments[$id]['payment_url']]);
            }
            if ($method === 'GET' && preg_match('#^/v3/payments/([a-z0-9]{12})$#D', $path, $match) === 1) {
                return isset($this->payments[$match[1]]) ? self::json(200, $this->payments[$match[1]]) : self::json(404, ['message' => 'not found']);
            }
            throw new RuntimeException('Llamada inesperada a Khipu: ' . $method . ' ' . $path);
        };
    }

    public function pay(string $id): void
    {
        $this->payments[$id] = ['status' => 'done', 'status_detail' => 'normal', 'conciliation_date' => '2026-10-06T12:04:00Z',
            'payment_method' => 'simplified_transfer'] + $this->payments[$id];
    }

    /** @param array<string, mixed> $body @return array{body:string,transport_code:int,http_status:int} */
    public static function json(int $status, array $body): array
    {
        return ['body' => json_encode($body, JSON_THROW_ON_ERROR), 'transport_code' => 0, 'http_status' => $status];
    }
}

$now = new DateTimeImmutable('2026-10-06T12:00:00Z');
/** @return array{store:InMemoryKhipuStore,khipu:FakeKhipu,service:KhipuEnrollmentService,processor:KhipuPaymentProcessor,clock:ArrayObject} */
$build = static function () use ($now): array {
    $store = new InMemoryKhipuStore();
    $khipu = new FakeKhipu();
    $clock = new ArrayObject(['now' => $now]);
    $tick = static fn (): DateTimeImmutable => $clock['now'];
    $config = new Config();
    $client = new KhipuClient($config, $khipu->transport());
    $processor = new KhipuPaymentProcessor($config, $store, $client, $tick);
    $service = new KhipuEnrollmentService($config, new PriceCatalog(), $store, $client, new KhipuRequestFactory($config), $processor, $tick);
    return ['store' => $store, 'khipu' => $khipu, 'service' => $service, 'processor' => $processor, 'clock' => $clock];
};
$request = static function (string $mode = 'single', int $duration = 1, string $plan = 'inicio', ?string $provider = 'khipu'): array {
    $selection = ['plan_id' => $plan, 'payment_mode' => $mode, 'duration_months' => $duration];
    if ($provider !== null) $selection['payment_provider'] = $provider;
    return [
        'schema_version' => PriceCatalog::ENROLLMENT_SCHEMA_VERSION,
        'pricing_version' => PriceCatalog::VERSION,
        'person' => ['full_name' => 'Prueba Khipu', 'email' => 'socio@example.test', 'phone_e164' => '+56912345678'],
        'selection' => $selection,
        'consents' => ['necessary_processing' => true, 'marketing' => false, 'text_version' => EnrollmentRequestValidator::PUBLIC_CONSENT_TEXT_VERSION],
    ];
};
$validate = static fn (array $payload): array => (new EnrollmentRequestValidator(new Config(), new PriceCatalog()))->validate($payload);
$key = static fn (string $suffix = 'a'): string => Idempotency::hashKey('khipu-test-key-00000' . $suffix);
/** Crea una inscripción lista para pagar y devuelve [contexto, cuerpo, id de pago]. */
$ready = static function (string $mode = 'single', int $duration = 1) use ($build, $request, $validate, $key): array {
    $context = $build();
    $input = $validate($request($mode, $duration));
    $response = $context['service']->create($input, $key(), Idempotency::fingerprint($input));
    if ($response['http_status'] !== 201) throw new RuntimeException('La inscripción de prueba no quedó lista.');
    return [$context, $response['body'], (string) $context['store']->charges[1]['khipu_payment_id']];
};

$test('validador: Khipu es opcional, exige gate y solo admite pago único o prepago', static function () use ($eq, $throws, $env, $baseEnv, $request, $validate): void {
    $card = $validate($request('single', 1, 'inicio', null));
    $eq(false, array_key_exists('payment_provider', $card), 'una solicitud sin proveedor conserva su forma');
    $eq(Idempotency::fingerprint($card), Idempotency::fingerprint($validate($request('single', 1, 'inicio', 'mercadopago'))), 'huella de Mercado Pago estable');
    $khipu = $validate($request('prepaid', 12, 'pro'));
    $eq('khipu', $khipu['payment_provider']);
    $eq(false, Idempotency::fingerprint($card) === Idempotency::fingerprint($validate($request())), 'huella distinta por proveedor');
    $eq('payment_provider_not_enabled', $throws(HttpException::class, fn () => $validate($request('automatic', 12)))->errorCode);
    $eq('invalid_payment_provider', $throws(HttpException::class, fn () => $validate($request('single', 1, 'inicio', 'webpay')))->errorCode);
    $env(['DGYM_KHIPU_ENABLED' => 'false']);
    $eq('payment_provider_not_enabled', $throws(HttpException::class, fn () => $validate($request()))->errorCode);
    $eq(false, array_key_exists('payment_provider', $validate($request('single', 1, 'inicio', null))), 'Mercado Pago no depende del gate Khipu');
    $env($baseEnv);
});

$test('alta: cobra el monto del catálogo, confirma por GET y entrega solo la URL de Khipu', static function () use ($eq, $build, $request, $validate, $key): void {
    $context = $build();
    $input = $validate($request('prepaid', 6, 'pro'));
    $response = $context['service']->create($input, $key(), Idempotency::fingerprint($input));
    $eq(201, $response['http_status']);
    $body = $response['body'];
    $eq('khipu', $body['next_action']);
    $eq('khipu_transfer', $body['checkout_type']);
    $eq('prepaid', $body['payment_mode']);
    $eq('https://khipu.com/payment/info/khipu0000001', $body['checkout_url']);
    $eq([['POST', '/v3/payments'], ['GET', '/v3/payments/khipu0000001']], $context['khipu']->calls);
    $remote = $context['khipu']->payments['khipu0000001'];
    $eq('173340.0000', $remote['amount'], 'prepago Pro 6 meses con matrícula');
    $eq($body['reference'], $remote['transaction_id']);
    $eq('2026-10-07T12:00:00Z', $remote['expires_date'], 'vigencia de 24 horas');
    $enrollment = $context['store']->enrollments[1];
    $eq('checkout_ready', $enrollment['status']);
    $eq(173340, $enrollment['checkout_amount']);
    $eq('created', $context['store']->charges[1]['status']);
    $eq('not_activated', $enrollment['membership_status'], 'crear el cobro no activa nada');
});

$test('alta: repetir la clave no crea otro cobro ni reexpone la URL; otros datos son conflicto', static function () use ($eq, $throws, $ready, $request, $validate, $key): void {
    [$context, $body] = $ready();
    $input = $validate($request());
    $replay = $context['service']->create($input, $key(), Idempotency::fingerprint($input));
    $eq(409, $replay['http_status']);
    $eq('khipu_payment_status_check', $replay['body']['error']['code']);
    $eq('status_only', $replay['body']['error']['retry_mode']);
    $eq($body['reference'], $replay['body']['error']['reference']);
    $eq(false, str_contains(json_encode($replay['body']), 'khipu.com'), 'sin URL cobrable');
    $eq(1, count($context['khipu']->payments));
    $other = $validate($request('prepaid', 3));
    $eq('idempotency_conflict', $throws(HttpException::class, fn () => $context['service']->create($other, $key(), Idempotency::fingerprint($other)))->errorCode);
    // Una clave nueva es una inscripción independiente, aunque repita persona y plan.
    $second = $context['service']->create($input, $key('b'), Idempotency::fingerprint($input));
    $eq(201, $second['http_status']);
    $eq(false, $second['body']['reference'] === $body['reference']);
});

$test('alta: gate cerrado, esquema ausente o credencial de otro entorno no llaman a Khipu', static function () use ($eq, $env, $baseEnv, $build, $request, $validate, $key): void {
    $input = $validate($request());
    foreach ([['DGYM_KHIPU_ENABLED' => 'false'], ['KHIPU_CREDENTIAL_ENVIRONMENT' => 'production'], ['KHIPU_API_KEY' => null], ['schema' => false]] as $case) {
        $context = $build();
        isset($case['schema']) ? $context['store']->schema = false : $env($case);
        $eq(false, $context['service']->available(), json_encode($case));
        $response = $context['service']->create($input, $key(), Idempotency::fingerprint($input));
        $eq(503, $response['http_status']);
        $eq('payment_provider_unavailable', $response['body']['error']['code']);
        $eq([], $context['khipu']->calls);
        $eq([], $context['store']->enrollments, 'nada persistido');
        $env($baseEnv);
    }
});

$test('alta: fallo o cuenta de cobro equivocada nunca entregan una URL y permiten un intento nuevo', static function () use ($eq, $build, $request, $validate, $key): void {
    $input = $validate($request());
    foreach (['timeout', 'rejected', 'receiver'] as $case) {
        $context = $build();
        if ($case === 'timeout') $context['khipu']->failNextPost = ['body' => false, 'transport_code' => 28, 'http_status' => 0];
        if ($case === 'rejected') $context['khipu']->failNextPost = FakeKhipu::json(401, ['message' => 'invalid api key']);
        if ($case === 'receiver') $context['khipu']->receiverId = 111111;
        $response = $context['service']->create($input, $key(), Idempotency::fingerprint($input));
        $eq(503, $response['http_status'], $case);
        $eq('khipu_unavailable', $response['body']['error']['code'], $case);
        $eq('new_idempotency_key', $response['body']['error']['retry_mode'], $case);
        $eq(false, str_contains(json_encode($response['body']), 'khipu.com'), $case);
        $eq('checkout_creation_failed', $context['store']->enrollments[1]['status'], $case);
        $eq($case === 'timeout' ? 'khipu_unavailable' : 'service_not_configured', $context['store']->enrollments[1]['error_code'], $case);
        $eq('failed', $context['store']->charges[1]['status'], $case);
        // La misma clave repite el mismo resultado sin volver a llamar a Khipu.
        $calls = count($context['khipu']->calls);
        $eq(503, $context['service']->create($input, $key(), Idempotency::fingerprint($input))['http_status'], $case);
        $eq($calls, count($context['khipu']->calls), $case);
    }
});

$test('pago: solo un GET done/normal con monto y cuenta exactos confirma; el aviso se puede repetir', static function () use ($eq, $ready): void {
    [$context, $body, $paymentId] = $ready();
    $pending = $context['processor']->refresh($paymentId, 'webhook');
    $eq(KhipuTransition::PENDING, $pending['outcome']);
    $eq('checkout_ready', $context['store']->enrollments[1]['status']);

    $context['khipu']->payments[$paymentId] = ['status' => 'verifying'] + $context['khipu']->payments[$paymentId];
    $eq(KhipuTransition::VERIFYING, $context['processor']->refresh($paymentId, 'webhook')['outcome']);
    $eq('payment_pending', $context['store']->enrollments[1]['status']);

    $context['khipu']->pay($paymentId);
    foreach ([1, 2] as $delivery) {
        $result = $context['processor']->refresh($paymentId, 'webhook');
        $eq(KhipuTransition::APPROVED, $result['outcome']);
        $eq('payment_verified', $result['state']);
        $eq($body['reference'], $result['reference']);
        $eq(null, $result['payment_url']);
    }
    $enrollment = $context['store']->enrollments[1];
    $eq('payment_verified', $enrollment['status']);
    $eq('approved_accredited', $enrollment['payment_status']);
    $eq('pending_manual_activation', $enrollment['membership_status'], 'la activación sigue siendo manual');
    $eq('confirmed', $context['store']->charges[1]['status']);
    $snapshot = json_encode($result['snapshot']);
    foreach (['Nombre Privado', 'privado@example.test', '11.111.111-1'] as $private) {
        $eq(false, str_contains($snapshot, $private), 'la evidencia no guarda datos del pagador');
    }
    $eq(34990, $result['snapshot']['payment']['amount']);
});

$test('pago: monto, cuenta, moneda o estado inesperados dejan la inscripción en revisión', static function () use ($eq, $ready): void {
    foreach ([
        'amount' => ['amount' => '45599.0000'], 'receiver_id' => ['receiver_id' => 5], 'currency' => ['currency' => 'USD'],
        'status' => ['status_detail' => 'marked-paid-by-receiver'],
    ] as $field => $change) {
        [$context, , $paymentId] = $ready();
        $context['khipu']->pay($paymentId);
        $context['khipu']->payments[$paymentId] = $change + $context['khipu']->payments[$paymentId];
        $result = $context['processor']->refresh($paymentId, 'webhook');
        $eq(KhipuTransition::REVIEW, $result['outcome'], $field);
        $eq('review_required', $context['store']->enrollments[1]['status'], $field);
        $eq('manual_review', $context['store']->enrollments[1]['membership_status'], $field);
        $eq('khipu_mismatch_' . $field, $context['store']->enrollments[1]['error_code'], $field);
        $eq(null, $context['store']->enrollments[1]['initial_payment_confirmed_at'], $field);
        // Un GET correcto posterior no saca el caso de revisión por sí solo.
        $context['khipu']->pay($paymentId);
        $context['khipu']->payments[$paymentId] = ['amount' => '34990.0000', 'receiver_id' => 990939, 'currency' => 'CLP'] + $context['khipu']->payments[$paymentId];
        $context['processor']->refresh($paymentId, 'webhook');
        $eq('review_required', $context['store']->enrollments[1]['status'], $field . ' sticky');
        $eq('manual_review', $context['store']->enrollments[1]['membership_status'], $field . ' sticky');
    }
});

$test('pago: devolución, segundo pago y conciliación fuera de plazo nunca se acreditan solos', static function () use ($eq, $ready): void {
    [$context, $body, $paymentId] = $ready();
    $context['khipu']->pay($paymentId);
    $context['processor']->refresh($paymentId, 'webhook');
    $context['khipu']->payments[$paymentId]['status_detail'] = 'fully-refunded';
    $eq(KhipuTransition::REVERSED, $context['processor']->refresh($paymentId, 'webhook')['outcome']);
    $eq('payment_refunded', $context['store']->enrollments[1]['status']);
    $eq('manual_review', $context['store']->enrollments[1]['membership_status']);
    $context['khipu']->payments[$paymentId]['status_detail'] = 'normal';
    $context['processor']->refresh($paymentId, 'webhook');
    $eq('payment_refunded', $context['store']->enrollments[1]['status'], 'una lectura posterior no revierte la devolución');
    $eq('reversed', $context['store']->charges[1]['status']);

    [$context, $body, $paymentId] = $ready();
    $context['khipu']->pay($paymentId);
    $context['processor']->refresh($paymentId, 'webhook');
    $context['khipu']->payments['khipuother01'] = ['payment_id' => 'khipuother01'] + $context['khipu']->payments[$paymentId];
    $second = $context['processor']->refresh('khipuother01', 'webhook');
    $eq(KhipuTransition::APPROVED, $second['outcome']);
    $eq('review_required', $second['state'], 'dos pagos para la misma referencia');
    $eq('khipu_second_payment', $context['store']->enrollments[1]['error_code']);
    $eq($paymentId, $context['store']->charges[1]['khipu_payment_id'], 'el cobro conserva su pago original');

    [$context, , $paymentId] = $ready();
    $context['khipu']->pay($paymentId);
    $context['khipu']->payments[$paymentId]['out_of_date_conciliation'] = true;
    $late = $context['processor']->refresh($paymentId, 'webhook');
    $eq(KhipuTransition::REVIEW, $late['outcome']);
    $eq('khipu_out_of_date_conciliation', $context['store']->enrollments[1]['error_code']);
    $eq('manual_review', $context['store']->enrollments[1]['membership_status']);
});

$test('pago: un aviso ajeno o de una inscripción de Mercado Pago no modifica nada', static function () use ($eq, $ready): void {
    [$context, , $paymentId] = $ready();
    $before = $context['store']->enrollments;
    $context['khipu']->payments['khipuforeign'] = ['payment_id' => 'khipuforeign', 'transaction_id' => 'ORDEN-123',
        'status' => 'done', 'status_detail' => 'normal'] + $context['khipu']->payments[$paymentId];
    $eq(KhipuPaymentProcessor::UNMATCHED, $context['processor']->refresh('khipuforeign', 'webhook')['outcome']);
    $context['khipu']->payments['khipuforeign']['transaction_id'] = 'DGYM-20261006-' . str_repeat('A', 32);
    $eq(KhipuPaymentProcessor::UNMATCHED, $context['processor']->refresh('khipuforeign', 'webhook')['outcome']);
    // Misma referencia, pero la inscripción pertenece a Mercado Pago.
    $context['store']->enrollments[1]['payment_provider'] = 'mercadopago';
    $context['khipu']->pay($paymentId);
    $eq(KhipuPaymentProcessor::UNMATCHED, $context['processor']->refresh($paymentId, 'webhook')['outcome']);
    $context['store']->enrollments[1]['payment_provider'] = 'khipu';
    $eq($before, $context['store']->enrollments);
});

$test('estado: verificar recupera un aviso perdido y continuar reutiliza el mismo cobro', static function () use ($eq, $throws, $env, $baseEnv, $ready): void {
    [$context, $body, $paymentId] = $ready();
    $eq(true, $context['service']->handles($body['reference']));
    $eq(false, $context['service']->handles('DGYM-20261006-' . str_repeat('B', 32)));
    $resumed = $context['service']->resume($body['reference']);
    $eq(200, $resumed['http_status']);
    $eq('khipu', $resumed['body']['next_action']);
    $eq($body['checkout_url'], $resumed['body']['checkout_url']);
    $eq(1, count($context['khipu']->payments), 'no se crea otro cobro');

    // Con el gate cerrado se sigue verificando, pero no se entrega un enlace para pagar.
    $env(['DGYM_KHIPU_ENABLED' => 'false']);
    $eq('payment_retry_not_allowed', $throws(HttpException::class, fn () => $context['service']->resume($body['reference']))->errorCode);
    $context['khipu']->pay($paymentId);
    $eq('payment_already_received', $throws(HttpException::class, fn () => $context['service']->resume($body['reference']))->errorCode);
    $eq('payment_verified', $context['store']->enrollments[1]['status'], 'el pago se acredita aunque el webhook nunca llegue');
    $env($baseEnv);

    [$context, $body, $paymentId] = $ready();
    $context['khipu']->payments[$paymentId]['status'] = 'verifying';
    $eq('payment_confirmation_pending', $throws(HttpException::class, fn () => $context['service']->resume($body['reference']))->errorCode);
});

$test('estado: un enlace vencido o rechazado se cierra y no vuelve a abrirse', static function () use ($eq, $throws, $ready): void {
    [$context, $body, $paymentId] = $ready();
    $context['clock']['now'] = new DateTimeImmutable('2026-10-07T12:00:01Z');
    $eq('payment_retry_not_allowed', $throws(HttpException::class, fn () => $context['service']->resume($body['reference']))->errorCode);
    $eq('payment_rejected', $context['store']->enrollments[1]['status']);
    $eq('khipu_payment_expired', $context['store']->enrollments[1]['error_code']);
    $eq('expired', $context['store']->charges[1]['status']);
    // Si la transferencia igual llega después, el dinero queda visible y acreditado.
    $context['khipu']->pay($paymentId);
    $eq('payment_verified', $context['processor']->refresh($paymentId, 'webhook')['state']);

    [$context, $body, $paymentId] = $ready();
    $context['khipu']->payments[$paymentId]['status_detail'] = 'rejected-by-payer';
    $eq(KhipuTransition::REJECTED, $context['processor']->refresh($paymentId, 'webhook')['outcome']);
    $eq('khipu_payment_rejected', $context['store']->enrollments[1]['error_code']);
});

$test('estado: una verificación que no prospera reabre el mismo enlace', static function () use ($eq, $throws, $ready): void {
    [$context, $body, $paymentId] = $ready();
    $context['khipu']->payments[$paymentId]['status'] = 'verifying';
    $context['processor']->refresh($paymentId, 'webhook');
    $eq('payment_pending', $context['store']->enrollments[1]['status']);
    $context['khipu']->payments[$paymentId]['status'] = 'pending';
    $resumed = $context['service']->resume($body['reference']);
    $eq(200, $resumed['http_status']);
    $eq($body['checkout_url'], $resumed['body']['checkout_url']);
    $eq('checkout_ready', $context['store']->enrollments[1]['status']);
    $eq('created', $context['store']->charges[1]['status']);
    // Un pago ya confirmado nunca vuelve a quedar abierto por una lectura atrasada.
    $context['khipu']->pay($paymentId);
    $context['processor']->refresh($paymentId, 'webhook');
    $context['khipu']->payments[$paymentId] = ['status' => 'pending', 'status_detail' => 'pending'] + $context['khipu']->payments[$paymentId];
    $context['processor']->refresh($paymentId, 'webhook');
    $eq('payment_verified', $context['store']->enrollments[1]['status']);
    $eq('confirmed', $context['store']->charges[1]['status']);
});

$test('barrido: acredita sin webhook, cierra vencidos y un fallo no detiene al resto', static function () use ($eq, $build, $request, $validate, $key): void {
    $context = $build();
    $input = $validate($request());
    foreach (['a', 'b', 'c', 'd'] as $suffix) {
        $eq(201, $context['service']->create($input, $key($suffix), Idempotency::fingerprint($input))['http_status']);
    }
    $context['khipu']->pay('khipu0000001');
    unset($context['khipu']->payments['khipu0000002']); // Khipu responde 404 para este cobro
    $context['khipu']->payments['khipu0000003']['expires_date'] = '2026-10-06T11:00:00Z';
    $summary = $context['processor']->sweep(50);
    $eq(4, $summary['checked']);
    $eq(1, $summary['failed']);
    $eq([KhipuTransition::APPROVED => 1, KhipuTransition::EXPIRED => 1, KhipuTransition::PENDING => 1], $summary['outcomes']);
    $eq('payment_verified', $context['store']->enrollments[1]['status']);
    $eq('checkout_ready', $context['store']->enrollments[2]['status'], 'un fallo de lectura no cambia estado');
    $eq('payment_rejected', $context['store']->enrollments[3]['status']);
    $eq('checkout_ready', $context['store']->enrollments[4]['status']);
    // Los resueltos salen del barrido siguiente.
    $eq(2, $context['processor']->sweep(50)['checked']);
    $eq(1, $context['processor']->sweep(1)['checked'], 'respeta el límite');
});

$test('revisión previa conserva su motivo ante una devolución; URL de pago estricta', static function () use ($eq, $ready): void {
    [$context, , $paymentId] = $ready();
    $context['khipu']->pay($paymentId);
    $context['khipu']->payments[$paymentId]['amount'] = '1.0000';
    $context['processor']->refresh($paymentId, 'webhook');
    $context['khipu']->payments[$paymentId]['status_detail'] = 'fully-refunded';
    $context['khipu']->payments[$paymentId]['amount'] = '34990.0000';
    $context['processor']->refresh($paymentId, 'webhook');
    $enrollment = $context['store']->enrollments[1];
    $eq('payment_refunded', $enrollment['status']);
    $eq('manual_review', $enrollment['membership_status']);
    $eq('khipu_mismatch_amount', $enrollment['error_code'], 'el motivo original no se pierde');

    $eq('https://khipu.com/payment/info/abc', KhipuPaymentProcessor::trustedPaymentUrl('https://khipu.com/payment/info/abc'));
    $eq('https://app.khipu.com/x', KhipuPaymentProcessor::trustedPaymentUrl('https://app.khipu.com/x'));
    foreach (['http://khipu.com/x', 'https://khipu.com.evil.example/x', 'https://evil.example\\.khipu.com/x', 'https://user@khipu.com/x',
        'https://khipu.com:8443/x', "https://khipu.com/x\n", 'https://khipu.com/a b', 'javascript:alert(1)', '', null, 42] as $unsafe) {
        $eq(null, KhipuPaymentProcessor::trustedPaymentUrl($unsafe), var_export($unsafe, true));
    }
});

$test('presentación: mensajes de transferencia y sin acciones de Mercado Pago', static function () use ($eq, $ready): void {
    [$context, $body, $paymentId] = $ready();
    $presenter = new StatusPresenter();
    $pending = $presenter->present($context['store']->enrollments[1]);
    $eq('checkout_pending', $pending['state']);
    $eq('khipu', $pending['payment_provider']);
    $eq('probe_payment', $pending['recovery_action']);
    $eq(null, $pending['retry_checkout_url'], 'la URL persistida nunca se expone');
    $eq(false, str_contains(json_encode($pending), 'Mercado Pago'));
    $eq(34990, $pending['plan']['today_amount']);

    $context['khipu']->pay($paymentId);
    $context['processor']->refresh($paymentId, 'webhook');
    $paid = $presenter->present($context['store']->enrollments[1]);
    $eq('payment_confirmed', $paid['state']);
    $eq(true, $paid['payment_confirmed']);
    $eq(false, $paid['membership_active']);
    $eq('none', $paid['recovery_action']);

    $base = ['initial_payment_confirmed_at' => null, 'membership_status' => 'not_activated'] + $context['store']->enrollments[1];
    foreach ([
        [['status' => 'payment_rejected', 'error_code' => 'khipu_payment_expired'], 'payment_rejected'],
        [['status' => 'checkout_creation_failed'], 'payment_rejected'],
        [['status' => 'payment_refunded', 'membership_status' => 'manual_review'], 'manual_review'],
        [['status' => 'checkout_ready', 'membership_status' => 'manual_review'], 'manual_review'],
    ] as [$change, $state]) {
        $presented = $presenter->present($change + $base);
        $eq($state, $presented['state'], json_encode($change));
        $eq('none', $presented['recovery_action'], json_encode($change));
    }
    // Un alta interrumpida antes de entregar el enlace deja de mostrarse como pago en curso.
    $creating = ['status' => 'creating_checkout', 'updated_at' => gmdate('Y-m-d H:i:s')] + $base;
    $eq('checkout_pending', $presenter->present($creating)['state']);
    $eq('payment_rejected', $presenter->present(['updated_at' => gmdate('Y-m-d H:i:s', time() - 900)] + $creating)['state']);
    // Una fila sin payment_provider (base sin 003) sigue por la presentación de Mercado Pago.
    $legacy = $context['store']->enrollments[1];
    unset($legacy['payment_provider']);
    $eq(false, array_key_exists('payment_provider', $presenter->present(['status' => 'checkout_ready', 'checkout_type' => 'preference'] + $legacy)));
});

$test('repositorio: cada sentencia recibe exactamente sus parámetros y solo usa columnas migradas', static function () use ($eq, $validate, $request): void {
    // Sin MySQL local: se registran las sentencias reales de KhipuRepository. Con
    // prepares nativos, un parámetro sobrante, faltante o repetido es un error fatal.
    $pdo = new class extends PDO {
        /** @var list<array{0:string,1:list<string>}> */
        public array $log = [];
        public bool $transaction = false;
        public function __construct() {}
        public function beginTransaction(): bool { $this->transaction = true; return true; }
        public function commit(): bool { $this->transaction = false; return true; }
        public function rollBack(): bool { $this->transaction = false; return true; }
        public function inTransaction(): bool { return $this->transaction; }
        public function lastInsertId(?string $name = null): string|false { return '7'; }
        public function query(string $query, ?int $fetchMode = null, mixed ...$fetchModeArgs): PDOStatement|false
        {
            $this->log[] = [$query, []];
            return $this->prepare($query);
        }
        public function prepare(string $query, array $options = []): PDOStatement|false
        {
            return new class($this, $query) extends PDOStatement {
                public function __construct(private readonly PDO $db, private readonly string $sql) {}
                public function execute(?array $params = null): bool
                {
                    $this->db->log[] = [$this->sql, array_keys($params ?? [])];
                    return true;
                }
                public function rowCount(): int { return 1; }
                public function closeCursor(): bool { return true; }
                public function fetchAll(int $mode = PDO::FETCH_DEFAULT, mixed ...$args): array { return ['v67prof2ugg3']; }
                public function fetch(int $mode = PDO::FETCH_DEFAULT, int $cursorOrientation = PDO::FETCH_ORI_NEXT, int $cursorOffset = 0): mixed
                {
                    return str_contains($this->sql, 'khipu_charges')
                        ? ['id' => 3, 'enrollment_id' => 7, 'status' => 'created', 'khipu_payment_id' => null]
                        : ['id' => 7, 'reference' => 'DGYM-20261006-' . str_repeat('C', 32), 'payment_provider' => 'khipu',
                            'status' => 'checkout_ready', 'membership_status' => 'not_activated', 'initial_payment_confirmed_at' => null];
                }
            };
        }
    };
    $repository = new DemoGym\Khipu\KhipuRepository($pdo);
    $input = $validate($request('prepaid', 3));
    $offer = (new PriceCatalog())->offer('inicio', 'prepaid', 3);
    $reference = 'DGYM-20261006-' . str_repeat('C', 32);
    $eq(true, $repository->schemaReady());
    $repository->findByIdempotencyHash(str_repeat('a', 64));
    $repository->createEnrollment($input, $offer, '11111111-1111-4111-8111-111111111111', $reference, str_repeat('a', 64), str_repeat('b', 64));
    $repository->markCheckoutReady(7, 'v67prof2ugg3', 'https://khipu.com/payment/info/v67prof2ugg3');
    $repository->markCheckoutFailure(7, 'khipu_unavailable');
    $repository->findTransferCharge(7);
    $eq(['v67prof2ugg3'], $repository->pendingPaymentIds(5000));
    $eq(true, str_contains(end($pdo->log)[0], 'LIMIT 200'), 'el barrido está acotado');
    foreach ([KhipuTransition::APPROVED, KhipuTransition::VERIFYING, KhipuTransition::EXPIRED, KhipuTransition::REVERSED, KhipuTransition::REVIEW] as $outcome) {
        $repository->applyPaymentOutcome(7, 'v67prof2ugg3', $outcome);
    }
    $eq(false, $pdo->inTransaction(), 'ninguna transacción queda abierta');

    $migrations = '';
    foreach (['001_initial', '002_multi_checkout', '003_khipu', '004_payment_retry_attempts'] as $file) {
        $migrations .= file_get_contents(dirname(__DIR__) . '/database/migrations/' . $file . '.sql');
    }
    $writes = 0;
    foreach ($pdo->log as [$sql, $params]) {
        preg_match_all('/(?<!:):([a-z_][a-z0-9_]*)/', $sql, $found);
        $placeholders = $found[1];
        $eq(count($placeholders), count(array_unique($placeholders)), 'marcador repetido en: ' . $sql);
        sort($placeholders); sort($params);
        $eq($placeholders, $params, 'parámetros de: ' . $sql);
        if (preg_match('/^\s*INSERT INTO (\w+) \(([^)]*)\)/', $sql, $insert) === 1) {
            $columns = array_map('trim', explode(',', $insert[2]));
        } elseif (preg_match('/^\s*UPDATE (\w+)\s+SET (.*?)\s+WHERE/s', $sql, $update) === 1) {
            preg_match_all('/(?:^|,)\s*([a-z_][a-z0-9_]*)\s*=/', $update[2], $set);
            $columns = $set[1];
        } else {
            continue;
        }
        $writes++;
        foreach ($columns as $column) {
            $eq(1, preg_match('/\b' . preg_quote($column, '/') . '\b/', $migrations), 'columna sin migración: ' . $column);
        }
    }
    $eq(true, $writes >= 12, 'se registraron las escrituras');
    $eq(true, str_contains($migrations, "ADD COLUMN payment_provider VARCHAR(24) NOT NULL DEFAULT ''mercadopago''"));
});

$test('webhook: firma sobre el cuerpo crudo antes de decodificar, registrar o consultar', static function () use ($eq): void {
    $endpoint = file_get_contents(dirname(__DIR__) . '/public/webhooks/khipu.php');
    $order = [];
    foreach ([
        "Request::assertMethod('POST')", '$app->khipuEnrollment->configured()', "file_get_contents('php://input'",
        'KhipuSignature::validate(', 'json_decode($rawBody', '$app->webhookEvents->register(', '$app->webhookEvents->acquire(',
        '$app->khipuPayments->refresh(', '$app->webhookEvents->finish(',
    ] as $needle) {
        $position = strpos($endpoint, $needle);
        $eq(true, is_int($position), 'falta: ' . $needle);
        $order[] = $position;
    }
    $sorted = $order;
    sort($sorted);
    $eq($sorted, $order, 'orden de las defensas del webhook');
    // El cuerpo solo aporta el identificador: ningún monto, estado o referencia del aviso se usa.
    foreach (["\$payload['amount']", "\$payload['status']", "\$payload['transaction_id']", 'khipuEnabled()'] as $forbidden) {
        $eq(false, str_contains($endpoint, $forbidden), 'no debe usar ' . $forbidden);
    }
    $retry = file_get_contents(dirname(__DIR__) . '/public/api/reintentar-pago.php');
    $eq(true, strpos($retry, '$app->rateLimiter->consume(') < strpos($retry, '$app->khipuEnrollment->handles('), 'rate limit antes de consultar Khipu');
});

$test('transición: resultados desconocidos e identificadores inválidos se rechazan', static function () use ($throws): void {
    $enrollment = ['status' => 'checkout_ready', 'membership_status' => 'not_activated'];
    $charge = ['status' => 'created', 'khipu_payment_id' => 'v67prof2ugg3'];
    $throws(InvalidArgumentException::class, fn () => KhipuTransition::decide($enrollment, $charge, 'v67prof2ugg3', 'paid'));
    $throws(RuntimeException::class, fn () => KhipuTransition::decide($enrollment, $charge, '../x', KhipuTransition::APPROVED));
});

$failures = 0;
foreach ($tests as [$name, $callback]) {
    try { $callback(); echo "PASS {$name}\n"; }
    catch (Throwable $e) { $failures++; echo "FAIL {$name} (" . get_class($e) . ': ' . $e->getMessage() . ")\n"; }
    $env($baseEnv);
}
echo count($tests) . " prueba(s) de transferencia Khipu, {$failures} falla(s).\n";
exit($failures === 0 ? 0 : 1);
