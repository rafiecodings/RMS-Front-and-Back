<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\FloorPlan;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\Reservation;
use App\Models\Role;
use App\Models\Table;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Canonical Reservation → Table → Order lifecycle.
 *
 *  pending/confirmed: block slot, table stays available
 *  seated:            table → occupied, keeps blocking slot
 *  completed/cancelled after seating: table → needs_cleaning
 *  cancelled/no-show before seating:  table untouched (available)
 *  dine-in payment:   table → needs_cleaning (never straight to available)
 *  manual reset:      needs_cleaning → available
 *
 *  Dine-in orders: available tables, or occupied tables held by an active
 *  seated reservation with no other active order (one cover → one order).
 *
 * Uses RefreshDatabase — never touches live data.
 */
class ReservationTableLifecycleTest extends TestCase
{
    use RefreshDatabase;

    private function userWithRole(string $role): User
    {
        $user = User::factory()->create();
        $user->roles()->attach(
            Role::firstOrCreate(
                ['name' => $role],
                ['display_name' => ucfirst(str_replace('_', ' ', $role)), 'is_system' => true]
            )
        );

        return $user->fresh();
    }

    private function table(string $number = 'T-LIFE'): Table
    {
        $plan = FloorPlan::firstOrCreate(['name' => 'Life Floor'], ['slug' => 'life-floor-'.uniqid()]);

        return Table::create([
            'floor_plan_id' => $plan->id,
            'number' => $number.'-'.uniqid(),
            'capacity' => 4,
            'status' => 'available',
            'is_active' => true,
        ]);
    }

    private function menuItem(): MenuItem
    {
        $category = MenuCategory::create(['name' => 'Life Cat '.uniqid(), 'slug' => 'life-cat-'.uniqid()]);

        return MenuItem::create([
            'category_id' => $category->id,
            'name' => 'Life Item '.uniqid(),
            'slug' => 'life-item-'.uniqid(),
            'price' => 100,
        ]);
    }

    private function reserve(User $as, ?string $tableId, string $date, string $time, string $status = 'pending'): string
    {
        $payload = [
            'guest_name' => 'Life Guest',
            'guest_phone' => '09170000001',
            'party_size' => 2,
            'reservation_date' => $date,
            'reservation_time' => $time,
        ];
        if ($tableId !== null) {
            $payload['table_id'] = $tableId;
        }

        return $this->actingAs($as)->postJson('/api/v1/reservations', $payload)
            ->assertStatus(201)->json('data.id');
    }

    private function order(User $as, string $tableId): string
    {
        return $this->actingAs($as)->postJson('/api/v1/orders', [
            'order_type' => 'dine_in',
            'table_id' => $tableId,
            'items' => [['menu_item_id' => $this->menuItem()->id, 'quantity' => 1]],
        ])->assertStatus(201)->json('data.id');
    }

    private function tableLogCount(string $tableId, string $action): int
    {
        return AuditLog::where('auditable_type', Table::class)
            ->where('auditable_id', $tableId)
            ->where('action', $action)
            ->count();
    }

    public function test_seated_occupies_table_with_two_audit_events(): void
    {
        $admin = $this->userWithRole('admin');
        $table = $this->table();
        $date = now()->addDay()->toDateString();
        $id = $this->reserve($admin, $table->id, $date, '18:00');

        $this->actingAs($admin)
            ->patchJson("/api/v1/reservations/{$id}/status", ['status' => 'seated'])
            ->assertStatus(200);

        $this->assertSame('occupied', $table->fresh()->status);
        $this->assertSame(1, $this->tableLogCount($table->id, 'table_status_changed'));

        $log = AuditLog::where('auditable_type', Table::class)
            ->where('auditable_id', $table->id)
            ->where('action', 'table_status_changed')
            ->first();
        $this->assertSame($admin->id, $log->user_id);
        $this->assertStringContainsString($table->number, $log->new_values['description']);
        $this->assertStringContainsString('Occupied', $log->new_values['description']);
    }

