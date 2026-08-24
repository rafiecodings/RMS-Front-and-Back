<?php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Http\Controllers\Api\V1\Customer\CustomerController;
use Illuminate\Http\Request;

try {
    $controller = app(CustomerController::class);
    $request = Request::create('/api/v1/customers', 'POST', [
        'name' => 'Test Customer',
        'email' => 'test@example.com',
        'is_active' => true,
    ]);
    $resp = $controller->store($request);
    echo 'Status: ' . $resp->status() . PHP_EOL;
    echo 'Body: ' . $resp->getContent() . PHP_EOL;
} catch (\Exception $e) {
    echo 'ERROR: ' . $e->getMessage() . PHP_EOL;
    echo 'File: ' . $e->getFile() . ':' . $e->getLine() . PHP_EOL;
    echo 'Trace:' . PHP_EOL . $e->getTraceAsString() . PHP_EOL;
}
