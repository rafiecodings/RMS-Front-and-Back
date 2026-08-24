<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
use App\Models\User;
use App\Models\Table;
use App\Models\Reservation;
$user = User::where('email','admin@rms.com')->first();
$token = $user->createToken('test')->plainTextToken;
$base = 'http://127.0.0.1:8000/api/v1';
$headers = ['Authorization: Bearer '.$token,'Content-Type: application/json','Accept: application/json'];
function call($m,$u,$b,$h){$c=curl_init($u);curl_setopt($c,CURLOPT_CUSTOMREQUEST,$m);curl_setopt($c,CURLOPT_HTTPHEADER,$h);curl_setopt($c,CURLOPT_RETURNTRANSFER,true);if($b)curl_setopt($c,CURLOPT_POSTFIELDS,json_encode($b));$r=curl_exec($c);$code=curl_getinfo($c,CURLINFO_HTTP_CODE);curl_close($c);return [$code,json_decode($r,true)];}
$table = Table::where('status','available')->first();
$d = date('Y-m-d', strtotime('+7 days'));
[$c,$data] = call('POST',"$base/reservations",['guest_name'=>'X','party_size'=>2,'reservation_date'=>$d,'reservation_time'=>'19:00','table_id'=>$table->id,'source'=>'walk_in'],$headers);
$rid = $data['data']['id'];
$table->refresh(); echo "after create: {$table->status} (expect reserved)\n";
[$c2] = call('PATCH',"$base/reservations/$rid/status",['status'=>'seated'],$headers);
$table->refresh(); echo "after seated: {$table->status} (expect occupied)\n";
[$c3] = call('PATCH',"$base/reservations/$rid/status",['status'=>'completed'],$headers);
$table->refresh(); echo "after completed: {$table->status} (expect available)\n";
call('DELETE',"$base/reservations/$rid",null,$headers);
echo "cleaned\n";
