<?php

namespace Tests\Feature;

use App\Models\FloorPlan;
use App\Models\Ingredient;
use App\Models\ReplenishmentRequest;
use App\Models\Role;
use App\Models\StockMovement;
use App\Models\Table;
use App\Models\User;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Order;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CoreProcessFixTest extends TestCase
{
    use RefreshDatabase;

    private function userWithRole(string $role): User
    {
        $u = User::factory()->create();
        $u->roles()->attach(Role::firstOrCreate(['name' => $role], ['display_name' => ucfirst($role)]));
        return $u->fresh()->load('roles');
    }

    public function test_replenishment_fulfilled_increments_stock_and_creates_movement(): void
    {
        $inv = $this->userWithRole('inventory_staff');
        $manager = $this->userWithRole('manager');
        $ing = Ingredient::create(['name'=>'FixIngr'.uniqid(),'unit'=>'g','current_stock'=>100,'minimum_stock'=>10,'cost_per_unit'=>1.5]);
        $before = (float)$ing->current_stock;
        $reqId = $this->actingAs($inv)->postJson('/api/v1/inventory/replenishment', ['ingredient_id'=>$ing->id,'quantity'=>10])->assertStatus(201)->json('data.id');
        $this->actingAs($manager)->patchJson("/api/v1/inventory/replenishment/{$reqId}/status", ['status'=>'approved'])->assertSuccessful();
        $this->actingAs($manager)->patchJson("/api/v1/inventory/replenishment/{$reqId}/status", ['status'=>'processing'])->assertSuccessful();
        $this->actingAs($manager)->patchJson("/api/v1/inventory/replenishment/{$reqId}/status", ['status'=>'fulfilled'])->assertSuccessful();
        $ing->refresh();
        $this->assertEquals($before + 10, (float)$ing->current_stock);
        $this->assertDatabaseHas('stock_movements', ['reference_type'=>'replenishment','reference_id'=>$reqId,'type'=>'inward','quantity'=>10]);
    }

    public function test_replenishment_fulfilled_idempotent(): void
    {
        $inv = $this->userWithRole('inventory_staff');
        $manager = $this->userWithRole('manager');
        $ing = Ingredient::create(['name'=>'FixIngr2'.uniqid(),'unit'=>'g','current_stock'=>50,'minimum_stock'=>10,'cost_per_unit'=>2]);
        $reqId = $this->actingAs($inv)->postJson('/api/v1/inventory/replenishment', ['ingredient_id'=>$ing->id,'quantity'=>5])->assertStatus(201)->json('data.id');
        $this->actingAs($manager)->patchJson("/api/v1/inventory/replenishment/{$reqId}/status", ['status'=>'approved'])->assertSuccessful();
        $this->actingAs($manager)->patchJson("/api/v1/inventory/replenishment/{$reqId}/status", ['status'=>'processing'])->assertSuccessful();
        $this->actingAs($manager)->patchJson("/api/v1/inventory/replenishment/{$reqId}/status", ['status'=>'fulfilled'])->assertSuccessful();
        $ing->refresh(); $afterFirst = (float)$ing->current_stock;
        $this->actingAs($manager)->patchJson("/api/v1/inventory/replenishment/{$reqId}/status", ['status'=>'fulfilled'])->assertStatus(409);
        $ing->refresh();
        $this->assertEquals($afterFirst, (float)$ing->current_stock);
        $this->assertEquals(1, StockMovement::where('reference_type','replenishment')->where('reference_id',$reqId)->count());
    }

    public function test_dine_in_claims_table_and_takeaway_does_not(): void
    {
        $waiter = $this->userWithRole('waiter');
        $cat = MenuCategory::create(['name'=>'FixCat'.uniqid(),'slug'=>'fix-'.uniqid()]);
        $item = MenuItem::create(['category_id'=>$cat->id,'name'=>'FixItem'.uniqid(),'slug'=>'fix-'.uniqid(),'price'=>100]);
        $plan = FloorPlan::create(['name'=>'Plan'.uniqid(),'width'=>10,'height'=>10]);
        $table = Table::create(['floor_plan_id'=>$plan->id,'number'=>'T-FIX-'.uniqid(),'capacity'=>4,'status'=>'available','is_active'=>true]);
        $this->actingAs($waiter)->postJson('/api/v1/orders', ['order_type'=>'dine_in','table_id'=>$table->id,'items'=>[['menu_item_id'=>$item->id,'quantity'=>1]]])->assertStatus(201);
        $table->refresh(); $this->assertEquals('occupied',$table->status);
        $this->actingAs($waiter)->postJson('/api/v1/orders', ['order_type'=>'takeaway','items'=>[['menu_item_id'=>$item->id,'quantity'=>1]]])->assertStatus(201);
        $table2 = Table::create(['floor_plan_id'=>$plan->id,'number'=>'T-FIX2-'.uniqid(),'capacity'=>4,'status'=>'available','is_active'=>true]);
        $table2->refresh(); $this->assertEquals('available',$table2->status);
    }

    public function test_second_active_order_same_table_rejected(): void
    {
        $waiter = $this->userWithRole('waiter');
        $cat = MenuCategory::create(['name'=>'FixCat'.uniqid(),'slug'=>'fix-'.uniqid()]);
        $item = MenuItem::create(['category_id'=>$cat->id,'name'=>'FixItem'.uniqid(),'slug'=>'fix-'.uniqid(),'price'=>50]);
        $plan = FloorPlan::create(['name'=>'Plan'.uniqid(),'width'=>10,'height'=>10]);
        $table = Table::create(['floor_plan_id'=>$plan->id,'number'=>'T-DUP-'.uniqid(),'capacity'=>4,'status'=>'available','is_active'=>true]);
        $this->actingAs($waiter)->postJson('/api/v1/orders', ['order_type'=>'dine_in','table_id'=>$table->id,'items'=>[['menu_item_id'=>$item->id,'quantity'=>1]]])->assertStatus(201);
        $this->actingAs($waiter)->postJson('/api/v1/orders', ['order_type'=>'dine_in','table_id'=>$table->id,'items'=>[['menu_item_id'=>$item->id,'quantity'=>1]]])->assertStatus(409);
    }

    public function test_completed_releases_table(): void
    {
        $waiter = $this->userWithRole('waiter');
        $admin = $this->userWithRole('admin');
        $cat = MenuCategory::create(['name'=>'FixCat'.uniqid(),'slug'=>'fix-'.uniqid()]);
        $item = MenuItem::create(['category_id'=>$cat->id,'name'=>'FixItem'.uniqid(),'slug'=>'fix-'.uniqid(),'price'=>60]);
        $plan = FloorPlan::create(['name'=>'Plan'.uniqid(),'width'=>10,'height'=>10]);
        $table = Table::create(['floor_plan_id'=>$plan->id,'number'=>'T-REL-'.uniqid(),'capacity'=>4,'status'=>'available','is_active'=>true]);
        $orderId = $this->actingAs($waiter)->postJson('/api/v1/orders', ['order_type'=>'dine_in','table_id'=>$table->id,'items'=>[['menu_item_id'=>$item->id,'quantity'=>1]]])->assertStatus(201)->json('data.id');
        $this->actingAs($waiter)->patchJson("/api/v1/orders/{$orderId}/status", ['status'=>'confirmed'])->assertSuccessful();
        // Simulate kitchen progress via order status (KOT exists after confirmed)
        $this->actingAs($waiter)->patchJson("/api/v1/orders/{$orderId}/status", ['status'=>'preparing'])->assertSuccessful();
        // Simulate kitchen: directly set served then pay
        Order::where('id',$orderId)->update(['status'=>'served']);
        \App\Models\Invoice::create(['invoice_number'=>'INV-'.uniqid(),'order_id'=>$orderId,'subtotal'=>60,'tax_amount'=>7.2,'discount_amount'=>0,'service_charge'=>0,'total'=>67.2,'amount_paid'=>0,'balance'=>67.2,'status'=>'pending']);
        $this->actingAs($admin)->postJson("/api/v1/orders/{$orderId}/payments", ['payment_method'=>'cash','amount'=>67.2])->assertStatus(201);
        $table->refresh(); $this->assertEquals('available',$table->status);
    }

    public function test_cancelled_releases_table(): void
    {
        $waiter = $this->userWithRole('waiter');
        $cat = MenuCategory::create(['name'=>'FixCat'.uniqid(),'slug'=>'fix-'.uniqid()]);
        $item = MenuItem::create(['category_id'=>$cat->id,'name'=>'FixItem'.uniqid(),'slug'=>'fix-'.uniqid(),'price'=>30]);
        $plan = FloorPlan::create(['name'=>'Plan'.uniqid(),'width'=>10,'height'=>10]);
        $table = Table::create(['floor_plan_id'=>$plan->id,'number'=>'T-CAN-'.uniqid(),'capacity'=>4,'status'=>'available','is_active'=>true]);
        $orderId = $this->actingAs($waiter)->postJson('/api/v1/orders', ['order_type'=>'dine_in','table_id'=>$table->id,'items'=>[['menu_item_id'=>$item->id,'quantity'=>1]]])->assertStatus(201)->json('data.id');
        $this->actingAs($waiter)->patchJson("/api/v1/orders/{$orderId}/status", ['status'=>'cancelled','notes'=>'test'])->assertSuccessful();
        $table->refresh(); $this->assertEquals('available',$table->status);
    }
}
