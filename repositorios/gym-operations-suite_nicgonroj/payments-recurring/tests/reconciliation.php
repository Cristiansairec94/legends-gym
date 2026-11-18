<?php

declare(strict_types=1);

use DemoGym\Application\PaymentVerification;
use DemoGym\Application\CheckoutPaymentVerification;
use DemoGym\Application\ReconciliationScan;
use DemoGym\Application\WebhookProcessor;
use DemoGym\Infrastructure\ReconciliationSearch;

require dirname(__DIR__) . '/autoload.php';

$tests = []; $test = static function (string $name, callable $fn) use (&$tests): void { $tests[$name] = $fn; };
$eq = static function (mixed $expected, mixed $actual): void {
    if ($expected !== $actual) {
        $trace = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 2);
        throw new RuntimeException('Line ' . ($trace[0]['line'] ?? '?') . ': expected ' . var_export($expected, true) . '; got ' . var_export($actual, true));
    }
};
$throws = static function (callable $fn): void { try { $fn(); } catch (Throwable) { return; } throw new RuntimeException('Expected failure.'); };
$payment = ['id' => '123', 'collector_id' => 42, 'application_id' => '43', 'live_mode' => true,
    'status' => 'approved', 'status_detail' => 'accredited', 'transaction_amount' => 29990,
    'transaction_amount_refunded' => 0, 'currency_id' => 'CLP',
    'date_approved' => '2026-09-01T10:00:00.125-04:00', 'date_last_updated' => '2026-09-01T14:00:01.000Z',
    'payer' => ['email' => 'synthetic@example.invalid'], 'card' => ['token' => 'never-export']];
