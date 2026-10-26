<?php

declare(strict_types=1);

use DemoGym\Config;
use DemoGym\Domain\EnrollmentReference;
use DemoGym\Domain\PriceCatalog;
use DemoGym\Khipu\KhipuApiException;
use DemoGym\Khipu\KhipuClient;
use DemoGym\Khipu\KhipuDataMismatchException;
use DemoGym\Khipu\KhipuPaymentVerification;
use DemoGym\Khipu\KhipuRequestFactory;
use DemoGym\Khipu\KhipuSignature;

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
        if (!$e instanceof $class) throw new RuntimeException('Se esperaba ' . $class . '; llegó ' . get_class($e));
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
    'KHIPU_API_KEY' => 'khipu-test-placeholder',
    'KHIPU_MERCHANT_SECRET' => 'placeholder-secret-0123456789',
    'KHIPU_RECEIVER_ID' => '990939',
    'KHIPU_CREDENTIAL_ENVIRONMENT' => 'development',
    'DGYM_KHIPU_ENABLED' => null,
];
$env($baseEnv);
$catalog = new PriceCatalog();
$reference = EnrollmentReference::generate();

$test('firma: vector oficial de la documentación de Khipu es válido', static function () use ($eq): void {
    $body = file_get_contents(__DIR__ . '/fixtures/khipu-notification-v3-example.json');
    $eq(true, KhipuSignature::validate(
        't=1711965600393,s=rq08YUGSaWa1D0RAwhMnJTRHMNmY4ToCn2Gd6G9LaDg=',
        $body, '1a4cbbbeb8bdb7e1d73572b9cc43ce4ce18f79d9', 1711965600393 + 1000
    ));
});

$test('firma: cuerpo alterado, secreto distinto, timestamp viejo o cabecera mal formada fallan', static function () use ($eq): void {
    $body = file_get_contents(__DIR__ . '/fixtures/khipu-notification-v3-example.json');
    $header = 't=1711965600393,s=rq08YUGSaWa1D0RAwhMnJTRHMNmY4ToCn2Gd6G9LaDg=';
    $secret = '1a4cbbbeb8bdb7e1d73572b9cc43ce4ce18f79d9';
    $now = 1711965600393;
    $eq(false, KhipuSignature::validate($header, str_replace('1000.0000', '9000.0000', $body), $secret, $now), 'monto');
    $eq(false, KhipuSignature::validate($header, $body . ' ', $secret, $now), 'espacio');
    $eq(false, KhipuSignature::validate($header, $body, $secret . 'x', $now), 'secreto');
    $eq(false, KhipuSignature::validate($header, $body, $secret, $now + 300001), 'replay');
    $eq(false, KhipuSignature::validate('s=rq08YUGSaWa1D0RAwhMnJTRHMNmY4ToCn2Gd6G9LaDg=', $body, $secret, $now), 'sin t');
    $eq(false, KhipuSignature::validate('', $body, $secret, $now), 'vacía');
    $eq(false, KhipuSignature::validate($header, $body, '', $now), 'sin secreto');
});

$test('transferencia: monto sale del catálogo y transaction_id es la referencia', static function () use ($eq, $catalog, $reference): void {
    $factory = new KhipuRequestFactory(new Config());
    $prepaid = $catalog->offer('pro', 'prepaid', 12);
    $payload = $factory->transferPayment($prepaid, $reference);
    $eq($prepaid['today_amount'], $payload['amount']);
    $eq('CLP', $payload['currency']);
    $eq($reference, $payload['transaction_id']);
    $eq('3.0', $payload['notify_api_version']);
    $eq('https://demogym.example/inscripcion/webhooks/khipu.php', $payload['notify_url']);
    $automatic = $catalog->offer('pro', 'automatic', 12);
    $eq($automatic['today_amount'], $factory->transferPayment($automatic, $reference)['amount'], 'primera cuota PAC con matrícula');
});

$test('mandato PAC: tope mensual y por cargo igual a la cuota; solo ofertas automáticas', static function () use ($eq, $throws, $catalog, $reference): void {
    $factory = new KhipuRequestFactory(new Config());
    $offer = $catalog->offer('pro', 'automatic', 6);
    $payload = $factory->subscription($offer, ' Socio@Example.CL ', $reference);
    $eq($offer['installment'], $payload['max_amount']);
    $eq($offer['installment'], $payload['max_amount_per_charge']);
    $eq('socio@example.cl', $payload['email']);
    $eq($reference, $payload['service_reference']);
    $eq('https://demogym.example/inscripcion/webhooks/khipu-mandato.php', $payload['notify_url']);
    $throws(InvalidArgumentException::class, fn () => $factory->subscription($catalog->offer('pro', 'prepaid', 6), 'a@b.cl', $reference));
    $throws(InvalidArgumentException::class, fn () => $factory->subscription($offer, 'no-es-correo', $reference));
});

$test('cargo PAC: transaction_id determinista por cuota; cuota 1 y fuera de rango se rechazan', static function () use ($eq, $throws, $reference): void {
    $factory = new KhipuRequestFactory(new Config());
    $sub = '13a0f1aa-5e47-4894-aa8b-282dd19593ec';
    $a = $factory->chargeIntent($sub, $reference, 2, 12, 25490);
    $b = $factory->chargeIntent($sub, $reference, 2, 12, 25490);
    $eq($a['transaction_id'], $b['transaction_id']);
    $eq($reference . '-C02', $a['transaction_id']);
    $eq(25490, $a['amount']);
    $throws(InvalidArgumentException::class, fn () => $factory->chargeIntent($sub, $reference, 1, 12, 25490));
    $throws(InvalidArgumentException::class, fn () => $factory->chargeIntent($sub, $reference, 13, 12, 25490));
    $throws(RuntimeException::class, fn () => $factory->chargeIntent('../otro', $reference, 2, 12, 25490));
    $throws(InvalidArgumentException::class, fn () => $factory->chargeIntent($sub, 'DGYM-malformada', 2, 12, 25490));
});

