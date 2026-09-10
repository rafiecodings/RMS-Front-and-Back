<?php

namespace Tests\Feature;

use App\Models\FloorPlan;
use App\Models\Reservation;
use App\Models\Role;
use App\Models\Table;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReservationDateTimePayloadTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create();
        $this->admin->roles()->attach(
            Role::firstOrCreate(['name' => 'admin'], ['display_name' => 'Admin', 'module' => 'system'])
        );
    }

    public function test_store_accepts_iso_datetime_date_without_500(): void
    {
        $plan = FloorPlan::create(['name' => 'T01 Floor', 'is_active' => true]);
        $table = Table::create([
            'floor_plan_id' => $plan->id,
            'number' => 'T01',
            'capacity' => 4,
            'status' => 'available',
            'shape' => 'rectangular',
            'pos_x' => 0.0,
            'pos_y' => 0.0,
            'width' => 1.0,
            'height' => 1.0,
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->admin)->postJson('/api/v1/reservations', [
            'guest_name' => 'Test Customer',
            'guest_phone' => '09170000001',
            'party_size' => 4,
            'reservation_date' => now()->addDay()->toDateString() . 'T19:00',
            'reservation_time' => '19:00',
            'table_id' => $table->id,
        ]);

        $response->assertCreated();
        $reservation = Reservation::find($response->json('data.id'));
        $this->assertNotNull($reservation);
        $this->assertSame(now()->addDay()->toDateString(), $reservation->reservation_date->toDateString());
        $this->assertSame('T01', $reservation->table->number);
    }
}
