<?php

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\OrderItem;
use App\Models\Order;
use App\Models\Reservation;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Refund;
use App\Models\PurchaseOrderItem;
use App\Models\Recipe;
use App\Models\StockMovement;
use App\Models\Attendance;
use App\Models\ShiftSchedule;
use Illuminate\Support\Facades\DB;

echo '--- orders / order_items ---' . PHP_EOL;
$softOrders = Order::withTrashed()->whereNotNull('deleted_at')->count();
echo 'orders_soft_deleted=' . $softOrders . PHP_EOL;
$itemsToSoftDeleted = DB::table('order_items')->whereIn('order_id', function ($q) {
    $q->select('id')->from('orders')->whereNotNull('deleted_at');
})->count();
echo 'order_items_pointing_soft_deleted_orders=' . $itemsToSoftDeleted . PHP_EOL;
$itemsToMissing = OrderItem::whereDoesntHave('order')->whereNotIn('order_id', function ($q) {
    $q->select('id')->from('orders');
})->count();
echo 'order_items_with_truly_invalid_order_id=' . $itemsToMissing . PHP_EOL;

echo '--- reservations / customers ---' . PHP_EOL;
$custSoft = Customer::withTrashed()->whereNotNull('deleted_at')->count();
echo 'customers_soft_deleted=' . $custSoft . PHP_EOL;
$resNullCust = Reservation::whereNull('customer_id')->count();
echo 'reservations_with_null_customer=' . $resNullCust . PHP_EOL;
$resToMissing = DB::table('reservations')->whereNotNull('customer_id')
    ->whereNotIn('customer_id', function ($q) {
        $q->select('id')->from('customers');
    })->count();
echo 'reservations_with_invalid_customer_id=' . $resToMissing . PHP_EOL;

echo '--- other orphans (non-soft-delete aware) ---' . PHP_EOL;
echo 'invoice_orphans=' . Invoice::whereDoesntHave('order')->count() . PHP_EOL;
echo 'payment_orphans=' . Payment::whereDoesntHave('invoice')->count() . PHP_EOL;
echo 'refund_orphans=' . Refund::whereDoesntHave('payment')->count() . PHP_EOL;
echo 'poi_orphans=' . PurchaseOrderItem::whereDoesntHave('purchaseOrder')->count() . PHP_EOL;
echo 'recipe_orphans=' . Recipe::whereDoesntHave('menuItem')->count() . PHP_EOL;
echo 'stockmov_orphans=' . StockMovement::whereDoesntHave('ingredient')->count() . PHP_EOL;
echo 'attendance_orphans=' . Attendance::whereDoesntHave('staff')->count() . PHP_EOL;
echo 'shiftsched_orphans=' . ShiftSchedule::whereDoesntHave('staff')->orWhereDoesntHave('shift')->count() . PHP_EOL;

echo '--- baseline counts ---' . PHP_EOL;
echo 'orders=' . Order::count() . ' (with trashed: ' . Order::withTrashed()->count() . ')' . PHP_EOL;
echo 'order_items=' . OrderItem::count() . PHP_EOL;
echo 'reservations=' . Reservation::count() . PHP_EOL;
echo 'customers=' . Customer::count() . ' (with trashed: ' . Customer::withTrashed()->count() . ')' . PHP_EOL;
echo 'profiles=' . \App\Models\StaffProfile::count() . ' schedules=' . ShiftSchedule::count() . ' users=' . \App\Models\User::count() . PHP_EOL;
echo 'admin_tokens=' . DB::table('personal_access_tokens')->where('name', 'like', '%admin%')->orWhere('id', 52)->count() . PHP_EOL;
echo 'a4_tokens=' . DB::table('personal_access_tokens')->where('name', 'like', 'a4-%')->orWhere('name', 'like', 'a3-%')->count() . PHP_EOL;