$test('verificación: solo done/normal acredita; reembolsos y datos distintos fallan cerrados', static function () use ($eq, $throws, $reference): void {
    $payment = ['receiver_id' => 990939, 'transaction_id' => $reference, 'currency' => 'CLP', 'amount' => '44990.0000', 'status' => 'done', 'status_detail' => 'normal'];
    $eq(KhipuPaymentVerification::APPROVED, KhipuPaymentVerification::classify($payment, 990939, $reference, 44990));
    $eq(KhipuPaymentVerification::PENDING, KhipuPaymentVerification::classify(['status' => 'verifying', 'status_detail' => 'pending'] + $payment, 990939, $reference, 44990));
    $eq(KhipuPaymentVerification::REVERSED, KhipuPaymentVerification::classify(['status_detail' => 'fully-refunded'] + $payment, 990939, $reference, 44990));
    foreach ([['receiver_id' => 1], ['transaction_id' => $reference . 'X'], ['currency' => 'USD'], ['amount' => '44989.0000'], ['status_detail' => 'marked-paid-by-receiver']] as $change) {
        $throws(KhipuDataMismatchException::class, fn () => KhipuPaymentVerification::classify($change + $payment, 990939, $reference, 44990));
    }
});

$test('cliente: usa rutas oficiales, valida IDs y solo acepta URLs de Khipu', static function () use ($eq, $throws): void {
    $calls = [];
    $transport = function (string $method, string $path, ?array $payload) use (&$calls): array {
        $calls[] = [$method, $path];
        return ['body' => json_encode(['payment_id' => 'v67prof2ugg3', 'payment_url' => 'https://khipu.com/payment/info/v67prof2ugg3']), 'transport_code' => 0, 'http_status' => 200];
    };
    $client = new KhipuClient(new Config(), $transport);
    $eq('v67prof2ugg3', $client->createPayment(['amount' => 1])['payment_id']);
    $eq([['POST', '/v3/payments']], $calls);
    $phishing = fn () => ['body' => json_encode(['payment_id' => 'v67prof2ugg3', 'payment_url' => 'https://khipu.com.evil.example/x']), 'transport_code' => 0, 'http_status' => 200];
    $throws(KhipuApiException::class, fn () => (new KhipuClient(new Config(), $phishing))->createPayment([]));
    $throws(RuntimeException::class, fn () => $client->getPayment('../../v3/banks'));
});

$test('cliente: 422 conserva solo códigos documentados; POST caído queda incierto', static function () use ($eq, $throws): void {
    $reject = fn () => ['body' => '{"error_code":"SUBSCRIPTION_NOT_CHARGEABLE","error_message":"x"}', 'transport_code' => 0, 'http_status' => 422];
    $e = $throws(KhipuApiException::class, fn () => (new KhipuClient(new Config(), $reject))->createChargeIntent([]));
    $eq('SUBSCRIPTION_NOT_CHARGEABLE', $e->errorCode);
    $eq(false, $e->outcomeUncertain);
    $odd = fn () => ['body' => '{"error_code":"<script>"}', 'transport_code' => 0, 'http_status' => 422];
    $eq('UNKNOWN', $throws(KhipuApiException::class, fn () => (new KhipuClient(new Config(), $odd))->createChargeIntent([]))->errorCode);
    $down = fn () => ['body' => false, 'transport_code' => 28, 'http_status' => 0];
    $e = $throws(KhipuApiException::class, fn () => (new KhipuClient(new Config(), $down))->createChargeIntent([]));
    $eq(true, $e->outcomeUncertain);
    $e = $throws(KhipuApiException::class, fn () => (new KhipuClient(new Config(), $down))->getPayment('v67prof2ugg3'));
    $eq(false, $e->outcomeUncertain);
});

$test('config: Khipu apagado por defecto y cuenta debe coincidir con APP_ENV', static function () use ($eq, $throws, $env, $baseEnv): void {
    $eq(false, (new Config())->khipuEnabled());
    $env(['DGYM_KHIPU_ENABLED' => 'TRUE']);
    $eq(true, (new Config())->khipuEnabled());
    $env(['DGYM_KHIPU_ENABLED' => 'yes']);
    $eq(false, (new Config())->khipuEnabled());
    $env(['KHIPU_CREDENTIAL_ENVIRONMENT' => 'production']);
    $never = function (): array { throw new RuntimeException('no debió llamar a la red'); };
    $throws(RuntimeException::class, fn () => (new KhipuClient(new Config(), $never))->getPayment('v67prof2ugg3'));
    $env(['KHIPU_RECEIVER_ID' => 'abc']);
    $throws(RuntimeException::class, fn () => (new Config())->khipuReceiverId());
    $env($baseEnv);
});

$failures = 0;
foreach ($tests as [$name, $callback]) {
    try { $callback(); echo "PASS {$name}\n"; }
    catch (Throwable $e) { $failures++; echo "FAIL {$name} (" . get_class($e) . ': ' . $e->getMessage() . ")\n"; }
}
echo count($tests) . " prueba(s) Khipu, {$failures} falla(s).\n";
exit($failures === 0 ? 0 : 1);
