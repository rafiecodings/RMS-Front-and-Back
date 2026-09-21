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
 * Capstone UAT Seeder — two modes:
 *
 * DEFAULT / TESTING (CAPSTONE_DEMO_MODE=false or testing env):
 *   Minimal fixture: Admin + Kitchen Staff (Jayson) only.
 *   Preserves legacy test contract — no demo customers, tables, orders, etc.
 *
 * EXPLICIT DEMO/UAT (CAPSTONE_DEMO_MODE=true in local/development):
 *   Full defense dataset: 6 roles, demo customers, tables, ingredients, recipes,
 *   suppliers/POs, reservations, order states, financial & historical transactions.
 *
 * DESTRUCTIVE: seedStaff() removes all users except Admin + Jayson.
 * Guarded to run only in local/testing/development. Never run in production.
 *
 * Run: php artisan db:seed --class=CapstoneUatSeeder
 * Demo: CAPSTONE_DEMO_MODE=true php artisan db:seed --class=CapstoneUatSeeder
 */
class CapstoneUatSeeder extends Seeder
{
    public function run(): void
    {
        $this->guardEnvironment();

        // Preserve existing baseline behavior for normal/test runs.
        $this->seedStaff();

        if (! $this->isDemoModeEnabled()) {
            return;
        }

        // Expanded defense-only data (explicit demo/UAT mode).
        $this->seedDemoCustomers();
        $this->seedDemoTables();
        $this->seedIngredientScenarios();
        $this->seedDemoMenuAndRecipe();
        $this->seedDemoSupplierAndPurchaseOrder();
        $this->seedReplenishmentRequests();
        $this->seedReservationScenarios();
        $this->seedDemoStaffOperations();
        $this->seedOrderStates();
        $this->seedDemoFinancialTransactions();
        // Historical transactions are NOT auto-run; use seedDemoHistoricalTransactions() explicitly if needed.
    }

    private function isDemoModeEnabled(): bool
    {
        // Force demo mode OFF in testing to match legacy test expectations.
        if (app()->environment("testing")) {
            return false;
        }

        return filter_var(env("CAPSTONE_DEMO_MODE", false), FILTER_VALIDATE_BOOLEAN);
    }

    // ------------------------------------------------------------------
    // STAFF — one person per restaurant role (4–5 total)
    // ------------------------------------------------------------------

    private function guardEnvironment(): void
    {
        if (! app()->environment(['local', 'testing', 'development', 'dev'])) {
            throw new \RuntimeException('CapstoneUatSeeder is destructive and may only run in local/testing/development environments. Current environment: '.app()->environment());
        }
    }

    private function seedDemoCustomers(): void
    {
        $customers = [
            [
                'name' => 'Maria Santos',
                'email' => 'maria.santos@demo.local',
                'phone' => '09171234567',
                'notes' => 'Regular customer, prefers window seat',
            ],
            [
                'name' => 'Juan Dela Cruz',
                'email' => 'juan.delacruz@demo.local',
                'phone' => '09178765432',
                'notes' => 'Walk-in customer, no loyalty account',
            ],
            [
                'name' => 'Ana Reyes',
                'email' => 'ana.reyes@demo.local',
                'phone' => '09173334444',
                'notes' => 'Corporate account, monthly billing',
            ],
        ];

        foreach ($customers as $customer) {
            Customer::firstOrCreate(
                ['email' => $customer['email']],
                [
                    'name' => $customer['name'],
                    'phone' => $customer['phone'],
                    'customer_type' => 'registered',
                    'notes' => $customer['notes'],
                    'is_active' => true,
                ]
            );
        }
    }

    private function seedDemoTables(): void
    {
        // Create floor plans first (migrate legacy names)
        $legacyFloor1 = \App\Models\FloorPlan::where('name', 'UAT Demo Floor 1')->first();
        if ($legacyFloor1 && ! \App\Models\FloorPlan::where('name', 'Main Dining')->exists()) {
            $legacyFloor1->update(['name' => 'Main Dining']);
        }

        $legacyFloor2 = \App\Models\FloorPlan::where('name', 'UAT Demo Floor 2')->first();
        if ($legacyFloor2 && ! \App\Models\FloorPlan::where('name', 'Private Rooms')->exists()) {
            $legacyFloor2->update(['name' => 'Private Rooms']);
        }

        $floorPlan1 = \App\Models\FloorPlan::firstOrCreate(
            ['name' => 'Main Dining'],
            ['sort_order' => 1, 'is_active' => true]
        );

        $floorPlan2 = \App\Models\FloorPlan::firstOrCreate(
            ['name' => 'Private Rooms'],
            ['sort_order' => 2, 'is_active' => true]
        );

        $tables = [
            ['number' => 'TBL-001', 'capacity' => 2, 'status' => 'available', 'floor_plan_id' => $floorPlan1->id],
            ['number' => 'TBL-002', 'capacity' => 4, 'status' => 'available', 'floor_plan_id' => $floorPlan1->id],
            ['number' => 'TBL-003', 'capacity' => 6, 'status' => 'available', 'floor_plan_id' => $floorPlan2->id],
        ];

        foreach ($tables as $table) {
            \App\Models\Table::firstOrCreate(
                ['number' => $table['number']],
                [
                    'capacity' => $table['capacity'],
                    'status' => $table['status'],
                    'is_active' => true,
                    'floor_plan_id' => $table['floor_plan_id'],
                ]
            );
        }
    }

