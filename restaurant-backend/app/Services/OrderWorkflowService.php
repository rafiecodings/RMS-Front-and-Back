<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\InsufficientStockException;
use App\Models\Ingredient;
use App\Models\KotTicket;
use App\Models\KotTicketItem;
use App\Models\Order;
use App\Models\Recipe;
use App\Models\RestaurantSetting;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class OrderWorkflowService
{
    public function createKotForOrder(Order $order): KotTicket
    {
        $existing = KotTicket::where('order_id', $order->id)->first();
        if ($existing) {
            return $existing->load('items');
        }

        return DB::transaction(function () use ($order) {
            return $this->createKotBody($order);
        });
    }

    private function createKotBody(Order $order): KotTicket
    {
        $kot = KotTicket::create([
            'kot_number' => generate_kot_number(),
            'order_id' => $order->id,
            'status' => 'received',
            'priority' => 'normal',
            'station' => null,
            'estimated_minutes' => null,
            'started_at' => null,
            'completed_at' => null,
        ]);

        $order->items()->get()->each(function ($item) use ($kot) {
            KotTicketItem::create([
                'kot_ticket_id' => $kot->id,
                'order_item_id' => $item->id,
                'name' => $item->name,
                'quantity' => $item->quantity,
                'notes' => $item->notes,
                'status' => 'pending',
            ]);
        });

        return $kot->load('items');
    }

    /**
     * Confirm / Send to Kitchen (manuscript-aligned).
     *
     * 1. Non-mutating availability pre-check (throws InsufficientStockException).
     * 2. Create KOT.
     * 3. NO current_stock decrement, NO outward StockMovement here.
     *
     * Actual deduction happens atomically at payment/completion.
     */
    public function confirmOrder(Order $order, User $user): array
    {
        return DB::transaction(function () use ($order, $user) {
            $checked = $this->checkAvailability($order);

            $this->createKotForOrder($order);

            return array_merge($checked, ['kot_created' => true]);
        });
    }

    /**
     * Non-mutating availability validation for confirm-time.
     * Reuses requirement calculation; respects allow_negative_inventory;
     * throws InsufficientStockException without changing stock or movements.
     */
    public function checkAvailability(Order $order): array
    {
        if (in_array($order->status, ['cancelled', 'voided'], true)) {
            return ['skipped' => true, 'reason' => 'Order is cancelled or voided.'];
        }

        $settings = RestaurantSetting::first();
        $allowNegative = (bool) ($settings?->allow_negative_inventory ?? false);

        $orderItems = $order->items()->get();
        $requirements = $this->calculateRequirements($orderItems);

        if (empty($requirements)) {
            return ['skipped' => true, 'reason' => 'No recipes found for order items.'];
        }

        $insufficient = [];

        foreach ($requirements as $ingredientId => $qty) {
            $ingredient = Ingredient::find($ingredientId);
            if (! $ingredient) {
                continue;
            }

            $currentStock = (float) $ingredient->current_stock;

            if (! $allowNegative && $currentStock < $qty) {
                $insufficient[] = [
                    'ingredient_id' => $ingredientId,
                    'name' => $ingredient->name,
                    'current_stock' => $currentStock,
                    'required' => round($qty, 3),
                ];
            }
        }

        if (! empty($insufficient) && ! $allowNegative) {
            throw new InsufficientStockException($insufficient);
        }

        return ['checked' => true, 'insufficient' => $insufficient];
    }

    public function deductInventoryForCompletedOrder(Order $order, User $user, bool $skipTransaction = false): array
    {
        if (in_array($order->status, ['cancelled', 'voided'], true)) {
            return ['skipped' => true, 'reason' => 'Order is cancelled or voided.'];
        }

        $alreadyDeducted = StockMovement::where('reference_type', 'order')
            ->where('reference_id', $order->id)
            ->where('type', 'outward')
            ->exists();

        if ($alreadyDeducted) {
            return ['already_deducted' => true];
        }

        $settings = RestaurantSetting::first();
        $allowNegative = (bool) ($settings?->allow_negative_inventory ?? false);

        $orderItems = $order->items()->get();
        $requirements = $this->calculateRequirements($orderItems);

        if (empty($requirements)) {
            return ['skipped' => true, 'reason' => 'No recipes found for order items.'];
        }

        $execute = function () use ($order, $user, $requirements, $allowNegative) {
            $movements = [];
            $insufficient = [];

            foreach ($requirements as $ingredientId => $qty) {
                $ingredient = Ingredient::lockForUpdate()->find($ingredientId);
                if (! $ingredient) {
                    continue;
                }

                $currentStock = (float) $ingredient->current_stock;

                if (! $allowNegative && $currentStock < $qty) {
                    $insufficient[] = [
                        'ingredient_id' => $ingredientId,
                        'name' => $ingredient->name,
                        'current_stock' => $currentStock,
                        'required' => round($qty, 3),
                    ];
                    continue;
                }

                $ingredient->decrement('current_stock', $qty);

                $movements[] = StockMovement::create([
                    'ingredient_id' => $ingredientId,
                    'type' => 'outward',
                    'quantity' => $qty,
                    'unit_cost' => (float) $ingredient->cost_per_unit,
                    'reference_type' => 'order',
                    'reference_id' => $order->id,
                    'notes' => "Automatic deduction for {$order->order_number}",
                    'created_by' => $user->id,
                ]);
            }

            if (! empty($insufficient) && ! $allowNegative) {
                throw new InsufficientStockException($insufficient);
            }

            return [
                'deducted' => true,
                'movements' => $movements,
                'insufficient' => $insufficient,
            ];
        };

        if ($skipTransaction) {
            return $execute();
        }

        return DB::transaction($execute);
    }

    public function reverseInventoryForCancelledOrder(Order $order, User $user): array
    {
        $deductionExists = StockMovement::where('reference_type', 'order')
            ->where('reference_id', $order->id)
            ->where('type', 'outward')
            ->exists();

        if (! $deductionExists) {
            return ['skipped' => true, 'reason' => 'No prior deduction to reverse.'];
        }

        $reversalExists = StockMovement::where('reference_type', 'order_reversal')
            ->where('reference_id', $order->id)
            ->exists();

        if ($reversalExists) {
            return ['already_reversed' => true];
        }

        $outwardMovements = StockMovement::where('reference_type', 'order')
            ->where('reference_id', $order->id)
            ->where('type', 'outward')
            ->get();

        return DB::transaction(function () use ($order, $user, $outwardMovements) {
            $reversals = [];

            foreach ($outwardMovements as $movement) {
                $ingredient = Ingredient::lockForUpdate()->find($movement->ingredient_id);
                if (! $ingredient) {
                    continue;
                }

                $qty = (float) $movement->quantity;
                $ingredient->increment('current_stock', $qty);

                $reversals[] = StockMovement::create([
                    'ingredient_id' => $movement->ingredient_id,
                    'type' => 'inward',
                    'quantity' => $qty,
                    'unit_cost' => (float) $movement->unit_cost,
                    'reference_type' => 'order_reversal',
                    'reference_id' => $order->id,
                    'notes' => "Automatic reversal for {$order->order_number}",
                    'created_by' => $user->id,
                ]);
            }

            return ['reversed' => true, 'movements' => $reversals];
        });
    }

    private function calculateRequirements($orderItems): array
    {
        $requirements = [];

        foreach ($orderItems as $item) {
            $recipe = Recipe::where('menu_item_id', $item->menu_item_id)
                ->with('ingredients')
                ->first();

            if (! $recipe) {
                continue;
            }

            $yieldQty = (float) $recipe->yield_quantity;
            if ($yieldQty <= 0) {
                $yieldQty = 1;
            }

            $multiplier = $item->quantity / $yieldQty;

            foreach ($recipe->ingredients as $ingredient) {
                $ingredientQty = (float) $ingredient->pivot->quantity;
                $needed = $ingredientQty * $multiplier;
                $requirements[$ingredient->id] = ($requirements[$ingredient->id] ?? 0) + $needed;
            }
        }

        return $requirements;
    }
}
