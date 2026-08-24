<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Ingredient;
use App\Models\Recipe;
use Illuminate\Support\Collection;

class LowStockProjectionService
{
    public function __construct(protected ForecastDemandService $forecastDemand) {}

    /**
     * Compute forecast-driven stockout projections for every active ingredient.
     *
     * @return array<int, array<string, mixed>>
     */
    public function project(int $horizon = 7): array
    {
        $ingredients = Ingredient::where('is_active', true)->get();

        $recipes = Recipe::query()
            ->with(['menuItem' => fn ($query) => $query->withTrashed(), 'ingredients'])
            ->whereHas('ingredients')
            ->get();

        $menuItemIds = $recipes->pluck('menu_item_id')->unique()->values();
        $demand = $this->forecastDemand->dailyDemand($menuItemIds, $horizon);

        [$usage, $contributors] = $this->accumulateUsage($recipes, $demand);

        $items = [];
        foreach ($ingredients as $ingredient) {
            $stock = (float) $ingredient->current_stock;
            $minimum = (float) $ingredient->minimum_stock;
            $dailyUsage = (float) ($usage[$ingredient->id] ?? 0.0);

            $daysUntilStockout = null;
            if ($dailyUsage > 0) {
                $daysUntilStockout = (int) floor(($stock - $minimum) / $dailyUsage);
            }

            $items[] = [
                'id' => $ingredient->id,
                'name' => $ingredient->name,
                'category' => $ingredient->category,
                'unit' => $ingredient->unit,
                'current_stock' => $stock,
                'minimum_stock' => $minimum,
                'forecast_daily_usage' => round($dailyUsage, 3),
                'days_until_stockout' => $daysUntilStockout,
                'severity' => $this->severity($stock, $daysUntilStockout),
                'contributors' => array_slice($contributors[$ingredient->id] ?? [], 0, 3),
            ];
        }

        return $this->sortBySeverity($items);
    }

    /**
     * @param  Collection<int, Recipe>  $recipes
     * @param  array<string, array{forecast: float, historical: float}>  $demand
     * @return array{0: array<string, float>, 1: array<string, array<int, array<string, mixed>>>}
     */
    protected function accumulateUsage(Collection $recipes, array $demand): array
    {
        $usage = [];
        $contributors = [];

        foreach ($recipes as $recipe) {
            $yield = max((float) $recipe->yield_quantity, 0.0001);
            $dailyDemand = (float) ($demand[$recipe->menu_item_id]['forecast'] ?? 0.0);

            foreach ($recipe->ingredients as $ingredient) {
                $qtyPerYield = (float) $ingredient->pivot->quantity;
                $add = ($dailyDemand / $yield) * $qtyPerYield;

                $usage[$ingredient->id] = ($usage[$ingredient->id] ?? 0.0) + $add;
                $contributors[$ingredient->id][] = [
                    'menu_item_id' => $recipe->menu_item_id,
                    'name' => $recipe->menuItem?->name ?? 'Unknown',
                    'forecast_daily_demand' => round($dailyDemand, 2),
                ];
            }
        }

        return [$usage, $contributors];
    }

    protected function severity(float $stock, ?int $daysUntilStockout): string
    {
        if ($stock <= 0) {
            return 'out_of_stock';
        }

        if ($daysUntilStockout === null) {
            return 'low';
        }

        return match (true) {
            $daysUntilStockout <= 0 => 'critical',
            $daysUntilStockout <= 3 => 'high',
            $daysUntilStockout <= 7 => 'medium',
            default => 'low',
        };
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     * @return array<int, array<string, mixed>>
     */
    protected function sortBySeverity(array $items): array
    {
        $rank = [
            'out_of_stock' => 0,
            'critical' => 1,
            'high' => 2,
            'medium' => 3,
            'low' => 4,
        ];

        usort($items, function (array $a, array $b) use ($rank): int {
            $ra = $rank[$a['severity']] ?? 5;
            $rb = $rank[$b['severity']] ?? 5;
            if ($ra !== $rb) {
                return $ra <=> $rb;
            }

            $da = $a['days_until_stockout'] ?? PHP_INT_MAX;
            $db = $b['days_until_stockout'] ?? PHP_INT_MAX;

            return $da <=> $db;
        });

        return $items;
    }
}