    // ------------------------------------------------------------------
    // STAFF — one person per restaurant role (6 total)
    // ------------------------------------------------------------------

    private function seedStaff(): void
    {
        $isDemoMode = $this->isDemoModeEnabled();

        // Keep only the core users; all others will be removed
        $keepEmails = ['admin@rms.com', 'jaysonkitchenstaff@gmail.com'];

        $removeIds = User::whereNotIn('email', $keepEmails)->pluck('id')->toArray();
        if (! empty($removeIds)) {
            // Clean up related data using DB queries (no raw SQL)
            DB::table('model_has_roles')->whereIn('model_id', $removeIds)->where('model_type', 'App\Models\User')->delete();
            DB::table('staff_profiles')->whereIn('user_id', $removeIds)->delete();
            DB::table('personal_access_tokens')->whereIn('tokenable_id', $removeIds)->delete();
            DB::table('sessions')->whereIn('user_id', $removeIds)->delete();

            // Clean up orders, payments, refunds, audit logs, stock movements
            DB::table('orders')->whereIn('created_by', $removeIds)->delete();
            DB::table('payments')->whereIn('processed_by', $removeIds)->delete();
            DB::table('refunds')->whereIn('processed_by', $removeIds)->delete();
            DB::table('audit_logs')->whereIn('user_id', $removeIds)->delete();
            DB::table('stock_movements')->whereIn('created_by', $removeIds)->delete();

            // Clean up shift_schedules, attendance, leave_requests, staff_performance via staff_profiles
            $staffProfileIds = DB::table('staff_profiles')->whereIn('user_id', $removeIds)->pluck('id')->toArray();
            if (! empty($staffProfileIds)) {
                DB::table('shift_schedules')->whereIn('staff_id', $staffProfileIds)->delete();
                DB::table('attendance')->whereIn('staff_id', $staffProfileIds)->delete();
                DB::table('leave_requests')->whereIn('staff_id', $staffProfileIds)->delete();
                DB::table('staff_performance')->whereIn('staff_id', $staffProfileIds)->delete();
            }

            DB::table('users')->whereIn('id', $removeIds)->delete();
        }

        // Admin
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

        // Jayson (Kitchen Staff) - always created in both modes
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
        } else {
            if ($kitchenRole && ! $jayson->roles()->where('name', 'kitchen_staff')->exists()) {
                $jayson->roles()->attach($kitchenRole);
            }
        }
        // Ensure staff profile exists for Jayson
        if (! $jayson->staffProfile) {
            \App\Models\StaffProfile::create([
                'id' => (string) Str::uuid(),
                'user_id' => $jayson->id,
                'employee_id' => 'EMP-JAYSON01',
                'position' => 'Kitchen Staff',
                'department' => 'Kitchen',
                'hire_date' => now()->subMonths(2),
                'employment_type' => 'full_time',
                'phone' => '09919999999',
                'is_active' => true,
            ]);
        }

        if (! $isDemoMode) {
            return;
        }

        // Demo mode: create additional staff roles
        // Manager
        $manager = User::where('email', 'manager@rms.com')->first();
        if (! $manager) {
            $manager = User::create([
                'name' => 'Maria Santos',
                'email' => 'manager@rms.com',
                'password' => Hash::make(env('DEMO_USER_PASSWORD', 'password')),
                'is_active' => true,
                'email_verified_at' => now(),
            ]);
            $managerRole = Role::where('name', 'manager')->first();
            if ($managerRole) $manager->roles()->attach($managerRole);
        } else {
            $managerRole = Role::where('name', 'manager')->first();
            if ($managerRole && ! $manager->roles()->where('name', 'manager')->exists()) {
                $manager->roles()->attach($managerRole);
            }
        }
        // Ensure staff profile for Manager
        if (! $manager->staffProfile) {
            \App\Models\StaffProfile::create([
                'id' => (string) Str::uuid(),
                'user_id' => $manager->id,
                'employee_id' => 'EMP-MARIA01',
                'position' => 'Manager',
                'department' => 'Management',
                'hire_date' => now()->subMonths(6),
                'employment_type' => 'full_time',
                'phone' => '09170000003',
                'is_active' => true,
            ]);
        }

