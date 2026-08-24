<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Analytics;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Services\Forecasting\InsufficientHistoryException;
use App\Services\Forecasting\TimechoForecastService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Demand forecasting endpoint.
 *
 * Laravel aggregates real completed-order history into restaurant-local
 * daily buckets, TimechoAI forecasts future demand (one call per horizon),
 * and Laravel performs all recipe/stock arithmetic for the inventory
 * projection. Forecasts are cached for several hours so the limited trial
 * quota is shared across Dashboard, Reports, Analytics, Gemini input and
 * inventory projection.
 */
class DemandForecastController extends Controller
{
    /** Cache lifetime for provider forecasts (quota-aware). */
    private const CACHE_TTL_MINUTES = 360; // 6 hours

    public function __construct(protected TimechoForecastService $timecho)
    {
    }

    public function forecast(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'horizon' => 'nullable|integer|in:7,14,30',
            'scope' => 'nullable|string|in:sales,ingredients',
        ]);

        $horizon = (int) ($validated['horizon'] ?? 7);
        $scope = $validated['scope'] ?? 'sales';

        if (! $this->timecho->configured()) {
            return $this->unavailable('Forecast service is not configured.');
        }

        // One cached forecast per metric/horizon/day — shared by every page.
        $cacheKey = "timecho_forecast:{$scope}:{$horizon}:".now()->toDateString();
        $cached = Cache::get($cacheKey);
        if (is_array($cached)) {
            // Mark as served from cache (explicit set — array union would
            // keep the stored false).
            $cached['cached'] = true;

            return $this->success($cached);
        }

        // Up to 90 days of history; at least 14 daily points are required
        // before any provider quota is spent.
        $historyStart = now()->subDays(89)->startOfDay();
        $historyEnd = now()->endOfDay();

        try {
            $payload = $scope === 'ingredients'
                ? $this->ingredientForecast($historyStart, $historyEnd, $horizon)
                : $this->salesForecast($historyStart, $historyEnd, $horizon);
        } catch (InsufficientHistoryException) {
            return $this->success([
                'available' => false,
                'reason' => 'insufficient_history',
                'message' => 'Not enough historical activity yet. Forecasts need at least 14 days of orders.',
                'forecast' => [],
            ]);
        } catch (\Throwable $e) {
            report($e);

            return $this->unavailable('Forecast temporarily unavailable.');
        }

        $payload += [
            'available' => true,
            'provider' => 'timecho',
            'model' => $this->timecho->model(),
            'cached' => false,
            'generated_at' => now()->toISOString(),
        ];

        Cache::put($cacheKey, $payload, now()->addMinutes(self::CACHE_TTL_MINUTES));

        return $this->success($payload);
    }

    private function unavailable(string $message): JsonResponse
    {
        return $this->success([
            'available' => false,
            'reason' => 'provider_unavailable',
            'message' => $message,
            'forecast' => [],
        ], $message);
    }

    /** Restaurant-local timezone for daily boundaries. */
    private function restaurantTz(): string
    {
        return (string) config('app.restaurant_timezone', config('app.timezone', 'UTC'));
    }

    /**
     * Overall restaurant demand: daily order counts bucketed in
     * restaurant-local days.
     */
    private function salesForecast(Carbon $start, Carbon $end, int $horizon): array
    {
        $tz = $this->restaurantTz();

        $rows = Order::where('status', 'completed')
            ->whereBetween('created_at', [$start, $end])
            ->get(['id', 'total', 'created_at']);

        if ($rows->isEmpty()) {
            throw new InsufficientHistoryException();
        }

        // Dense daily series in restaurant-local time.
        $byDay = [];
        foreach ($rows as $o) {
            $day = Carbon::parse($o->created_at)->timezone($tz)->toDateString();
            $byDay[$day]['orders'] = ($byDay[$day]['orders'] ?? 0) + 1;
            $byDay[$day]['revenue'] = ($byDay[$day]['revenue'] ?? 0) + (float) $o->total;
        }

        $firstDay = min(array_keys($byDay));
        $cursor = Carbon::parse($firstDay);
        $todayStr = Carbon::today($tz)->toDateString();

        $orderSeries = [];
        $revenueSeries = [];
        while ($cursor->toDateString() <= $todayStr) {
            $key = $cursor->toDateString();
            $orderSeries[] = (float) ($byDay[$key]['orders'] ?? 0);
            $revenueSeries[] = (float) ($byDay[$key]['revenue'] ?? 0);
            $cursor->addDay();
        }

        if (count(array_filter($orderSeries)) < 14) {
            throw new InsufficientHistoryException();
        }

        // ONE provider call per horizon — revenue is derived from historical
        // average order value instead of a second forecast call.
        $points = $this->timecho->forecastDailySeries(
            $orderSeries,
            $firstDay,
            $horizon,
            'daily_orders',
        );

        $activeDays = max(1, count(array_filter($orderSeries)));
        $avgOrderValue = array_sum($revenueSeries) / $activeDays;

        $days = array_map(fn ($p) => [
            'date' => $p['date'],
            'predicted_orders' => $p['predicted'],
            'lower_orders' => null,
            'upper_orders' => null,
            'predicted_revenue' => round($p['predicted'] * $avgOrderValue, 2),
        ], $points);

        $direction = end($days)['predicted_orders'] >= $orderSeries[count($orderSeries) - 1]
            ? 'up'
            : 'down';
        $highest = collect($days)->sortByDesc('predicted_orders')->first();

        return [
            'metric' => 'sales',
            'horizon' => $horizon,
            'forecast_direction' => $direction,
            'highest_day' => $highest ? [
                'date' => $highest['date'],
                'predicted_orders' => $highest['predicted_orders'],
            ] : null,
            'historical_summary' => [
                'days_of_history' => count($orderSeries),
                'avg_daily_orders' => round(array_sum($orderSeries) / count($orderSeries), 1),
                'total_revenue' => round(array_sum($revenueSeries), 2),
            ],
            'forecast' => $days,
        ];
    }

    /**
     * Inventory projection: TimechoAI forecasts per-item daily demand, then
     * Laravel converts demand through recipe requirements into ingredient
     * needs and compares with current stock.
     */
    private function ingredientForecast(Carbon $start, Carbon $end, int $horizon): array
    {
        $tz = $this->restaurantTz();

        // Top items by recent quantity sold (last 30 days).
        $recentStart = now()->subDays(29)->startOfDay()->toDateTimeString();

        $itemRows = OrderItem::query()
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->leftJoin('menu_items', 'menu_items.id', '=', 'order_items.menu_item_id')
            ->where('orders.status', 'completed')
            ->whereBetween('orders.created_at', [$recentStart, $end])
            ->selectRaw("COALESCE(order_items.name, menu_items.name, 'Unknown') as item_name, SUM(order_items.quantity) as qty_30d")
            ->groupBy('item_name')
            ->orderByDesc('qty_30d')
            ->limit(10)
            ->get();

        if ($itemRows->isEmpty()) {
            throw new InsufficientHistoryException();
        }

        // Per-item daily quantities bucketed in restaurant-local time —
        // raw rows fetched once and aggregated in PHP.
        $rawRows = OrderItem::query()
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->leftJoin('menu_items', 'menu_items.id', '=', 'order_items.menu_item_id')
            ->where('orders.status', 'completed')
            ->whereBetween('orders.created_at', [$start, $end])
            ->get([
                'order_items.quantity',
                DB::raw("COALESCE(order_items.name, menu_items.name, 'Unknown') as item_name"),
                'orders.created_at',
            ]);

        $perItemByDay = [];
        foreach ($rawRows as $row) {
            $day = Carbon::parse($row->created_at)->timezone($tz)->toDateString();
            $perItemByDay[$row->item_name][$day] = ($perItemByDay[$row->item_name][$day] ?? 0) + (int) $row->quantity;
        }

        $projections = [];
        foreach ($itemRows as $item) {
            $name = $item->item_name;
            $byDay = $perItemByDay[$name] ?? [];
            if (count($byDay) < 7) {
                continue; // too sparse for an individual series
            }

            $firstDay = min(array_keys($byDay));
            $cursor = Carbon::parse($firstDay);
            $todayStr = Carbon::today($tz)->toDateString();
            $series = [];
            while ($cursor->toDateString() <= $todayStr) {
                $series[] = (float) ($byDay[$cursor->toDateString()] ?? 0);
                $cursor->addDay();
            }

            if (count(array_filter($series)) < 7) {
                continue;
            }

            try {
                $points = $this->timecho->forecastDailySeries(
                    $series,
                    $firstDay,
                    7, // per-item series stay short to conserve quota
                    'item_quantity',
                );
            } catch (\Throwable) {
                continue; // skip this item; others may still forecast
            }

            $projectedQty = array_sum(array_column($points, 'predicted'));

            // Recipe requirement arithmetic (Laravel-authoritative).
            $requirements = DB::table('recipes')
                ->join('recipe_ingredients', 'recipe_ingredients.recipe_id', '=', 'recipes.id')
                ->join('ingredients', 'ingredients.id', '=', 'recipe_ingredients.ingredient_id')
                ->whereIn('recipes.menu_item_id', function ($q) use ($name) {
                    $q->select('id')->from('menu_items')->where('name', $name)->limit(1);
                })
                ->select(
                    'ingredients.id as ingredient_id',
                    'ingredients.name as ingredient_name',
                    'ingredients.unit as stock_unit',
                    'ingredients.current_stock',
                    'recipe_ingredients.quantity as per_yield_qty',
                    'recipes.yield_quantity',
                )
                ->get();

            foreach ($requirements as $req) {
                $yield = (float) ($req->yield_quantity ?: 1);
                $batchesNeeded = $projectedQty / max(0.01, $yield);
                $required = (float) $req->per_yield_qty * $batchesNeeded;
                $currentStock = (float) ($req->current_stock ?? 0);

                $existing = $projections[$req->ingredient_id] ?? [
                    'ingredient_id' => $req->ingredient_id,
                    'name' => $req->ingredient_name,
                    'unit' => $req->stock_unit,
                    // Authoritative current stock from the database.
                    'current_stock' => (float) ($req->current_stock ?? 0),
                    'projected_requirement' => 0.0,
                ];

                $existing['projected_requirement'] += $required;
                $projections[$req->ingredient_id] = $existing;
            }
        }

        $items = collect($projections)
            ->map(function ($p) {
                $p['current_stock'] = round((float) $p['current_stock'], 2);
                $p['projected_requirement'] = round((float) $p['projected_requirement'], 2);
                $p['projected_shortage'] = round(max(0.0, $p['projected_requirement'] - $p['current_stock']), 2);
                $ratio = $p['projected_requirement'] > 0
                    ? $p['current_stock'] / $p['projected_requirement']
                    : 1;
                $p['status'] = match (true) {
                    $p['current_stock'] <= 0 => 'Out of Stock',
                    $ratio < 0.5 => 'Restock Urgent',
                    $ratio < 1 => 'Restock Recommended',
                    default => 'Sufficient',
                };

                return $p;
            })
            ->sortByDesc('projected_shortage')
            ->values()
            ->take(15)
            ->toArray();

        return [
            'metric' => 'ingredients',
            'horizon' => $horizon,
            'items_considered' => $itemRows->count(),
            'projected_requirements' => $items,
        ];
    }
}
