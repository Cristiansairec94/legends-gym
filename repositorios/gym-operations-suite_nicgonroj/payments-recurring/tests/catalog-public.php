<?php

declare(strict_types=1);

// Catálogo puro para QA de paridad frontend/backend; no carga entorno privado,
// base de datos ni clientes de red.
require_once dirname(__DIR__) . '/autoload.php';

echo json_encode((new DemoGym\Domain\PriceCatalog())->publicOffers([
    'automatic' => [3, 6, 12],
    'single' => [1],
    'prepaid' => [3, 6, 12],
]), JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . PHP_EOL;
