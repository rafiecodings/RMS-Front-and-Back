<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Customer;
use App\Models\Discount;
use App\Models\Ingredient;
use App\Models\Inventory\Recipe;
use App\Models\Menu\Category;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Outlet;
use App\Models\Payment;
use App\Models\Permission;
use App\Models\PurchaseOrder;
use App\Models\Role;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Models\Table;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Reduces database to 5 records per table with full FK integrity.
 *
 * Strategy: walk the dependency graph outward from menu_items.
 * For each table encountered, keep at most 5 records.
 * Since we traverse via relationships, FK integrity is automatic.
 */
class DataCleanupCommand
{
    private const MAX = 5;

    /** @var array<string, Collection> */
    private array $kept = [];

    public function run(): void
    {
        DB::beginTransaction();

        try {
            $this->cleanup();
            DB::commit();
            $this->report();
        } catch (\Throwable $e) {
            DB::rollBack();
            throw $e;
        }
    }

    private function cleanup(): void
    {
        // Phase 1: Root tables (no parent FK dependency) — keep 5 most recent
        $this->keep(Role::query()->orderByDesc('created_at')->take(self::MAX)->get());
        $this->keep(Permission::query()->orderByDesc('created_at')->take(self::MAX)->get());
        $this->keep(Outlet::query()->orderByDesc('created_at')->take(self::MAX)->get());
        $this->keep(Discount::query()->orderByDesc('created_at')->take(self::MAX)->get());
        $this->keep(Category::query()->orderByDesc('created_at')->take(self::MAX)->get());
        $this->keep(User::query()->orderByDesc('created_at')->take(self::MAX)->get());
        $this->keep(Customer::query()->orderByDesc('created_at')->take(self::MAX)->get());
        $this->keep(Supplier::query()->orderByDesc('created_at')->take(self::MAX)->get());

        // Phase 2: Tables that depend on roots — keep children of kept parents
        $this->keep(MenuItem::query()->whereIn('category_id', $this->ids(Category::class))
            ->orderByDesc('created_at')->take(self::MAX)->get());

        $this->keep(Table::query()->orderByDesc('created_at')->take(self::MAX)->get());

        $this->keep(\App\Models\StaffProfile::query()->whereIn('user_id', $this->ids(User::class))
            ->orderByDesc('created_at')->take(self::MAX)->get());

        // Staff shifts (only 3 exist — keep all)
        $this->keep(\App\Models\StaffShift::query()->take(self::MAX)->get());

        // Ingredients: keep 5 whose supplier (if any) is kept
        $this->keep(Ingredient::query()->where(function ($q) {
            $q->whereNull('supplier_id')
              ->orWhereIn('supplier_id', $this->ids(Supplier::class));
        })->orderByDesc('created_at')->take(self::MAX)->get());

        // Purchase orders: keep 5 for kept suppliers
        $this->keep(PurchaseOrder::query()->whereIn('supplier_id', $this->ids(Supplier::class))
            ->orderByDesc('created_at')->take(self::MAX)->get());

        // Purchase order items: keep all that reference kept POs and ingredients
        // then limit to 5
        $poItems = \App\Models\PurchaseOrderItem::query()
            ->whereIn('purchase_order_id', $this->ids(PurchaseOrder::class))
            ->whereIn('ingredient_id', $this->ids(Ingredient::class))
            ->orderByDesc('created_at')->take(self::MAX)->get();
        $this->keep($poItems);

        // Phase 3: Recipe-related
        $this->keep(Recipe::query()->whereIn('menu_item_id', $this->ids(MenuItem::class))
            ->orderByDesc('created_at')->take(self::MAX)->get());

        // Recipe ingredients: keep up to 5 that reference kept recipes AND kept ingredients
        $recipeIngredients = \App\Models\RecipeIngredient::query()
            ->whereIn('recipe_id', $this->ids(Recipe::class))
            ->whereIn('ingredient_id', $this->ids(Ingredient::class))
            ->take(self::MAX)->get();
        $this->keep($recipeIngredients);

        // Phase 4: Orders — keep 5 whose customer/table refs are valid
        $this->keep(Order::query()->where(function ($q) {
            $q->whereNull('customer_id')
              ->orWhereIn('customer_id', $this->ids(Customer::class));
        })->where(function ($q) {
            $q->whereNull('table_id')
              ->orWhereIn('table_id', $this->ids(Table::class));
        })->orderByDesc('created_at')->take(self::MAX)->get());

        // Order items: keep up to 5 for kept orders AND kept menu_items
        $this->keep(OrderItem::query()->whereIn('order_id', $this->ids(Order::class))
            ->whereIn('menu_item_id', $this->ids(MenuItem::class))
            ->orderByDesc('created_at')->take(self::MAX)->get());

        // Invoices: keep for kept orders
        $this->keep(\App\Models\Invoice::query()->whereIn('order_id', $this->ids(Order::class))
            ->orderByDesc('created_at')->take(self::MAX)->get());

        // Payments: keep for kept invoices
        $this->keep(Payment::query()->whereIn('invoice_id', $this->ids(\App\Models\Invoice::class))
            ->orderByDesc('created_at')->take(self::MAX)->get());

        // KOT tickets: keep for kept orders
        $this->keep(\App\Models\KitchenTicket::query()->whereIn('order_id', $this->ids(Order::class))
            ->orderByDesc('created_at')->take(self::MAX)->get());

        // KOT ticket items: keep for kept tickets and order items
        $this->keep(\App\Models\KitchenTicketItem::query()
            ->whereIn('kot_ticket_id', $this->ids(\App\Models\KitchenTicket::class))
            ->whereIn('order_item_id', $this->ids(OrderItem::class))
            ->orderByDesc('created_at')->take(self::MAX)->get());

        // Order status history: keep for kept orders
        $this->keep(\App\Models\OrderStatusHistory::query()
            ->whereIn('order_id', $this->ids(Order::class))
            ->orderByDesc('created_at')->take(self::MAX)->get());

        // Reservations: keep for kept customers/tables
        $this->keep(\App\Models\Reservation::query()->where(function ($q) {
            $q->whereNull('customer_id')
              ->orWhereIn('customer_id', $this->ids(Customer::class));
        })->where(function ($q) {
            $q->whereNull('table_id')
              ->orWhereIn('table_id', $this->ids(Table::class));
        })->orderByDesc('created_at')->take(self::MAX)->get());

        // Stock movements: keep for kept ingredients
        $this->keep(StockMovement::query()->whereIn('ingredient_id', $this->ids(Ingredient::class))
            ->orderByDesc('created_at')->take(self::MAX)->get());

        // Wastage
        $this->keep(\App\Models\Wastage::query()->whereIn('ingredient_id', $this->ids(Ingredient::class))
            ->orderByDesc('created_at')->take(self::MAX)->get());

        // Staff-related
        $this->keep(\App\Models\ShiftSchedule::query()
            ->whereIn('staff_id', $this->ids(\App\Models\StaffProfile::class))
            ->whereIn('shift_id', $this->ids(\App\Models\StaffShift::class))
            ->orderByDesc('created_at')->take(self::MAX)->get());

        $this->keep(\App\Models\Attendance::query()
            ->whereIn('staff_id', $this->ids(\App\Models\StaffProfile::class))
            ->orderByDesc('created_at')->take(self::MAX)->get());

        $this->keep(\App\Models\StaffPerformance::query()
            ->whereIn('staff_id', $this->ids(\App\Models\StaffProfile::class))
            ->orderByDesc('created_at')->take(self::MAX)->get());

        $this->keep(\App\Models\StaffCommission::query()
            ->whereIn('staff_id', $this->ids(\App\Models\StaffProfile::class))
            ->whereIn('order_id', $this->ids(Order::class))
            ->orderByDesc('created_at')->take(self::MAX)->get());

        // Audit logs
        $this->keep(\App\Models\AuditLog::query()->orderByDesc('created_at')->take(self::MAX)->get());

        // Cash register sessions
        $this->keep(\App\Models\CashRegisterSession::query()
            ->whereIn('user_id', $this->ids(User::class))
            ->orderByDesc('created_at')->take(self::MAX)->get());

        // Menu modifiers / combos (seeder typically doesn't create these — keep 5 if exist)
        $this->keep(\App\Models\MenuModifier::query()->orderByDesc('created_at')->take(self::MAX)->get());
        $this->keep(\App\Models\MenuCombo::query()->orderByDesc('created_at')->take(self::MAX)->get());

        // Junction tables
        $this->keep(\App\Models\RoleHasPermission::query()
            ->whereIn('role_id', $this->ids(Role::class))
            ->whereIn('permission_id', $this->ids(Permission::class))
            ->take(self::MAX)->get());

        $this->keep(\App\Models\ModelHasRole::query()
            ->whereIn('role_id', $this->ids(Role::class))
            ->take(self::MAX)->get());

        // ============================================================================
        // DELETE: Remove everything not in the kept sets
        // Order: children first, parents last
        // ============================================================================

        DB::statement('SET session_replication_role = replica');

        $deletes = [
            \App\Models\Refund::class,
            \App\Models\MenuComboItem::class,
            \App\Models\MenuItemModifier::class,
            \App\Models\OrderItemModifier::class,
            \App\Models\KitchenTicketItem::class,
            \App\Models\KitchenTicket::class,
            \App\Models\OrderStatusHistory::class,
            \App\Models\StaffCommission::class,
            \App\Models\StaffPerformance::class,
            \App\Models\Attendance::class,
            \App\Models\ShiftSchedule::class,
            \App\Models\CashRegisterSession::class,
            \App\Models\AuditLog::class,
            \App\Models\Payment::class,
            \App\Models\Invoice::class,
            \App\Models\Reservation::class,
            \App\Models\OrderItem::class,
            \App\Models\Order::class,
            \App\Models\Washtage::class,
            \App\Models\StockMovement::class,
            \App\Models\PurchaseOrderItem::class,
            \App\Models\PurchaseOrder::class,
            \App\Models\RecipeIngredient::class,
            \App\Models\Recipe::class,
            \App\Models\MenuItem::class,
            \App\Models\MenuModifier::class,
            \App\Models\MenuCombo::class,
            \App\Models\Ingredient::class,
            \App\Models\StaffProfile::class,
            \App\Models\Table::class,
            \App\Models\Supplier::class,
            \App\Models\Customer::class,
            \App\Models\Category::class,
            \App\Models\User::class,
            \App\Models\Discount::class,
            \App\Models\Outlet::class,
            \App\Models\StaffShift::class,
            \App\Models\Role::class,
            \App\Models\Permission::class,
            \App\Models\RoleHasPermission::class,
            \App\Models\ModelHasRole::class,
            \App\Models\WaitList::class,
            \App\Models\GiftCard::class,
        ];

        foreach ($deletes as $modelClass) {
            $table = (new $modelClass)->getTable();
            $kept = $this->kept[$table] ?? collect();
            $keptIds = $kept->pluck('id');

            if ($keptIds->isEmpty()) {
                DB::table($table)->delete();
            } else {
                DB::table($table)->whereNotIn('id', $keptIds)->delete();
            }
        }

        DB::statement('SET session_replication_role = origin');

        // Orphan cleanup
        $this->deleteOrphans();
    }