    public function test_seated_reservation_blocks_overlap_and_availability(): void
    {
        $admin = $this->userWithRole('admin');
        $table = $this->table();
        $date = now()->addDay()->toDateString();
        $id = $this->reserve($admin, $table->id, $date, '18:00');
        $this->actingAs($admin)
            ->patchJson("/api/v1/reservations/{$id}/status", ['status' => 'seated'])
            ->assertStatus(200);

        // B: overlapping same-table reservation rejected.
        $this->actingAs($admin)->postJson('/api/v1/reservations', [
            'guest_name' => 'Overlap',
            'guest_phone' => '09170000002',
            'party_size' => 2,
            'reservation_date' => $date,
            'reservation_time' => '18:30',
            'table_id' => $table->id,
        ])->assertStatus(409);

        // C: absent from reservation availability for the overlapping slot.
        $ids = collect(
            $this->actingAs($admin)->getJson('/api/v1/tables/available?' . http_build_query([
                'reservation_date' => $date, 'reservation_time' => '18:30', 'party_size' => 2,
            ]))->assertStatus(200)->json('data.items')
        )->pluck('id')->all();
        $this->assertNotContains($table->id, $ids);
    }

    public function test_first_order_on_seated_table_allowed_second_rejected(): void
    {
        $admin = $this->userWithRole('admin');
        $waiter = $this->userWithRole('waiter');
        $table = $this->table();
        $date = now()->addDay()->toDateString();
        $id = $this->reserve($admin, $table->id, $date, '18:00');
        $this->actingAs($admin)
            ->patchJson("/api/v1/reservations/{$id}/status", ['status' => 'seated'])
            ->assertStatus(200);

        // D: first dine-in order allowed, table stays occupied.
        $orderId = $this->order($waiter, $table->id);
        $this->assertSame('occupied', $table->fresh()->status);

        // E: second active order rejected authoritatively.
        $this->actingAs($waiter)->postJson('/api/v1/orders', [
            'order_type' => 'dine_in',
            'table_id' => $table->id,
            'items' => [['menu_item_id' => $this->menuItem()->id, 'quantity' => 1]],
        ])->assertStatus(409);

        // After the first order completes, the cover is gone → still one-order rule holds.
        $this->actingAs($admin)->postJson("/api/v1/orders/{$orderId}/void", ['reason' => 'lifecycle test'])
            ->assertStatus(200);
        // Seated reservation still active → table stays occupied.
        $this->assertSame('occupied', $table->fresh()->status);
    }

    public function test_unusable_tables_reject_orders(): void
    {
        $waiter = $this->userWithRole('waiter');

        foreach (['needs_cleaning', 'maintenance'] as $status) {
            $table = $this->table();
            $table->update(['status' => $status]);
            $this->actingAs($waiter)->postJson('/api/v1/orders', [
                'order_type' => 'dine_in',
                'table_id' => $table->id,
                'items' => [['menu_item_id' => $this->menuItem()->id, 'quantity' => 1]],
            ])->assertStatus(409);
        }
    }

    public function test_seated_completed_and_cancelled_leave_needs_cleaning(): void
    {
        $admin = $this->userWithRole('admin');
        $date = now()->addDay()->toDateString();

        // H: seated → completed.
        $table = $this->table('T-DONE');
        $id = $this->reserve($admin, $table->id, $date, '18:00');
        $this->actingAs($admin)->patchJson("/api/v1/reservations/{$id}/status", ['status' => 'seated'])->assertStatus(200);
        $this->actingAs($admin)->patchJson("/api/v1/reservations/{$id}/status", ['status' => 'completed'])->assertStatus(200);
        $this->assertSame('needs_cleaning', $table->fresh()->status);
        // Same-second timestamps: match the release row by content.
        $log = AuditLog::where('auditable_type', Table::class)
            ->where('auditable_id', $table->id)
            ->where('action', 'table_status_changed')
            ->get()
            ->first(fn (AuditLog $l) => str_contains((string) ($l->new_values['description'] ?? ''), 'Needs Cleaning'));
        $this->assertNotNull($log);
        $this->assertStringContainsString('Needs Cleaning', $log->new_values['description']);

        // K: seated → cancelled.
        $table2 = $this->table('T-CANX');
        $id2 = $this->reserve($admin, $table2->id, $date, '19:00');
        $this->actingAs($admin)->patchJson("/api/v1/reservations/{$id2}/status", ['status' => 'seated'])->assertStatus(200);
        $this->actingAs($admin)->patchJson(
            "/api/v1/reservations/{$id2}/status",
            ['status' => 'cancelled', 'cancellation_reason' => 'guest left']
        )->assertStatus(200);
        $this->assertSame('needs_cleaning', $table2->fresh()->status);
    }

