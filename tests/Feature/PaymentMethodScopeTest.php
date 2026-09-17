<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PaymentMethodScopeTest extends TestCase
{
    use RefreshDatabase;

    private function cashier(): User
    {
        $u = User::factory()->create();
        $u->roles()->attach(Role::firstOrCreate(['name' => 'cashier'], ['display_name' => 'Cashier', 'is_system' => true]));
        return $u->fresh()->load('roles');
    }

    private function servedOrder(): Order
    {
        return Order::create([
            'order_number' => 'ORD-'.uniqid(),
            'order_type' => 'takeaway',
            'status' => 'served',
            'payment_status' => 'unpaid',
            'subtotal' => 100,
            'total' => 100,
        ]);
    }

    public function test_live_cash_card_ewallet_succeed(): void
    {
        foreach (['cash', 'card', 'e_wallet'] as $method) {
            $user = $this->cashier();
            $order = $this->servedOrder();
            $this->actingAs($user)->postJson("/api/v1/orders/{$order->id}/payments", [
                'payment_method' => $method,
                'amount' => 100,
            ])->assertStatus(201);
        }
    }

    public function test_live_rejects_undocumented_methods(): void
    {
        foreach (['bank_transfer', 'gift_card', 'loyalty_points'] as $method) {
            $user = $this->cashier();
            $order = $this->servedOrder();
            $this->actingAs($user)->postJson("/api/v1/orders/{$order->id}/payments", [
                'payment_method' => $method,
                'amount' => 100,
            ])->assertStatus(422);
        }
    }

    public function test_legacy_split_payment_has_no_route(): void
    {
        $user = $this->cashier();
        $order = $this->servedOrder();
        $this->actingAs($user)->postJson("/api/v1/payments/{$order->id}/split", [
            'payments' => [
                ['amount' => 50, 'payment_method' => 'cash'],
                ['amount' => 50, 'payment_method' => 'cash'],
            ],
        ])->assertStatus(404);
    }
}
