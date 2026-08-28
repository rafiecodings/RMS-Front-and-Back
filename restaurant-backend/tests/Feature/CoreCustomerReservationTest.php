<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Reservation;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CoreCustomerReservationTest extends TestCase
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

    public function test_saved_customer_is_always_registered_with_zero_derived_metrics(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/api/v1/customers', [
            'name' => 'UAT Registered Customer',
            'customer_type' => 'walk_in',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.customer_type', 'registered')
            ->assertJsonPath('data.total_orders', 0)
            ->assertJsonPath('data.total_reservations', 0)
            ->assertJsonPath('data.visit_count', 0)
            ->assertJsonPath('data.loyalty_tier', 'Member');

        $this->assertDatabaseHas('customers', [
            'id' => $response->json('data.id'),
            'customer_type' => 'registered',
        ]);
    }

    public function test_registered_reservation_uses_customer_identity_without_incrementing_visit(): void
    {
        $customer = Customer::create([
            'name' => 'UAT Reservation Customer',
            'phone' => '09171234567',
            'email' => 'reservation-customer@uat.local',
        ]);

        $response = $this->actingAs($this->admin)->postJson('/api/v1/reservations', [
            'customer_id' => $customer->id,
            'party_size' => 2,
            'reservation_date' => now()->addDay()->toDateString(),
            'reservation_time' => '18:00',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.customer.id', $customer->id)
            ->assertJsonPath('data.guest_name', $customer->name);

        $this->assertSame(0, (int) $customer->fresh()->visit_count);

        $this->actingAs($this->admin)
            ->getJson("/api/v1/customers/{$customer->id}")
            ->assertOk()
            ->assertJsonPath('data.total_reservations', 1)
            ->assertJsonCount(1, 'data.reservations');
    }

    public function test_guest_reservation_has_no_customer_profile_and_requires_contact(): void
    {
        $before = Customer::count();

        $this->actingAs($this->admin)->postJson('/api/v1/reservations', [
            'guest_name' => 'UAT Guest',
            'party_size' => 2,
            'reservation_date' => now()->addDay()->toDateString(),
            'reservation_time' => '19:00',
        ])->assertUnprocessable();

        $response = $this->actingAs($this->admin)->postJson('/api/v1/reservations', [
            'guest_name' => 'UAT Guest',
            'guest_phone' => '09170000000',
            'party_size' => 2,
            'reservation_date' => now()->addDay()->toDateString(),
            'reservation_time' => '19:00',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.customer_id', null)
            ->assertJsonPath('data.customer', null)
            ->assertJsonPath('data.guest_name', 'UAT Guest');

        $this->assertSame($before, Customer::count());
        $this->assertNull(Reservation::find($response->json('data.id'))->customer_id);
    }
}
