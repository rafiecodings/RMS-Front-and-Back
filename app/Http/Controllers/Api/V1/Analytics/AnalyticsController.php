<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Analytics;

use App\Concerns\HandlesDateTrunc;
use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Ingredient;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\StockMovement;
use App\Models\Wastage;
use App\Services\ForecastDemandService;
use App\Services\LowStockProjectionService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    use HandlesDateTrunc;

    /**
     * Restaurant-local timezone used for hour bucketing so "peak hour 18:00"
     * means restaurant time. Hour aggregation happens in PHP, which keeps
     * every driver (SQLite dev / PostgreSQL prod) consistent and portable.
     */
    protected function restaurantTz(): string
    {
        return (string) config('app.restaurant_timezone', config('app.timezone', 'UTC'));
    }

    /**
     * The equivalent preceding window of equal length with full-day
     * boundaries: Aug 15–Aug 21 -> Aug 8–Aug 14 (NOT "previous day").
     */
    protected function previousPeriod(Carbon $start, Carbon $end): array
    {
        $lengthDays = (int) floor($start->copy()->startOfDay()->diffInDays($end->copy()->startOfDay())) + 1;

        $prevEnd = $start->copy()->subDay()->endOfDay();
        $prevStart = $prevEnd->copy()->subDays($lengthDays - 1)->startOfDay();

        return [$prevStart, $prevEnd];
    }

    /**
     * Hour-of-day aggregation performed in PHP with the restaurant timezone.
     * Returns only hours that have activity, sorted busiest-first.
     */
    protected function aggregateOrdersByHour(iterable $orders): array
    {
        $tz = $this->restaurantTz();
        $buckets = [];
        foreach ($orders as $o) {
            $hour = (int) Carbon::parse($o->created_at)->timezone($tz)->format('G');
            $buckets[$hour]['revenue'] = ($buckets[$hour]['revenue'] ?? 0) + (float) $o->total;
            $buckets[$hour]['orders'] = ($buckets[$hour]['orders'] ?? 0) + 1;
        }

        return collect($buckets)
            ->map(fn ($v, $h) => [
                'hour' => (int) $h,
                'revenue' => round((float) $v['revenue'], 2),
                'orders' => (int) $v['orders'],
            ])
            ->sortByDesc('orders')
            ->values()
            ->toArray();
    }

    protected function getDateRange(Request $request): array
    {
        $period = $request->input('period', 'this_month');
        $dateRange = $request->input('date_range');

        if ($dateRange && isset($dateRange['from']) && isset($dateRange['to'])) {
            return [
                'start' => Carbon::parse($dateRange['from'])->startOfDay()->toDateTimeString(),
                'end' => Carbon::parse($dateRange['to'])->endOfDay()->toDateTimeString(),
            ];
        }

        $now = now();

        $ranges = [
            'today' => [
                'start' => $now->copy()->startOfDay()->toDateTimeString(),
                'end' => $now->copy()->endOfDay()->toDateTimeString(),
            ],
            'yesterday' => [
                'start' => $now->copy()->subDay()->startOfDay()->toDateTimeString(),
                'end' => $now->copy()->subDay()->endOfDay()->toDateTimeString(),
            ],
            'this_week' => [
                'start' => $now->copy()->startOfWeek()->toDateTimeString(),
                'end' => $now->copy()->endOfWeek()->toDateTimeString(),
            ],
            'this_month' => [
                'start' => $now->copy()->startOfMonth()->toDateTimeString(),
                'end' => $now->copy()->endOfMonth()->toDateTimeString(),
            ],
            'last_month' => [
                'start' => $now->copy()->subMonth()->startOfMonth()->toDateTimeString(),
                'end' => $now->copy()->subMonth()->endOfMonth()->toDateTimeString(),
            ],
            'this_quarter' => [
                'start' => $now->copy()->startOfQuarter()->toDateTimeString(),
                'end' => $now->copy()->endOfQuarter()->toDateTimeString(),
            ],
            'this_year' => [
                'start' => $now->copy()->startOfYear()->toDateTimeString(),
                'end' => $now->copy()->endOfYear()->toDateTimeString(),
            ],
        ];

        return $ranges[$period] ?? $ranges['this_month'];
    }

    public function revenue(Request $request): JsonResponse
    {
        $range = $this->getDateRange($request);
        $start = Carbon::parse($range['start']);
        $end = Carbon::parse($range['end']);

        $ordersInRange = Order::where('status', 'completed')
            ->whereBetween('created_at', [$start, $end])
            ->get(['id', 'order_type', 'total', 'created_at']);

        $totalRevenue = (float) $ordersInRange->sum('total');
        $totalOrders = $ordersInRange->count();
        $aov = $totalOrders > 0 ? $totalRevenue / $totalOrders : 0;

        // Busiest hours first (TZ-aware, driver-independent).
        $byHour = $this->aggregateOrdersByHour($ordersInRange);

        $byType = Order::where('status', 'completed')
            ->whereBetween('created_at', [$start, $end])
            ->selectRaw('order_type, SUM(total) as revenue, COUNT(*) as orders')
            ->groupBy('order_type')
            ->get()
            ->map(fn ($row) => [
                'type' => $row->order_type,
                'revenue' => (float) $row->revenue,
                'orders' => (int) $row->orders,
            ]);

        $byDay = Order::where('status', 'completed')
            ->whereBetween('created_at', [$start, $end])
            ->selectRaw('DATE(created_at) as date, SUM(total) as revenue, COUNT(*) as orders')
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(fn ($row) => [
                'date' => Carbon::parse($row->date)->toDateString(),
                'revenue' => (float) $row->revenue,
                'orders' => (int) $row->orders,
            ]);

        // Equivalent preceding window with full-day boundaries.
        [$prevStart, $prevEnd] = $this->previousPeriod($start, $end);

        $prevTotal = (float) Order::where('status', 'completed')
            ->whereBetween('created_at', [$prevStart, $prevEnd])
            ->sum('total');
        $revenueGrowth = $prevTotal > 0 ? (($totalRevenue - $prevTotal) / $prevTotal) * 100 : null;

        // Align each current-period day to the same offset in the previous
        // period (Aug 15 -> Aug 8, Aug 16 -> Aug 9, ...).
        $prevByDay = Order::where('status', 'completed')
            ->whereBetween('created_at', [$prevStart, $prevEnd])
            ->selectRaw('DATE(created_at) as date, SUM(total) as revenue')
            ->groupBy('date')
            ->pluck('revenue', 'date');

        $prevStartDate = $prevStart->copy()->startOfDay();
        $trend = $byDay->values()->map(function ($item, $i) use ($prevByDay, $prevStartDate) {
            $offsetDate = $prevStartDate->copy()->addDays($i)->toDateString();
            $prevRevenue = (float) ($prevByDay[$offsetDate] ?? 0);

            return [
                'date' => $item['date'],
                'revenue' => $item['revenue'],
                'previous_period_revenue' => $prevRevenue,
            ];
        });

        return $this->success([
            'total_revenue' => $totalRevenue,
            'revenue_growth' => $revenueGrowth !== null ? round($revenueGrowth, 2) : null,
            'previous_period_revenue' => round($prevTotal, 2),
            'average_order_value' => round($aov, 2),
            'revenue_by_hour' => $byHour,
            'revenue_by_day' => $byDay,
            'revenue_by_type' => $byType,
            'revenue_trend' => $trend,
        ]);
    }

    public function sales(Request $request): JsonResponse
    {
        $range = $this->getDateRange($request);
        $start = $range['start'];
        $end = $range['end'];

        $byType = Order::where('status', 'completed')
            ->whereBetween('created_at', [$start, $end])
            ->selectRaw('order_type, SUM(total) as revenue, COUNT(*) as orders')
            ->groupBy('order_type')
            ->get();

        $totalSales = (float) $byType->sum('revenue');
        $totalOrders = (int) $byType->sum('orders');
        $averageTicket = $totalOrders > 0 ? $totalSales / $totalOrders : 0;

        [$prevStart, $prevEnd] = $this->previousPeriod($start, $end);
        $prevSales = (float) Order::where('status', 'completed')
            ->whereBetween('created_at', [$prevStart, $prevEnd])
            ->sum('total');
        $salesGrowth = $prevSales > 0 ? (($totalSales - $prevSales) / $prevSales) * 100 : null;

        // Items-per-hour: fetch joined rows once, bucket in PHP (TZ-aware).
        $tz = $this->restaurantTz();
        $itemRows = OrderItem::query()
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->where('orders.status', 'completed')
            ->whereBetween('orders.created_at', [$start, $end])
            ->get(['order_items.quantity', 'order_items.total_price', 'orders.created_at']);

        $hourBuckets = [];
        foreach ($itemRows as $row) {
            $hour = (int) Carbon::parse($row->created_at)->timezone($tz)->format('G');
            $hourBuckets[$hour]['items_sold'] = ($hourBuckets[$hour]['items_sold'] ?? 0) + (int) $row->quantity;
            $hourBuckets[$hour]['revenue'] = ($hourBuckets[$hour]['revenue'] ?? 0) + (float) $row->total_price;
        }
        $byHour = collect($hourBuckets)
            ->map(fn ($v, $h) => [
                'hour' => (int) $h,
                'items_sold' => (int) $v['items_sold'],
                'revenue' => round((float) $v['revenue'], 2),
            ])
            ->sortByDesc('items_sold')
            ->values()
            ->toArray();

        $byCategoryRows = OrderItem::whereHas('order', function ($q) use ($start, $end) {
            $q->where('status', 'completed')
                ->whereBetween('created_at', [$start, $end]);
        })
            ->join('menu_items', 'order_items.menu_item_id', '=', 'menu_items.id')
            ->join('menu_categories', 'menu_items.category_id', '=', 'menu_categories.id')
            ->selectRaw('menu_categories.name as category, SUM(order_items.quantity) as items_sold, SUM(order_items.total_price) as revenue')
            ->groupBy('menu_categories.name')
            ->orderBy('revenue', 'desc')
            ->get();

        $byCategory = $byCategoryRows->map(fn ($row) => [
            'category' => $row->category ?? 'Uncategorized',
            'items_sold' => (int) $row->items_sold,
            'revenue' => (float) $row->revenue,
            'percentage' => 0,
        ]);

        $catTotal = max((float) $byCategory->sum('revenue'), 1);
        $byCategory = $byCategory->map(function ($item) use ($catTotal) {
            $item['percentage'] = ($item['revenue'] / $catTotal) * 100;

            return $item;
        });

        $byDay = OrderItem::whereHas('order', function ($q) use ($start, $end) {
            $q->where('status', 'completed')
                ->whereBetween('created_at', [$start, $end]);
        })
            ->selectRaw('DATE(order_items.created_at) as date, SUM(order_items.quantity) as items_sold, SUM(order_items.total_price) as revenue')
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(fn ($row) => [
                'date' => Carbon::parse($row->date)->toDateString(),
                'items_sold' => (int) $row->items_sold,
                'revenue' => (float) $row->revenue,
            ]);

        $topItemsRows = OrderItem::whereHas('order', function ($q) use ($start, $end) {
            $q->where('status', 'completed')
                ->whereBetween('created_at', [$start, $end]);
        })
            ->join('menu_items', 'order_items.menu_item_id', '=', 'menu_items.id')
            ->join('menu_categories', 'menu_items.category_id', '=', 'menu_categories.id')
            ->selectRaw('menu_items.id, menu_items.name, menu_categories.name as category, SUM(order_items.quantity) as quantity_sold, SUM(order_items.total_price) as revenue, AVG(order_items.unit_price) as average_price')
            ->groupBy('menu_items.id', 'menu_items.name', 'menu_categories.name')
            ->orderBy('revenue', 'desc')
            ->limit(20)
            ->get();

        $demandService = app(ForecastDemandService::class);
        $demand = $demandService->dailyDemand($topItemsRows->pluck('id'));

        $topItems = $topItemsRows->map(function ($row) use ($demandService, $demand) {
            $item = $demand[$row->id] ?? ['forecast' => 0.0, 'historical' => 0.0];

            return [
                'id' => $row->id,
                'name' => $row->name,
                'category' => $row->category ?? 'Uncategorized',
                'quantity_sold' => (int) $row->quantity_sold,
                'revenue' => (float) $row->revenue,
                'average_price' => round((float) $row->average_price ?? 0, 2),
                'forecast_daily_demand' => round((float) $item['forecast'], 2),
                'trend' => $demandService->classifyTrend((float) $item['forecast'], (float) $item['historical']),
            ];
        });

        return $this->success([
            'total_sales' => $totalSales,
            'sales_growth' => $salesGrowth !== null ? round($salesGrowth, 2) : null,
            'total_items_sold' => (int) $itemRows->sum('quantity'),
            'average_ticket' => round($averageTicket, 2),
            'sales_by_hour' => $byHour,
            'sales_by_category' => $byCategory,
            'sales_by_day' => $byDay,
            'top_items' => $topItems,
        ]);
    }

    public function peakHours(Request $request): JsonResponse
    {
        $range = $this->getDateRange($request);
        $start = Carbon::parse($range['start']);
        $end = Carbon::parse($range['end']);

        $tz = $this->restaurantTz();

        $rows = Order::where('status', 'completed')
            ->whereBetween('created_at', [$start, $end])
            ->get(['id', 'total', 'created_at']);

        // Aggregate in PHP: "dayname|hour" => orders/revenue.
        $cellTotals = [];
        foreach ($rows as $o) {
            $local = Carbon::parse($o->created_at)->timezone($tz);
            $day = strtolower($local->format('l'));
            $hour = (int) $local->format('G');
            $key = $day.'|'.$hour;
            $cellTotals[$key]['orders'] = ($cellTotals[$key]['orders'] ?? 0) + 1;
            $cellTotals[$key]['revenue'] = ($cellTotals[$key]['revenue'] ?? 0) + (float) $o->total;
        }

        $dayMap = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

        $flat = collect($cellTotals)->map(function ($v, $key) {
            [$day, $hour] = explode('|', $key);

            return [
                'hour' => (int) $hour,
                'day_of_week' => $day,
                'orders' => (int) $v['orders'],
                'revenue' => round((float) $v['revenue'], 2),
            ];
        })->values();

        // Busiest cells first — consumers slice for "Busiest Hours".
        $peakHours = $flat->sortByDesc('orders')->values()->toArray();

        // Busiest / quietest weekday derived from actual activity totals.
        $perDayOrders = [];
        foreach ($dayMap as $d) {
            $perDayOrders[$d] = (int) $flat->where('day_of_week', $d)->sum('orders');
        }
        arsort($perDayOrders);
        $activeDays = array_filter($perDayOrders, fn ($c) => $c > 0);
        $busiestDay = $activeDays !== [] ? array_key_first($activeDays) : null;
        // Quietest = lowest-activity among days that actually had orders.
        $quietestDay = null;
        if ($activeDays !== []) {
            $minCount = min($activeDays);
            foreach ($dayMap as $d) {
                if (($activeDays[$d] ?? 0) === $minCount) {
                    $quietestDay = $d;
                    break;
                }
            }
        }

        // Dense 24x7 heatmap for the chart.
        $distribution = [];
        for ($h = 0; $h < 24; $h++) {
            $hourData = [
                'hour' => $h,
                'label' => sprintf('%02d:00', $h),
                'monday' => 0, 'tuesday' => 0, 'wednesday' => 0,
                'thursday' => 0, 'friday' => 0, 'saturday' => 0, 'sunday' => 0,
                'average' => 0,
            ];
            foreach ($dayMap as $day) {
                $cell = $cellTotals[$day.'|'.$h] ?? null;
                if ($cell !== null) {
                    $hourData[$day] = (int) $cell['orders'];
                }
            }
            $dayVals = array_map(fn ($d) => $hourData[$d], $dayMap);
            $hourData['average'] = count($dayVals) > 0 ? round(array_sum($dayVals) / count($dayVals), 2) : 0;
            $distribution[] = $hourData;
        }

        $totalOrders = (int) $flat->sum('orders');
        $activeHours = $flat->pluck('hour')->unique()->count();
        $avgPerHour = $activeHours > 0 ? $totalOrders / $activeHours : 0;

        return $this->success([
            'peak_hours' => $peakHours,
            'busiest_day' => $busiestDay,
            'quietest_day' => $quietestDay,
            'average_orders_per_hour' => round($avgPerHour, 2),
            'hourly_distribution' => $distribution,
        ]);
    }

    public function inventory(Request $request): JsonResponse
    {
        $range = $this->getDateRange($request);
        $start = $range['start'];
        $end = $range['end'];

        $totalIngredients = (int) Ingredient::where('is_active', true)->count();
        // Actual usage cost = quantity moved out x unit cost.
        $totalUsageCost = (float) StockMovement::where('type', 'outward')
            ->whereBetween('created_at', [$start, $end])
            ->selectRaw('SUM(quantity * unit_cost) as cost')
            ->value('cost');

        $wastageCost = (float) Wastage::join('ingredients', 'wastage.ingredient_id', '=', 'ingredients.id')
            ->whereBetween('wastage.created_at', [$start, $end])
            ->sum(DB::raw('wastage.quantity * ingredients.cost_per_unit'));

        $usageByCategoryRows = Ingredient::where('is_active', true)
            ->join('stock_movements', 'ingredients.id', '=', 'stock_movements.ingredient_id')
            ->where('stock_movements.type', 'outward')
            ->whereBetween('stock_movements.created_at', [$start, $end])
            ->selectRaw('ingredients.category, SUM(stock_movements.quantity * stock_movements.unit_cost) as usage_cost')
            ->groupBy('ingredients.category')
            ->orderBy('usage_cost', 'desc')
            ->get();

        $usageByCategory = $usageByCategoryRows->map(fn ($row) => [
            'category' => $row->category ?? 'Uncategorized',
            'usage_cost' => (float) $row->usage_cost,
            'percentage' => 0,
        ]);

        $catUsageTotal = max((float) $usageByCategory->sum('usage_cost'), 1);
        $usageByCategory = $usageByCategory->map(function ($item) use ($catUsageTotal) {
            $item['percentage'] = ($item['usage_cost'] / $catUsageTotal) * 100;

            return $item;
        });

        $topConsumed = Ingredient::where('is_active', true)
            ->join('stock_movements', 'ingredients.id', '=', 'stock_movements.ingredient_id')
            ->where('stock_movements.type', 'outward')
            ->whereBetween('stock_movements.created_at', [$start, $end])
            ->selectRaw('ingredients.id, ingredients.name, ingredients.category, SUM(stock_movements.quantity) as quantity_used, ingredients.unit, SUM(stock_movements.quantity * stock_movements.unit_cost) as cost')
            ->groupBy('ingredients.id', 'ingredients.name', 'ingredients.category', 'ingredients.unit')
            ->orderBy('quantity_used', 'desc')
            ->limit(10)
            ->get()
            ->map(fn ($row) => [
                'id' => $row->id,
                'name' => $row->name,
                'category' => $row->category ?? 'Uncategorized',
                'quantity_used' => (float) $row->quantity_used,
                'unit' => $row->unit ?? '',
                'cost' => (float) $row->cost,
            ]);

        $wastageTrend = Wastage::join('ingredients', 'wastage.ingredient_id', '=', 'ingredients.id')
            ->whereBetween('wastage.created_at', [$start, $end])
            ->selectRaw('DATE(wastage.created_at) as date, SUM(wastage.quantity) as wastage_count, SUM(wastage.quantity * ingredients.cost_per_unit) as wastage_cost')
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(fn ($row) => [
                'date' => Carbon::parse($row->date)->toDateString(),
                'wastage_count' => (int) $row->wastage_count,
                'wastage_cost' => (float) $row->wastage_cost,
            ]);

        $lowStockAlerts = Ingredient::where('is_active', true)
            ->whereColumn('current_stock', '<=', 'minimum_stock')
            ->get()
            ->map(fn ($i) => [
                'id' => $i->id,
                'name' => $i->name,
                'current_stock' => (float) $i->current_stock,
                'min_threshold' => (float) $i->minimum_stock,
                'unit' => $i->unit ?? '',
                'severity' => (float) $i->current_stock <= 0 ? 'out_of_stock' : ((float) $i->current_stock <= ((float) $i->minimum_stock * 0.5) ? 'critical' : 'low'),
            ]);

        return $this->success([
            'total_ingredients' => $totalIngredients,
            'total_usage_cost' => round($totalUsageCost, 2),
            'wastage_cost' => round($wastageCost, 2),
            'usage_by_category' => $usageByCategory,
            'top_consumed' => $topConsumed,
            'wastage_trend' => $wastageTrend,
            'low_stock_alerts' => $lowStockAlerts,
        ]);
    }

    public function lowStockProjection(Request $request, LowStockProjectionService $projection): JsonResponse
    {
        $horizon = (int) $request->input('horizon', 7);

        if (! in_array($horizon, [7, 14, 30], true)) {
            $horizon = 7;
        }

        $items = $projection->project($horizon);

        $summary = [
            'out_of_stock' => 0,
            'critical' => 0,
            'high' => 0,
            'medium' => 0,
            'low' => 0,
        ];

        foreach ($items as $item) {
            $summary[$item['severity']] = ($summary[$item['severity']] ?? 0) + 1;
        }

        return $this->success([
            'generated_at' => now()->toISOString(),
            'horizon_days' => $horizon,
            'items' => $items,
            'summary' => $summary,
        ], 'Low stock projections generated');
    }

    public function customers(Request $request): JsonResponse
    {
        $range = $this->getDateRange($request);
        $start = Carbon::parse($range['start']);
        $end = Carbon::parse($range['end']);

        $totalCustomers = (int) Customer::count();
        $newCustomers = (int) Customer::whereBetween('created_at', [$start, $end])->count();

        [$prevStart, $prevEnd] = $this->previousPeriod($start, $end);
        $prevCustomers = (int) Customer::whereBetween('created_at', [$prevStart, $prevEnd])->count();

        // Returning = customers with 2+ completed orders in the period —
        // real repeat behaviour, not account-creation counts.
        $returningCustomerIds = Order::where('status', 'completed')
            ->whereNotNull('customer_id')
            ->whereBetween('created_at', [$start, $end])
            ->selectRaw('customer_id, COUNT(*) as c')
            ->groupBy('customer_id')
            ->havingRaw('COUNT(*) >= 2')
            ->pluck('customer_id');
        $returningCustomers = $returningCustomerIds->count();

        $avgLifetimeValue = (float) Customer::avg('total_spent');
        $avgVisitsPerCustomer = (float) Customer::where('visit_count', '>', 0)->avg('visit_count');

        // Real last-visit from order history (not account creation).
        $lastVisitByCustomer = Order::where('status', 'completed')
            ->whereNotNull('customer_id')
            ->selectRaw('customer_id, MAX(created_at) as last_visit')
            ->groupBy('customer_id')
            ->pluck('last_visit', 'customer_id');

        $topCustomers = Customer::orderBy('total_spent', 'desc')
            ->limit(10)
            ->get()
            ->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name ?? 'Unknown',
                'email' => $c->email ?? '',
                'total_orders' => (int) $c->visit_count,
                'total_spent' => (float) $c->total_spent,
                'last_visit' => isset($lastVisitByCustomer[$c->id])
                    ? Carbon::parse($lastVisitByCustomer[$c->id])->toISOString()
                    : null,
            ]);

        $segCounts = [
            'vip' => (int) Customer::where('customer_type', 'vip')->count(),
            'regular' => (int) Customer::where('customer_type', 'regular')->count(),
            'walk_in' => (int) Customer::where('customer_type', 'walk_in')->count(),
        ];

        $segments = [];
        foreach (['VIP' => 'vip', 'Regular' => 'regular', 'Walk-in' => 'walk_in'] as $label => $type) {
            $count = $segCounts[$type];
            $segments[] = [
                'segment' => $label,
                'count' => $count,
                'percentage' => $totalCustomers > 0 ? ($count / $totalCustomers) * 100 : 0,
                'average_spend' => (float) Customer::where('customer_type', $type)->avg('total_spent'),
            ];
        }

        $visitFreqData = [
            ['range' => '0-2 visits', 'count' => (int) Customer::where('visit_count', '<=', 2)->count(), 'percentage' => 0],
            ['range' => '3-5 visits', 'count' => (int) Customer::whereBetween('visit_count', [3, 5])->count(), 'percentage' => 0],
            ['range' => '6-10 visits', 'count' => (int) Customer::whereBetween('visit_count', [6, 10])->count(), 'percentage' => 0],
            ['range' => '10+ visits', 'count' => (int) Customer::where('visit_count', '>', 10)->count(), 'percentage' => 0],
        ];
        $totalVisitors = max(array_sum(array_column($visitFreqData, 'count')), 1);
        $visitFreqData = array_map(function ($item) use ($totalVisitors) {
            $item['percentage'] = ($item['count'] / $totalVisitors) * 100;

            return $item;
        }, $visitFreqData);

        // Single grouped queries instead of a per-day N+1 loop.
        $newPerDay = Customer::whereBetween('created_at', [$start, $end])
            ->selectRaw('DATE(created_at) as date, COUNT(*) as c')
            ->groupBy('date')
            ->pluck('c', 'date');

        $visitsPerDay = Order::where('status', 'completed')
            ->whereBetween('created_at', [$start, $end])
            ->selectRaw('DATE(created_at) as date, COUNT(DISTINCT customer_id) as visitors, COUNT(*) as orders')
            ->groupBy('date')
            ->get()
            ->keyBy('date');

        $visitTrends = $visitsPerDay
            ->sortBy('date')
            ->map(function ($row, $date) use ($newPerDay) {
                $day = Carbon::parse($date)->toDateString();
                $new = (int) ($newPerDay[$day] ?? 0);
                $visitors = (int) $row->visitors;

                return [
                    'date' => $day,
                    'new_customers' => $new,
                    // Visitors that day who were not first-time accounts.
                    'returning_customers' => max(0, $visitors - $new),
                    'total_visits' => (int) $row->orders,
                ];
            })
            ->values()
            ->toArray();

        $newGrowth = $prevCustomers > 0
            ? round((($newCustomers - $prevCustomers) / $prevCustomers) * 100, 2)
            : null;

        return $this->success([
            'total_customers' => $totalCustomers,
            'new_customers' => $newCustomers,
            'new_customers_growth' => $newGrowth,
            'returning_customers' => $returningCustomers,
            'average_visit_frequency' => round($avgVisitsPerCustomer, 2),
            'average_lifetime_value' => round($avgLifetimeValue, 2),
            'visit_frequency' => $visitFreqData,
            'customer_segments' => $segments,
            'top_customers' => $topCustomers,
            'visit_trends' => $visitTrends,
        ]);
    }
}
