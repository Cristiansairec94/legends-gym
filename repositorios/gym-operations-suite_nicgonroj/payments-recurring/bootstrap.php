<?php

declare(strict_types=1);

use DemoGym\App;
use DemoGym\Environment;

require_once __DIR__ . '/autoload.php';
Environment::loadPrivateFileIfConfigured();

return new App();
