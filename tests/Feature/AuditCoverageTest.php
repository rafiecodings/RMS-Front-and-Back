<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\FloorPlan;
use App\Models\Ingredient;
use App\Models\KotTicket;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\Role;
use App\Models\Table;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * System-wide audit logging coverage + consistency.
 *
 * Every representative business mutation must produce exactly ONE meaningful
 * audit row with the correct actor (authenticated user), action, module
 * (auditable_type), record (auditable_id) and human-readable description
 * using business identifiers — never UUID-only text, never passwords.
 *
 * Uses RefreshDatabase — never touches live accounts.
 */
class AuditCoverageTest extends TestCase
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

    private function floorPlan(): FloorPlan
    {
        return FloorPlan::firstOrCreate(
            ['name' => 'Audit Floor'],
            ['slug' => 'audit-floor-'.uniqid()]
        );
    }

    private function menuItem(): MenuItem
    {
        $category = MenuCategory::create([
            'name' => 'Audit Cat',
            'slug' => 'audit-cat-'.uniqid(),
        ]);

        return MenuItem::create([
            'category_id' => $category->id,
            'name' => 'Audit Item',
            'slug' => 'audit-item-'.uniqid(),
            'price' => 100,
        ]);
    }

    private function table(string $number = 'T-AUDIT'): Table
    {
        return Table::create([
            'floor_plan_id' => $this->floorPlan()->id,
            'number' => $number.'-'.uniqid(),
            'capacity' => 4,
            'status' => 'available',
            'is_active' => true,
        ]);
    }

    private function createOrder(User $as, Table $table): string
    {
        return $this->actingAs($as)
            ->postJson('/api/v1/orders', [
                'order_type' => 'dine_in',
                'table_id' => $table->id,
                'items' => [['menu_item_id' => $this->menuItem()->id, 'quantity' => 1]],
            ])
            ->assertStatus(201)
            ->json('data.id');
    }

    private function latestLog(string $auditableType, string $auditableId, string $action): ?AuditLog
    {
        return AuditLog::where('auditable_type', $auditableType)
            ->where('auditable_id', $auditableId)
            ->where('action', $action)
            ->orderByDesc('created_at')
            ->first();
    }

    private function logCount(string $auditableType, string $auditableId, string $action): int
    {
        return AuditLog::where('auditable_type', $auditableType)
            ->where('auditable_id', $auditableId)
            ->where('action', $action)
            ->count();
    }

    public function test_table_status_lifecycle_is_audited_without_duplicates(): void
    {
        $admin = $this->userWithRole('admin');
        $table = $this->table();

        // available -> maintenance via status endpoint.
        $this->actingAs($admin)
            ->patchJson("/api/v1/tables/{$table->id}/status", ['status' => 'maintenance'])
            ->assertStatus(200);

        $this->assertSame(1, $this->logCount(Table::class, $table->id, 'table_status_changed'));
        $log = $this->latestLog(Table::class, $table->id, 'table_status_changed');
        $this->assertSame($admin->id, $log->user_id);
        $this->assertStringContainsString($table->number, $log->new_values['description']);
        $this->assertStringContainsString('Available', $log->new_values['description']);
        $this->assertStringContainsString('Maintenance', $log->new_values['description']);

        // maintenance -> needs_cleaning via generic update (the T1 path).
        $this->actingAs($admin)
            ->putJson("/api/v1/tables/{$table->id}", ['status' => 'needs_cleaning'])
            ->assertStatus(200);

        $this->assertSame(2, $this->logCount(Table::class, $table->id, 'table_status_changed'));
        $this->assertSame(0, $this->logCount(Table::class, $table->id, 'table_updated'));
        // Same-second timestamps: match the maintenance -> needs_cleaning row by content.
        $cleaningLog = AuditLog::where('auditable_type', Table::class)
            ->where('auditable_id', $table->id)
            ->where('action', 'table_status_changed')
            ->get()
            ->first(fn (AuditLog $l) => str_contains((string) ($l->new_values['description'] ?? ''), 'Needs Cleaning'));
        $this->assertNotNull($cleaningLog);
        $this->assertSame($admin->id, $cleaningLog->user_id);

        // needs_cleaning -> available.
        $this->actingAs($admin)
            ->putJson("/api/v1/tables/{$table->id}", ['status' => 'available'])
            ->assertStatus(200);
        $this->assertSame(3, $this->logCount(Table::class, $table->id, 'table_status_changed'));

        // Archive + restore.
        $this->actingAs($admin)->deleteJson("/api/v1/tables/{$table->id}/archive")->assertStatus(200);
        $archived = $this->latestLog(Table::class, $table->id, 'table_archived');
        $this->assertNotNull($archived);
        $this->assertSame($admin->id, $archived->user_id);
        $this->assertStringContainsString($table->number, $archived->new_values['description']);

        $this->actingAs($admin)->patchJson("/api/v1/tables/{$table->id}/restore")->assertStatus(200);
        $this->assertSame(1, $this->logCount(Table::class, $table->id, 'table_restored'));
    }

    public function test_reservation_lifecycle_is_audited(): void
    {
        $admin = $this->userWithRole('admin');
        $date = now()->addDay()->toDateString();

        $id = $this->actingAs($admin)->postJson('/api/v1/reservations', [
            'guest_name' => 'Audit Guest',
            'guest_phone' => '09170000001',
            'party_size' => 2,
            'reservation_date' => $date,
            'reservation_time' => '19:00',
        ])->assertStatus(201)->json('data.id');

        $created = $this->latestLog(\App\Models\Reservation::class, $id, 'reservation_created');
        $this->assertNotNull($created);
        $this->assertSame($admin->id, $created->user_id);
        $number = $created->auditable->reservation_number;
        $this->assertStringContainsString($number, $created->new_values['description']);

        // No mismatched action/description pairs: seated + completed.
        $this->actingAs($admin)->patchJson("/api/v1/reservations/{$id}/status", ['status' => 'seated'])->assertStatus(200);
        $seated = $this->latestLog(\App\Models\Reservation::class, $id, 'reservation_seated');
        $this->assertNotNull($seated);
        $this->assertStringContainsString($number, $seated->new_values['description']);

        $this->actingAs($admin)->patchJson("/api/v1/reservations/{$id}/status", ['status' => 'completed'])->assertStatus(200);
        $this->assertSame(1, $this->logCount(\App\Models\Reservation::class, $id, 'reservation_completed'));

        // Cancel path on a second reservation.
        $id2 = $this->actingAs($admin)->postJson('/api/v1/reservations', [
            'guest_name' => 'Cancel Guest',
            'guest_phone' => '09170000002',
            'party_size' => 2,
            'reservation_date' => $date,
            'reservation_time' => '20:00',
        ])->assertStatus(201)->json('data.id');

        $this->actingAs($admin)->patchJson("/api/v1/reservations/{$id2}/status", [
            'status' => 'cancelled',
            'cancellation_reason' => 'Guest called off',
        ])->assertStatus(200);

        $cancelled = $this->latestLog(\App\Models\Reservation::class, $id2, 'reservation_cancelled');
        $this->assertNotNull($cancelled);
        $this->assertStringContainsString('Guest called off', $cancelled->new_values['description']);
        $this->assertSame(1, $this->logCount(\App\Models\Reservation::class, $id2, 'reservation_cancelled'));
    }

    public function test_order_kitchen_lifecycle_has_no_duplicate_rows(): void
    {
        $admin = $this->userWithRole('admin');
        $table = $this->table('T-ORD');
        $orderId = $this->createOrder($admin, $table);

        $this->assertSame(1, $this->logCount(Order::class, $orderId, 'order_created'));
        $created = $this->latestLog(Order::class, $orderId, 'order_created');
        $this->assertSame($admin->id, $created->user_id);

        $this->actingAs($admin)->patchJson("/api/v1/orders/{$orderId}/status", ['status' => 'confirmed'])->assertStatus(200);
        $this->assertSame(1, $this->logCount(Order::class, $orderId, 'order_confirmed'));

        $kot = KotTicket::where('order_id', $orderId)->first();
        $this->assertNotNull($kot);

        // Kitchen board owns preparing/ready: one row each.
        $this->actingAs($admin)->patchJson("/api/v1/kot/{$kot->id}/status", ['status' => 'in_progress'])->assertStatus(200);
        $this->assertSame(1, $this->logCount(Order::class, $orderId, 'order_preparing'));

        // Direct no-op re-set must NOT duplicate.
        $this->actingAs($admin)->patchJson("/api/v1/orders/{$orderId}/status", ['status' => 'preparing'])->assertStatus(200);
        $this->assertSame(1, $this->logCount(Order::class, $orderId, 'order_preparing'));

        $this->actingAs($admin)->patchJson("/api/v1/kot/{$kot->id}/status", ['status' => 'ready'])->assertStatus(200);
        $this->assertSame(1, $this->logCount(Order::class, $orderId, 'order_ready'));

        $this->actingAs($admin)->patchJson("/api/v1/orders/{$orderId}/status", ['status' => 'ready'])->assertStatus(200);
        $this->assertSame(1, $this->logCount(Order::class, $orderId, 'order_ready'));

        $ready = $this->latestLog(Order::class, $orderId, 'order_ready');
        $this->assertSame($admin->id, $ready->user_id);
        $this->assertStringContainsString(Order::find($orderId)->order_number, $ready->new_values['description']);

        $this->actingAs($admin)->patchJson("/api/v1/orders/{$orderId}/status", ['status' => 'served'])->assertStatus(200);
        $this->assertSame(1, $this->logCount(Order::class, $orderId, 'order_served'));

        // Payment completes the order: exactly one payment row.
        $total = (float) Order::find($orderId)->total;
        $pay = $this->actingAs($admin)->postJson("/api/v1/orders/{$orderId}/payments", [
            'payment_method' => 'cash',
            'amount' => $total,
        ])->assertStatus(201);

        $this->assertSame(1, $this->logCount(Order::class, $orderId, 'payment_completed'));
        $payment = $this->latestLog(Order::class, $orderId, 'payment_completed');
        $this->assertSame($admin->id, $payment->user_id);

        // Refund: one row on the refund record.
        $refund = $this->actingAs($admin)->postJson("/api/v1/invoices/{$pay->json('data.invoice.id')}/refund", [
            'payment_id' => $pay->json('data.id'),
            'amount' => 1,
            'reason' => 'Audit test refund',
        ])->assertStatus(201);

        $this->assertSame(
            1,
            $this->logCount(\App\Models\Refund::class, $refund->json('data.id'), 'refund_processed')
        );
    }

    public function test_order_void_is_audited(): void
    {
        $admin = $this->userWithRole('admin');
        $orderId = $this->createOrder($admin, $this->table('T-VOID'));

        $this->actingAs($admin)->postJson("/api/v1/orders/{$orderId}/void", [
            'reason' => 'Audit void test',
        ])->assertStatus(200);

        $log = $this->latestLog(Order::class, $orderId, 'order_voided');
        $this->assertNotNull($log);
        $this->assertSame($admin->id, $log->user_id);
        $this->assertStringContainsString('Audit void test', $log->new_values['description']);
        $this->assertSame(1, $this->logCount(Order::class, $orderId, 'order_voided'));
    }

    public function test_promotion_lifecycle_is_audited(): void
    {
        $admin = $this->userWithRole('admin');
        $payload = [
            'name' => 'Audit Promo',
            'type' => 'percentage',
            'value' => 10,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
            'promotion_kind' => 'automatic',
        ];

        $id = $this->actingAs($admin)->postJson('/api/v1/discounts', $payload)
            ->assertStatus(201)->json('data.id');

        $this->assertSame(1, $this->logCount(\App\Models\Discount::class, $id, 'promotion_created'));

        $this->actingAs($admin)->putJson("/api/v1/discounts/{$id}", ['is_active' => false])->assertStatus(200);
        $this->assertSame(1, $this->logCount(\App\Models\Discount::class, $id, 'promotion_deactivated'));

        $this->actingAs($admin)->putJson("/api/v1/discounts/{$id}", ['name' => 'Audit Promo v2'])->assertStatus(200);
        $this->assertSame(1, $this->logCount(\App\Models\Discount::class, $id, 'promotion_updated'));

        $this->actingAs($admin)->deleteJson("/api/v1/discounts/{$id}")->assertStatus(200);
        $this->assertSame(1, $this->logCount(\App\Models\Discount::class, $id, 'promotion_archived'));
    }

    public function test_replenishment_lifecycle_tracks_actors(): void
    {
        $manager = $this->userWithRole('manager');
        $admin = $this->userWithRole('admin');
        $ingredient = Ingredient::create([
            'name' => 'Audit Tea',
            'unit' => 'kg',
            'current_stock' => 10,
            'minimum_stock' => 2,
            'cost_per_unit' => 5,
        ]);

        // Submitted by manager...
        $id = $this->actingAs($manager)->postJson('/api/v1/inventory/replenishment', [
            'ingredient_id' => $ingredient->id,
            'quantity' => 5,
        ])->assertStatus(201)->json('data.id');

        $submitted = $this->latestLog(\App\Models\ReplenishmentRequest::class, $id, 'replenishment_submitted');
        $this->assertNotNull($submitted);
        $this->assertSame($manager->id, $submitted->user_id);
        $this->assertStringContainsString('Audit Tea', $submitted->new_values['description']);

        // ...approved + fulfilled by admin (self-approval is forbidden).
        $this->actingAs($admin)->patchJson("/api/v1/inventory/replenishment/{$id}/status", ['status' => 'approved'])->assertStatus(200);
        $approved = $this->latestLog(\App\Models\ReplenishmentRequest::class, $id, 'replenishment_approved');
        $this->assertSame($admin->id, $approved->user_id);

        $this->actingAs($admin)->patchJson("/api/v1/inventory/replenishment/{$id}/status", ['status' => 'processing'])->assertStatus(200);
        $this->actingAs($admin)->patchJson("/api/v1/inventory/replenishment/{$id}/status", ['status' => 'fulfilled'])->assertStatus(200);

        // One business event for fulfillment (stock movement is the detail, not a second audit row).
        $this->assertSame(1, $this->logCount(\App\Models\ReplenishmentRequest::class, $id, 'replenishment_fulfilled'));
        $fulfilled = $this->latestLog(\App\Models\ReplenishmentRequest::class, $id, 'replenishment_fulfilled');
        $this->assertStringContainsString('Audit Tea', $fulfilled->new_values['description']);
        $this->assertSame($admin->id, $fulfilled->user_id);

        // Reject path on a second request.
        $id2 = $this->actingAs($manager)->postJson('/api/v1/inventory/replenishment', [
            'ingredient_id' => $ingredient->id,
            'quantity' => 1,
        ])->assertStatus(201)->json('data.id');

        $this->actingAs($admin)->patchJson("/api/v1/inventory/replenishment/{$id2}/status", ['status' => 'rejected'])->assertStatus(200);
        $this->assertSame(1, $this->logCount(\App\Models\ReplenishmentRequest::class, $id2, 'replenishment_rejected'));
    }

    public function test_admin_user_mutations_are_audited_without_secrets(): void
    {
        $admin = $this->userWithRole('admin');
        $target = $this->userWithRole('waiter');
        $cashierRole = Role::firstOrCreate(['name' => 'cashier'], ['display_name' => 'Cashier', 'is_system' => true]);

        $this->actingAs($admin)->putJson("/api/v1/admin/users/{$target->id}", [
            'role_id' => $cashierRole->id,
        ])->assertStatus(200);

        $roleLog = $this->latestLog(User::class, $target->id, 'user_role_changed');
        $this->assertNotNull($roleLog);
        $this->assertSame($admin->id, $roleLog->user_id);
        $this->assertStringContainsString('Waiter', $roleLog->new_values['description']);
        $this->assertStringContainsString('Cashier', $roleLog->new_values['description']);

        $this->actingAs($admin)->putJson("/api/v1/admin/users/{$target->id}", [
            'is_active' => false,
        ])->assertStatus(200);
        $this->assertSame(1, $this->logCount(User::class, $target->id, 'user_deactivated'));

        // Role change and status change each log exactly one row (no generic extra).
        $this->assertSame(1, $this->logCount(User::class, $target->id, 'user_role_changed'));

        $createdId = $this->actingAs($admin)->postJson('/api/v1/admin/users', [
            'name' => 'Audit Hired',
            'email' => 'audit-hired-'.uniqid().'@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'waiter',
        ])->assertStatus(201)->json('data.id');

        $created = $this->latestLog(User::class, $createdId, 'user_created');
        $this->assertNotNull($created);
        $this->assertStringNotContainsStringIgnoringCase(
            'password123',
            json_encode($created->new_values).json_encode($created->old_values)
        );
    }
}
