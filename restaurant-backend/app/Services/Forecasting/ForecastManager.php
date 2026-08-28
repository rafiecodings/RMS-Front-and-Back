<?php

declare(strict_types=1);

namespace App\Services\Forecasting;

use App\Models\Order;
use App\Models\OrderItem;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Central forecasting pipeline for RMS.
 *
 * Provider strategy:
 *   1. If TIMECHO_API_KEY is configured, TimechoAI produces the demand
 *      forecast (restaurant-level daily order counts only — no personal
 *      data ever leaves the backend).
 *   2. ANY provider failure (unconfigured, auth, quota, timeout, 5xx,
 *      malformed response) silently falls back to the local recency-weighted
 *      statistical forecast, so the Forecast UI stays available.
 *   3. Results are cached for 6 hours per metric/horizon/day and shared by
 *      Dashboard, Reports, Analytics, Inventory projection and AI insights.
 *      Because the cache expires on a rolling wall-clock basis, a busy day
 *      can cost up to ~4 provider calls per horizon (not strictly one).
 *
 * Ingredient projections NEVER call the provider: they derive from the
 * cached sales forecast using historical menu mix + recipe/yield arithmetic.
 */
class ForecastManager
{
    /** Cache lifetime for forecasts (provider-quota aware). */
    public const CACHE_TTL_MINUTES = 360;

    /** Minimum non-zero history days before any forecast is produced. */
    private const MIN_HISTORY_DAYS = 14;

    public function __construct(private readonly TimechoForecastService $timecho)
    {
    }

    /**
     * Restaurant-wide sales demand forecast payload.
     *
     * @return array{
     *     available: bool, reason?: string, message?: string,
     *     model: string, provider?: string, metric: string, horizon: int,
     *     forecast_direction?: string, highest_day?: ?array,
     *     historical_summary?: array, forecast: list<array>, cached?: bool,
     *     generated_at?: string
     * }
     */
    public function sales(int $horizon): array
    {
        $horizon = in_array($horizon, [7, 14, 30], true) ? $horizon : 7;
        $cacheKey = $this->cacheKey('sales', $horizon);

        $cached = Cache::get($cacheKey);
        if (is_array($cached)) {
            $cached['cached'] = true;

            return $cached;
        }

        [$series, $revenueSeries] = $this->dailyOrderSeries();

        if (count(array_filter($series)) < self::MIN_HISTORY_DAYS) {
            return $this->remember($cacheKey, [
                'available' => false,
                'reason' => 'insufficient_history',
                'message' => 'Not enough historical activity yet. Forecasts need at least 14 days of orders.',
                'model' => 'none',
                'metric' => 'sales',
                'horizon' => $horizon,
                'forecast' => [],
            ]);
        }

        $payload = null;

        // --- Primary provider: TimechoAI ------------------------------------
        if ($this->timecho->configured()) {
            try {
                $firstDay = now()->subDays(count($series) - 1)->startOfDay()->toDateString();
                $points = $this->timecho->forecastDailySeries(
                    $series,
                    $firstDay,
                    $horizon,
                    'daily_orders',
                );

                $payload = $this->buildSalesPayload(
                    array_map(fn ($p) => [
                        'date' => $p['date'],
                        'predicted_orders' => round((float) $p['predicted'], 2),
                        'lower_orders' => $p['lower'],
                        'upper_orders' => $p['upper'],
                    ], $points),
                    $series,
                    $revenueSeries,
                    $horizon,
                    'timecho'
                );
            } catch (InsufficientHistoryException) {
                // Pre-checked above; treat as provider-side rejection anyway.
            } catch (\Throwable $e) {
                // Auth / quota / timeout / malformed response -> local fallback.
                report($e);
            }
        }

        // --- Fallback: local statistical forecast ----------------------------
        $payload ??= $this->localSalesPayload($series, $revenueSeries, $horizon);

        return $this->remember($cacheKey, $payload);
    }