$at = '2026-09-22T12:00:00.123Z';
$test('verification preserves exact financial facts and UTC provenance without PII', static function () use ($eq, $payment, $at): void {
    $v = PaymentVerification::snapshot($payment, 'production', 'reconciliation_read', $at);
    $eq('dgym-payment-verification/1', $v['schema']); $eq('reconciliation_read', $v['source']);
    $eq($at, $v['verified_at']); $eq(true, $v['authenticated_lookup']);
    $eq('2026-09-01 14:00:00.125', $v['payment']['paid_at']); $eq(29990, $v['payment']['amount']);
    $eq(false, str_contains(json_encode($v), 'example.invalid')); $eq(false, isset($v['signature_verified']));
});
$test('verification rejects environment mismatch and invented source', static function () use ($throws, $payment, $at): void {
    $throws(fn () => PaymentVerification::snapshot($payment, 'test', 'webhook', $at));
    $throws(fn () => PaymentVerification::snapshot($payment, 'production', 'manual', $at));
    $throws(fn () => PaymentVerification::snapshot($payment, 'unverified', 'webhook', $at));
});
$test('verification cannot turn a webhook live mode string into production', static function () use ($throws, $payment, $at): void {
    $throws(fn () => PaymentVerification::snapshot(array_replace($payment, ['live_mode' => 'true']), 'production', 'webhook', $at));
});
$test('missing live mode is explicit and ownership identifiers required', static function () use ($eq, $throws, $payment, $at): void {
    unset($payment['live_mode']); $eq(null, PaymentVerification::snapshot($payment, 'production', 'webhook', $at)['live_mode']);
    unset($payment['collector_id']); $throws(fn () => PaymentVerification::snapshot($payment, 'production', 'webhook', $at));
});
$checkoutEnrollment = ['id' => 1, 'checkout_type' => 'subscription', 'mp_subscription_id' => 'sub1', 'reference' => 'DGYM-20260922-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 'checkout_amount' => 29990, 'currency' => 'CLP'];
$checkoutPayment = $payment; unset($checkoutPayment['application_id']); $checkoutPayment['external_reference'] = 'DGYM-20260922-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
$checkout = ['id' => 'sub1', 'collector_id' => 42, 'application_id' => 43, 'external_reference' => 'DGYM-20260922-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'];
$invoice = ['id' => 'invoice1', 'preapproval_id' => 'sub1', 'payment' => ['id' => '123'], 'transaction_amount' => 29990, 'currency_id' => 'CLP'];
$test('v2 preserves absent payment application and binds a fresh invoice checkout chain', static function () use ($eq, $checkoutEnrollment, $checkoutPayment, $checkout, $invoice, $at): void {
    $proof = CheckoutPaymentVerification::proof($checkoutEnrollment, $checkoutPayment, $checkout, 'production', '42', '43', $invoice, '2026-09-22T12:00:00.000Z');
    $v = PaymentVerification::snapshot($checkoutPayment, 'production', 'reconciliation_read', $at, $proof);
    $eq('dgym-payment-verification/2', $v['schema']); $eq(null, $v['application_id']); $eq('collector_environment_checkout', $v['ownership_basis']);
    $eq('43', $v['checkout_verification']['application_id']); $eq('123', $v['checkout_verification']['payment_id']);
    $eq('authorized_payment', $proof['linkage']); $eq('invoice1', $proof['authorized_payment_id']);
});
$test('v2 rejects absent boolean environment and unproven application absence', static function () use ($throws, $checkoutEnrollment, $checkoutPayment, $checkout, $invoice, $at): void {
    $throws(fn () => PaymentVerification::snapshot($checkoutPayment, 'production', 'webhook', $at));
    foreach ([null, 'true', false] as $mode) {
        $p = array_replace($checkoutPayment, ['live_mode' => $mode]);
        $throws(fn () => CheckoutPaymentVerification::proof($checkoutEnrollment, $p, $checkout, 'production', '42', '43', $invoice, $at));
    }
});
$test('checkout chain rejects contradictory app seller reference and exact checkout identity', static function () use ($throws, $checkoutEnrollment, $checkoutPayment, $checkout, $invoice, $at): void {
    foreach ([['application_id'=>44], ['application_id'=>43,'client_id'=>44], ['collector_id'=>99], ['id'=>'other'], ['external_reference'=>'other'], ['live_mode'=>false]] as $change) {
        $throws(fn () => CheckoutPaymentVerification::proof($checkoutEnrollment, $checkoutPayment, array_replace($checkout,$change), 'production', '42', '43', $invoice, $at));
    }
    $throws(fn () => CheckoutPaymentVerification::proof($checkoutEnrollment, array_replace($checkoutPayment,['client_id'=>44]), $checkout, 'production', '42', '43', $invoice, $at));
});
$test('invoice proof rejects wrong payment subscription amount and currency', static function () use ($throws, $checkoutEnrollment, $checkoutPayment, $checkout, $invoice, $at): void {
    foreach ([['payment'=>['id'=>'other']], ['preapproval_id'=>'other'], ['transaction_amount'=>1], ['currency_id'=>'USD'], ['external_reference'=>'other']] as $change) {
        $throws(fn () => CheckoutPaymentVerification::proof($checkoutEnrollment, $checkoutPayment, $checkout, 'production', '42', '43', array_replace($invoice,$change), $at));
    }
});
$test('matrícula automática solo pertenece al pago inicial identificado', static function () use ($eq, $throws, $checkoutPayment, $checkout, $at): void {
    $enrollment = [
        'id' => 1,
        'checkout_type' => 'subscription',
        'mp_subscription_id' => 'sub1',
        'reference' => 'DGYM-20260922-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        'checkout_amount' => 44990,
        'installment_amount' => 29990,
        'initial_payment_confirmed_at' => null,
        'initial_mp_payment_id' => null,
        'currency' => 'CLP',
    ];
    $initialPayment = array_replace($checkoutPayment, ['transaction_amount' => 44990]);
    $initialInvoice = ['id' => 'invoice1', 'preapproval_id' => 'sub1', 'payment' => ['id' => '123'], 'transaction_amount' => 44990, 'currency_id' => 'CLP'];
    $eq('invoice1', CheckoutPaymentVerification::proof($enrollment, $initialPayment, $checkout, 'production', '42', '43', $initialInvoice, $at)['authorized_payment_id']);
    $throws(fn () => CheckoutPaymentVerification::proof(
        $enrollment,
        array_replace($initialPayment, ['transaction_amount' => 29990]),
        $checkout,
        'production',
        '42',
        '43',
        array_replace($initialInvoice, ['transaction_amount' => 29990]),
        $at
    ));

    $paid = array_replace($enrollment, [
        'initial_payment_confirmed_at' => '2026-09-22 12:00:00.000',
        'initial_mp_payment_id' => '123',
    ]);
    $eq('invoice1', CheckoutPaymentVerification::proof($paid, $initialPayment, $checkout, 'production', '42', '43', $initialInvoice, $at)['authorized_payment_id']);
    $nextPayment = array_replace($checkoutPayment, ['id' => '124', 'transaction_amount' => 29990]);
    $nextInvoice = array_replace($initialInvoice, ['id' => 'invoice2', 'payment' => ['id' => '124'], 'transaction_amount' => 29990]);
    $eq('invoice2', CheckoutPaymentVerification::proof($paid, $nextPayment, $checkout, 'production', '42', '43', $nextInvoice, $at)['authorized_payment_id']);
    $throws(fn () => CheckoutPaymentVerification::proof(
        $paid,
        array_replace($nextPayment, ['transaction_amount' => 44990]),
        $checkout,
        'production',
        '42',
        '43',
        array_replace($nextInvoice, ['transaction_amount' => 44990]),
        $at
    ));
});
$test('invoice optional ownership fields cannot contradict the authenticated chain', static function () use ($throws, $checkoutEnrollment, $checkoutPayment, $checkout, $invoice, $at): void {
    foreach ([['application_id'=>44],['client_id'=>44],['application_id'=>43,'client_id'=>44],['collector_id'=>99],['collector_id'=>true],['live_mode'=>false],['live_mode'=>'true']] as $change) {
        $throws(fn () => CheckoutPaymentVerification::proof($checkoutEnrollment,$checkoutPayment,$checkout,'production','42','43',array_replace($invoice,$change),$at));
    }
});
$test('native checkout proof rejects reference only and conflicting native links', static function () use ($eq, $throws, $checkoutEnrollment, $checkoutPayment, $checkout, $at): void {
    $throws(fn () => CheckoutPaymentVerification::proof($checkoutEnrollment, $checkoutPayment, $checkout, 'production', '42', '43', null, $at));
    $p = array_replace($checkoutPayment,['preapproval_id'=>'sub1']);
    $proof = CheckoutPaymentVerification::proof($checkoutEnrollment, $p, $checkout, 'production', '42', '43', null, $at);
    $eq('native_subscription',$proof['linkage']); $eq(null,$proof['authorized_payment_id']);
    $throws(fn () => CheckoutPaymentVerification::proof($checkoutEnrollment, array_replace($p,['subscription_id'=>'other']), $checkout, 'production', '42', '43', null, $at));
});
$test('native preference requires actual preference link and observed client identity', static function () use ($eq, $throws, $checkoutEnrollment, $checkoutPayment, $checkout, $at): void {
    $e = array_replace($checkoutEnrollment,['checkout_type'=>'preference','mp_preference_id'=>'pref1']);
    $c = array_replace($checkout,['id'=>'pref1','client_id'=>43]); unset($c['application_id']);
    $p = array_replace($checkoutPayment,['preference_id'=>'pref1']);
    $proof = CheckoutPaymentVerification::proof($e,$p,$c,'production','42','43',null,$at); $eq('native_preference',$proof['linkage']);
    $throws(fn () => CheckoutPaymentVerification::proof($e,$checkoutPayment,$c,'production','42','43',null,$at));
});
$test('merchant order proves a Checkout Pro payment when preference_id is absent', static function () use ($eq, $throws, $checkoutEnrollment, $checkoutPayment, $checkout, $at): void {
    $e = array_replace($checkoutEnrollment,['checkout_type'=>'preference','mp_preference_id'=>'pref1']);
    $c = array_replace($checkout,['id'=>'pref1','client_id'=>43]); unset($c['application_id']);
    $p = array_replace($checkoutPayment,['order'=>['id'=>987654321]]);
    $order = [
        'id'=>987654321,'status'=>'closed','external_reference'=>$e['reference'],'preference_id'=>'pref1',
        'collector'=>['id'=>42],'application_id'=>43,'total_amount'=>29990,
        'payments'=>[array_replace($p,['transaction_amount'=>29990,'currency_id'=>'CLP'])],
    ];
    $proof = CheckoutPaymentVerification::proof($e,$p,$c,'production','42','43',null,$at,$order);
    $eq('merchant_order',$proof['linkage']);$eq('987654321',$proof['merchant_order_id']);
    $verification = PaymentVerification::snapshot($p,'production','reconciliation_read',$at,$proof);
    $eq('dgym-payment-verification/2',$verification['schema']);
    $eq(['123'],CheckoutPaymentVerification::merchantOrderPaymentIds($order));
    foreach ([
        ['preference_id'=>'other'],
        ['external_reference'=>'other'],
        ['collector'=>['id'=>99]],
        ['application_id'=>44],
        ['total_amount'=>1],
        ['payments'=>[]],
    ] as $change) {
        $throws(fn () => CheckoutPaymentVerification::proof($e,$p,$c,'production','42','43',null,$at,array_replace($order,$change)));
    }
});
$test('v2 rejects unbound future or invalid checkout attestation', static function () use ($throws, $checkoutEnrollment, $checkoutPayment, $checkout, $invoice, $at): void {
    $proof = CheckoutPaymentVerification::proof($checkoutEnrollment,$checkoutPayment,$checkout,'production','42','43',$invoice,'2026-09-22T12:00:00.000Z');
    foreach ([['payment_id'=>'other'],['collector_id'=>'99'],['environment'=>'test'],['authenticated_lookup'=>false],['verified_at'=>'2026-09-22T12:00:01.000Z'],['authorized_payment_id'=>null],['linkage'=>'native_preference'],['application_id'=>null]] as $change) {
        $throws(fn () => PaymentVerification::snapshot($checkoutPayment,'production','webhook',$at,array_replace($proof,$change)));
    }
});
$test('processor performs a fresh exact subscription GET for missing payment application', static function () use ($eq, $throws, $checkoutEnrollment, $checkoutPayment, $checkout): void {
    $old=[];foreach (['MP_CREDENTIAL_ENVIRONMENT'=>'production','MP_SELLER_ID'=>'42','MP_APPLICATION_ID'=>'43','APP_ENV'=>'production'] as $key=>$value) { $old[$key]=getenv($key);putenv($key.'='.$value); }
    try {
        $gateway = new class($checkout) implements DemoGym\Domain\CheckoutGateway {
            public array $calls=[];
            public function __construct(public array $checkout) {}
            public function createCheckout(string $checkoutType,array $payload,string $idempotencyKey):array { throw new RuntimeException('No mutations.'); }
            public function searchCheckout(string $checkoutType,string $externalReference,string $payerEmail,int $expectedAmount):array { throw new RuntimeException('No search.'); }
            public function getSubscription(string $id):array { $this->calls[]=['subscription',$id];return $this->checkout; }
            public function getPreference(string $id):array { throw new RuntimeException('Unexpected preference.'); }
            public function getPayment(string $id):array { throw new RuntimeException('Unexpected payment.'); }
            public function getMerchantOrder(string $id):array { throw new RuntimeException('Unexpected merchant order.'); }
            public function getAuthorizedPayment(string $id):array { throw new RuntimeException('Unexpected invoice.'); }
            public function getChargeback(string $id):array { throw new RuntimeException('Unexpected chargeback.'); }
            public function getClaim(string $id):array { throw new RuntimeException('Unexpected claim.'); }
        };
        $p=(new ReflectionClass(WebhookProcessor::class))->newInstanceWithoutConstructor();
        (new ReflectionProperty(WebhookProcessor::class,'config'))->setValue($p,new DemoGym\Config());
        (new ReflectionProperty(WebhookProcessor::class,'mercadoPago'))->setValue($p,$gateway);
        $method=new ReflectionMethod(WebhookProcessor::class,'verifyPaymentCheckout');
        $payment=array_replace($checkoutPayment,['preapproval_id'=>'sub1']);
        $proof=$method->invoke($p,$checkoutEnrollment,$payment,null);$eq([['subscription','sub1']],$gateway->calls);$eq('sub1',$proof['id']);
        $gateway->checkout['application_id']=44;$throws(fn ()=>$method->invoke($p,$checkoutEnrollment,$payment,null));
        $gate=new ReflectionMethod(WebhookProcessor::class,'authenticatedResourceMatchesEnvironment');
        $eq(false,$gate->invoke($p,$checkoutPayment));$eq(true,$gate->invoke($p,$checkoutPayment,true));
        $eq(false,$gate->invoke($p,array_replace($checkoutPayment,['application_id'=>43,'client_id'=>44]),true));
        $withoutMode=$checkoutPayment;unset($withoutMode['live_mode']);$eq(false,$gate->invoke($p,$withoutMode,true));
    } finally { foreach($old as $key=>$value) $value===false?putenv($key):putenv($key.'='.$value); }
});
$test('verification rejects invalid timestamps and future evidence', static function () use ($throws, $payment, $at): void {
    foreach (['tomorrow', '2026-02-30T00:00:00Z', '2027-01-01T00:00:00Z', null] as $date) {
        $throws(fn () => PaymentVerification::snapshot(array_replace($payment, ['date_last_updated' => $date]), 'production', 'webhook', $at));
    }
});
$test('verification refuses fractional CLP and invalid refunds', static function () use ($throws, $payment, $at): void {
    foreach ([['transaction_amount' => 29989.5], ['transaction_amount_refunded' => 29991], ['currency_id' => 'USD']] as $change) {
        $throws(fn () => PaymentVerification::snapshot(array_replace($payment, $change), 'production', 'webhook', $at));
    }
});
$test('refund snapshot retains refund status without approving it', static function () use ($eq, $payment, $at): void {
    $v = PaymentVerification::snapshot(array_replace($payment, ['status' => 'refunded', 'transaction_amount_refunded' => 29990]), 'production', 'reconciliation_read', $at);
    $eq('refunded', $v['payment']['status']); $eq(29990, $v['payment']['amount_refunded']);
});
$test('unchanged linked historical facts match but refunds or changed linkage do not', static function () use ($eq, $payment, $at): void {
    $v = PaymentVerification::snapshot($payment, 'production', 'reconciliation_read', $at);
    $stored = $v['payment']; $stored['mp_payment_id'] = $stored['id']; $stored['checkout_link_verified'] = 1;
    $eq(true, PaymentVerification::matchesStoredPayment($v, $stored));
    $eq(false, PaymentVerification::matchesStoredPayment($v, array_replace($stored, ['status' => 'refunded'])));
    $eq(false, PaymentVerification::matchesStoredPayment($v, array_replace($stored, ['checkout_link_verified' => 0])));
    $eq(false, PaymentVerification::matchesStoredPayment($v, null));
});
$test('CLI refresh of historical rejection does not replay enrollment transition', static function () use ($eq, $payment, $at): void {
    $payment['status'] = 'rejected'; $payment['status_detail'] = 'cc_rejected_other_reason'; $payment['date_approved'] = null;
    $facts = PaymentVerification::snapshot($payment, 'production', 'reconciliation_read', $at)['payment'];
    $facts['mp_payment_id'] = $facts['id']; $facts['checkout_link_verified'] = 1;
    $pdo = new class($facts) extends PDO {
        public array $queries = [];
        public function __construct(private array $facts) {}
        public function prepare(string $query, array $options = []): PDOStatement|false {
            $this->queries[] = $query;
            return new class($this->facts) extends PDOStatement {
                public function __construct(private array $facts) {}
                public function execute(?array $params = null): bool { return true; }
                public function fetch(int $mode = PDO::FETCH_DEFAULT, int $cursorOrientation = PDO::FETCH_ORI_NEXT, int $cursorOffset = 0): mixed { return $this->facts; }
            };
        }
    };
    $processor = (new ReflectionClass(WebhookProcessor::class))->newInstanceWithoutConstructor();
    (new ReflectionProperty(WebhookProcessor::class, 'config'))->setValue($processor, new DemoGym\Config());
    (new ReflectionProperty(WebhookProcessor::class, 'enrollments'))->setValue($processor, new DemoGym\Infrastructure\EnrollmentRepository($pdo));
    $method = new ReflectionMethod(WebhookProcessor::class, 'applyPayment');
    $previous = getenv('MP_CREDENTIAL_ENVIRONMENT'); putenv('MP_CREDENTIAL_ENVIRONMENT=production');
    try {
        $enrollment = ['id' => 1, 'checkout_type' => 'preference', 'checkout_amount' => 29990, 'currency' => 'CLP', 'reference' => 'ref', 'mp_preference_id' => 'pref'];
        $payment['external_reference'] = 'ref';
        $payment['preference_id'] = 'pref';
        $checkout = ['id' => 'pref', 'collector_id' => 42, 'application_id' => 43, 'external_reference' => 'ref'];
        $proof = CheckoutPaymentVerification::proof($enrollment, $payment, $checkout, 'production', '42', '43', null, $at);
        $eq(true, $method->invoke($processor, $enrollment, $payment, null, false, true, $proof));
        foreach ($pdo->queries as $query) $eq(false, str_contains($query, 'UPDATE enrollments'));
        $eq(4, count($pdo->queries));
    } finally { $previous === false ? putenv('MP_CREDENTIAL_ENVIRONMENT') : putenv('MP_CREDENTIAL_ENVIRONMENT=' . $previous); }
});
$reference = 'DGYM-20260901-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
$page = static fn (array $rows, int $total, int $offset = 0): array => ['results' => $rows, 'paging' => ['total' => $total, 'offset' => $offset, 'limit' => 50]];
$row = static fn (string $id): array => ['id' => $id, 'external_reference' => $reference, 'status' => 'approved', 'date_last_updated' => '2026-09-01T00:00:00Z'];
$test('payment discovery uses exact reference and paginates every result', static function () use ($eq, $page, $row, $reference, $at): void {
    $calls = [];
    $search = new ReconciliationSearch(static function (string $path) use (&$calls, $eq, $page, $row, $reference): array {
        parse_str((string) parse_url($path, PHP_URL_QUERY), $q); $calls[] = $q;
        $eq('/v1/payments/search', parse_url($path, PHP_URL_PATH)); $eq($reference, $q['external_reference']); $eq('asc', $q['criteria']);
        $offset = (int) $q['offset']; $rows = [];
        for ($i = $offset; $i < min($offset + 50, 51); $i++) $rows[] = $row((string) (1000 + $i));
        return $page($rows, 51, $offset);
    });
    $eq(51, count($search->payments($reference, '2026-09-01T00:00:00Z', $at))); $eq(2, count($calls));
});
$test('search refuses truncated pages, oversized sets and missing paging', static function () use ($throws, $page, $row, $reference, $at): void {
    foreach ([$page([$row('1')], 2), $page([], 201), ['results' => []]] as $response) {
        $s = new ReconciliationSearch(static fn (string $path): array => $response);
        $throws(fn () => $s->payments($reference, '2026-09-01T00:00:00Z', $at));
    }
});
$test('search refuses wrong reference and duplicate result IDs', static function () use ($throws, $page, $row, $reference, $at): void {
    foreach ([[$row('1'), $row('1')], [array_replace($row('1'), ['external_reference' => 'another'])]] as $rows) {
        $s = new ReconciliationSearch(static fn (string $path): array => $page($rows, count($rows)));
        $throws(fn () => $s->payments($reference, '2026-09-01T00:00:00Z', $at));
    }
});
$test('invoice discovery enforces subscription and keeps payment link only', static function () use ($eq, $throws, $page): void {
    $s = new ReconciliationSearch(static fn (string $path): array => $page([['id' => 'i1', 'preapproval_id' => 's1', 'payment' => ['id' => 123]]], 1));
    $eq('123', $s->authorizedPayments('s1')['i1']['payment_id']); $throws(fn () => $s->authorizedPayments('s2'));
});
$test('invoice discovery omits rejected limit and follows provider pages across 36 installments', static function () use ($eq): void {
    $offsets = [];
    $search = new ReconciliationSearch(static function (string $path) use ($eq, &$offsets): array {
        parse_str((string) parse_url($path, PHP_URL_QUERY), $q);
        $eq('/authorized_payments/search', parse_url($path, PHP_URL_PATH)); $eq(false, array_key_exists('limit', $q));
        $eq('s1', $q['preapproval_id']); $offset = (int) $q['offset']; $offsets[] = $offset; $rows = [];
        for ($i = $offset; $i < min($offset + 12, 37); $i++) $rows[] = ['id' => 'i' . $i, 'preapproval_id' => 's1', 'payment' => ['id' => 1000 + $i]];
        return ['results' => $rows, 'paging' => ['total' => 37, 'offset' => $offset, 'limit' => 12]];
    });
    $eq(37, count($search->authorizedPayments('s1'))); $eq([0, 12, 24, 36], $offsets);
});
$test('invoice pagination rejects invalid limits and totals above its 100 record cap', static function () use ($throws): void {
    foreach ([['total' => 0, 'offset' => 0, 'limit' => 0], ['total' => 0, 'offset' => 0, 'limit' => '12'], ['total' => 101, 'offset' => 0, 'limit' => 12]] as $paging) {
        $search = new ReconciliationSearch(static fn (string $path): array => ['results' => [], 'paging' => $paging]);
        $throws(fn () => $search->authorizedPayments('s1'));
    }
});
$test('invoice tiny pages stop after bounded requests and never certify a truncated set', static function () use ($eq, $throws): void {
    $calls = 0;
    $search = new ReconciliationSearch(static function (string $path) use (&$calls): array {
        parse_str((string) parse_url($path, PHP_URL_QUERY), $q); $offset = (int) $q['offset']; $calls++;
        return ['results' => [['id' => 'i' . $offset, 'preapproval_id' => 's1']], 'paging' => ['total' => 21, 'offset' => $offset, 'limit' => 1]];
    });
    $throws(fn () => $search->authorizedPayments('s1')); $eq(20, $calls);
});
$enrollment = ['reference' => $reference, 'created_at' => '2026-09-01 00:00:00.000', 'mp_subscription_id' => null];
$now = new DateTimeImmutable($at);
$test('scan discovers a missing webhook payment and rechecks known IDs', static function () use ($eq, $page, $row, $enrollment, $now): void {
    $local = ['old']; $called = [];
    $s = new ReconciliationSearch(static fn (string $path): array => $page([$row('123')], 1));
    $scan = new ReconciliationScan($s, static function (string $topic, string $id) use (&$local, &$called): bool { $called[] = [$topic, $id]; $local[] = $id; return true; }, static function () use (&$local): array { return $local; });
    $result = $scan->run($enrollment, 'production', $now);
    $eq(true, $result['complete']); $eq(['123', 'old'], $result['payment_ids']); $eq([['payment', '123'], ['payment', 'old']], $called);
});
$test('scan fails closed on an individual failed GET', static function () use ($eq, $page, $row, $enrollment, $now): void {
    $scan = new ReconciliationScan(new ReconciliationSearch(static fn (string $path): array => $page([$row('123')], 1)), static fn (string $topic, string $id): bool => false, static fn (): array => ['123']);
    $result = $scan->run($enrollment, 'production', $now); $eq(false, $result['complete']); $eq(true, in_array('lookup_failed', $result['errors'], true));
});
$test('scan refuses financial search changes between passes', static function () use ($eq, $page, $row, $enrollment, $now): void {
    $calls = 0;
    $s = new ReconciliationSearch(static function (string $path) use (&$calls, $page, $row): array { $r = $row('123'); $r['status'] = ++$calls === 1 ? 'approved' : 'refunded'; return $page([$r], 1); });
    $result = (new ReconciliationScan($s, static fn (string $topic, string $id): bool => true, static fn (): array => ['123']))->run($enrollment, 'production', $now);
    $eq(false, $result['complete']); $eq(true, in_array('search_changed', $result['errors'], true));
});
$test('second payment search advances its cutoff and sees activity created during the scan', static function () use ($eq, $page, $row, $enrollment, $now): void {
    $ends=[];
    $later=$now->modify('+1 minute');
    $search=new ReconciliationSearch(static function (string $path) use (&$ends,$page,$row,$later):array {
        parse_str((string)parse_url($path,PHP_URL_QUERY),$query);
        $ends[]=(string)$query['end_date'];
        $isLater=$query['end_date']===$later->format('Y-m-d\TH:i:s.v\Z');
        return $page($isLater?[$row('late')]:[],$isLater?1:0);
    });
    $scan=new ReconciliationScan($search,static fn(string $topic,string $id):bool=>true,static fn():array=>[],null,static fn():DateTimeImmutable=>$later);
    $result=$scan->run($enrollment,'production',$now);
    $eq([$now->format('Y-m-d\TH:i:s.v\Z'),$later->format('Y-m-d\TH:i:s.v\Z')],$ends);
    $eq(false,$result['complete']);$eq(true,in_array('search_changed',$result['errors'],true));
});
$test('scan cannot certify history outside documented search window', static function () use ($eq, $page, $enrollment, $now): void {
    $enrollment['created_at'] = '2020-01-01 00:00:00';
    $result = (new ReconciliationScan(new ReconciliationSearch(static fn (string $p): array => $page([], 0)), static fn (string $t, string $i): bool => true, static fn (): array => []))->run($enrollment, 'production', $now);
    $eq(false, $result['complete']); $eq(true, in_array('historical_window_incomplete', $result['errors'], true));
});
$test('empty stable discovery is complete but never invents a payment', static function () use ($eq, $page, $enrollment, $now): void {
    $result = (new ReconciliationScan(new ReconciliationSearch(static fn (string $p): array => $page([], 0)), static fn (string $t, string $i): bool => true, static fn (): array => []))->run($enrollment, 'test', $now);
    $eq(true, $result['complete']); $eq([], $result['payment_ids']); $eq('test', $result['environment']);
});
$test('concurrent local payment insertion invalidates scan completeness', static function () use ($eq, $page, $enrollment, $now): void {
    $reads = 0;
    $result = (new ReconciliationScan(new ReconciliationSearch(static fn (string $p): array => $page([], 0)), static fn (string $t, string $i): bool => true, static function () use (&$reads): array { return ++$reads === 1 ? [] : ['new']; }))->run($enrollment, 'production', $now);
    $eq(false, $result['complete']); $eq(true, in_array('payment_set_changed', $result['errors'], true));
});
$test('subscription scan preserves authenticated next date separately', static function () use ($eq, $page, $enrollment, $now): void {
    $enrollment['mp_subscription_id'] = 's1'; $called = [];
    $facts = ['id' => 's1', 'next_payment_date' => '2026-10-01T00:00:00.000Z', 'verified_at' => '2026-09-22T12:00:00.000Z'];
    $result = (new ReconciliationScan(new ReconciliationSearch(static fn (string $p): array => $page([], 0)), static function (string $t, string $i) use (&$called): bool { $called[] = [$t, $i]; return true; }, static fn (): array => [], static fn (): array => $facts))->run($enrollment, 'production', $now);
    $eq(true, $result['complete']); $eq($facts, $result['subscription']); $eq([['subscription_preapproval', 's1']], $called);
});
$test('subscription timestamp helper canonicalizes timezone and rejects overflow dates', static function () use ($eq): void {
    $processor = (new ReflectionClass(WebhookProcessor::class))->newInstanceWithoutConstructor();
    $method = new ReflectionMethod(WebhookProcessor::class, 'canonicalTimestamp');
    $eq('2026-09-01T14:00:00.123Z', $method->invoke($processor, '2026-09-01T10:00:00.123-04:00'));
    $eq(null, $method->invoke($processor, '2026-02-30T00:00:00Z'));
    $eq(null, $method->invoke($processor, 'tomorrow'));
});
$test('invoice discovery failure preserves independently verified discovered payments', static function () use ($eq, $page, $row, $enrollment, $now): void {
    $enrollment['mp_subscription_id'] = 's1'; $local = []; $called = [];
    $search = new ReconciliationSearch(static function (string $path) use ($page, $row): array {
        if (str_starts_with($path, '/authorized_payments/')) throw new RuntimeException('Provider HTTP 400.');
        return $page([$row('123')], 1);
    });
    $refresh = static function (string $topic, string $id) use (&$local, &$called): bool {
        $called[] = [$topic, $id]; if ($topic === 'payment') $local[] = $id; return true;
    };
    $result = (new ReconciliationScan($search, $refresh, static function () use (&$local): array { return $local; }))->run($enrollment, 'production', $now);
    $eq(false, $result['complete']); $eq(['invoices_discovery_failed'], $result['errors']);
    $eq(['123'], $result['payment_ids']); $eq([['subscription_preapproval', 's1'], ['payment', '123']], $called);
});
$test('payment discovery failure still refreshes known and invoice linked payments', static function () use ($eq, $page, $enrollment, $now): void {
    $enrollment['mp_subscription_id'] = 's1'; $local = ['old']; $called = [];
    $search = new ReconciliationSearch(static function (string $path) use ($page): array {
        if (str_starts_with($path, '/v1/payments/')) throw new RuntimeException('Provider HTTP 500.');
        return $page([['id' => 'i1', 'preapproval_id' => 's1', 'payment' => ['id' => '123']]], 1);
    });
    $refresh = static function (string $topic, string $id) use (&$local, &$called): bool {
        $called[] = [$topic, $id]; if ($topic === 'payment') $local[] = $id; return true;
    };
    $result = (new ReconciliationScan($search, $refresh, static function () use (&$local): array { return $local; }))->run($enrollment, 'production', $now);
    $eq(false, $result['complete']); $eq(['payments_discovery_failed'], $result['errors']); $eq(['123', 'old'], $result['payment_ids']);
    $eq([['subscription_preapproval', 's1'], ['authorized_payment', 'i1'], ['payment', '123'], ['payment', 'old']], $called);
});
$test('one thrown lookup does not suppress the remaining known payment refreshes', static function () use ($eq, $page, $enrollment, $now): void {
    $called = [];
    $refresh = static function (string $topic, string $id) use (&$called): bool {
        $called[] = $id; if ($id === 'a') throw new RuntimeException('Temporary lookup error.'); return true;
    };
    $result = (new ReconciliationScan(new ReconciliationSearch(static fn (string $path): array => $page([], 0)), $refresh, static fn (): array => ['a', 'b']))->run($enrollment, 'production', $now);
    $eq(false, $result['complete']); $eq(['lookup_failed'], $result['errors']); $eq(['a', 'b'], $called);
});
$test('actual processor persists invoice, binds its attempt and isolates a late historical webhook', static function () use ($eq, $checkoutEnrollment, $checkoutPayment, $checkout, $invoice): void {
    $old=[];foreach (['MP_CREDENTIAL_ENVIRONMENT'=>'production','MP_SELLER_ID'=>'42','MP_APPLICATION_ID'=>'43','APP_ENV'=>'production','MP_API_TOKEN'=>'SYNTHETIC_TOKEN_FOR_TEST_ONLY'] as $key=>$value) { $old[$key]=getenv($key);putenv($key.'='.$value); }
    try {
        $enrollment=array_replace($checkoutEnrollment,['status'=>'subscription_authorized','subscription_status'=>'authorized','membership_status'=>'not_activated','payment_status'=>'pending','checkout_charge_count'=>12,'initial_payment_confirmed_at'=>null,'initial_mp_payment_id'=>null,'mp_last_payment_id'=>null,'active_checkout_attempt_id'=>10]);
        $pdo=new class($enrollment) extends PDO {
            public ?array $payment=null; public array $events=[]; public array $attempts=[]; private bool $transaction=false;
            public function __construct(public array $enrollment) {
                $this->attempts[]=['id'=>10,'enrollment_id'=>1,'attempt_number'=>1,'checkout_type'=>'subscription','external_reference'=>'DGYM-20260922-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA','resource_id'=>'sub1','provider_status'=>'authorized','lifecycle_status'=>'active','replaces_attempt_id'=>null,'is_active'=>1];
            }
            public function beginTransaction():bool { $this->transaction=true;return true; }
            public function commit():bool { $this->transaction=false;return true; }
            public function rollBack():bool { $this->transaction=false;return true; }
            public function inTransaction():bool { return $this->transaction; }
            public function prepare(string $query,array $options=[]):PDOStatement|false {
                return new class($this,$query) extends PDOStatement {
                    private array $params=[];
                    public function __construct(private PDO $db,private string $sql) {}
                    public function execute(?array $params=null):bool {
                        $this->params=$params??[];
                        if(str_contains($this->sql,'INSERT INTO payment_records')) {
                            if(is_array($this->db->payment)) {
                                foreach(['checkout_attempt_id','mp_authorized_payment_id','mp_preference_id'] as $sticky) {
                                    if(($this->params[$sticky]??null)===null) $this->params[$sticky]=$this->db->payment[$sticky]??null;
                                }
                                $this->params['checkout_link_verified']=max((int)($this->db->payment['checkout_link_verified']??0),(int)($this->params['checkout_link_verified']??0));
                                $this->params['ever_accredited']=max((int)($this->db->payment['ever_accredited']??0),(int)($this->params['ever_accredited']??0));
                            }
                            $this->db->payment=$this->params;
                        }
                        elseif(str_contains($this->sql,'UPDATE webhook_events')) $this->db->events[]=$this->params;
                        elseif(str_contains($this->sql,'UPDATE enrollments AS enrollment')) {
                            if(($this->db->enrollment['payment_status']??null)==='approved_accredited') {
                                $this->db->enrollment['initial_mp_payment_id']=$this->db->enrollment['mp_last_payment_id'];
                                $this->db->enrollment['initial_payment_confirmed_at']='2026-09-22 12:00:00';
                            }
                        } elseif(str_contains($this->sql,'UPDATE enrollments SET')) {
                            foreach(['status','subscription_status','payment_status','membership_status','mp_last_payment_id','error_code'] as $key) if(array_key_exists($key,$this->params)) $this->db->enrollment[$key]=$this->params[$key];
                        }
                        return true;
                    }
                    public function fetch(int $mode=PDO::FETCH_DEFAULT,int $cursorOrientation=PDO::FETCH_ORI_NEXT,int $cursorOffset=0):mixed {
                        if(str_contains($this->sql,'FROM payment_records')) return $this->db->payment??false;
                        if(str_contains($this->sql,'FROM checkout_payment_attempts AS attempt')) {
                            foreach($this->db->attempts as $attempt) {
                                if(isset($this->params['attempt_id']) && str_contains($this->sql,'replaces_attempt_id') && (int)($attempt['replaces_attempt_id']??0)!==(int)$this->params['attempt_id']) continue;
                                if(isset($this->params['resource_id']) && (string)$attempt['resource_id']!==(string)$this->params['resource_id']) continue;
                                if(isset($this->params['reference']) && (string)$attempt['external_reference']!==(string)$this->params['reference']) continue;
                                if(isset($this->params['enrollment_id']) && (int)$attempt['enrollment_id']!==(int)$this->params['enrollment_id']) continue;
                                $attempt['is_active']=(int)$this->db->enrollment['active_checkout_attempt_id']===(int)$attempt['id']?1:0;
                                return $attempt;
                            }
                            return false;
                        }
                        return $this->db->enrollment;
                    }
                    public function fetchAll(int $mode=PDO::FETCH_DEFAULT,mixed ...$args):array {
                        if(!str_contains($this->sql,'FROM checkout_payment_attempts AS attempt')) return [];
                        $rows=[];
                        foreach($this->db->attempts as $attempt) {
                            if(isset($this->params['enrollment_id']) && (int)$attempt['enrollment_id']!==(int)$this->params['enrollment_id']) continue;
                            $attempt['is_active']=(int)$this->db->enrollment['active_checkout_attempt_id']===(int)$attempt['id']?1:0;
                            $rows[]=$attempt;
                        }
                        return $rows;
                    }
                    public function fetchColumn(int $column=0):mixed {
                        if(str_contains($this->sql,'SELECT checkout_attempt_id FROM payment_records')) return $this->db->payment['checkout_attempt_id']??false;
                        return $this->db->payment===null ? 0 : 1;
                    }
                    public function rowCount():int { return 1; }
                };
            }
        };
        $gateway=new class($checkoutPayment,$checkout,$invoice) implements DemoGym\Domain\CheckoutGateway, DemoGym\Domain\SubscriptionAmountGateway {
            public array $calls=[]; public int $amountUpdates=0;
            public function __construct(public array $payment,public array $checkout,public array $invoice) {}
            public function createCheckout(string $checkoutType,array $payload,string $idempotencyKey):array { throw new RuntimeException('No mutations.'); }
            public function searchCheckout(string $checkoutType,string $externalReference,string $payerEmail,int $expectedAmount):array { throw new RuntimeException('No search.'); }
            public function getSubscription(string $id):array { $this->calls[]=['subscription',$id];return $this->checkout; }
            public function getPreference(string $id):array { throw new RuntimeException('Unexpected preference.'); }
            public function getPayment(string $id):array { $this->calls[]=['payment',$id];return $this->payment; }
            public function getMerchantOrder(string $id):array { throw new RuntimeException('Unexpected merchant order.'); }
            public function getAuthorizedPayment(string $id):array { $this->calls[]=['invoice',$id];return $this->invoice; }
            public function getChargeback(string $id):array { throw new RuntimeException('Unexpected chargeback.'); }
            public function getClaim(string $id):array { throw new RuntimeException('Unexpected claim.'); }
            public function updateSubscriptionAmount(string $id,int $amount,string $currency):array {
                ++$this->amountUpdates;
                throw new RuntimeException('Manual reconciliation must not mutate subscriptions.');
            }
        };
        $processor=new WebhookProcessor(new DemoGym\Config(),new DemoGym\Infrastructure\EnrollmentRepository($pdo),new DemoGym\Infrastructure\WebhookEventRepository($pdo),$gateway);
        $processor->process(1,'authorized_payment','invoice1','reconciliation_read');
        $eq(1,$pdo->payment['checkout_link_verified']);$eq('invoice1',$pdo->payment['mp_authorized_payment_id']);$eq(10,$pdo->payment['checkout_attempt_id']);
        $first=json_decode($pdo->events[0]['snapshot'],true)['verification'];
        $eq('processed',$pdo->events[0]['status']);$eq('dgym-payment-verification/2',$first['schema']);$eq(null,$first['application_id']);
        $eq(true,$first['verified_at'] >= $first['checkout_verification']['verified_at']);
        $gateway->calls=[];$processor->process(2,'payment','123','reconciliation_read');
        $eq([['payment','123'],['invoice','invoice1'],['subscription','sub1']],$gateway->calls);
        $eq('processed',$pdo->events[1]['status']);$eq('123',$pdo->payment['mp_payment_id']);
        $pdo->attempts[]=['id'=>11,'enrollment_id'=>1,'attempt_number'=>2,'checkout_type'=>'subscription','external_reference'=>'DGYM-20260923-BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB','resource_id'=>null,'provider_status'=>'not_created','lifecycle_status'=>'awaiting_cancellation','replaces_attempt_id'=>10,'is_active'=>0];
        $pdo->enrollment['status']='payment_rejected';$pdo->enrollment['membership_status']='not_activated';$pdo->enrollment['error_code']='payment_rejected';
        $gateway->checkout=array_replace($checkout,[
            'status'=>'authorized',
            'auto_recurring'=>[
                'transaction_amount'=>29990,'currency_id'=>'CLP','frequency'=>1,'frequency_type'=>'months',
                'end_date'=>DemoGym\Domain\PendingSubscriptionRequest::endDate('DGYM-20260922-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',12),
            ],
        ]);
        $processor->process(3,'subscription','sub1','reconciliation_read');
        $eq('processed',$pdo->events[2]['status']);$eq('payment_rejected',$pdo->enrollment['status']);
        $eq('not_activated',$pdo->enrollment['membership_status']);$eq('payment_rejected',$pdo->enrollment['error_code']);
        $pdo->attempts[0]['lifecycle_status']='canceled_for_retry';
        $pdo->attempts[1]['resource_id']='sub2';$pdo->attempts[1]['provider_status']='pending';$pdo->attempts[1]['lifecycle_status']='active';
        $pdo->enrollment['active_checkout_attempt_id']=11;
        $pdo->enrollment['status']='checkout_ready';$pdo->enrollment['membership_status']='not_activated';$pdo->enrollment['error_code']=null;
        $gateway->checkout=array_replace($checkout,[
            'status'=>'canceled',
            'auto_recurring'=>[
                'transaction_amount'=>29990,'currency_id'=>'CLP','frequency'=>1,'frequency_type'=>'months',
                'end_date'=>DemoGym\Domain\PendingSubscriptionRequest::endDate('DGYM-20260922-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',12),
            ],
        ]);
        $processor->process(4,'subscription','sub1','reconciliation_read');
        $eq('processed',$pdo->events[3]['status']);$eq('checkout_ready',$pdo->enrollment['status']);
        $eq('not_activated',$pdo->enrollment['membership_status']);$eq(null,$pdo->enrollment['error_code']);

        $gateway->checkout['status']='authorized';
        $processor->process(5,'subscription','sub1','reconciliation_read');
        $eq('processed',$pdo->events[4]['status']);$eq('review_required',$pdo->enrollment['status']);
        $eq('manual_review',$pdo->enrollment['membership_status']);$eq('historical_checkout_reactivated',$pdo->enrollment['error_code']);

        $pdo->enrollment['status']='checkout_ready';$pdo->enrollment['membership_status']='not_activated';$pdo->enrollment['error_code']=null;
        $gateway->checkout['status']='paused';
        $processor->process(6,'subscription','sub1','reconciliation_read');
        $eq('processed',$pdo->events[5]['status']);$eq('review_required',$pdo->enrollment['status']);
        $eq('manual_review',$pdo->enrollment['membership_status']);$eq('historical_checkout_unsafe_status',$pdo->enrollment['error_code']);

        $pdo->enrollment['status']='checkout_ready';$pdo->enrollment['membership_status']='not_activated';$pdo->enrollment['error_code']=null;
        $gateway->checkout['status']='canceled';
        $gateway->payment=array_replace($checkoutPayment,['preapproval_id'=>'sub1','status'=>'rejected','status_detail'=>'cc_rejected_other_reason','date_approved'=>null]);
        $processor->process(7,'payment','123','reconciliation_read');
        $eq('processed',$pdo->events[6]['status']);$eq(1,$pdo->payment['ever_accredited']);
        $eq('review_required',$pdo->enrollment['status']);$eq('manual_review',$pdo->enrollment['membership_status']);
        $eq('historical_attempt_financial_activity',$pdo->enrollment['error_code']);

        $pdo->enrollment['status']='checkout_ready';$pdo->enrollment['membership_status']='not_activated';$pdo->enrollment['error_code']=null;$pdo->payment=null;
        $gateway->payment=array_replace($checkoutPayment,['id'=>'124','preapproval_id'=>'sub1','status'=>'pending','status_detail'=>'pending_waiting_payment','date_approved'=>null]);
        $processor->process(8,'payment','124','reconciliation_read');
        $eq('processed',$pdo->events[7]['status']);$eq('review_required',$pdo->enrollment['status']);
        $eq('manual_review',$pdo->enrollment['membership_status']);$eq('historical_attempt_financial_activity',$pdo->enrollment['error_code']);

        $pdo->enrollment['status']='checkout_ready';$pdo->enrollment['membership_status']='not_activated';$pdo->enrollment['error_code']=null;$pdo->payment=null;
        $gateway->payment=array_replace($checkoutPayment,['id'=>'125','preapproval_id'=>'sub1','status'=>'rejected','status_detail'=>'cc_rejected_other_reason','date_approved'=>null]);
        $processor->process(9,'payment','125','reconciliation_read');
        $eq('processed',$pdo->events[8]['status']);$eq('checkout_ready',$pdo->enrollment['status']);
        $eq('not_activated',$pdo->enrollment['membership_status']);$eq(null,$pdo->enrollment['error_code']);

        $pdo->payment=null;
        $gateway->payment=array_replace($checkoutPayment,['id'=>'126','preapproval_id'=>'sub1','status'=>'approved','status_detail'=>'pending_contingency','date_approved'=>null]);
        $processor->process(10,'payment','126','reconciliation_read');
        $eq('processed',$pdo->events[9]['status']);$eq('review_required',$pdo->enrollment['status']);
        $eq('manual_review',$pdo->enrollment['membership_status']);$eq('historical_attempt_financial_activity',$pdo->enrollment['error_code']);

        $pdo->enrollment['status']='checkout_ready';$pdo->enrollment['membership_status']='not_activated';$pdo->enrollment['error_code']=null;
        $pdo->payment=['enrollment_id'=>1,'checkout_attempt_id'=>10,'mp_payment_id'=>'conflict','mp_authorized_payment_id'=>null,'checkout_link_verified'=>1,'status'=>'rejected','status_detail'=>'cc_rejected_other_reason','amount_refunded'=>0,'ever_accredited'=>0,'last_gateway_update_at'=>'2026-09-01 14:00:01.000'];
        $gateway->checkout=['id'=>'sub2','collector_id'=>42,'application_id'=>43,'external_reference'=>'DGYM-20260923-BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB','status'=>'pending'];
        $gateway->payment=array_replace($checkoutPayment,['id'=>'conflict','external_reference'=>'DGYM-20260923-BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB','preapproval_id'=>'sub2','status'=>'pending','status_detail'=>'pending_waiting_payment','date_approved'=>null]);
        $processor->process(11,'payment','conflict','reconciliation_read');
        $eq('review_required',$pdo->events[10]['status']);$eq('gateway_data_mismatch',$pdo->events[10]['error_code']);
        $eq('review_required',$pdo->enrollment['status']);$eq('manual_review',$pdo->enrollment['membership_status']);$eq('gateway_data_mismatch',$pdo->enrollment['error_code']);

        $pdo->enrollment['status']='checkout_ready';$pdo->enrollment['membership_status']='not_activated';$pdo->enrollment['error_code']=null;$pdo->payment=null;
        $gateway->payment=array_replace($checkoutPayment,['id'=>'127','external_reference'=>'DGYM-20260923-BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB','preapproval_id'=>'sub2','status'=>'pending','status_detail'=>'pending_waiting_payment','date_approved'=>null]);
        $gateway->invoice=['id'=>'invoice-bad','preapproval_id'=>'sub2','payment'=>['id'=>'127'],'transaction_amount'=>1,'currency_id'=>'CLP'];
        $processor->process(12,'authorized_payment','invoice-bad','reconciliation_read');
        $eq('review_required',$pdo->events[11]['status']);$eq('gateway_data_mismatch',$pdo->events[11]['error_code']);
        $eq('review_required',$pdo->enrollment['status']);$eq('manual_review',$pdo->enrollment['membership_status']);$eq('gateway_data_mismatch',$pdo->enrollment['error_code']);

        $pdo->enrollment['status']='checkout_ready';$pdo->enrollment['membership_status']='not_activated';$pdo->enrollment['error_code']=null;
        $pdo->payment=['enrollment_id'=>2,'checkout_attempt_id'=>null,'mp_payment_id'=>'foreign','mp_authorized_payment_id'=>null,'checkout_link_verified'=>0,'status'=>'rejected','status_detail'=>'cc_rejected_other_reason','amount_refunded'=>0,'ever_accredited'=>0,'last_gateway_update_at'=>'2026-09-01 14:00:01.000'];
        $gateway->invoice=$invoice;
        $gateway->payment=array_replace($checkoutPayment,['id'=>'foreign','external_reference'=>'DGYM-20260923-BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB','preapproval_id'=>'sub2','status'=>'pending','status_detail'=>'pending_waiting_payment','date_approved'=>null]);
        $processor->process(13,'payment','foreign','reconciliation_read');
        $eq('review_required',$pdo->events[12]['status']);$eq('gateway_data_mismatch',$pdo->events[12]['error_code']);
        $eq('review_required',$pdo->enrollment['status']);$eq('manual_review',$pdo->enrollment['membership_status']);$eq('gateway_data_mismatch',$pdo->enrollment['error_code']);
        $eq(2,$pdo->payment['enrollment_id']);$eq(null,$pdo->payment['checkout_attempt_id']);$eq('foreign',$pdo->payment['mp_payment_id']);
        $eq(0,$gateway->amountUpdates);

    } finally { foreach($old as $key=>$value) $value===false?putenv($key):putenv($key.'='.$value); }
});
$failures = 0;
foreach ($tests as $name => $fn) { try { $fn(); echo "PASS $name\n"; } catch (Throwable $error) { $failures++; echo 'FAIL ' . $name . ': ' . get_class($error) . ' ' . $error->getMessage() . "\n"; } }
echo count($tests) . " tests, $failures failures.\n";
exit($failures > 0 ? 1 : 0);
