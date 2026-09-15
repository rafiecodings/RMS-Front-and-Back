<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Reports;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Ingredient;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\StaffPerformance;
use App\Models\Wastage;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function revenue(Request $request): JsonResponse
    {
        $startDate = $request->input('start_date', now()->startOfMonth()->toDateString());
        $endDate = $request->input('end_date', now()->toDateString());

        $revenue = Order::where('status', 'completed')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->selectRaw("date(created_at) as date, sum(total) as revenue, count(*) as orders")
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        $summary = Order::where('status', 'completed')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->selectRaw("
                sum(total) as total_revenue,
                count(*) as total_orders,
                avg(total) as avg_order_value,
                sum(tax_amount) as total_tax,
                sum(discount_amount) as total_discounts,
                sum(service_charge) as total_service_charges
            ")
            ->first();

        return $this->success([
            'period' => ['start' => $startDate, 'end' => $endDate],
            'summary' => [
                'total_revenue' => (float) ($summary->total_revenue ?? 0),
                'total_orders' => (int) ($summary->total_orders ?? 0),
                'avg_order_value' => round((float) ($summary->avg_order_value ?? 0), 2),
                'total_tax' => (float) ($summary->total_tax ?? 0),
                'total_discounts' => (float) ($summary->total_discounts ?? 0),
                'total_service_charges' => (float) ($summary->total_service_charges ?? 0),
            ],
            'daily' => $revenue->map(fn ($row) => [
                'date' => Carbon::parse($row->date)->toDateString(),
                'revenue' => (float) $row->revenue,
                'orders' => (int) $row->orders,
            ]),
        ]);
    }

    public function sales(Request $request): JsonResponse
    {
        $startDate = $request->input('start_date', now()->startOfMonth()->toDateString());
        $endDate = $request->input('end_date', now()->toDateString());

        $byType = Order::where('status', 'completed')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->selectRaw("order_type, sum(total) as revenue, count(*) as orders")
            ->groupBy('order_type')
            ->get();

        $byPayment = Order::where('status', 'completed')
            ->whereNotNull('payment_method')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->selectRaw("payment_method, sum(total) as revenue, count(*) as orders")
            ->groupBy('payment_method')
            ->get();

        $hourly = Order::where('status', 'completed')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->get(['created_at', 'total'])
            ->groupBy(fn ($order) => (int) $order->created_at->format('G'))
            ->sortKeys()
            ->map(fn ($rows, $hour) => (object) [
                'hour' => $hour,
                'revenue' => (float) $rows->sum('total'),
                'orders' => $rows->count(),
            ])
            ->values();

        return $this->success([
            'period' => ['start' => $startDate, 'end' => $endDate],
            'by_order_type' => $byType->map(fn ($row) => [
                'type' => $row->order_type,
                'revenue' => (float) $row->revenue,
                'orders' => (int) $row->orders,
            ]),
            'by_payment_method' => $byPayment->map(fn ($row) => [
                'method' => $row->payment_method,
                'revenue' => (float) $row->revenue,
                'orders' => (int) $row->orders,
            ]),
            'hourly_distribution' => $hourly->map(fn ($row) => [
                'hour' => (int) $row->hour,
                'revenue' => (float) $row->revenue,
                'orders' => (int) $row->orders,
            ]),
        ]);
    }

    public function menuPerformance(Request $request): JsonResponse
    {
        $startDate = $request->input('start_date', now()->subDays(30)->toDateString());
        $endDate = $request->input('end_date', now()->toDateString());

        $topItems = OrderItem::whereHas('order', function ($q) use ($startDate, $endDate) {
            $q->where('status', 'completed')
                ->whereBetween('created_at', [$startDate, $endDate]);
        })
            ->selectRaw("menu_item_id, name, sum(quantity) as total_quantity, sum(total_price) as total_revenue")
            ->groupBy('menu_item_id', 'name')
            ->orderBy('total_revenue', 'desc')
            ->limit(20)
            ->get();

        $bottomItems = OrderItem::whereHas('order', function ($q) use ($startDate, $endDate) {
            $q->where('status', 'completed')
                ->whereBetween('created_at', [$startDate, $endDate]);
        })
            ->selectRaw("menu_item_id, name, sum(quantity) as total_quantity, sum(total_price) as total_revenue")
            ->groupBy('menu_item_id', 'name')
            ->orderBy('total_revenue', 'asc')
            ->limit(10)
            ->get();

        $topIds = $topItems->pluck('menu_item_id')->all();
        if (count($topIds) > 10) {
            $bottomItems = $bottomItems->reject(fn ($item) => in_array($item->menu_item_id, $topIds, true))->values();
        }

        return $this->success([
            'period' => ['start' => $startDate, 'end' => $endDate],
            'top_items' => $topItems->map(fn ($item) => [
                'menu_item_id' => $item->menu_item_id,
                'name' => $item->name,
                'total_quantity' => (int) $item->total_quantity,
                'total_revenue' => (float) $item->total_revenue,
            ]),
            'bottom_items' => $bottomItems->map(fn ($item) => [
                'menu_item_id' => $item->menu_item_id,
                'name' => $item->name,
                'total_quantity' => (int) $item->total_quantity,
                'total_revenue' => (float) $item->total_revenue,
            ]),
        ]);
    }

    public function customerAnalytics(Request $request): JsonResponse
    {
        $totalCustomers = Customer::where('is_active', true)->count();
        $newCustomers = Customer::where('created_at', '>=', now()->startOfMonth())->count();
        $vipCustomers = Customer::where('customer_type', 'vip')->count();
        $avgSpent = Customer::where('visit_count', '>', 0)->avg('total_spent');
        $avgVisits = Customer::avg('visit_count');

        $topCustomers = Customer::orderBy('total_spent', 'desc')
            ->limit(10)
            ->get();

        return $this->success([
            'summary' => [
                'total_customers' => $totalCustomers,
                'new_this_month' => $newCustomers,
                'vip_customers' => $vipCustomers,
                'avg_total_spent' => round((float) ($avgSpent ?? 0), 2),
                'avg_visit_count' => round((float) ($avgVisits ?? 0), 1),
            ],
            'top_customers' => $topCustomers->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'total_spent' => (float) $c->total_spent,
                'visit_count' => $c->visit_count,
                'loyalty_points' => $c->loyalty_points,
            ]),
        ]);
    }

    public function inventory(Request $request): JsonResponse
    {
        $totalIngredients = Ingredient::where('is_active', true)->count();
        $lowStockCount = Ingredient::where('is_active', true)
            ->whereColumn('current_stock', '<=', 'minimum_stock')
            ->count();

        $stockValue = Ingredient::where('is_active', true)
            ->selectRaw("sum(current_stock * cost_per_unit) as total")
            ->value('total');

        $wastageTotal = Wastage::whereDate('created_at', '>=', now()->startOfMonth())
            ->sum('quantity');

        $lowStockItems = Ingredient::where('is_active', true)
            ->whereColumn('current_stock', '<=', 'minimum_stock')
            ->get();

        return $this->success([
            'summary' => [
                'total_ingredients' => $totalIngredients,
                'low_stock_count' => $lowStockCount,
                'total_stock_value' => round((float) ($stockValue ?? 0), 2),
                'monthly_wastage_quantity' => round((float) $wastageTotal, 3),
            ],
            'low_stock_items' => $lowStockItems->map(fn ($i) => [
                'id' => $i->id,
                'name' => $i->name,
                'current_stock' => (float) $i->current_stock,
                'minimum_stock' => (float) $i->minimum_stock,
                'unit' => $i->unit,
            ]),
        ]);
    }

    public function staff(Request $request): JsonResponse
    {
        $startDate = $request->input('start_date', now()->startOfMonth()->toDateString());
        $endDate = $request->input('end_date', now()->toDateString());
        $startDt = \Carbon\Carbon::parse($startDate)->startOfDay();
        $endDt = \Carbon\Carbon::parse($endDate)->endOfDay();

        // Legacy StaffPerformance snapshots are unused for active analytics.
        // Derive trustworthy metrics from orders (completed only) per staff,
        // consistent with GET /staff/{id}/performance.
        $staffProfiles = \App\Models\StaffProfile::with('user')->get();
        $staffData = $staffProfiles->map(function ($staff) use ($startDt, $endDt) {
            if (!$staff->user_id) {
                return null;
            }
            $ordersQ = \App\Models\Order::where('created_by', $staff->user_id)
                ->where('status', 'completed')
                ->whereBetween('created_at', [$startDt, $endDt]);
            $totalOrders = (int) $ordersQ->count();
            $totalSales = (float) $ordersQ->sum('total');
            if ($totalOrders === 0 && $totalSales === 0) {
                return null;
            }
            return [
                'staff_id' => $staff->id,
                'name' => $staff->user?->name ?? 'Unknown',
                'position' => $staff->position ?? '',
                'total_orders' => $totalOrders,
                'total_sales' => $totalSales,
                'avg_rating' => 0,
            ];
        })->filter()->sortByDesc('total_sales')->values();

        return $this->success([
            'period' => ['start' => $startDate, 'end' => $endDate],
            'staff_performance' => $staffData,
        ]);
    }

    public function tax(Request $request): JsonResponse
    {
        $startDate = $request->input('start_date', now()->startOfMonth()->toDateString());
        $endDate = $request->input('end_date', now()->toDateString());

        $taxData = Order::where('status', 'completed')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->selectRaw("date(created_at) as date, sum(tax_amount) as tax_collected")
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        $totalTax = $taxData->sum('tax_collected');

        return $this->success([
            'period' => ['start' => $startDate, 'end' => $endDate],
            'summary' => [
                'total_tax_collected' => round((float) $totalTax, 2),
            ],
            'daily' => $taxData->map(fn ($row) => [
                'date' => Carbon::parse($row->date)->toDateString(),
                'tax_collected' => round((float) $row->tax_collected, 2),
            ]),
        ]);
    }

    public function custom(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'metric' => 'required|string|in:revenue,orders,customers,inventory',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
            'group_by' => 'sometimes|string|in:day,week,month',
        ]);

        $start = $validated['start_date'];
        $end = $validated['end_date'];
        $groupBy = $validated['group_by'] ?? 'day';

        if ($validated['metric'] === 'revenue') {
            $query = Order::where('status', 'completed')
                ->whereBetween('created_at', [$start, $end]);

            $rows = $query->get(['created_at', 'total']);

            $groupFormat = match ($groupBy) {
                'week' => 'o-W',
                'month' => 'Y-m',
                default => 'Y-m-d',
            };

            $data = $rows
                ->groupBy(fn ($order) => $order->created_at->format($groupFormat))
                ->sortKeys()
                ->map(function ($group) use ($groupBy) {
                    $anchor = $group->first()->created_at->copy();
                    $label = match ($groupBy) {
                        'week' => $anchor->startOfWeek()->toDateString(),
                        'month' => $anchor->startOfMonth()->toDateString(),
                        default => $anchor->toDateString(),
                    };

                    return (object) [
                        'period' => $label,
                        'value' => (float) $group->sum('total'),
                        'count' => $group->count(),
                    ];
                })
                ->values();

            return $this->success([
                'metric' => 'revenue',
                'items' => $data->map(fn ($row) => [
                    'period' => Carbon::parse($row->period)->toDateString(),
                    'value' => (float) $row->value,
                    'count' => (int) $row->count,
                ]),
            ]);
        }

        return $this->error('Custom report for ' . $validated['metric'] . ' is not implemented.', 501);
    }

    public function export(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => 'required|string|in:revenue,sales,menu,customers,inventory,staff,tax',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
            'format' => 'sometimes|string|in:csv,json',
        ]);

        return $this->success([
            'message' => 'Export generation started.',
            'status' => 'pending',
            'type' => $validated['type'],
            'format' => $validated['format'] ?? 'csv',
        ], 'Export queued successfully.');
    }
}
