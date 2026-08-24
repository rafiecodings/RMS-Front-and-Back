<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
App\Models\Reservation::where('reservation_number','like','TSTX-%')->delete();
$svc = new App\Services\ReservationService();
$table = App\Models\Table::where('status','available')->first();
$date = date('Y-m-d', strtotime('+10 days'));
$r = App\Models\Reservation::create([
  'customer_id'=>null,'table_id'=>$table->id,'reservation_number'=>'TSTX-'.uniqid(),
  'guest_name'=>'A','party_size'=>2,'reservation_date'=>$date,'reservation_time'=>'18:00','status'=>'pending']);
echo "Single 18:00 reservation occupies [18:00,20:00)\n";
echo '17:59 (overlap): ' . ($svc->hasOverlap($table->id,$date,'17:59',null)?'CONFLICT':'OK') . "\n";
echo '18:00 (overlap): ' . ($svc->hasOverlap($table->id,$date,'18:00',null)?'CONFLICT':'OK') . "\n";
echo '19:59 (overlap, <20:00): ' . ($svc->hasOverlap($table->id,$date,'19:59',null)?'CONFLICT':'OK') . "\n";
echo '20:00 exact boundary (expect OK): ' . ($svc->hasOverlap($table->id,$date,'20:00',null)?'CONFLICT':'OK') . "\n";
echo '20:01 (expect OK): ' . ($svc->hasOverlap($table->id,$date,'20:01',null)?'CONFLICT':'OK') . "\n";
echo '22:00 (expect OK): ' . ($svc->hasOverlap($table->id,$date,'22:00',null)?'CONFLICT':'OK') . "\n";
$r->delete();
echo "cleaned up\n";
