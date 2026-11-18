<?php
declare(strict_types=1);
require dirname(__DIR__) . '/autoload.php';
use DemoGym\Application\ReconciliationService;
use DemoGym\Infrastructure\ManualReconciliationAuth as Auth;
use DemoGym\Infrastructure\MercadoPagoClient;
use DemoGym\Infrastructure\MercadoPagoApiException;
use DemoGym\Infrastructure\ReconciliationReadContext as Reads;
use DemoGym\Infrastructure\ReadBudgetExceeded;

$tests = []; $test = static function (string $name, callable $fn) use (&$tests): void { $tests[$name] = $fn; };
$eq = static function (mixed $expected, mixed $actual): void { if ($expected !== $actual) throw new RuntimeException('Unexpected result.'); };
$throws = static function (callable $fn, string $class = Throwable::class): void { try { $fn(); } catch (Throwable $error) { if ($error instanceof $class) return; throw $error; } throw new RuntimeException('Expected failure.'); };
$key = str_repeat('k',32); $now = 1790131200; $timestamp = (string) $now; $nonce = str_repeat('n',32);
$body = json_encode(['schema'=>'dgym-manual-reconciliation/1','runId'=>'synthetic-run-0001','afterId'=>0]);
$sign = static fn (string $data): string => Auth::sign(implode("\n",['v1','POST',Auth::PATH,$timestamp,$nonce,hash('sha256',$data)]),$key);
$test('valid HMAC authenticates exact bytes and existing canonical response format', static function () use ($eq,$key,$now,$timestamp,$nonce,$body,$sign): void {
    $eq(true,Auth::authenticate('POST',Auth::PATH,$body,$timestamp,$nonce,$sign($body),$key,$now));
    $canonical = implode("\n",['v1','response',Auth::PATH,$timestamp,$nonce,hash('sha256','{"status":"complete"}')]);
    $eq(rtrim(strtr(base64_encode(hash_hmac('sha256',$canonical,$key,true)),'+/','-_'),'='),Auth::sign($canonical,$key));
});
$test('bad signature body method path stale timestamp and key cannot authorize a lookup', static function () use ($eq,$key,$now,$timestamp,$nonce,$body,$sign): void {
    $calls=0;
    foreach ([['POST',Auth::PATH,$body.' ',$timestamp,$nonce,$sign($body),$key,$now],['GET',Auth::PATH,$body,$timestamp,$nonce,$sign($body),$key,$now],
        ['POST',Auth::PATH.'?x=1',$body,$timestamp,$nonce,$sign($body),$key,$now],['POST',Auth::PATH,$body,$timestamp,$nonce,$sign($body),$key,$now+301],
        ['POST',Auth::PATH,$body,$timestamp,$nonce,$sign($body),str_repeat('x',32),$now],['POST',Auth::PATH,$body,$timestamp,$nonce."\r\n",$sign($body),$key,$now]] as $args) {
        if(Auth::authenticate(...$args))$calls++;
    }
    $eq(0,$calls);
});
$test('manual payload accepts global cursor or exact UUID target', static function () use ($eq,$body): void {
    $eq(['runId'=>'synthetic-run-0001','afterId'=>0,'enrollmentPublicId'=>null],Auth::payload($body));
    $p=['schema'=>'dgym-manual-reconciliation/1','runId'=>'synthetic-run-0001','enrollmentPublicId'=>'12345678-ABCD-4ABC-9ABC-123456789ABC'];
    $eq('12345678-abcd-4abc-9abc-123456789abc',Auth::payload(json_encode($p))['enrollmentPublicId']);
});
$test('payload rejects selector ambiguity, coercion, arbitrary fields, SQL and oversized JSON', static function () use ($throws,$body): void {
    $base=json_decode($body,true);
    foreach ([['afterId'=>'1'],['afterId'=>-1],['afterId'=>1.1],['afterId'=>null],['operation'=>'approve'],['runId'=>'bad'],
        ['enrollmentPublicId'=>"' OR 1=1"],['enrollmentPublicId'=>'12345678-abcd-4abc-9abc-123456789abc']] as $change) $throws(fn()=>Auth::payload(json_encode(array_replace($base,$change))),InvalidArgumentException::class);
    $throws(fn()=>Auth::payload(str_repeat(' ',4097)),InvalidArgumentException::class);
});
$test('persisted nonce prevents a second signed request even after a new PHP instance', static function () use ($eq,$throws,$nonce): void {
    $root=sys_get_temp_dir().'/manual-'.bin2hex(random_bytes(6));mkdir($root,0700);$root=(string)realpath($root);
    try {
        $eq(true,Auth::consumeNonce($root,$nonce));$eq(false,Auth::consumeNonce($root,$nonce));
        $file=$root.'/var/control-manual-nonces/'.hash('sha256',$nonce).'.nonce';
        $eq('used',file_get_contents($file));$eq(0600,fileperms($file)&0777);
        $eq(0700,fileperms(dirname($file))&0777);
        $throws(fn()=>Auth::consumeNonce($root,'../../unsafe'));
    } finally { foreach(glob($root.'/var/control-manual-nonces/*')?:[] as $f)unlink($f);rmdir($root.'/var/control-manual-nonces');rmdir($root.'/var');rmdir($root); }
});
$test('retry policy has one retry for transient GET only and rejects conflicts', static function () use ($eq): void {
    foreach([0,408,429,500,502,503,504] as $status) {$eq(true,Reads::canRetry('GET',$status,1));$eq(false,Reads::canRetry('GET',$status,2));$eq(false,Reads::canRetry('POST',$status,1));}
    foreach([200,400,401,403,404,409,422] as $status)$eq(false,Reads::canRetry('GET',$status,1));
});
$test('shared budget limits each request and prohibits another GET after exhaustion', static function () use ($eq,$throws): void {
    $clock=0.0;$reads=new Reads(45,static function()use(&$clock):float{return $clock;},static function(int $ms)use(&$clock):void{$clock+=$ms/1000;});
    $eq(20000,$reads->timeoutMilliseconds());$clock=44.0;$eq(900,$reads->timeoutMilliseconds());
    $eq(false,$reads->pauseBeforeRetry(1000));$clock=44.9;$throws(fn()=>$reads->timeoutMilliseconds(),ReadBudgetExceeded::class);
    $eq(true,$reads->diagnostics()['budget_exhausted']);
});
$test('mutation budget reserves its authenticated confirmation window', static function () use ($eq,$throws): void {
    $clock=0.0;$reads=new Reads(10,static function()use(&$clock):float{return $clock;});
    $eq(5000,$reads->mutationTimeoutMilliseconds());
    $clock=5.0;$throws(fn()=>$reads->mutationTimeoutMilliseconds(),ReadBudgetExceeded::class);
    $eq(true,$reads->diagnostics()['budget_exhausted']);
});
$test('Retry-After is respected and excessive backoff is never shortened', static function () use ($eq): void {
    $clock=0.0;$delays=[];$reads=new Reads(45,static function()use(&$clock):float{return $clock;},static function(int $ms)use(&$clock,&$delays):void{$delays[]=$ms;$clock+=$ms/1000;});
    $eq(false,$reads->pauseBeforeRetry(3000));$eq([],$delays);$eq(true,$reads->pauseBeforeRetry(1500));$eq([1500],$delays);
    $eq(true,$reads->pauseBeforeRetry(null));$eq([1500,200],$delays);
});
$old=[];foreach(['APP_ENV'=>'development','MP_CREDENTIAL_ENVIRONMENT'=>'test','MP_APPLICATION_ID'=>'43','MP_SELLER_ID'=>'42','MP_API_TOKEN'=>'synthetic-not-a-credential'] as $k=>$v){$old[$k]=getenv($k);putenv($k.'='.$v);}
$response=static fn(int $status,string|false $body='{}',int $transport=0,?int $retry=null):array=>['http_status'=>$status,'body'=>$body,'transport_code'=>$transport,'retry_after_ms'=>$retry];
$test('client retries a non JSON 503 once then returns verified GET body', static function () use ($eq,$response): void {
    $calls=[];$reads=new Reads(45,null,static function(int $ms):void{});
    $client=new MercadoPagoClient(new DemoGym\Config(),$reads,static function(string $method,string $path,?array $payload,int $timeout)use(&$calls,$response):array{
        $calls[]=[$method,$path,$timeout];return count($calls)===1?$response(503,'<upstream>'):$response(200,'{"id":"123"}');
    });
    $eq(['id'=>'123'],$client->getPayment('123'));$eq(2,count($calls));$eq(1,$reads->diagnostics()['retry_count']);
    $eq('payment',$reads->diagnostics()['requests'][0]['endpoint']);
    $eq(false,str_contains(json_encode($reads->diagnostics()),'123'));
});
$test('client preserves curl errno and never repeats failed GET more than twice', static function () use ($eq,$throws,$response): void {
    $calls=0;$reads=new Reads(45,null,static function(int $ms):void{});
    $client=new MercadoPagoClient(new DemoGym\Config(),$reads,static function()use(&$calls,$response):array{$calls++;return $response(0,false,28);});
    $throws(fn()=>$client->getSubscription('synthetic-id'),MercadoPagoApiException::class);$eq(2,$calls);$eq(28,$reads->diagnostics()['requests'][0]['transport_code']);
});
$test('client does not retry 409 authorization failures validation or POST checkout creation', static function () use ($eq,$throws,$response): void {
    foreach([401,403,409,422] as $status){$calls=0;$client=new MercadoPagoClient(new DemoGym\Config(),new Reads(45),static function()use(&$calls,$response,$status):array{$calls++;return $response($status);});$throws(fn()=>$client->getPayment('123'));$eq(1,$calls);}
    $calls=0;$client=new MercadoPagoClient(new DemoGym\Config(),new Reads(45),static function()use(&$calls,$response):array{$calls++;return $response(503);});
    $throws(fn()=>$client->createSubscription(['synthetic'=>true]),MercadoPagoApiException::class);$eq(1,$calls);
});
$test('expired context makes zero transport calls', static function () use ($eq,$throws,$response): void {
    $clock=0.0;$calls=0;$reads=new Reads(1,static function()use(&$clock):float{return $clock;});$clock=2.0;
    $client=new MercadoPagoClient(new DemoGym\Config(),$reads,static function()use(&$calls,$response):array{$calls++;return $response(200);});
    $throws(fn()=>$client->getPayment('123'),ReadBudgetExceeded::class);$eq(0,$calls);
});
$test('insufficient confirmation reserve prevents POST before transport', static function () use ($eq,$throws,$response): void {
    $clock=0.0;$calls=0;$reads=new Reads(10,static function()use(&$clock):float{return $clock;});$clock=5.1;
    $client=new MercadoPagoClient(new DemoGym\Config(),$reads,static function()use(&$calls,$response):array{$calls++;return $response(200);});
    $throws(fn()=>$client->createSubscription(['external_reference'=>'SYNTHETIC']),ReadBudgetExceeded::class);$eq(0,$calls);
});
$test('mutation timeout is bounded below the remaining deadline for final GET', static function () use ($eq,$response): void {
    $clock=0.0;$timeouts=[];$reads=new Reads(12,static function()use(&$clock):float{return $clock;});
    $client=new MercadoPagoClient(new DemoGym\Config(),$reads,static function(string $method,string $path,?array $payload,int $timeout)use(&$timeouts,$response):array{$timeouts[]=$timeout;return $response(200,'{"id":"synthetic"}');});
    $client->createSubscription(['external_reference'=>'SYNTHETIC']);
    $eq([7000],$timeouts);
});
$test('safe diagnostics never contain raw error messages SQL IDs or credentials', static function () use ($eq): void {
    $eq(['code'=>'storage_failed'],ReconciliationService::safeFailure(new PDOException('SQL password@example.invalid')));
    $eq(['code'=>'provider_rate_limited','http_status'=>429],ReconciliationService::safeFailure(new MercadoPagoApiException(429,true,false,'secret id email')));
    $eq(['code'=>'reconciliation_unavailable'],ReconciliationService::safeFailure(new RuntimeException('raw-secret')));
});

