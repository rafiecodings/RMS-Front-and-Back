<?php

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\Route;

$routes = Route::getRoutes()->getRoutes();

$seen = [];
$dupes = [];
$noUuid = [];

foreach ($routes as $rt) {
    $methods = $rt->methods();
    $method = in_array('GET', $methods) ? 'GET' : (in_array('POST', $methods) ? 'POST' : implode(',', array_filter($methods, fn($m) => in_array($m, ['PUT','PATCH','DELETE']))));
    $uri = $rt->uri();
    $key = $method . '|' . $uri;
    $seen[$key] = ($seen[$key] ?? 0) + 1;
    if ($seen[$key] > 1) {
        $dupes[] = $key;
    }
    if (preg_match('/\{/', $uri)) {
        $hasUuid = false;
        foreach (($rt->wheres ?? []) as $param => $regex) {
            if (str_contains($regex, '[0-9a-fA-F]') || str_contains($regex, 'urn:uuid') || str_contains($regex, 'uuid')) {
                $hasUuid = true;
            }
        }
        if (!$hasUuid) {
            $noUuid[] = $method . ' ' . $uri;
        }
    }
}

echo "TOTAL_ROUTES=" . count($routes) . PHP_EOL;
echo "DUPLICATE_ROUTE_KEYS=" . count($dupes) . PHP_EOL;
foreach ($dupes as $d) { echo "DUP: {$d}" . PHP_EOL; }
echo PHP_EOL . "PARAM_ROUTES_WITHOUT_whereUuid=" . count($noUuid) . PHP_EOL;
foreach ($noUuid as $r) { echo "  {$r}" . PHP_EOL; }

// Shadowing: within each HTTP method, order routes by uri; flag a {param}-segment route that precedes a literal-segment route differing only at that param position.
$byMethod = [];
foreach ($routes as $rt) {
    $byMethod[$rt->methods()[0] ?? 'GET'][] = $rt;
}
$shadows = [];
foreach ($byMethod as $m => $list) {
    foreach ($list as $i => $a) {
        foreach (array_slice($list, $i + 1) as $j => $b) {
            $pa = explode('/', $a->uri());
            $pb = explode('/', $b->uri());
            if (count($pa) !== count($pb)) continue;
            $diff = null;
            for ($z = 0; $z < count($pa); $z++) {
                if ($pa[$z] !== $pb[$z]) { $diff = $z; break; }
            }
            if ($diff !== null && preg_match('/^\{/', $pa[$diff]) && !preg_match('/^\{/', $pb[$diff])) {
                $shadows[$a->uri() . ' shadows literal ' . $b->uri()] = true;
            }
        }
    }
}
echo PHP_EOL . "POTENTIAL_SHADOWS=" . count($shadows) . PHP_EOL;
foreach (array_keys($shadows) as $s) { echo "  {$s}" . PHP_EOL; }