    /**
     * Ingredient requirement projection derived from the CACHED sales
     * forecast (never calls the provider itself).
     */
    public function ingredients(int $horizon): array
    {
        $horizon = in_array($horizon, [7, 14, 30], true) ? $horizon : 7;
        $cacheKey = $this->cacheKey('ingredients', $horizon);

        $cached = Cache::get($cacheKey);
        if (is_array($cached)) {
            $cached['cached'] = true;

            return $cached;
        }

        $sales = $this->sales($horizon);

        if (! ($sales['available'] ?? false)) {
            return $this->remember($cacheKey, [
                'available' => false,
                'reason' => $sales['reason'] ?? 'forecast_unavailable',
                'message' => $sales['message'] ?? 'Sales forecast unavailable.',
                'model' => 'none',
                'metric' => 'ingredients',
                'horizon' => $horizon,
                'items_considered' => 0,
                'projected_requirements' => [],
            ]);
        }

        $payload = $this->ingredientProjectionFromSales($sales, $horizon);

        return $this->remember($cacheKey, $payload);
    }

    // ------------------------------------------------------------------
    // Sales payload builders
    // ------------------------------------------------------------------

    /**
     * @param  list<float>  $series
     * @param  list<float>  $revenueSeries
     */
    private function localSalesPayload(array $series, array $revenueSeries, int $horizon): array
    {
        $window = array_slice($series, -min(14, count($series)));
        $n = count($window);

        // Linearly increasing weights: most recent day weighs most.
        $weights = range(1, $n);
        $weightSum = array_sum($weights);
        $mean = array_sum(array_map(fn ($v, $w) => $v * $w, $window, $weights)) / $weightSum;

        $variance = array_sum(array_map(fn ($v) => ($v - $mean) ** 2, $window)) / max(1, $n - 1);
        $sigma = max(1.0, sqrt($variance));

        $lastDate = Carbon::today($this->restaurantTz());
        $days = [];
        for ($i = 1; $i <= $horizon; $i++) {
            $days[] = [
                'date' => $lastDate->copy()->addDays($i)->toDateString(),
                'predicted_orders' => round($mean, 2),
                'lower_orders' => round(max(0.0, $mean - $sigma), 2),
                'upper_orders' => round($mean + $sigma, 2),
            ];
        }

        return $this->buildSalesPayload($days, $series, $revenueSeries, $horizon, 'local-weighted-average');
    }

    /**
     * @param  list<array{date:string,predicted_orders:float|int,lower_orders:mixed,upper_orders:mixed}>  $days
     * @param  list<float>  $series
     * @param  list<float>  $revenueSeries
     */
    private function buildSalesPayload(
        array $days,
        array $series,
        array $revenueSeries,
        int $horizon,
        string $model,
    ): array {
        $recentMean = array_sum(array_slice($series, -7)) / 7;
        $futureSlice = array_slice($days, 0, min(7, count($days)));
        $futureMean = array_sum(array_column($futureSlice, 'predicted_orders')) / max(1, count($futureSlice));
        $direction = $futureMean >= $recentMean ? 'up' : 'down';

        $highest = collect($days)->sortByDesc('predicted_orders')->first();
        $activeDays = max(1, count(array_filter($series)));

        return [
            'available' => true,
            'provider' => $model === 'timecho' ? 'timecho' : 'local',
            'model' => $model,
            'metric' => 'sales',
            'horizon' => $horizon,
            'forecast_direction' => $direction,
            'highest_day' => $highest ? [
                'date' => $highest['date'],
                'predicted_orders' => $highest['predicted_orders'],
            ] : null,
            'historical_summary' => [
                'days_of_history' => count($series),
                'avg_daily_orders' => round(array_sum($series) / max(1, count($series)), 1),
                'total_revenue' => round((float) array_sum($revenueSeries), 2),
            ],
            'forecast' => $days,
            'generated_at' => now()->toISOString(),
        ];
    }

    // ------------------------------------------------------------------
    // Ingredients from cached sales + historical menu mix
    // ------------------------------------------------------------------