// Fake PDO exercises the real service, repositories and lock/selection control without provider access.
final class ManualTestPDO extends PDO {
    public array $queries=[];public array $parameters=[]; public bool $busy=false;public bool $acquire=false;public array $enrollments=[];
    public function __construct(){}
    public function query(string $query,?int $fetchMode=null,mixed ...$args):PDOStatement|false{return $this->prepare($query);}
    public function prepare(string $query,array $options=[]):PDOStatement|false {
        $this->queries[]=$query;
        return new class($this,$query) extends PDOStatement {
            public function __construct(private ManualTestPDO $db,private string $sql){}
            public function execute(?array $params=null):bool{$this->db->parameters[]=$params;return true;}
            public function fetchColumn(int $column=0):mixed{if(str_contains($this->sql,'DATABASE()'))return 'synthetic';return $this->db->busy?0:1;}
            public function fetchAll(int $mode=PDO::FETCH_DEFAULT,mixed ...$args):array{return str_contains($this->sql,'FROM enrollments')?$this->db->enrollments:[];}
            public function fetch(int $mode=PDO::FETCH_DEFAULT,int $orientation=PDO::FETCH_ORI_NEXT,int $offset=0):mixed{return ['id'=>1,'attempts'=>1,'status'=>'processed','enrollment_id'=>1,'resource_snapshot_json'=>'{"complete":true,"completed_at":"2026-09-01T00:00:00Z","errors":[]}'];}
            public function rowCount():int{return $this->db->acquire?1:0;}
        };
    }
}
$service=static fn(ManualTestPDO $pdo):ReconciliationService=>new ReconciliationService(new DemoGym\Config(),$pdo,new DemoGym\Infrastructure\EnrollmentRepository($pdo),new DemoGym\Infrastructure\WebhookEventRepository($pdo));
$test('busy lock prevents enrollment lookup and returns finished metadata',static function()use($eq,$service):void{
    $pdo=new ManualTestPDO();$pdo->busy=true;$r=$service($pdo)->run('test-run-0001');$eq('busy',$r['status']);$eq('reconciliation_busy',$r['error']);$eq(true,is_string($r['finishedAt']));
    foreach($pdo->queries as $q){$eq(false,str_contains($q,'FROM enrollments'));$eq(false,str_contains($q,'RELEASE_LOCK'));}
});
$test('specific selection is prepared and missing target releases lock',static function()use($eq,$service):void{
    $pdo=new ManualTestPDO();$r=$service($pdo)->run('test-run-0001',0,1,'12345678-abcd-4abc-9abc-123456789abc');
    $eq('enrollment_not_found',$r['error']);$eq(false,$r['hasMore']);$eq(true,is_string($r['finishedAt']));
    $eq(true,(bool)array_filter($pdo->queries,static fn($q)=>str_contains($q,'WHERE public_id = :public_id LIMIT 1')));
    $eq(true,(bool)array_filter($pdo->queries,static fn($q)=>str_contains($q,'RELEASE_LOCK')));
});
$test('global one row page returns cursor and replays without pretending newer proof',static function()use($eq,$service):void{
    $pdo=new ManualTestPDO();$pdo->enrollments=[['id'=>1,'public_id'=>'12345678-abcd-4abc-9abc-123456789abc'],['id'=>2,'public_id'=>'22345678-abcd-4abc-9abc-123456789abc']];
    $r=$service($pdo)->run('test-run-0001');$eq('replayed',$r['status']);$eq(1,$r['processed']);$eq(1,$r['replayed']);$eq(0,$r['complete']);$eq(true,$r['hasMore']);$eq(1,$r['nextAfterId']);$eq('2026-09-01T00:00:00Z',$r['verifiedAt']);$eq(0,$r['diagnostics']['request_count']);
});
$test('real service completes an empty stable search and persists its own authenticated pass',static function()use($eq,$response):void{
    $pdo=new ManualTestPDO();$pdo->acquire=true;$pdo->enrollments=[['id'=>1,'public_id'=>'12345678-abcd-4abc-9abc-123456789abc','reference'=>'DGYM-20261005-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA','created_at'=>gmdate('Y-m-d H:i:s'),'mp_subscription_id'=>null]];
    $calls=[];$transport=static function($method,$path)use(&$calls,$response):array{$calls[]=[$method,$path];return $response(200,'{"results":[],"paging":{"total":0,"offset":0,"limit":50}}');};
    $service=new ReconciliationService(new DemoGym\Config(),$pdo,new DemoGym\Infrastructure\EnrollmentRepository($pdo),new DemoGym\Infrastructure\WebhookEventRepository($pdo),$transport);
    $r=$service->run('test-run-0002');$eq('complete',$r['status']);$eq(1,$r['complete']);$eq([],$r['errorCodes']);$eq(2,count($calls));
    foreach($calls as $call)$eq('GET',$call[0]);
    $writes=array_values(array_filter($pdo->parameters,static fn($p)=>is_array($p)&&isset($p['snapshot'])));
    $eq(1,count($writes));$snapshot=json_decode($writes[0]['snapshot'],true);$eq(true,$snapshot['complete']);$eq(2,$snapshot['diagnostics']['request_count']);
});
$test('real service persists incomplete diagnostic after both transient GET attempts fail',static function()use($eq,$response):void{
    $pdo=new ManualTestPDO();$pdo->acquire=true;$pdo->enrollments=[['id'=>1,'public_id'=>'12345678-abcd-4abc-9abc-123456789abc','reference'=>'DGYM-20261005-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA','created_at'=>gmdate('Y-m-d H:i:s'),'mp_subscription_id'=>null]];
    $transport=static fn()=> $response(503,'gateway temporary error');
    $service=new ReconciliationService(new DemoGym\Config(),$pdo,new DemoGym\Infrastructure\EnrollmentRepository($pdo),new DemoGym\Infrastructure\WebhookEventRepository($pdo),$transport);
    $r=$service->run('test-run-0003');$eq('incomplete',$r['status']);$eq(0,$r['complete']);$eq(1,$r['incomplete']);$eq(null,$r['verifiedAt']);
    $eq(['payments_discovery_failed'],$r['errorCodes']);$eq(2,$r['diagnostics']['request_count']);$eq(1,$r['diagnostics']['retry_count']);$eq(503,$r['diagnostics']['requests'][0]['http_status']);
    $writes=array_values(array_filter($pdo->parameters,static fn($p)=>is_array($p)&&isset($p['snapshot'])));$eq(false,json_decode($writes[0]['snapshot'],true)['complete']);$eq('failed_transient',$writes[0]['status']);
});
$failures=0;
try{foreach($tests as $name=>$fn){try{$fn();echo "PASS $name\n";}catch(Throwable $error){$failures++;echo 'FAIL '.$name.' ('.get_class($error).")\n";}}}
finally{foreach($old as $k=>$v)$v===false?putenv($k):putenv($k.'='.$v);}
echo count($tests).' manual tests, '.$failures." failures.\n";exit($failures===0?0:1);