    private function ids(string $modelClass): array
    {
        $table = (new $modelClass)->getTable();
        return $this->kept[$table]?->pluck('id')->toArray() ?? [];
    }

    private function keep(Collection $records): void
    {
        if ($records->isEmpty()) {
            return;
        }
        $table = $records->first()->getTable();
        if (!isset($this->kept[$table])) {
            $this->kept[$table] = collect();
        }
        $this->kept[$table] = $this->kept[$table]->merge($records)->unique('id');
    }

    private function deleteOrphans(): void
    {
        $checks = [
            ['order_items', 'order_id', 'orders'],
            ['order_items', 'menu_item_id', 'menu_items'],
            ['recipes', 'menu_item_id', 'menu_items'],
            ['recipe_ingredients', 'recipe_id', 'recipes'],
            ['recipe_ingredients', 'ingredient_id', 'ingredients'],
            ['invoices', 'order_id', 'orders'],
            ['payments', 'invoice_id', 'invoices'],
            ['refunds', 'payment_id', 'payments'],
            ['kot_tickets', 'order_id', 'orders'],
            ['kot_ticket_items', 'kot_ticket_id', 'kot_tickets'],
            ['kot_ticket_items', 'order_item_id', 'order_items'],
            ['order_status_history', 'order_id', 'orders'],
            ['order_item_modifiers', 'order_item_id', 'order_items'],
            ['stock_movements', 'ingredient_id', 'ingredients'],
            ['wastage', 'ingredient_id', 'ingredients'],
            ['purchase_order_items', 'purchase_order_id', 'purchase_orders'],
            ['purchase_order_items', 'ingredient_id', 'ingredients'],
            ['purchase_orders', 'supplier_id', 'suppliers'],
            ['menu_items', 'category_id', 'menu_categories'],
            ['staff_profiles', 'user_id', 'users'],
            ['shift_schedules', 'staff_id', 'staff_profiles'],
            ['shift_schedules', 'shift_id', 'staff_shifts'],
            ['attendance', 'staff_id', 'staff_profiles'],
            ['staff_performance', 'staff_id', 'staff_profiles'],
            ['staff_commissions', 'staff_id', 'staff_profiles'],
            ['staff_commissions', 'order_id', 'orders'],
            ['role_has_permissions', 'role_id', 'roles'],
            ['role_has_permissions', 'permission_id', 'permissions'],
            ['model_has_roles', 'role_id', 'roles'],
        ];

        foreach ($checks as [$child, $fk, $parent]) {
            DB::statement("
                DELETE FROM {$child} c
                WHERE NOT EXISTS (SELECT 1 FROM {$parent} p WHERE p.id = c.{$fk})
            ");
        }

        // Nullable FKs
        DB::statement("
            DELETE FROM orders o
            WHERE (o.customer_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM customers c WHERE c.id = o.customer_id))
               OR (o.table_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tables t WHERE t.id = o.table_id))
        ");
        DB::statement("
            DELETE FROM reservations r
            WHERE (r.customer_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM customers c WHERE c.id = r.customer_id))
               OR (r.table_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tables t WHERE t.id = r.table_id))
        ");
        DB::statement("
            DELETE FROM ingredients i
            WHERE i.supplier_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM suppliers s WHERE s.id = i.supplier_id)
        ");
    }

    private function report(): void
    {
        $tables = [
            'users', 'customers', 'menu_categories', 'menu_items',
            'ingredients', 'recipes', 'recipe_ingredients', 'suppliers',
            'purchase_orders', 'purchase_order_items', 'stock_movements',
            'tables', 'reservations', 'orders', 'order_items',
            'payments', 'discounts', 'kot_tickets', 'staff_shifts',
            'attendance', 'audit_logs', 'outlets', 'floor_plans',
            'refunds', 'invoices', 'order_status_history',
            'staff_profiles', 'shift_schedules',
        ];

        echo "=== REMAINING RECORDS ===\n";
        foreach ($tables as $table) {
            $count = DB::table($table)->count();
            echo str_pad($table, 30) . $count . "\n";
        }
    }
}
