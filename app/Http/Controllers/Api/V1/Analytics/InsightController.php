<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Analytics;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Wastage;
use App\Services\GeminiInsightService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/**
 * AI Insights endpoint.
 *
 * Laravel computes ALL authoritative figures from the database, sends only
 * aggregated non-sensitive metrics to Gemini, and validates the structured
 * response. If Gemini is unconfigured/unreachable/malformed, the endpoint
 * degrades gracefully and core reporting is unaffected.
 */
class InsightController extends Controller
{
    public function __construct(protected GeminiInsightService $gemini)
    {
    }

    public function insights(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
        ]);

        $start = Carbon::parse($validated['start_date'])->startOfDay();
        $end = Carbon::parse($validated['end_date'])->endOfDay();

        if (! $this->gemini->configured()) {
            return $this->unavailable('AI insights are not configured.');
        }

        // Cache identical requests for 5 minutes to avoid repeat Gemini calls.
        $cacheKey = sprintf(
            'ai-insights:%s:%s',
            $start->toDateString(),
            $end->toDateString()
        );

        $cached = Cache::get($cacheKey);
        if (is_array($cached)) {
            return $this->success($cached + ['cached' => true]);
        }

        try {
            $metrics = $this->buildMetrics($start, $end);
            $insights = $this->gemini->generateInsights($metrics);
        } catch (\Throwable $e) {
            report($e);

            return $this->unavailable('AI insights temporarily unavailable.');
        }

        $payload = $insights + [
            'available' => true,
            'generated_at' => now()->toISOString(),
            'cached' => false,
        ];

        Cache::put($cacheKey, $payload, now()->addMinutes(5));

        return $this->success($payload);
    }

    private function unavailable(string $message): JsonResponse
    {
        return $this->success([
            'available' => false,
            'message' => $message,
            'summary' => '',
            'sales_insights' => [],
            'inventory_insights' => [],
            'risks' => [],
            'recommendations' => [],
            'confidence' => 'low',
        ], $message);
    }

    /**
     * Aggregated, non-sensitive operational metrics. No customer contact
     * details, no employee personal data, no credentials — only anonymous
     * operational aggregates.
     */
    private function buildMetrics(Carbon $start, Carbon $end): array
    {
        $orders = Order::where('status', 'completed')
            ->whereBetween('created_at', [$start, $end])
            ->get(['id', 'total', 'created_at']);

        $dailySales = $orders
            ->groupBy(fn ($o) => Carbon::parse($o->created_at)->toDateString())
            ->map(fn ($day) => [
                'date' => $day->first()->created_at->toDateString(),
                'revenue' => round((float) $day->sum('total'), 2),
                'orders' => $day->count(),
            ])
            ->sortBy('date')
            ->values()
            ->toArray();

        $totalRevenue = round((float) $orders->sum('total'), 2);
        $totalOrders = $orders->count();
        $prevStart = $start->copy();
        $lengthDays = (int) floor($start->startOfDay()->diffInDays($end->copy()->startOfDay())) + 1;
        $prevEnd = $start->copy()->subDay()->endOfDay();
        $prevStartDate = $prevEnd->copy()->subDays($lengthDays - 1)->startOfDay();

        $previousPeriodRevenue = round((float) Order::where('status', 'completed')
            ->whereBetween('created_at', [$prevStartDate, $prevEnd])
            ->sum('total'), 2);

        $topItems = OrderItem::query()
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->where('orders.status', 'completed')
            ->whereBetween('orders.created_at', [$start, $end])
            ->selectRaw('order_items.name as name, SUM(order_items.quantity) as qty, SUM(order_items.total_price) as revenue')
            ->groupBy('order_items.name')
            ->orderByDesc('qty')
            ->limit(8)
            ->get()
            ->map(fn ($r) => [
                'name' => (string) $r->name,
                'quantity_sold' => (int) $r->qty,
                'revenue' => round((float) $r->revenue, 2),
            ])
            ->toArray();

        // Hour buckets in restaurant time for peak/quiet observations.
        $tz = (string) config('app.restaurant_timezone', config('app.timezone', 'UTC'));
        $hourCounts = [];
        foreach ($orders as $o) {
            $h = (int) Carbon::parse($o->created_at)->timezone($tz)->format('G');
            $hourCounts[$h] = ($hourCounts[$h] ?? 0) + 1;
        }
        arsort($hourCounts);
        $peakHours = array_map(fn ($h) => sprintf('%02d:00', $h), array_slice(array_keys($hourCounts), 0, 3, true));

        $lowStockItems = \App\Models\Ingredient::where('is_active', true)
            ->whereColumn('current_stock', '<=', 'minimum_stock')
            ->orderByRaw('current_stock / NULLIF(minimum_stock, 0)')
            ->limit(8)
            ->get(['name', 'current_stock', 'minimum_stock', 'unit'])
            ->map(fn ($i) => [
                'name' => (string) $i->name,
                'current_stock' => round((float) $i->current_stock, 2),
                'minimum_stock' => round((float) $i->minimum_stock, 2),
                'unit' => (string) $i->unit,
            ])
            ->toArray();

        $wastageSummary = Wastage::query()
            ->join('ingredients', 'ingredients.id', '=', 'wastage.ingredient_id')
            ->whereBetween('wastage.created_at', [$start, $end])
            ->selectRaw("COALESCE(wastage.reason, 'unknown') as reason, SUM(wastage.quantity) as quantity")
            ->groupBy('reason')
            ->orderByDesc('quantity')
            ->limit(5)
            ->get()
            ->map(fn ($r) => ['reason' => (string) $r->reason, 'quantity' => round((float) $r->quantity, 2)])
            ->toArray();

        return [
            'period' => ['start' => $start->toDateString(), 'end' => $end->toDateString()],
            // Currency context from Settings so Gemini labels amounts as
            // Philippine Peso instead of assuming USD.
            'currency' => (string) (\App\Models\RestaurantSetting::first()?->currency ?? 'PHP'),
            'currency_symbol' => (string) (\App\Models\RestaurantSetting::first()?->currency_symbol ?? '₱'),
            'total_revenue' => $totalRevenue,
            'total_orders' => $totalOrders,
            'average_order_value' => $totalOrders > 0 ? round($totalRevenue / $totalOrders, 2) : 0,
            'previous_period_revenue' => $previousPeriodRevenue,
            'sales_trend' => $dailySales,
            'top_items' => $topItems,
            'peak_hours' => $peakHours,
            'quietest_day' => null,
            'busiest_day' => null,
            'low_stock_items' => $lowStockItems,
            'wastage_summary' => $wastageSummary,
        ];

        // Enrich with TimechoAI forecast aggregates when available (cached only —
        // never call forecasting from inside the insight request path).
        $cachedForecast = Cache::get('timecho_forecast:sales:7:'.now()->toDateString());
        if (is_array($cachedForecast) && ($cachedForecast['available'] ?? false)) {
            $metrics['forecast_direction'] = $cachedForecast['forecast_direction'] ?? null;
            $metrics['forecast_next_7_days'] = collect($cachedForecast['forecast'] ?? [])
                ->take(7)
                ->map(fn ($d) => [
                    'date' => $d['date'],
                    'predicted_orders' => $d['predicted_orders'],
                    'lower_orders' => $d['lower_orders'],
                    'upper_orders' => $d['upper_orders'],
                ])
                ->toArray();
        }

        $cachedInventoryRisk = null;
        foreach ([7, 14, 30] as $h) {
            $candidate = Cache::get("timecho_forecast:ingredients:{$h}:".now()->toDateString());
            if (is_array($candidate) && ($candidate['available'] ?? false)) {
                $cachedInventoryRisk = $candidate;
                break;
            }
        }
        if (is_array($cachedInventoryRisk) && ($cachedInventoryRisk['available'] ?? false)) {
            $metrics['inventory_risks'] = collect($cachedInventoryRisk['projected_requirements'] ?? [])
                ->where('status', '!=', 'Sufficient')
                ->take(8)
                ->values()
                ->toArray();
        }

        return $metrics;
    }
}
