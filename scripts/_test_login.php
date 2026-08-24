<?php
require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
// Use the LoginController logic directly to validate auth flow
$user = \App\Models\User::where("email","admin@rms.com")->first();
if (! $user || ! Hash::check("password",$user->password)) {
    echo "FAIL: cannot auth admin@rms.com".PHP_EOL; exit(1);
}
echo "PASS: admin@rms.com password=valid".PHP_EOL;
// Test each role user
$expected = [
    "victor.ramos@kainanexpress.com"=>"manager",
    "yvonne.ong@kainanexpress.com"=>"cashier",
    "xavier.lim@kainanexpress.com"=>"waiter",
    "zandro.bautista@kainanexpress.com"=>"kitchen",
    "ramon.guerrero@kainanexpress.com"=>"inventory_staff",
];
foreach ($expected as $email=>$want) {
    $u = \App\Models\User::where("email",$email)->first();
    $ok = $u && Hash::check("password",$u->password) && $u->hasRole($want);
    echo ($ok ? "PASS" : "FAIL").": $email role=$want active=".($u->is_active?"1":"0").PHP_EOL;
}
// Confirm 403 middleware behavior: simulate role check
$cashier = \App\Models\User::where("email","yvonne.ong@kainanexpress.com")->first();
echo "cashier admin route access: ".($cashier->hasRole("admin") ? "ALLOWED" : "FORBIDDEN(403)").PHP_EOL;
$admin = \App\Models\User::where("email","admin@rms.com")->first();
echo "admin admin route access: ".($admin->hasRole("admin") ? "ALLOWED" : "FORBIDDEN").PHP_EOL;
