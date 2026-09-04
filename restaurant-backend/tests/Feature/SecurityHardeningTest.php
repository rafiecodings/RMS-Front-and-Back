<?php

namespace Tests\Feature;

use App\Models\Ingredient;
use App\Models\Invoice;
use App\Models\KotTicket;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\Role;
use App\Models\StaffProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SecurityHardeningTest extends TestCase
{
    use RefreshDatabase;

    private function userWithRole(string $role): User
    {
        $u = User::factory()->create();
        $u->roles()->attach(
            Role::firstOrCreate(['name' => $role], ['display_name' => ucfirst($role), 'module' => 'system'])
        );
        return $u->fresh()->load('roles');
    }

    private function makeMenuItem(): MenuItem
    {
        $cat = MenuCategory::create(['name' => 'Sec Cat '.uniqid(), 'slug' => 'sec-cat-'.uniqid()]);
        return MenuItem::create(['category_id' => $cat->id, 'name' => 'Sec Item '.uniqid(), 'slug' => 'sec-item-'.uniqid(), 'price' => 100]);
    }

    private function makeOrder(User $as, MenuItem $item): string
    {
        $plan = \App\Models\FloorPlan::firstOrCreate(['name' => 'Sec Floor'], ['slug' => 'sec-floor-'.uniqid()]);
        $table = \App\Models\Table::firstOrCreate(['number' => 'T-SEC-'.uniqid()], ['floor_plan_id' => $plan->id, 'capacity' => 4, 'status' => 'available', 'is_active' => true]);
        return $this->actingAs($as)->postJson('/api/v1/orders', [
            'order_type' => 'dine_in',
            'table_id' => $table->id,
            'items' => [['menu_item_id' => $item->id, 'quantity' => 1]],
        ])->assertStatus(201)->json('data.id');
    }

    public function test_cashier_refund_denied_manager_allowed(): void
    {
        $admin = $this->userWithRole('admin');
        $cashier = $this->userWithRole('cashier');
        $manager = $this->userWithRole('manager');
        \App\Models\RestaurantSetting::create(['name'=>'Sec','currency'=>'PHP','currency_symbol'=>'₱','default_tax_rate'=>12,'vat_enabled'=>true,'vat_inclusive'=>true]);
        $item = $this->makeMenuItem();
        $orderId = $this->makeOrder($admin, $item);
        Order::where('id',$orderId)->update(['status'=>'served']);
        $this->actingAs($admin)->postJson("/api/v1/orders/{$orderId}/payments", ['payment_method'=>'cash','amount'=>(float)Order::find($orderId)->total])->assertStatus(201);
        $invoiceId = Invoice::where('order_id',$orderId)->first()->id;
        $paymentId = \App\Models\Payment::where('invoice_id',$invoiceId)->first()->id;

        $this->actingAs($cashier)->postJson("/api/v1/payments/{$invoiceId}/refund", ['payment_id'=>$paymentId,'amount'=>1,'reason'=>'test'])->assertStatus(403);
        $this->actingAs($manager)->postJson("/api/v1/payments/{$invoiceId}/refund", ['payment_id'=>$paymentId,'amount'=>1,'reason'=>'manager refund'])->assertStatus(201);
    }

    public function test_cashier_void_denied(): void
    {
        $admin = $this->userWithRole('admin');
        $cashier = $this->userWithRole('cashier');
        \App\Models\RestaurantSetting::firstOrCreate(['name'=>'Sec'],['currency'=>'PHP','currency_symbol'=>'₱','default_tax_rate'=>12,'vat_enabled'=>true,'vat_inclusive'=>true]);
        $item = $this->makeMenuItem();
        $orderId = $this->makeOrder($admin, $item);
        $this->actingAs($cashier)->postJson("/api/v1/orders/{$orderId}/void", ['reason'=>'cashier void'])->assertStatus(403);
        $this->actingAs($admin)->postJson("/api/v1/orders/{$orderId}/void", ['reason'=>'admin void'])->assertStatus(200);
    }

    public function test_kot_status_rbac(): void
    {
        $admin = $this->userWithRole('admin');
        $cashier = $this->userWithRole('cashier');
        $inventory = $this->userWithRole('inventory_staff');
        $kitchen = $this->userWithRole('kitchen_staff');
        $waiter = $this->userWithRole('waiter');
        \App\Models\RestaurantSetting::firstOrCreate(['name'=>'Sec'],['currency'=>'PHP','currency_symbol'=>'₱','default_tax_rate'=>12,'vat_enabled'=>true,'vat_inclusive'=>true]);
        $item = $this->makeMenuItem();
        $orderId = $this->makeOrder($admin, $item);
        $this->actingAs($admin)->patchJson("/api/v1/orders/{$orderId}/status", ['status'=>'confirmed'])->assertStatus(200);
        $kotId = KotTicket::where('order_id',$orderId)->first()->id;

        $this->actingAs($cashier)->patchJson("/api/v1/kot/{$kotId}/status", ['status'=>'in_progress'])->assertStatus(403);
        $this->actingAs($inventory)->patchJson("/api/v1/kot/{$kotId}/status", ['status'=>'in_progress'])->assertStatus(403);
        $this->actingAs($waiter)->patchJson("/api/v1/kot/{$kotId}/status", ['status'=>'in_progress'])->assertStatus(403);
        $this->actingAs($kitchen)->patchJson("/api/v1/kot/{$kotId}/status", ['status'=>'in_progress'])->assertSuccessful();
    }

    public function test_kot_void_restricted_to_admin_manager(): void
    {
        $admin = $this->userWithRole('admin');
        $cashier = $this->userWithRole('cashier');
        \App\Models\RestaurantSetting::firstOrCreate(['name'=>'Sec'],['currency'=>'PHP','currency_symbol'=>'₱','default_tax_rate'=>12,'vat_enabled'=>true,'vat_inclusive'=>true]);
        $item = $this->makeMenuItem();
        $orderId = $this->makeOrder($admin, $item);
        $this->actingAs($admin)->patchJson("/api/v1/orders/{$orderId}/status", ['status'=>'confirmed'])->assertStatus(200);
        $kotId = KotTicket::where('order_id',$orderId)->first()->id;
        $this->actingAs($cashier)->postJson("/api/v1/kot/{$kotId}/void", [])->assertStatus(403);
        $this->actingAs($admin)->postJson("/api/v1/kot/{$kotId}/void", ['reason'=>'test'])->assertSuccessful();
    }

    public function test_replenishment_self_approval_blocked(): void
    {
        $inventory = $this->userWithRole('inventory_staff');
        $manager = $this->userWithRole('manager');
        \App\Models\RestaurantSetting::firstOrCreate(['name'=>'Sec'],['currency'=>'PHP','currency_symbol'=>'₱','default_tax_rate'=>12,'vat_enabled'=>true,'vat_inclusive'=>true]);
        $ing = Ingredient::create(['name'=>'SecIngr'.uniqid(),'unit'=>'g','current_stock'=>100,'minimum_stock'=>10,'cost_per_unit'=>1]);
        $reqId = $this->actingAs($inventory)->postJson('/api/v1/inventory/replenishment', ['ingredient_id'=>$ing->id,'quantity'=>10])->assertStatus(201)->json('data.id');
        $this->actingAs($inventory)->patchJson("/api/v1/inventory/replenishment/{$reqId}/status", ['status'=>'approved'])->assertStatus(403);
        $this->actingAs($manager)->patchJson("/api/v1/inventory/replenishment/{$reqId}/status", ['status'=>'approved'])->assertSuccessful();
    }

    public function test_customer_mutation_restricted(): void
    {
        $kitchen = $this->userWithRole('kitchen_staff');
        $inventory = $this->userWithRole('inventory_staff');
        $waiter = $this->userWithRole('waiter');
        $this->actingAs($kitchen)->postJson('/api/v1/customers', ['name'=>'Hacker','phone'=>'09170000001'])->assertStatus(403);
        $this->actingAs($inventory)->postJson('/api/v1/customers', ['name'=>'Hacker2','phone'=>'09170000002'])->assertStatus(403);
        $this->actingAs($waiter)->postJson('/api/v1/customers', ['name'=>'Ok Customer','phone'=>'09170000003'])->assertStatus(201);
    }

    public function test_reservation_mutation_restricted(): void
    {
        $cashier = $this->userWithRole('cashier');
        $kitchen = $this->userWithRole('kitchen_staff');
        $waiter = $this->userWithRole('waiter');
        $plan = \App\Models\FloorPlan::create(['name'=>'Sec Plan '.uniqid(),'width'=>10,'height'=>10]);
        \App\Models\Table::create(['floor_plan_id'=>$plan->id,'number'=>'T-SEC-'.uniqid(),'capacity'=>4,'status'=>'available','is_active'=>true]);
        $table = \App\Models\Table::first();
        $payload = ['table_id'=>$table->id,'reservation_date'=>now()->addDay()->format('Y-m-d'),'reservation_time'=>'18:00','party_size'=>2,'customer_name'=>'Res Test','guest_name'=>'Res Test','guest_phone'=>'09170000009'];
        $this->actingAs($cashier)->postJson('/api/v1/reservations', $payload)->assertStatus(403);
        $this->actingAs($kitchen)->postJson('/api/v1/reservations', $payload)->assertStatus(403);
        $this->actingAs($waiter)->postJson('/api/v1/reservations', $payload)->assertStatus(201);
    }

    public function test_staff_clock_ownership(): void
    {
        $userA = $this->userWithRole('waiter');
        $userB = $this->userWithRole('waiter');
        $admin = $this->userWithRole('admin');
        $profileA = StaffProfile::create(['user_id'=>$userA->id,'employee_id'=>'EMP-A-'.uniqid(),'position'=>'Waiter','hire_date'=>now()->toDateString()]);
        $profileB = StaffProfile::create(['user_id'=>$userB->id,'employee_id'=>'EMP-B-'.uniqid(),'position'=>'Waiter','hire_date'=>now()->toDateString()]);
        $this->actingAs($userA)->postJson('/api/v1/staff/clock-in', ['staff_id'=>$profileB->id])->assertStatus(403);
        $this->actingAs($userA)->postJson('/api/v1/staff/clock-in', ['staff_id'=>$profileA->id])->assertStatus(201);
        $this->actingAs($admin)->postJson('/api/v1/staff/clock-in', ['staff_id'=>$profileB->id])->assertStatus(201);
    }

    public function test_login_throttling_returns_429(): void
    {
        $user = User::factory()->create(['email'=>'throttle@test.local','password'=>bcrypt('Secret123!')]);
        $user->roles()->attach(Role::firstOrCreate(['name'=>'waiter'],['display_name'=>'Waiter','module'=>'system']));
        for ($i=0;$i<5;$i++) {
            $this->postJson('/api/v1/auth/login', ['email'=>'throttle@test.local','password'=>'wrong'])->assertStatus(401);
        }
        $this->postJson('/api/v1/auth/login', ['email'=>'throttle@test.local','password'=>'wrong'])->assertStatus(429);
    }
}