        // Waiter
        $waiter = User::where('email', 'waiter@rms.com')->first();
        if (! $waiter) {
            $waiter = User::create([
                'name' => 'Juan Dela Cruz',
                'email' => 'waiter@rms.com',
                'password' => Hash::make(env('DEMO_USER_PASSWORD', 'password')),
                'is_active' => true,
                'email_verified_at' => now(),
            ]);
            $waiterRole = Role::where('name', 'waiter')->first();
            if ($waiterRole) $waiter->roles()->attach($waiterRole);
        } else {
            $waiterRole = Role::where('name', 'waiter')->first();
            if ($waiterRole && ! $waiter->roles()->where('name', 'waiter')->exists()) {
                $waiter->roles()->attach($waiterRole);
            }
        }
        // Ensure staff profile for Waiter
        if (! $waiter->staffProfile) {
            \App\Models\StaffProfile::create([
                'id' => (string) Str::uuid(),
                'user_id' => $waiter->id,
                'employee_id' => 'EMP-JUAN01',
                'position' => 'Waiter',
                'department' => 'Service',
                'hire_date' => now()->subMonths(3),
                'employment_type' => 'full_time',
                'phone' => '09170000004',
                'is_active' => true,
            ]);
        }

        // Cashier
        $cashier = User::where('email', 'cashier@rms.com')->first();
        if (! $cashier) {
            $cashier = User::create([
                'name' => 'Pedro Reyes',
                'email' => 'cashier@rms.com',
                'password' => Hash::make(env('DEMO_USER_PASSWORD', 'password')),
                'is_active' => true,
                'email_verified_at' => now(),
            ]);
            $cashierRole = Role::where('name', 'cashier')->first();
            if ($cashierRole) $cashier->roles()->attach($cashierRole);
        } else {
            $cashierRole = Role::where('name', 'cashier')->first();
            if ($cashierRole && ! $cashier->roles()->where('name', 'cashier')->exists()) {
                $cashier->roles()->attach($cashierRole);
            }
        }
        // Ensure staff profile for Cashier
        if (! $cashier->staffProfile) {
            \App\Models\StaffProfile::create([
                'id' => (string) Str::uuid(),
                'user_id' => $cashier->id,
                'employee_id' => 'EMP-PEDRO01',
                'position' => 'Cashier',
                'department' => 'POS',
                'hire_date' => now()->subMonths(4),
                'employment_type' => 'full_time',
                'phone' => '09170000005',
                'is_active' => true,
            ]);
        }

        // Inventory Staff
        $inventory = User::where('email', 'inventory@rms.com')->first();
        if (! $inventory) {
            $inventory = User::create([
                'name' => 'Rosa Mendoza',
                'email' => 'inventory@rms.com',
                'password' => Hash::make(env('DEMO_USER_PASSWORD', 'password')),
                'is_active' => true,
                'email_verified_at' => now(),
            ]);
            $inventoryRole = Role::where('name', 'inventory_staff')->first();
            if ($inventoryRole) $inventory->roles()->attach($inventoryRole);
        } else {
            $inventoryRole = Role::where('name', 'inventory_staff')->first();
            if ($inventoryRole && ! $inventory->roles()->where('name', 'inventory_staff')->exists()) {
                $inventory->roles()->attach($inventoryRole);
            }
        }
        // Ensure staff profile exists for Inventory Staff
        if (! $inventory->staffProfile) {
            \App\Models\StaffProfile::create([
                'id' => (string) Str::uuid(),
                'user_id' => $inventory->id,
                'employee_id' => 'EMP-ROSA01',
                'position' => 'Inventory Staff',
                'department' => 'Inventory',
                'hire_date' => now()->subMonths(1),
                'employment_type' => 'full_time',
                'phone' => '09170000002',
                'is_active' => true,
            ]);
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
        // Migrate old UAT-named ingredients to new realistic names
        $legacyToNew = [
            'UAT Healthy Basil' => 'Fresh Basil',
            'UAT Healthy Rice' => 'Jasmine Rice',
            'UAT Low Stock Flour' => 'All-Purpose Flour',
            'UAT Out of Stock Eggs' => 'Fresh Eggs',
            'UAT Overstock Sugar' => 'White Sugar',
        ];

        foreach ($legacyToNew as $legacy => $newName) {
            $legacyIng = Ingredient::where('name', $legacy)->first();
            if ($legacyIng && ! Ingredient::where('name', $newName)->exists()) {
                $legacyIng->update(['name' => $newName]);
            }
        }

        $scenarios = [
            // name, current_stock, minimum_stock, maximum_stock, cost_per_unit, category
            ['Fresh Basil', 500, 200, 1000, 0.08, 'Spices & Herbs'],       // healthy - 50 servings (10g each)
            ['Jasmine Rice', 5000, 1000, 10000, 0.05, 'Grains'],           // healthy - 25 servings (200g each)
            ['All-Purpose Flour', 250, 500, 1200, 0.08, 'Grains'],         // low stock
            ['Fresh Eggs', 0, 100, 300, 0.12, 'Dairy & Eggs'],             // out of stock
            ['White Sugar', 5000, 200, 1000, 0.06, 'Pantry'],              // overstock
        ];

        foreach ($scenarios as [$name, $stock, $min, $max, $cost, $category]) {
            Ingredient::firstOrCreate(
                ['name' => $name],
                [
                    'unit' => 'g',
                    'current_stock' => $stock,
                    'minimum_stock' => $min,
                    'maximum_stock' => $max,
                    'cost_per_unit' => $cost,
                    'category' => $category,
                ]
            );
        }

        // Replenishment requests tied to the low/out items.
        $outOfStock = Ingredient::where('name', 'Fresh Eggs')->first();
        $lowStock = Ingredient::where('name', 'All-Purpose Flour')->first();
    }

