<?php

namespace Database\Seeders;

use App\Models\Customer;
use App\Models\Ingredient;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\ReplenishmentRequest;
use App\Models\Reservation;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Intentional UAT scenarios for the capstone demo.
 *
 * DESTRUCTIVE: seedStaff() removes all users except Admin + Jayson.
 * Guarded to run only in local/testing/development. Never run in production.
 *
 * Run: php artisan db:seed --class=CapstoneUatSeeder
 */
class CapstoneUatSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment(['local', 'testing', 'development', 'dev'])) {
            throw new \RuntimeException('CapstoneUatSeeder is destructive and may only run in local/testing/development environments. Current environment: '.app()->environment());
        }

        $this->seedStaff();
        $this->seedTieredCustomers();
        $this->seedIngredientScenarios();
        $this->seedReplenishmentRequests();
        $this->seedReservationScenarios();
        $this->seedOrderStates();
    }

    // ------------------------------------------------------------------
    // STAFF — one person per restaurant role (4–5 total)
    // ------------------------------------------------------------------

    private function seedStaff(): void
    {
        $keep = ['admin@rms.com', 'jaysonkitchenstaff@gmail.com'];

        $removeIds = DB::table('users')->whereNotIn('email', $keep)->pluck('id')->toArray();
        if (! empty($removeIds)) {
            DB::table('personal_access_tokens')->whereIn('tokenable_id', $removeIds)->delete();
            DB::table('model_has_roles')->whereIn('model_id', $removeIds)->where('model_type', 'App\Models\User')->delete();
            DB::table('staff_profiles')->whereIn('user_id', $removeIds)->delete();
            DB::table('sessions')->whereIn('user_id', $removeIds)->delete();
            DB::table('users')->whereIn('id', $removeIds)->delete();
        }

        $admin = User::where('email', 'admin@rms.com')->first();
        if (! $admin) {
            $admin = User::create([
                'name' => 'Administrator',
                'email' => 'admin@rms.com',
                'password' => Hash::make(env('ADMIN_PASSWORD', 'password')),
                'is_active' => true,
                'email_verified_at' => now(),
            ]);
            $adminRole = Role::where('name', 'admin')->first();
            if ($adminRole) $admin->roles()->attach($adminRole);
        }

        $jayson = User::where('email', 'jaysonkitchenstaff@gmail.com')->first();
        $kitchenRole = Role::where('name', 'kitchen_staff')->first();
        if (! $jayson) {
            $jayson = User::create([
                'name' => 'Jayson Statham',
                'email' => 'jaysonkitchenstaff@gmail.com',
                'password' => Hash::make(env('DEMO_USER_PASSWORD', 'password')),
                'is_active' => true,
                'email_verified_at' => now(),
            ]);
            if ($kitchenRole) $jayson->roles()->attach($kitchenRole);
            DB::table('staff_profiles')->insert([
                'id' => (string) Str::uuid(),
                'user_id' => $jayson->id,
                'employee_id' => 'EMP-JAYSON01',
                'position' => 'Kitchen Staff',
                'department' => 'Kitchen',
                'hire_date' => now()->subMonths(2),
                'employment_type' => 'full_time',
                'phone' => '09919999999',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } else {
            if ($kitchenRole && ! $jayson->roles()->where('name', 'kitchen_staff')->exists()) {
                $jayson->roles()->attach($kitchenRole);
            }
            $hasProfile = DB::table('staff_profiles')->where('user_id', $jayson->id)->exists();
            if (! $hasProfile) {
                DB::table('staff_profiles')->insert([
                    'id' => (string) Str::uuid(),
                    'user_id' => $jayson->id,
                    'employee_id' => 'EMP-JAYSON01',
                    'position' => 'Kitchen Staff',
                    'department' => 'Kitchen',
                    'hire_date' => now()->subMonths(2),
                    'employment_type' => 'full_time',
                    'phone' => '09919999999',
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    // ------------------------------------------------------------------
    // CUSTOMERS covering every loyalty tier
    // ------------------------------------------------------------------

    private function seedTieredCustomers(): void
    {
        $tiers = [
            ['Member Demo', 0],
            ['Bronze Demo', 6],
            ['Silver Demo', 12],
            ['Gold Demo', 24],
            ['Platinum Demo', 35],
        ];

        foreach ($tiers as [$name, $visits]) {
            if (Customer::where('name', $name)->exists()) {
                continue;
            }

            Customer::create([
                'name' => $name,
                'email' => Str::slug($name).'@uat.local',
                'phone' => '0917'.str_pad((string) random_int(1000000, 9999999), 7, '0'),
                'customer_type' => 'registered',
                'loyalty_points' => 0,
                'total_spent' => $visits * 350,
                'visit_count' => $visits,
                'is_active' => true,
            ]);
        }
    }

    // ------------------------------------------------------------------
    // INGREDIENTS: Healthy / Low / Out / Overstock
    // ------------------------------------------------------------------

    private function seedIngredientScenarios(): void
    {
        $scenarios = [
            ['UAT Healthy Basil', 900, 200, 800],   // healthy
            ['UAT Low Stock Flour', 250, 500, 1200],// low
            ['UAT Out of Stock Eggs', 0, 100, 300], // out of stock
            ['UAT Overstock Sugar', 5000, 200, 1000],// overstock
        ];

        foreach ($scenarios as [$name, $stock, $min, $max]) {
            Ingredient::firstOrCreate(
                ['name' => $name],
                [
                    'unit' => 'g',
                    'current_stock' => $stock,
                    'minimum_stock' => $min,
                    'maximum_stock' => $max,
                    'cost_per_unit' => 0.08,
                ]
            );
        }

        // Replenishment requests tied to the low/out items.
        $outOfStock = Ingredient::where('name', 'UAT Out of Stock Eggs')->first();
        $lowStock = Ingredient::where('name', 'UAT Low Stock Flour')->first();
    }

    private function seedReplenishmentRequests(): void
    {
        $outOfStock = Ingredient::where('name', 'UAT Out of Stock Eggs')->first();
        $lowStock = Ingredient::where('name', 'UAT Low Stock Flour')->first();
        $manager = User::whereHas('roles', fn ($q) => $q->where('name', 'manager'))->first();

        if ($outOfStock && ! ReplenishmentRequest::where('ingredient_id', $outOfStock->id)->exists()) {
            ReplenishmentRequest::create([
                'request_number' => 'RPL-UAT-001',
                'ingredient_id' => $outOfStock->id,
                'quantity' => 500,
                'unit' => 'g',
                'priority' => 'urgent',
                'status' => 'submitted',
                'requested_by' => $manager?->id ?? User::first()?->id,
                'notes' => 'Completely out of stock during service.',
            ]);
        }

        if ($lowStock && ! ReplenishmentRequest::where('ingredient_id', $lowStock->id)->exists()) {
            ReplenishmentRequest::create([
                'request_number' => 'RPL-UAT-002',
                'ingredient_id' => $lowStock->id,
                'quantity' => 1500,
                'unit' => 'g',
                'priority' => 'high',
                'status' => 'approved',
                'requested_by' => $manager?->id ?? User::first()?->id,
                'notes' => 'Below minimum; restock before the weekend.',
            ]);
        }
    }

    // ------------------------------------------------------------------
    // RESERVATIONS: upcoming / seated / completed / cancelled
    // ------------------------------------------------------------------

    private function seedReservationScenarios(): void
    {
        $guests = Customer::take(2)->get();
        $scenarios = [
            ['RSV-UAT-UPC-'.Str::upper(Str::random(4)), now()->addDays(2), '18:00', 'confirmed', null],
            ['RSV-UAT-STN-'.Str::upper(Str::random(4)), now(), '17:30', 'seated', null],
            ['RSV-UAT-DON-'.Str::upper(Str::random(4)), now()->subDays(1), '19:00', 'completed', null],
            ['RSV-UAT-CXL-'.Str::upper(Str::random(4)), now()->addDays(3), '20:00', 'cancelled', 'Change of plans'],
        ];

        foreach ($scenarios as [$number, $date, $time, $status, $reason]) {
            if (Reservation::where('reservation_number', $number)->exists()) {
                continue;
            }

            Reservation::create([
                'reservation_number' => $number,
                'guest_name' => 'UAT Guest '.Str::random(3),
                'guest_phone' => '0918'.random_int(1000000, 9999999),
                'party_size' => random_int(2, 6),
                'customer_id' => $guests->isEmpty() ? null : $guests->random()->id,
                'reservation_date' => $date->toDateString(),
                'reservation_time' => $time,
                'status' => $status,
                'cancellation_reason' => $reason,
            ]);
        }
    }

    // ------------------------------------------------------------------
    // ORDER STATES: pending / preparing / ready / completed / cancelled
    // ------------------------------------------------------------------

    private function seedOrderStates(): void
    {
        $states = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
        $menuItem = DB::table('menu_items')->orderBy('created_at')->first();

        foreach ($states as $state) {
            $number = 'ORD-UAT-'.Str::upper(Str::random(4));
            if (Order::where('order_number', $number)->exists()) {
                continue;
            }

            $orderId = (string) Str::uuid();
            $paid = in_array($state, ['completed'], true);

            DB::table('orders')->insert([
                'id' => $orderId,
                'order_number' => $number,
                'order_type' => 'dine_in',
                'status' => $state,
                'payment_status' => $paid ? 'paid' : 'unpaid',
                'subtotal' => 250,
                'tax_amount' => 0,
                'discount_amount' => 0,
                'service_charge' => 0,
                'total' => 250,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            if ($menuItem) {
                OrderItem::create([
                    'order_id' => $orderId,
                    'menu_item_id' => $menuItem->id,
                    'name' => $menuItem->name,
                    'quantity' => 1,
                    'unit_price' => 250,
                    'total_price' => 250,
                ]);
            }
        }

        // NOTE: UAT orders are created "today", so forecasting history from
        // real orders remains untouched and Timecho keeps its 90-day series.
    }
}
