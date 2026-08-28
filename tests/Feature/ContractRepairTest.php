<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\KotTicket;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Refund;
use App\Models\Reservation;
use App\Models\Role;
use App\Models\ShiftSchedule;
use App\Models\StaffProfile;
use App\Models\StaffShift;
use App\Models\Table;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Contract repair coverage: archive subsystem, staff module completion,
 * tables availability, billing/payments endpoints and UUID hardening.
 */
class ContractRepairTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $staff;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = $this->createUserWithRole('admin');
        $this->staff = $this->createUserWithRole('staff');
    }

    // ------------------------------------------------------------------
    // Archive — Orders
    // ------------------------------------------------------------------

    public function test_completed_order_can_be_archived_and_hidden_from_index(): void
    {
        $order = $this->createOrder('completed');

        $this->actingAs($this->admin)
            ->patchJson("/api/v1/orders/{$order->id}/archive")
            ->assertStatus(200)
            ->assertJsonPath('data.archived_at', fn ($v) => $v !== null);

        // Hidden from the default list.
        $this->actingAs($this->admin)
            ->getJson('/api/v1/orders')
            ->assertStatus(200)
            ->assertJsonMissing(['order_number' => $order->order_number]);

        // Visible through the archived scope.
        $this->actingAs($this->admin)
            ->getJson('/api/v1/orders?archived=1')
            ->assertStatus(200)
            ->assertJsonFragment(['order_number' => $order->order_number]);
    }

    public function test_pending_order_cannot_be_archived(): void
    {
        $order = $this->createOrder('pending');

        $this->actingAs($this->admin)
            ->patchJson("/api/v1/orders/{$order->id}/archive")
            ->assertStatus(422);

        $this->assertNull($order->fresh()->archived_at);
    }

    public function test_archiving_twice_is_idempotent(): void
    {
        $order = $this->createOrder('completed');

        $this->actingAs($this->admin)->patchJson("/api/v1/orders/{$order->id}/archive")->assertStatus(200);
        $first = $order->fresh()->archived_at;

        sleep(0);
        $this->actingAs($this->admin)->patchJson("/api/v1/orders/{$order->id}/archive")->assertStatus(200);
        $this->assertEquals($first, $order->fresh()->archived_at);
    }

    public function test_order_can_be_unarchived(): void
    {
        $order = $this->createOrder('completed');
        $order->update(['archived_at' => now()]);

        $this->actingAs($this->admin)
            ->deleteJson("/api/v1/orders/{$order->id}/archive")
            ->assertStatus(200)
            ->assertJsonPath('data.archived_at', null);

        $this->assertNull($order->fresh()->archived_at);
    }

    // ------------------------------------------------------------------
    // Archive — Reservations
    // ------------------------------------------------------------------

    public function test_cancelled_reservation_archives_and_appears_in_archived_view(): void
    {
        $reservation = $this->createReservation('cancelled');

        $this->actingAs($this->admin)
            ->patchJson("/api/v1/reservations/{$reservation->id}/archive")
            ->assertStatus(200);

        $this->actingAs($this->admin)
            ->getJson('/api/v1/reservations')
            ->assertJsonMissing(['reservation_number' => $reservation->reservation_number]);

        $this->actingAs($this->admin)
            ->getJson('/api/v1/reservations?archived=1')
            ->assertJsonFragment(['reservation_number' => $reservation->reservation_number]);
    }

    public function test_confirmed_reservation_cannot_be_archived(): void
    {
        $reservation = $this->createReservation('confirmed', '+5 days');

        $this->actingAs($this->admin)
            ->patchJson("/api/v1/reservations/{$reservation->id}/archive")
            ->assertStatus(409);
    }

    // ------------------------------------------------------------------
    // Archive — KOT tickets
    // ------------------------------------------------------------------

    public function test_completed_kot_ticket_archives_and_hides_from_board(): void
    {
        $ticket = $this->createKotTicket('completed');

        $this->actingAs($this->admin)
            ->patchJson("/api/v1/kot/{$ticket->id}/archive")
            ->assertStatus(200);

        $this->actingAs($this->admin)
            ->getJson('/api/v1/kot')
            ->assertJsonMissing(['kot_number' => $ticket->kot_number]);

        $this->actingAs($this->admin)
            ->getJson('/api/v1/kot?archived=1')
            ->assertJsonFragment(['kot_number' => $ticket->kot_number]);
    }

    public function test_in_progress_kot_ticket_cannot_be_archived(): void
    {
        $ticket = $this->createKotTicket('in_progress');

        $this->actingAs($this->admin)
            ->patchJson("/api/v1/kot/{$ticket->id}/archive")
            ->assertStatus(409);
    }

    // ------------------------------------------------------------------
    // Archive — Customers (is_active semantics per frontend contract)
    // ------------------------------------------------------------------

    public function test_customer_archive_sets_is_active_false_and_filter_works(): void
    {
        $customer = $this->createCustomer();

        $this->actingAs($this->admin)
            ->deleteJson("/api/v1/customers/{$customer->id}/archive")
            ->assertStatus(200)
            ->assertJsonPath('data.is_active', false);

        $this->assertFalse((bool) $customer->fresh()->is_active);

        $this->actingAs($this->admin)
            ->getJson('/api/v1/customers?is_active=0')
            ->assertJsonFragment(['name' => $customer->name]);

        $this->actingAs($this->admin)
            ->getJson('/api/v1/customers?is_active=1')
            ->assertJsonMissing(['name' => $customer->name]);
    }

    // ------------------------------------------------------------------
    // Archive — RBAC
    // ------------------------------------------------------------------

    public function test_non_manager_cannot_archive_orders(): void
    {
        $order = $this->createOrder('completed');

        $this->actingAs($this->staff)
            ->patchJson("/api/v1/orders/{$order->id}/archive")
            ->assertStatus(403);
    }

    // ------------------------------------------------------------------
    // Staff — attendance
    // ------------------------------------------------------------------

    public function test_attendance_listing_returns_records_with_staff_info(): void
    {
        $profile = $this->createStaffProfile();
        Attendance::create([
            'staff_id' => $profile->id,
            'clock_in' => now()->subHours(4),
            'clock_out' => now(),
            'hours_worked' => 4,
            'status' => 'present',
        ]);

        $response = $this->actingAs($this->admin)->getJson('/api/v1/staff/attendance');

        $response->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonCount(1, 'data.items');

        $record = $response->json('data.items.0');
        $this->assertEquals($profile->id, $record['staff_id']);
        $this->assertEquals($profile->employee_id, $record['staff']['employee_id']);
        $this->assertNotNull($record['clock_in']);
    }

    public function test_attendance_requires_management_role(): void
    {
        $this->actingAs($this->staff)
            ->getJson('/api/v1/staff/attendance')
            ->assertStatus(403);
    }

    // ------------------------------------------------------------------
    // Staff — employees aliases
    // ------------------------------------------------------------------

    public function test_employees_alias_lists_same_staff_data(): void
    {
        $profile = $this->createStaffProfile();

        $response = $this->actingAs($this->admin)->getJson('/api/v1/staff/employees');

        $response->assertStatus(200)
            ->assertJsonPath('data.items.0.employee_id', $profile->employee_id);

        $detail = $this->actingAs($this->admin)
            ->getJson("/api/v1/staff/employees/{$profile->id}");
        $detail->assertStatus(200)->assertJsonPath('data.id', $profile->id);
    }

    // ------------------------------------------------------------------
    // Staff — schedule update/delete
    // ------------------------------------------------------------------

    public function test_schedule_can_be_updated(): void
    {
        $schedule = $this->createSchedule();

        $this->actingAs($this->admin)
            ->putJson("/api/v1/staff/schedule/{$schedule->id}", [
                'status' => 'confirmed',
                'notes' => 'updated by test',
            ])
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'confirmed')
            ->assertJsonPath('data.notes', 'updated by test');
    }

    public function test_schedule_update_detects_conflict(): void
    {
        $profile = $this->createStaffProfile();
        $a = $this->createSchedule($profile->id, '2026-09-01');
        $b = $this->createSchedule($profile->id, '2026-09-02');

        // Move B onto A's date -> conflict.
        $this->actingAs($this->admin)
            ->putJson("/api/v1/staff/schedule/{$b->id}", ['date' => '2026-09-01'])
            ->assertStatus(409);
    }

    public function test_schedule_can_be_deleted(): void
    {
        $schedule = $this->createSchedule();

        $this->actingAs($this->admin)
            ->deleteJson("/api/v1/staff/schedule/{$schedule->id}")
            ->assertStatus(200);

        $this->assertSoftDeleted((new ShiftSchedule)->getTable(), ['id' => $schedule->id]);
    }

    // ------------------------------------------------------------------
    // Tables — availability
    // ------------------------------------------------------------------

    public function test_available_tables_exclude_confirmed_reservations(): void
    {
        $free = $this->createTable(1, 4);
        $taken = $this->createTable(2, 4);
        $date = now()->addDays(3)->toDateString();

        Reservation::create([
            'table_id' => $taken->id,
            'reservation_number' => 'RSV-'.uniqid(),
            'guest_name' => 'Blocked Guest',
            'guest_phone' => '09170000000',
            'party_size' => 2,
            'reservation_date' => $date,
            'reservation_time' => '18:00',
            'status' => 'confirmed',
        ]);

        $response = $this->actingAs($this->admin)
            ->getJson("/api/v1/tables/available?reservation_date={$date}&reservation_time=18%3A30&party_size=2");

        $response->assertStatus(200);

        $ids = collect($response->json('data.items'))->pluck('id');
        $this->assertContains($free->id, $ids);
        $this->assertNotContains($taken->id, $ids);
    }

    public function test_cancelled_reservation_does_not_block_availability(): void
    {
        $table = $this->createTable(5, 4);
        $date = now()->addDays(4)->toDateString();

        Reservation::create([
            'table_id' => $table->id,
            'reservation_number' => 'RSV-'.uniqid(),
            'guest_name' => 'Cancelled Guest',
            'guest_phone' => '09170000000',
            'party_size' => 2,
            'reservation_date' => $date,
            'reservation_time' => '19:00',
            'status' => 'cancelled',
        ]);

        $response = $this->actingAs($this->admin)
            ->getJson("/api/v1/tables/available?reservation_date={$date}&reservation_time=19%3A00");

        $ids = collect($response->json('data.items'))->pluck('id');
        $this->assertContains($table->id, $ids);
    }

    public function test_available_tables_respect_party_size_capacity(): void
    {
        $small = $this->createTable(6, 2);

        $response = $this->actingAs($this->admin)
            ->getJson('/api/v1/tables/available?reservation_date='.now()->addDays(5)->toDateString().'&reservation_time=12%3A00&party_size=6');

        $ids = collect($response->json('data.items'))->pluck('id');
        $this->assertNotContains($small->id, $ids);
    }

    // ------------------------------------------------------------------
    // Billing — payments / stats / refunds / refund alias
    // ------------------------------------------------------------------

    public function test_payments_listing_returns_contract_shape(): void
    {
        $payment = $this->createPaymentWithInvoice();

        $response = $this->actingAs($this->admin)->getJson('/api/v1/payments');

        $response->assertStatus(200)->assertJsonCount(1, 'data.items');

        $row = $response->json('data.items.0');
        $this->assertEquals($payment->id, $row['id']);
        $this->assertEquals(500, $row['amount']);
        $this->assertEquals('cash', $row['payment_method']);
        $this->assertArrayHasKey('processed_by', $row);
    }

    public function test_payment_stats_reflect_seeded_totals(): void
    {
        $invoice = $this->createInvoice('paid', 1000, 1000, 0);
        Payment::create([
            'invoice_id' => $invoice->id,
            'amount' => 1000,
            'payment_method' => 'gcash',
        ]);
        Refund::create([
            'payment_id' => Payment::latest('id')->first()->id,
            'amount' => 250,
            'reason' => 'test refund',
            'status' => 'approved',
        ]);

        $response = $this->actingAs($this->admin)->getJson('/api/v1/payments/stats');

        $response->assertStatus(200);
        $this->assertEquals(1000.0, $response->json('data.total_revenue'));
        $this->assertEquals(250.0, $response->json('data.total_refunds'));
        $this->assertEquals(750.0, $response->json('data.net_revenue'));
        $this->assertEquals(1, $response->json('data.orders_count'));

        $breakdown = $response->json('data.payment_method_breakdown');
        $this->assertCount(1, $breakdown);
        $this->assertEquals('gcash', $breakdown[0]['method']);
    }

    public function test_refunds_listing_maps_frontend_contract(): void
    {
        [$payment] = $this->createPaymentWithRefund();

        $response = $this->actingAs($this->admin)->getJson('/api/v1/payments/refunds');

        $response->assertStatus(200)->assertJsonCount(1, 'data.items');

        $row = $response->json('data.items.0');
        $this->assertEquals($payment->invoice_id, $row['invoice_id']);
        $this->assertMatchesRegularExpression('/^REF-[A-F0-9]{8}$/', $row['refund_number']);
        $this->assertEquals('full', $row['type']);
        $this->assertEquals('approved', $row['status']);
    }

    public function test_invoice_refund_alias_processes_refund(): void
    {
        $invoice = $this->createInvoice('partial', 500, 500, 0);
        $payment = Payment::create([
            'invoice_id' => $invoice->id,
            'amount' => 500,
            'payment_method' => 'cash',
        ]);

        $this->actingAs($this->admin)
            ->postJson("/api/v1/invoices/{$invoice->id}/refund", [
                'payment_id' => $payment->id,
                'amount' => 200,
                'reason' => 'customer complaint',
            ])
            ->assertStatus(201);

        $this->assertDatabaseHas((new Refund)->getTable(), ['amount' => 200]);

        // Over-refund must be rejected (same logic as canonical endpoint).
        $this->actingAs($this->admin)
            ->postJson("/api/v1/invoices/{$invoice->id}/refund", [
                'payment_id' => $payment->id,
                'amount' => 999,
                'reason' => 'too much',
            ])
            ->assertStatus(422);
    }

    // ------------------------------------------------------------------
    // UUID hardening
    // ------------------------------------------------------------------

    public function test_malformed_uuid_returns_404_not_500(): void
    {
        $this->actingAs($this->admin)
            ->getJson('/api/v1/customers/not-a-uuid')
            ->assertStatus(404);

        $this->actingAs($this->admin)
            ->putJson('/api/v1/orders/12345/status', ['status' => 'pending'])
            ->assertStatus(404);
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private function createUserWithRole(string $role): User
    {
        $user = User::factory()->create([
            'password' => Hash::make('secret-password'),
        ]);
        $user->roles()->attach(
            Role::firstOrCreate(
                ['name' => $role],
                ['display_name' => ucfirst($role), 'module' => 'system']
            )
        );

        return $user;
    }

    private function createOrder(string $status): Order
    {
        return Order::create([
            'order_number' => 'ORD-'.uniqid(),
            'order_type' => 'takeaway',
            'status' => $status,
            'payment_status' => $status === 'completed' ? 'paid' : 'unpaid',
            'subtotal' => 100,
            'total' => 100,
        ]);
    }

    private function createCustomer(): Customer
    {
        return Customer::create([
            'name' => 'Archive Me '.uniqid(),
            'email' => uniqid().'@test.local',
            'phone' => '0917'.random_int(1000000, 9999999),
            'is_active' => true,
        ]);
    }

    private function createReservation(string $status, string $date = '-2 days'): Reservation
    {
        return Reservation::create([
            'reservation_number' => 'RSV-'.uniqid(),
            'guest_name' => 'Guest '.uniqid(),
            'guest_phone' => '09180000000',
            'party_size' => 2,
            'reservation_date' => now()->modify($date)->toDateString(),
            'reservation_time' => '18:00',
            'status' => $status,
        ]);
    }

    private function createKotTicket(string $status): KotTicket
    {
        $order = $this->createOrder('completed');

        return KotTicket::create([
            'kot_number' => 'KOT-'.uniqid(),
            'order_id' => $order->id,
            'status' => $status,
        ]);
    }

    private function createTable(int $number, int $capacity): Table
    {
        $floorPlan = \App\Models\FloorPlan::create([
            'name' => 'Main Hall '.uniqid(),
        ]);

        return Table::create([
            'floor_plan_id' => $floorPlan->id,
            'number' => $number,
            'capacity' => $capacity,
            'status' => 'available',
            'is_active' => true,
        ]);
    }

    private function createStaffProfile(): StaffProfile
    {
        $shift = StaffShift::firstOrCreate(
            ['name' => 'Morning'],
            ['start_time' => '06:00', 'end_time' => '14:00']
        );

        $user = User::factory()->create();

        return StaffProfile::create([
            'user_id' => $user->id,
            'employee_id' => 'EMP-'.uniqid(),
            'position' => 'Server',
            'department' => 'Service',
            'employment_type' => 'full_time',
            'hire_date' => now()->toDateString(),
            'is_active' => true,
        ]);
    }

    private function createSchedule(?string $staffId = null, string $date = '2026-09-15'): ShiftSchedule
    {
        $profile = $staffId ? StaffProfile::find($staffId) : $this->createStaffProfile();
        $shift = StaffShift::firstOrCreate(
            ['name' => 'Morning'],
            ['start_time' => '06:00', 'end_time' => '14:00']
        );

        return ShiftSchedule::create([
            'staff_id' => $profile->id,
            'shift_id' => $shift->id,
            'date' => $date,
            'status' => 'scheduled',
        ]);
    }

    private function createInvoice(string $status, float $total, float $paid, float $balance): Invoice
    {
        $order = $this->createOrder('completed');
        // Keep the linked order totals consistent with the invoice so
        // revenue-based stats assertions are deterministic.
        $order->update(['subtotal' => $total, 'total' => $total]);

        return Invoice::create([
            'invoice_number' => 'INV-'.uniqid(),
            'order_id' => $order->id,
            'total' => $total,
            'amount_paid' => $paid,
            'balance' => $balance,
            'status' => $status,
        ]);
    }

    /** @return array{0: Payment, 1: Invoice} */
    private function createPaymentWithRefund(): array
    {
        $invoice = $this->createInvoice('paid', 300, 300, 0);
        $payment = Payment::create([
            'invoice_id' => $invoice->id,
            'amount' => 300,
            'payment_method' => 'card',
        ]);

        Refund::create([
            'payment_id' => $payment->id,
            'amount' => 300,
            'reason' => 'full refund test',
            'status' => 'approved',
        ]);

        return [$payment, $invoice];
    }

    private function createPaymentWithInvoice(): Payment
    {
        $invoice = $this->createInvoice('paid', 500, 500, 0);

        return Payment::create([
            'invoice_id' => $invoice->id,
            'amount' => 500,
            'payment_method' => 'cash',
        ]);
    }
}
