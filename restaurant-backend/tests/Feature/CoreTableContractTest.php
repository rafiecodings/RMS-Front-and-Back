<?php

namespace Tests\Feature;

use App\Models\FloorPlan;
use App\Models\Order;
use App\Models\Role;
use App\Models\Table;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CoreTableContractTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private FloorPlan $floorPlan;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create();
        $this->admin->roles()->attach(
            Role::firstOrCreate(['name' => 'admin'], ['display_name' => 'Admin', 'module' => 'system'])
        );
        $this->floorPlan = FloorPlan::create(['name' => 'UAT Main Floor', 'is_active' => true]);
    }

    public function test_table_create_defaults_available_and_duplicate_is_human_readable(): void
    {
        $created = $this->actingAs($this->admin)->postJson('/api/v1/tables', [
            'number' => 'UAT-1',
            'capacity' => 4,
        ]);

        $created->assertCreated()->assertJsonPath('data.status', 'available');

        $this->actingAs($this->admin)->postJson('/api/v1/tables', [
            'number' => 'uat-1',
            'capacity' => 2,
        ])->assertConflict()->assertJsonPath(
            'message',
            'Table "uat-1" already exists. Please use a different table number.'
        );
    }

    public function test_duplicate_number_is_rejected_when_edit_keeps_same_floor_plan(): void
    {
        $first = $this->table('UAT-A');
        $second = $this->table('UAT-B');

        $this->actingAs($this->admin)->putJson("/api/v1/tables/{$second->id}", [
            'number' => strtolower($first->number),
        ])->assertConflict()->assertJsonPath('message', 'Table number already exists in this floor plan.');
    }

    public function test_table_with_active_order_cannot_be_archived(): void
    {
        $table = $this->table('UAT-ACTIVE');
        Order::create([
            'order_number' => 'ORD-UAT-TABLE',
            'order_type' => 'dine_in',
            'table_id' => $table->id,
            'status' => 'served',
            'payment_status' => 'unpaid',
            'subtotal' => 100,
            'total' => 100,
        ]);

        $this->actingAs($this->admin)
            ->deleteJson("/api/v1/tables/{$table->id}/archive")
            ->assertConflict()
            ->assertJsonPath('message', "Table {$table->number} cannot be archived while it has an active order.");
    }

    private function table(string $number): Table
    {
        return Table::create([
            'floor_plan_id' => $this->floorPlan->id,
            'number' => $number,
            'capacity' => 4,
            'status' => 'available',
            'shape' => 'rectangle',
            'is_active' => true,
        ]);
    }
}