    private function seedReplenishmentRequests(): void
    {
        $outOfStock = Ingredient::where('name', 'Fresh Eggs')->first();
        $lowStock = Ingredient::where('name', 'All-Purpose Flour')->first();
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
            ['RSV-UAT-UPC-0001', now()->addDays(2), '18:00', 'confirmed', null],
            ['RSV-UAT-STN-0001', now(), '17:30', 'seated', null],
            ['RSV-UAT-DON-0001', now()->subDays(1), '19:00', 'completed', null],
            ['RSV-UAT-CXL-0001', now()->addDays(3), '20:00', 'cancelled', 'Change of plans'],
        ];

        foreach ($scenarios as [$number, $date, $time, $status, $reason]) {
            if (Reservation::where('reservation_number', $number)->exists()) {
                continue;
            }

            Reservation::create([
                'reservation_number' => $number,
                'guest_name' => 'UAT Guest',
                'guest_phone' => '09181234567',
                'party_size' => 4,
                'customer_id' => $guests->isEmpty() ? null : $guests->first()->id,
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
        $menuItem = \App\Models\MenuItem::where('slug', 'herb-rice-bowl')->first();
        
        if (!$menuItem) {
            return;
        }

        $states = [
            ['ORD-DEMO-PENDING-001', 'pending', 'unpaid'],
            ['ORD-DEMO-CONFIRMED-001', 'confirmed', 'unpaid'],
            ['ORD-DEMO-PREPARING-001', 'preparing', 'unpaid'],
            ['ORD-DEMO-READY-001', 'ready', 'unpaid'],
            ['ORD-DEMO-SERVED-001', 'served', 'unpaid'],
            ['ORD-DEMO-PAID-001', 'completed', 'paid'],
            ['ORD-DEMO-CANCELLED-001', 'cancelled', 'unpaid'],
        ];

        foreach ($states as [$number, $state, $paymentStatus]) {
            if (Order::where('order_number', $number)->exists()) {
                continue;
            }

            $orderId = (string) Str::uuid();
            $subtotal = 219; // Herb Rice Bowl price
            $paid = $state === 'completed';
            $paymentStatus = $paid ? 'paid' : 'unpaid';
            
            // Use PricingService for accurate VAT calculation
            $pricing = app(\App\Services\PricingService::class);
            $totals = $pricing->orderTotals((float) $subtotal, 0);

            DB::table('orders')->insert([
                'id' => $orderId,
                'order_number' => $number,
                'order_type' => 'takeaway', // Use takeaway to not block tables
                'status' => $state,
                'payment_status' => $paymentStatus,
                'subtotal' => $subtotal,
                'tax_amount' => $totals['tax_amount'],
                'discount_amount' => 0,
                'service_charge' => 0,
                'total' => $totals['total'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            OrderItem::create([
                'order_id' => $orderId,
                'menu_item_id' => $menuItem->id,
                'name' => $menuItem->name,
                'quantity' => 1,
                'unit_price' => $subtotal,
                'total_price' => $subtotal,
            ]);
        }

        // Regenerate the deterministic demo fixtures if pricing settings
        // changed since seeding. Scoped to exact demo order numbers only;
        // genuine orders are never touched.
        $recompute = app(\App\Services\PricingService::class);
        foreach (['ORD-DEMO-PENDING-001', 'ORD-DEMO-CONFIRMED-001', 'ORD-DEMO-PREPARING-001', 'ORD-DEMO-READY-001', 'ORD-DEMO-SERVED-001', 'ORD-DEMO-PAID-001', 'ORD-DEMO-CANCELLED-001'] as $number) {
            $existing = Order::where('order_number', $number)->first();
            if (! $existing) {
                continue;
            }
            $recomputed = $recompute->orderTotals((float) $existing->subtotal, (float) $existing->discount_amount);
            $existing->update([
                'tax_amount' => $recomputed['tax_amount'],
                'total' => $recomputed['total'],
            ]);
        }

        // NOTE: UAT orders are created "today", so forecasting history from
        // real orders remains untouched and Timecho keeps its 90-day series.
    }

    private function seedDemoMenuAndRecipe(): void
    {
        // Migrate old category
        $legacyCategory = \App\Models\MenuCategory::where('name', 'UAT Demo Mains')->first();
        if ($legacyCategory && ! \App\Models\MenuCategory::where('name', 'Main Dishes')->exists()) {
            $legacyCategory->update(['name' => 'Main Dishes', 'slug' => 'main-dishes']);
        }

        // Find or create a demo menu category (deterministic slug for idempotency)
        $category = \App\Models\MenuCategory::firstOrCreate(
            ['name' => 'Main Dishes'],
            ['slug' => 'main-dishes', 'sort_order' => 999, 'is_active' => true]
        );

        // Migrate old menu item
        $legacyItem = \App\Models\MenuItem::where('slug', 'uat-demo-rice-bowl')->first();
        if ($legacyItem && ! \App\Models\MenuItem::where('slug', 'herb-rice-bowl')->exists()) {
            $legacyItem->update([
                'name' => 'Herb Rice Bowl',
                'slug' => 'herb-rice-bowl',
                'description' => 'Fragrant jasmine rice with fresh basil and herbs',
                'category_id' => $category->id,
            ]);
        }

        // Create demo menu item (deterministic slug for idempotency)
        $menuItem = \App\Models\MenuItem::firstOrCreate(
            ['slug' => 'herb-rice-bowl'],
            [
                'category_id' => $category->id,
                'name' => 'Herb Rice Bowl',
                'description' => 'Fragrant jasmine rice with fresh basil and herbs',
                'price' => 219,
                'is_available' => true,
            ]
        );

        // Create recipe (one per menu item)
        $recipe = \App\Models\Recipe::firstOrCreate(
            ['menu_item_id' => $menuItem->id],
            [
                'yield_quantity' => 1,
                'yield_unit' => 'serving',
            ]
        );

        // Link ingredients to recipe - use healthy-stock ingredients from seedIngredientScenarios
        $basil = \App\Models\Ingredient::where('name', 'Fresh Basil')->first();
        $rice = \App\Models\Ingredient::where('name', 'Jasmine Rice')->first();

        // Fallback: if ingredients don't exist (should not happen in demo mode), create minimal healthy ones
        if (! $basil) {
            $basil = \App\Models\Ingredient::firstOrCreate(
                ['name' => 'Fresh Basil'],
                ['unit' => 'g', 'current_stock' => 500, 'minimum_stock' => 200, 'maximum_stock' => 1000, 'cost_per_unit' => 0.08]
            );
        }

        if (! $rice) {
            $rice = \App\Models\Ingredient::firstOrCreate(
                ['name' => 'Jasmine Rice'],
                ['unit' => 'g', 'current_stock' => 5000, 'minimum_stock' => 1000, 'maximum_stock' => 10000, 'cost_per_unit' => 0.05]
            );
        }

        // Recipe ingredients: 10g basil + 200g rice per serving
        // Healthy stock: basil 500g (50 servings), rice 5000g (25 servings)
        $ingredients = [
            ['ingredient_id' => $basil->id, 'quantity' => 10, 'unit' => 'g'],
            ['ingredient_id' => $rice->id, 'quantity' => 200, 'unit' => 'g'],
        ];

        foreach ($ingredients as $ing) {
            $recipe->ingredients()->syncWithoutDetaching([
                $ing['ingredient_id'] => [
                    'quantity' => $ing['quantity'],
                    'unit' => $ing['unit'],
                ],
            ]);
        }
    }

    private function seedDemoSupplierAndPurchaseOrder(): void
    {
        // Create supplier (idempotent on name, migrate legacy)
        $legacySupplier = \App\Models\Supplier::where('name', 'UAT Demo Supplier')->first();
        if ($legacySupplier && ! \App\Models\Supplier::where('name', 'Metro Food Supply')->exists()) {
            $legacySupplier->update(['name' => 'Metro Food Supply']);
        }

        $supplier = \App\Models\Supplier::firstOrCreate(
            ['name' => 'Metro Food Supply'],
            [
                'contact_person' => 'Roberto Tan',
                'phone' => '09170000000',
                'email' => 'orders@metrofood.ph',
                'address' => '123 Industrial Ave, Quezon City',
                'payment_terms' => 'Net 30',
                'rating' => 5.0,
                'is_active' => true,
            ]
        );

        // Create one received PO (historical) + one confirmed PO (for UI demo)
        // Historical received PO
        $receivedPo = \App\Models\PurchaseOrder::firstOrCreate(
            ['po_number' => 'PO-UAT-DEMO-001'],
            [
                'supplier_id' => $supplier->id,
                'status' => 'received',
                'expected_date' => now()->subDays(2),
                'received_at' => now()->subDays(1),
                'notes' => 'Historical PO for defense demo (received)',
                'total_amount' => 80.00,
            ]
        );

        // Add PO item for received PO
        $basil = \App\Models\Ingredient::where('name', 'Fresh Basil')->first();
        if ($basil) {
            \App\Models\PurchaseOrderItem::firstOrCreate(
                ['purchase_order_id' => $receivedPo->id, 'ingredient_id' => $basil->id],
                [
                    'quantity' => 1000,
                    'unit' => 'g',
                    'unit_cost' => $basil->cost_per_unit ?? 0.08,
                    'total_cost' => 1000 * ($basil->cost_per_unit ?? 0.08),
                    'received_quantity' => 1000,
                ]
            );
        }

        // Confirmed PO for live UI demo (not yet received)
        $confirmedPo = \App\Models\PurchaseOrder::firstOrCreate(
            ['po_number' => 'PO-UAT-DEMO-002'],
            [
                'supplier_id' => $supplier->id,
                'status' => 'confirmed',
                'expected_date' => now()->addDays(3),
                'notes' => 'Active PO for defense demo (confirmed, awaiting delivery)',
                'total_amount' => 250.00,
            ]
        );

        // Add PO item for confirmed PO
        $rice = \App\Models\Ingredient::where('name', 'Jasmine Rice')->first();
        if ($rice) {
            \App\Models\PurchaseOrderItem::firstOrCreate(
                ['purchase_order_id' => $confirmedPo->id, 'ingredient_id' => $rice->id],
                [
                    'quantity' => 5000,
                    'unit' => 'g',
                    'unit_cost' => 0.05,
                    'total_cost' => 250.00,
                    'received_quantity' => 0,
                ]
            );
        }

        // Ensure PO totals match sum of items (idempotent recalculation)
        foreach (['PO-UAT-DEMO-001', 'PO-UAT-DEMO-002'] as $poNumber) {
            $po = \App\Models\PurchaseOrder::where('po_number', $poNumber)->first();
            if ($po) {
                $calculatedTotal = $po->items->sum(fn ($item) => $item->total_cost);
                if ((float) $po->total_amount !== (float) $calculatedTotal) {
                    $po->update(['total_amount' => $calculatedTotal]);
                }
            }
        }
    }

    private function seedDemoStaffOperations(): void
    {
        $waiter = User::where('email', 'waiter@rms.com')->first();
        $manager = User::where('email', 'manager@rms.com')->first();
        $cashier = User::where('email', 'cashier@rms.com')->first();
        $kitchen = User::where('email', 'jaysonkitchenstaff@gmail.com')->first();
        $inventory = User::where('email', 'inventory@rms.com')->first();

        // Create staff shifts first
        $dayShift = \App\Models\StaffShift::firstOrCreate(
            ['name' => 'Day Shift'],
            ['start_time' => '08:00:00', 'end_time' => '16:00:00']
        );
        $nightShift = \App\Models\StaffShift::firstOrCreate(
            ['name' => 'Night Shift'],
            ['start_time' => '16:00:00', 'end_time' => '00:00:00']
        );

        $users = [$waiter, $manager, $cashier, $kitchen];
        
        // Create schedules for the next 7 days
        foreach ($users as $user) {
            if (! $user || ! $user->staffProfile) continue;
            for ($i = 0; $i < 7; $i++) {
                $date = now()->addDays($i)->toDateString();
                \App\Models\ShiftSchedule::firstOrCreate([
                    'staff_id' => $user->staffProfile->id,
                    'shift_id' => $dayShift->id,
                    'date' => $date,
                ], [
                    'status' => 'scheduled',
                ]);
            }
        }

        // Attendance records for the past 7 days
        foreach ($users as $user) {
            if (! $user || ! $user->staffProfile) continue;
            for ($i = 1; $i <= 7; $i++) {
                $date = now()->subDays($i);
                \App\Models\Attendance::firstOrCreate([
                    'staff_id' => $user->staffProfile->id,
                    'clock_in' => $date->copy()->setTime(8, 0),
                ], [
                    'clock_out' => $date->copy()->setTime(16, 0),
                    'status' => 'present',
                    'notes' => null,
                ]);
            }
        }

        // Leave request for waiter (approved)
        if ($waiter && $waiter->staffProfile) {
            \App\Models\LeaveRequest::firstOrCreate([
                'staff_id' => $waiter->staffProfile->id,
                'start_date' => now()->addDays(10)->toDateString(),
                'end_date' => now()->addDays(12)->toDateString(),
                'leave_type' => 'vacation',
            ], [
                'reason' => 'Personal leave',
                'status' => 'approved',
                'decided_by' => $manager?->id,
                'decided_at' => now(),
            ]);
        }

        // Performance records for the past 30 days
        foreach ($users as $user) {
            if (! $user || ! $user->staffProfile) continue;
            for ($i = 1; $i <= 30; $i++) {
                $date = now()->subDays($i);
                $orders = \App\Models\Order::where('created_by', $user->id)
                    ->where('status', 'completed')
                    ->whereDate('created_at', $date)
                    ->count();
                
                if ($orders > 0) {
                    \App\Models\StaffPerformance::firstOrCreate([
                        'staff_id' => $user->staffProfile->id,
                        'date' => $date->toDateString(),
                    ], [
                        'orders_count' => $orders,
                        'sales_total' => \App\Models\Order::where('created_by', $user->id)
                            ->where('status', 'completed')
                            ->whereDate('created_at', $date)
                            ->sum('total'),
                    ]);
                }
            }
        }
    }

private function seedDemoFinancialTransactions(): void
    {
        $pricing = app(\App\Services\PricingService::class);
        
        // Normal VAT-inclusive transaction (replaces ORD-UAT-VAT-DEMO-001)
        $vatOrder = \App\Models\Order::firstOrCreate(
            ['order_number' => 'ORD-DEMO-PAID-001'],
            [
                'customer_id' => null,
                'table_id' => \App\Models\Table::where('number', 'TBL-001')->first()?->id,
                'order_type' => 'dine_in',
                'status' => 'completed',
                'subtotal' => 219,
                'tax_amount' => 0,
                'discount_amount' => 0,
                'service_charge' => 0,
                'total' => 219,
                'payment_status' => 'paid',
                'order_type' => 'dine_in',
            ]
        );
        
        // Recompute with PricingService for accurate VAT breakdown
        $totals = $pricing->orderTotals(
            (float) $vatOrder->subtotal,
            (float) $vatOrder->discount_amount
        );
        
        $vatOrder->update([
            'tax_amount' => $totals['tax_amount'],
            'total' => $totals['total'],
        ]);
        
        // Create invoice and payment for this order
        if (!$vatOrder->invoice) {
            $invoice = \App\Models\Invoice::firstOrCreate(
                ['order_id' => $vatOrder->id],
                [
                    'invoice_number' => 'INV-DEMO-VAT-001',
                    'subtotal' => $totals['subtotal'],
                    'tax_amount' => $totals['tax_amount'],
                    'discount_amount' => $totals['discount_amount'],
                    'service_charge' => $totals['service_charge'],
                    'total' => $totals['total'],
                    'amount_paid' => $totals['total'],
                    'balance' => 0,
                    'status' => 'paid',
                ]
            );

            \App\Models\Payment::firstOrCreate(
                ['invoice_id' => $invoice->id],
                [
                    'amount' => $totals['total'],
                    'payment_method' => 'cash',
                    'reference_number' => 'REF-DEMO-VAT-001',
                    'processed_by' => User::where('email', 'cashier@rms.com')->first()?->id,
                ]
            );
        } else {
            // Regenerate deterministic demo invoice/payment if settings changed.
            $vatOrder->invoice->update([
                'subtotal' => $totals['subtotal'],
                'tax_amount' => $totals['tax_amount'],
                'discount_amount' => $totals['discount_amount'],
                'service_charge' => $totals['service_charge'],
                'total' => $totals['total'],
                'amount_paid' => $totals['total'],
                'balance' => 0,
                'status' => 'paid',
            ]);
            $vatOrder->invoice->payments()->update(['amount' => $totals['total']]);
        }
        
        // SC/PWD statutory discount transaction (replaces ORD-UAT-SC-DEMO-001)
        $scOrder = \App\Models\Order::firstOrCreate(
            ['order_number' => 'ORD-DEMO-SCPWD-001'],
            [
                'customer_id' => null,
                'table_id' => \App\Models\Table::where('number', 'TBL-002')->first()?->id,
                'order_type' => 'dine_in',
                'status' => 'completed',
                'subtotal' => 112,
                'tax_amount' => 0,
                'discount_amount' => 0,
                'service_charge' => 0,
                'total' => 80,
                'payment_status' => 'paid',
                'statutory_discount_type' => 'senior_citizen',
                'statutory_discount_reference' => 'OSCA-123456789',
                'statutory_discount_name' => 'Senior Citizen Discount',
                'qualified_amount' => 112,
                'statutory_discount_amount' => 20,
                'vat_exempt_sales' => 100,
            ]
        );
        
        $scTotals = $pricing->orderTotalsWithStatutoryDiscount(
            (float) $scOrder->subtotal,
            (float) $scOrder->discount_amount,
            'senior_citizen',
            (float) $scOrder->qualified_amount,
            $scOrder->statutory_discount_reference
        );
        
        $scOrder->update([
            'tax_amount' => $scTotals['tax_amount'],
            'total' => $scTotals['total'],
            'discount_amount' => $scTotals['discount_amount'],
            'statutory_discount_amount' => $scTotals['statutory_discount_amount'],
            'qualified_amount' => $scTotals['qualified_amount'],
            'vat_exempt_sales' => $scTotals['vat_exempt_sales'],
        ]);
        
        // Create invoice and payment for SC order
        if (!$scOrder->invoice) {
            $scInvoice = \App\Models\Invoice::firstOrCreate(
                ['order_id' => $scOrder->id],
                [
                    'invoice_number' => 'INV-DEMO-SC-001',
                    'subtotal' => $scTotals['subtotal'],
                    'tax_amount' => $scTotals['tax_amount'],
                    'discount_amount' => $scTotals['discount_amount'],
                    'service_charge' => $scTotals['service_charge'],
                    'total' => $scTotals['total'],
                    'amount_paid' => $scTotals['total'],
                    'balance' => 0,
                    'status' => 'paid',
                ]
            );

            \App\Models\Payment::firstOrCreate(
                ['invoice_id' => $scInvoice->id],
                [
                    'amount' => $scTotals['total'],
                    'payment_method' => 'cash',
                    'reference_number' => 'REF-DEMO-SC-001',
                    'processed_by' => User::where('email', 'cashier@rms.com')->first()?->id,
                ]
            );
        } else {
            // Regenerate deterministic demo invoice/payment if settings changed.
            $scOrder->invoice->update([
                'subtotal' => $scTotals['subtotal'],
                'tax_amount' => $scTotals['tax_amount'],
                'discount_amount' => $scTotals['discount_amount'],
                'service_charge' => $scTotals['service_charge'],
                'total' => $scTotals['total'],
                'amount_paid' => $scTotals['total'],
                'balance' => 0,
                'status' => 'paid',
            ]);
            $scOrder->invoice->payments()->update(['amount' => $scTotals['total']]);
        }
    }

    private function seedDemoHistoricalTransactions(): void
    {
        $pricing = app(\App\Services\PricingService::class);
        $menuItem = \App\Models\MenuItem::first();
        $customer = \App\Models\Customer::first();
        $table = \App\Models\Table::first();

        if (! $menuItem || ! $customer || ! $table) {
            return;
        }

        $baseDate = now()->subDays(30);
        
        for ($i = 0; $i < 30; $i++) {
            $date = $baseDate->copy()->addDays($i);
            $orderCount = 10; // Fixed count for determinism
            
            for ($j = 0; $j < $orderCount; $j++) {
                // Deterministic order time based on date and sequence
                $orderTime = $date->copy()->addHours(8 + ($j % 14))->addMinutes(($j * 7) % 60);
                
                // Deterministic subtotal based on date and sequence
                $subtotal = 200 + (($i * 10 + $j * 7) % 300);
                $totals = $pricing->orderTotals($subtotal, 0);
                
                // Deterministic order number based on date and sequence
                $orderNumber = sprintf('ORD-HIST-%s-%02d', $date->format('Ymd'), $j + 1);
                
                $order = \App\Models\Order::firstOrCreate(
                    ['order_number' => $orderNumber],
                    [
                        'customer_id' => $customer->id,
                        'table_id' => $table->id,
                        'order_type' => ($j % 2 === 0) ? 'dine_in' : 'takeaway',
                        'status' => 'completed',
                        'subtotal' => $subtotal,
                        'tax_amount' => $totals['tax_amount'],
                        'discount_amount' => $totals['discount_amount'],
                        'service_charge' => $totals['service_charge'],
                        'total' => $totals['total'],
                        'payment_status' => 'paid',
                        'created_at' => $orderTime,
                        'updated_at' => $orderTime,
                    ]
                );
                
                // Create order item
                \App\Models\OrderItem::firstOrCreate(
                    ['order_id' => $order->id, 'menu_item_id' => $menuItem->id],
                    [
                        'menu_item_id' => $menuItem->id,
                        'name' => $menuItem->name,
                        'quantity' => 1,
                        'unit_price' => $subtotal,
                        'total_price' => $subtotal,
                        'status' => 'completed',
                    ]
                );
                
                // Create invoice
                \App\Models\Invoice::firstOrCreate(
                    ['order_id' => $order->id],
                    [
                        'invoice_number' => 'INV-'.strtoupper(Str::random(8)),
                        'subtotal' => $totals['subtotal'],
                        'tax_amount' => $totals['tax_amount'],
                        'discount_amount' => $totals['discount_amount'],
                        'service_charge' => $totals['service_charge'],
                        'total' => $totals['total'],
                        'amount_paid' => $totals['total'],
                        'balance' => 0,
                        'status' => 'paid',
                    ]
                );
                
                // Create payment
                \App\Models\Payment::firstOrCreate(
                    ['invoice_id' => $order->invoice?->id],
                    [
                        'amount' => $totals['total'],
                        'payment_method' => ['cash', 'card', 'e_wallet'][$j % 3],
                        'reference_number' => 'REF-'.strtoupper(Str::random(8)),
                        'processed_by' => User::where('email', 'cashier@rms.com')->first()?->id,
                    ]
                );
                
// Skip stock deduction for historical transactions to avoid depleting demo inventory
                // Historical orders are for reporting/dashboard purposes only
            }
        }
    }
}