    public function test_pre_seating_cancellation_and_noshow_leave_table_available(): void
    {
        $admin = $this->userWithRole('admin');
        $date = now()->addDay()->toDateString();

        // I: pending → cancelled.
        $table = $this->table('T-PC');
        $id = $this->reserve($admin, $table->id, $date, '18:00');
        $this->actingAs($admin)->patchJson(
            "/api/v1/reservations/{$id}/status",
            ['status' => 'cancelled', 'cancellation_reason' => 'changed plans']
        )->assertStatus(200);
        $this->assertSame('available', $table->fresh()->status);
        $this->assertSame(0, $this->tableLogCount($table->id, 'table_status_changed'));

        // J: pending → no_show.
        $table2 = $this->table('T-NS');
        $id2 = $this->reserve($admin, $table2->id, $date, '19:00');
        $this->actingAs($admin)->patchJson("/api/v1/reservations/{$id2}/status", ['status' => 'no_show'])->assertStatus(200);
        $this->assertSame('available', $table2->fresh()->status);
        $this->assertSame(0, $this->tableLogCount($table2->id, 'table_status_changed'));
    }

    public function test_dine_in_payment_leaves_needs_cleaning(): void
    {
        $admin = $this->userWithRole('admin');
        $waiter = $this->userWithRole('waiter');
        $kitchen = $this->userWithRole('kitchen_staff');
        $table = $this->table('T-PAY');

        $orderId = $this->order($waiter, $table->id);
        $this->actingAs($waiter)->patchJson("/api/v1/orders/{$orderId}/status", ['status' => 'confirmed'])->assertStatus(200);
        $this->actingAs($kitchen)->patchJson("/api/v1/orders/{$orderId}/status", ['status' => 'preparing'])->assertStatus(200);
        $this->actingAs($kitchen)->patchJson("/api/v1/orders/{$orderId}/status", ['status' => 'ready'])->assertStatus(200);
        $this->actingAs($waiter)->patchJson("/api/v1/orders/{$orderId}/status", ['status' => 'served'])->assertStatus(200);

        $total = (float) Order::find($orderId)->total;
        $this->actingAs($admin)->postJson("/api/v1/orders/{$orderId}/payments", [
            'payment_method' => 'cash',
            'amount' => $total,
        ])->assertStatus(201);

        // L: final state is needs_cleaning, never straight available.
        $this->assertSame('needs_cleaning', $table->fresh()->status);
    }

    public function test_manual_reset_returns_table_to_service(): void
    {
        $admin = $this->userWithRole('admin');
        $table = $this->table('T-RDY');
        $table->update(['status' => 'needs_cleaning']);

        // M: manual reset.
        $this->actingAs($admin)
            ->putJson("/api/v1/tables/{$table->id}", ['status' => 'available'])
            ->assertStatus(200);
        $this->assertSame('available', $table->fresh()->status);

        // Selectable again: listed by order-eligible.
        $ids = collect(
            $this->actingAs($admin)->getJson('/api/v1/tables/order-eligible')
                ->assertStatus(200)->json('data.items')
        )->pluck('id')->all();
        $this->assertContains($table->id, $ids);
    }

    public function test_order_eligible_lists_only_valid_covers(): void
    {
        $admin = $this->userWithRole('admin');
        $waiter = $this->userWithRole('waiter');
        $date = now()->addDay()->toDateString();

        $free = $this->table('T-FREE');

        $seatedTable = $this->table('T-SEAT');
        $resId = $this->reserve($admin, $seatedTable->id, $date, '18:00');
        $this->actingAs($admin)->patchJson("/api/v1/reservations/{$resId}/status", ['status' => 'seated'])->assertStatus(200);

        $busyTable = $this->table('T-BUSY');
        $this->order($waiter, $busyTable->id);

        $dirty = $this->table('T-DIRTY');
        $dirty->update(['status' => 'needs_cleaning']);
        $broken = $this->table('T-BROKEN');
        $broken->update(['status' => 'maintenance']);

        $items = collect(
            $this->actingAs($waiter)->getJson('/api/v1/tables/order-eligible')
                ->assertStatus(200)->json('data.items')
        )->keyBy('id');

        $this->assertTrue(isset($items[$free->id]));
        $this->assertNull($items[$free->id]['seating']);

        $this->assertTrue(isset($items[$seatedTable->id]));
        $this->assertNotNull($items[$seatedTable->id]['seating']);
        $this->assertArrayHasKey('reservation_number', $items[$seatedTable->id]['seating']);
        $this->assertArrayNotHasKey('id', $items[$seatedTable->id]['seating'] ?? []);

        $this->assertFalse(isset($items[$busyTable->id]));
        $this->assertFalse(isset($items[$dirty->id]));
        $this->assertFalse(isset($items[$broken->id]));
    }
}
