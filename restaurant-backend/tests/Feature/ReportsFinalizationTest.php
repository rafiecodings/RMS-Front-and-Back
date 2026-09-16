<?php

namespace Tests\Feature;

use App\Models\{Attendance, Customer, Ingredient, Invoice, MenuCategory, MenuItem, Order, OrderItem, Payment, Refund, Role, StaffProfile, User, Wastage};
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportsFinalizationTest extends TestCase
{
    use RefreshDatabase;

    private function actor(string $role = 'admin'): User
    {
        $user = User::factory()->create();
        $user->roles()->attach(Role::firstOrCreate(['name' => $role], ['display_name' => $role]));
        return $user;
    }

    private function order(string $date = '2026-09-10 23:59:59', array $attributes = []): Order
    {
        $order = Order::create(array_merge([
            'order_number' => 'REPORT-'.fake()->uuid(), 'order_type' => 'takeaway',
            'status' => 'completed', 'payment_status' => 'paid', 'payment_method' => 'cash',
            'subtotal' => 100, 'tax_amount' => 12, 'total' => 112,
        ], $attributes));
        $order->forceFill(['created_at' => $date])->save();
        return $order;
    }

    private function refund(Order $order, float $amount, string $status = 'approved'): Refund
    {
        $invoice = Invoice::firstOrCreate(['order_id' => $order->id], [
            'invoice_number' => 'INV-'.fake()->uuid(), 'subtotal' => $order->subtotal,
            'total' => $order->total, 'amount_paid' => $order->total, 'balance' => 0, 'status' => 'paid',
        ]);
        $payment = Payment::firstOrCreate(['invoice_id' => $invoice->id], ['amount' => $order->total, 'payment_method' => 'cash']);
        return Refund::create(['payment_id' => $payment->id, 'amount' => $amount, 'status' => $status, 'reason' => 'Report test']);
    }

    private function report(string $type, array $range = [])
    {
        return $this->getJson('/api/v1/reports/'.$type.'?'.http_build_query($range ?: ['start_date' => '2026-09-10', 'end_date' => '2026-09-10']));
    }

    public function test_revenue_includes_end_of_day_paid_completed_orders_and_only_approved_refunds(): void
    {
        $first = $this->order('2026-09-10 00:00:00');
        $last = $this->order();
        $this->refund($last, 20);
        $this->refund($last, 5, 'pending');
        $this->refund($last, 6, 'rejected');
        $this->refund($last, 7)->delete();
        $this->refund($this->order('2026-09-09 23:59:59'), 30);
        $this->order('2026-09-11 00:00:00');
        $this->order(attributes: ['status' => 'cancelled']);
        $this->order(attributes: ['status' => 'served']);
        $this->order(attributes: ['payment_status' => 'unpaid']);
        $this->order()->delete();
        $first->update(['archived_at' => now()]); // Archiving must not erase financial history.
        $this->actingAs($this->actor());
        $this->report('revenue')->assertOk()->assertJsonPath('data.summary.gross_revenue', 224)
            ->assertJsonPath('data.summary.refunds', 20)->assertJsonPath('data.summary.net_revenue', 204)
            ->assertJsonPath('data.summary.total_orders', 2)->assertJsonPath('data.summary.avg_order_value', 102)
            ->assertJsonPath('data.daily.0.revenue', 204);
        $this->report('revenue', ['start_date' => '2020-01-01', 'end_date' => '2020-01-01'])
            ->assertOk()->assertJsonPath('data.summary.net_revenue', 0)->assertJsonPath('data.summary.avg_order_value', 0)->assertJsonCount(0, 'data.daily');
    }

    public function test_sales_menu_tax_staff_and_custom_share_the_qualifying_order_scope(): void
    {
        $user = $this->actor('manager');
        $staff = StaffProfile::create(['user_id' => $user->id, 'employee_id' => 'EMP-REPORT', 'position' => 'Manager', 'hire_date' => '2026-01-01', 'is_active' => true]);
        $category = MenuCategory::create(['name' => 'Reports', 'slug' => 'reports']);
        $item = MenuItem::create(['category_id' => $category->id, 'name' => 'Report Meal', 'slug' => 'report-meal', 'price' => 50, 'is_available' => true]);
        $paid = $this->order(attributes: ['created_by' => $user->id]);
        $unpaid = $this->order(attributes: ['created_by' => $user->id, 'payment_status' => 'unpaid']);
        foreach ([$paid, $unpaid] as $order) {
            OrderItem::create(['order_id' => $order->id, 'menu_item_id' => $item->id, 'name' => 'Report Meal', 'quantity' => 2, 'unit_price' => 50, 'total_price' => 100]);
        }
        Attendance::create(['staff_id' => $staff->id, 'clock_in' => '2026-09-10 09:00:00', 'status' => 'present']);
        $this->refund($paid, 12);
        $this->actingAs($user);
        $this->report('sales')->assertOk()->assertJsonPath('data.by_order_type.0.revenue', 112)->assertJsonPath('data.items_sold', 2);
        $this->report('menu-performance')->assertOk()->assertJsonPath('data.top_items.0.total_quantity', 2)->assertJsonPath('data.top_items.0.order_count', 1);
        $this->report('tax')->assertOk()->assertJsonPath('data.summary.total_tax_collected', 12);
        $this->report('staff')->assertOk()->assertJsonPath('data.performance_ranking.0.orders_handled', 1)
            ->assertJsonPath('data.performance_ranking.0.revenue_generated', 112)->assertJsonPath('data.attendance_summary.attendance_rate', 100);
        foreach (['day', 'week', 'month'] as $group) {
            $this->postJson('/api/v1/reports/custom', ['metric' => 'revenue', 'group_by' => $group, 'start_date' => '2026-09-10', 'end_date' => '2026-09-10'])
                ->assertOk()->assertJsonPath('data.items.0.value', 100)->assertJsonPath('data.items.0.count', 1);
        }
        $this->postJson('/api/v1/reports/custom', ['metric' => 'orders', 'start_date' => '2026-09-10', 'end_date' => '2026-09-10'])
            ->assertOk()->assertJsonPath('data.items.0.count', 1);
    }

    public function test_customer_snapshot_uses_active_customers_and_real_lifetime_tiers(): void
    {
        foreach ([0, 5, 10, 20, 30] as $visits) {
            $customer = Customer::create(['name' => 'Customer '.$visits, 'phone' => '09'.$visits, 'customer_type' => 'registered', 'visit_count' => $visits, 'total_spent' => $visits * 100, 'is_active' => true]);
            $customer->forceFill(['created_at' => '2026-09-10 22:00:00'])->save();
        }
        Customer::create(['name' => 'Inactive', 'customer_type' => 'registered', 'visit_count' => 100, 'total_spent' => 99999, 'is_active' => false]);
        $this->actingAs($this->actor());
        $this->report('customer-analytics')->assertOk()->assertJsonPath('data.summary.total_customers', 5)
            ->assertJsonPath('data.summary.new_in_period', 5)->assertJsonPath('data.summary.loyal_customers', 4)
            ->assertJsonPath('data.summary.loyalty_tiers.Platinum', 1)->assertJsonPath('data.top_customers.0.visit_count', 30)
            ->assertJsonPath('data.top_customers.0.loyalty_tier', 'Platinum');
    }

    public function test_inventory_uses_selected_wastage_period_and_real_unit_cost(): void
    {
        $ingredient = Ingredient::create(['name' => 'Rice', 'unit' => 'kg', 'current_stock' => 1, 'minimum_stock' => 2, 'cost_per_unit' => 50, 'is_active' => true]);
        foreach (['2026-09-10 23:59:59', '2026-09-11 00:00:00'] as $date) {
            $wastage = Wastage::create(['ingredient_id' => $ingredient->id, 'quantity' => 2, 'reason' => 'spoilage']);
            $wastage->forceFill(['created_at' => $date])->save();
        }
        $this->actingAs($this->actor());
        $this->report('inventory')->assertOk()->assertJsonPath('data.summary.wastage_count', 1)
            ->assertJsonPath('data.summary.wastage_cost', 100)->assertJsonPath('data.low_stock_items.0.unit_cost', 50);
    }

    public function test_exports_are_real_attachments_with_escaped_nested_data(): void
    {
        $this->order();
        Customer::create(['name' => '=SUM(1,2) "Guest"', 'customer_type' => 'registered', 'is_active' => true]);
        $this->actingAs($this->actor());
        foreach (['revenue', 'sales', 'menu', 'customers', 'inventory', 'staff', 'tax'] as $type) {
            $payload = ['type' => $type, 'start_date' => '2026-09-10', 'end_date' => '2026-09-10'];
            $json = $this->postJson('/api/v1/reports/export', $payload + ['format' => 'json'])->assertOk();
            $this->assertStringContainsString('.json', $json->headers->get('Content-Disposition'));
            $csv = $this->postJson('/api/v1/reports/export', $payload + ['format' => 'csv'])->assertOk();
            $this->assertStringContainsString('text/csv', $csv->headers->get('Content-Type'));
            $this->assertStringStartsWith("\xEF\xBB\xBFsection,record,field,value", $csv->getContent());
            if ($type === 'revenue') $json->assertJsonPath('summary.net_revenue', 112);
            if ($type === 'sales') $this->assertStringContainsString('takeaway', $csv->getContent());
            if ($type === 'customers') {
                $this->assertStringContainsString('summary.loyalty_tiers', $csv->getContent());
                $this->assertStringContainsString("'=SUM(1,2)", $csv->getContent());
                $this->assertStringContainsString('""Guest""', $csv->getContent());
            }
        }
    }

    public function test_report_date_validation_and_rbac(): void
    {
        $endpoints = ['revenue', 'sales', 'menu-performance', 'customer-analytics', 'inventory', 'staff', 'tax'];
        $this->report('revenue')->assertUnauthorized();
        foreach (['cashier', 'waiter', 'kitchen_staff', 'inventory_staff'] as $role) {
            $this->actingAs($this->actor($role));
            foreach ($endpoints as $endpoint) $this->report($endpoint)->assertForbidden();
            $this->postJson('/api/v1/reports/export', [])->assertForbidden();
            $this->postJson('/api/v1/reports/custom', [])->assertForbidden();
        }
        $this->actingAs($this->actor());
        foreach ($endpoints as $endpoint) {
            $this->report($endpoint, ['start_date' => 'bad', 'end_date' => '2026-09-10'])->assertUnprocessable();
            $this->report($endpoint, ['start_date' => '2026-09-11', 'end_date' => '2026-09-10'])->assertUnprocessable();
        }
    }
}