    private function ingredientProjectionFromSales(array $sales, int $horizon): array
    {
        $tz = $this->restaurantTz();
        $recentStart = now()->subDays(29)->startOfDay()->toDateTimeString();

        // Historical menu mix: quantity sold per item over the last 30 days.
        $mixRows = OrderItem::query()
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->leftJoin('menu_items', 'menu_items.id', '=', 'order_items.menu_item_id')
            ->where('orders.status', 'completed')
            ->whereBetween('orders.created_at', [$recentStart, now()->endOfDay()])
            ->selectRaw("COALESCE(order_items.name, menu_items.name, 'Unknown') as item_name, SUM(order_items.quantity) as qty")
            ->groupBy('item_name')
            ->orderByDesc('qty')
            ->limit(10)
            ->get();

        if ($mixRows->isEmpty()) {
            return [
                'available' => false,
                'reason' => 'insufficient_history',
                'message' => 'Not enough historical activity yet.',
                'model' => $sales['model'] ?? 'none',
                'metric' => 'ingredients',
                'horizon' => $horizon,
                'items_considered' => 0,
                'projected_requirements' => [],
            ];
        }

        $totalQty30d = (float) $mixRows->sum('qty');
        $ordersCount30d = max(1, Order::where('status', 'completed')
            ->whereBetween('created_at', [$recentStart, now()->endOfDay()])
            ->count());
        $itemsPerOrder = max(1.0, $totalQty30d / $ordersCount30d);

        // Total predicted orders across the horizon (from the cached forecast).
        $predictedOrdersTotal = (float) collect($sales['forecast'])->sum('predicted_orders');

        $projections = [];

        foreach ($mixRows as $item) {
            $share = $totalQty30d > 0 ? ((float) $item->qty) / $totalQty30d : 0.0;
            $projectedQty = $share * $predictedOrdersTotal * $itemsPerOrder;

            $requirements = DB::table('recipes')
                ->join('recipe_ingredients', 'recipe_ingredients.recipe_id', '=', 'recipes.id')
                ->join('ingredients', 'ingredients.id', '=', 'recipe_ingredients.ingredient_id')
                ->whereIn('recipes.menu_item_id', function ($q) use ($item) {
                    $q->select('id')->from('menu_items')->where('name', $item->item_name)->limit(1);
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
                    'current_stock' => $currentStock,
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
            'available' => true,
            'provider' => $sales['provider'] ?? 'local',
            'model' => $sales['model'] ?? 'none',
            'derived_from_sales_forecast' => true,
            'metric' => 'ingredients',
            'horizon' => $horizon,
            'items_considered' => $mixRows->count(),
            'projected_requirements' => $items,
        ];
    }

    // ------------------------------------------------------------------
    // Shared helpers
    // ------------------------------------------------------------------

    /**
     * Dense daily series (zeros included) of completed-order counts and
     * revenue from the first recorded day up to today, in restaurant-local
     * days.
     *
     * @return array{0: list<float>, 1: list<float>}
     */
    private function dailyOrderSeries(): array
    {
        $tz = $this->restaurantTz();

        $rows = Order::where('status', 'completed')
            ->whereBetween('created_at', [now()->subDays(89)->startOfDay(), now()->endOfDay()])
            ->get(['id', 'total', 'created_at']);

        $byDay = [];
        foreach ($rows as $order) {
            $day = Carbon::parse($order->created_at)->timezone($tz)->toDateString();
            $byDay[$day]['orders'] = ($byDay[$day]['orders'] ?? 0) + 1;
            $byDay[$day]['revenue'] = ($byDay[$day]['revenue'] ?? 0) + (float) $order->total;
        }

        if ($byDay === []) {
            return [[], []];
        }

        $cursor = Carbon::parse(min(array_keys($byDay)));
        $todayStr = Carbon::today($tz)->toDateString();

        $orderSeries = [];
        $revenueSeries = [];
        while ($cursor->toDateString() <= $todayStr) {
            $key = $cursor->toDateString();
            $orderSeries[] = (float) ($byDay[$key]['orders'] ?? 0);
            $revenueSeries[] = (float) ($byDay[$key]['revenue'] ?? 0);
            $cursor->addDay();
        }

        return [$orderSeries, $revenueSeries];
    }

    private function cacheKey(string $scope, int $horizon): string
    {
        return "demand_forecast:{$scope}:{$horizon}:".now()->toDateString();
    }

    /** Store in the shared cache and return the payload unchanged. */
    private function remember(string $cacheKey, array $payload): array
    {
        Cache::put($cacheKey, $payload, now()->addMinutes(self::CACHE_TTL_MINUTES));

        return $payload;
    }

    private function restaurantTz(): string
    {
        return (string) config('app.restaurant_timezone', config('app.timezone', 'UTC'));
    }
}
