<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Reports;

use App\Concerns\HandlesDateTrunc;
use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Customer;
use App\Models\Ingredient;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\ShiftSchedule;
use App\Models\StaffProfile;
use App\Models\User;
use App\Models\Wastage;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    use HandlesDateTrunc;

    /**
     * Restaurant-local timezone used for hour/day bucketing in reports so
     * "peak hour 18:00" means restaurant time, not UTC.
     */
    protected function restaurantTz(): string
    {
        return (string) config('app.restaurant_timezone', config('app.timezone', 'UTC'));
    }

    /**
     * Resolve start/end date strings into full datetime boundaries so
     * whereBetween covers the entire end day. Single-day ranges are valid
     * (end >= start).
     */
    protected function resolveDateRange(Request $request): array
    {
        $startDate = $request->input('start_date', now()->startOfMonth()->toDateString());
        $endDate = $request->input('end_date', $startDate);

        if (Carbon::parse($endDate)->lt(Carbon::parse($startDate))) {
            // Swap instead of failing so reversed pickers still work.
            [$startDate, $endDate] = [$endDate, $startDate];
        }

        $start = Carbon::parse($startDate)->startOfDay()->toDateTimeString();
        $end = Carbon::parse($endDate)->endOfDay()->toDateTimeString();

        return [$start, $end];
    }

    /**
     * The equivalent preceding window of equal length, e.g.
     * Aug 15–Aug 21 -> Aug 8–Aug 14 (full-day boundaries on both ends).
     */
    protected function previousRange(string $startDt, string $endDt): array
    {
        $start = Carbon::parse($startDt);
        $end = Carbon::parse($endDt);

        $lengthDays = (int) floor($start->diffInDays($end)) + 1;
        $prevEnd = $start->copy()->subDay()->endOfDay();
        $prevStart = $prevEnd->copy()->subDays($lengthDays - 1)->startOfDay();

        return [
            $prevStart->toDateTimeString(),
            $prevEnd->toDateTimeString(),
        ];
    }

    protected function buildRevenuePayload(string $startDate, string $endDate): array
    {
        [$prevStart, $prevEnd] = $this->previousRange($startDate, $endDate);

        $summary = Order::where('status', 'completed')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->selectRaw('
                sum(total) as total_revenue,
                count(*) as total_orders,
                avg(total) as avg_order_value,
                sum(tax_amount) as total_tax,
                sum(discount_amount) as total_discounts,
                sum(service_charge) as total_service_charges
            ')
            ->first();

        $daily = Order::where('status', 'completed')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->selectRaw($this->dateColumn('created_at').' as date, sum(total) as revenue, count(*) as orders')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        $prevSummary = Order::where('status', 'completed')
            ->whereBetween('created_at', [$prevStart, $prevEnd])
            ->selectRaw('sum(total) as total_revenue')
            ->value('total_revenue');

        $totalRevenue = (float) ($summary->total_revenue ?? 0);
        $prevRevenue = (float) ($prevSummary ?? 0);
        $growth = $prevRevenue > 0
            ? round((($totalRevenue - $prevRevenue) / $prevRevenue) * 100, 2)
            : null;

        return [
            'period' => ['start' => $startDate, 'end' => $endDate],
            'summary' => [
                'total_revenue' => $totalRevenue,
                'total_orders' => (int) ($summary->total_orders ?? 0),
                'avg_order_value' => round((float) ($summary->avg_order_value ?? 0), 2),
                'total_tax' => (float) ($summary->total_tax ?? 0),
                'total_discounts' => (float) ($summary->total_discounts ?? 0),
                'total_service_charges' => (float) ($summary->total_service_charges ?? 0),
                // Null when there is no comparable previous period — never a fake zero.
                'revenue_growth' => $growth,
                'previous_period_revenue' => $prevRevenue,
            ],
            'daily' => $daily->map(fn ($row) => [
                'date' => Carbon::parse($row->date)->toDateString(),
                'revenue' => (float) $row->revenue,
                'orders' => (int) $row->orders,
            ])->toArray(),
        ];
    }

    public function revenue(Request $request): JsonResponse
    {
        [$startDate, $endDate] = $this->resolveDateRange($request);

        return $this->success($this->buildRevenuePayload($startDate, $endDate));
    }

    /**
     * Shared aggregation used by both GET /reports/sales and the CSV export.
     * Hour buckets use the restaurant timezone (PHP-side) so they are
     * driver-independent and presentation-correct.
     */
    protected function buildSales(string $startDt, string $endDt): array
    {
        $tz = $this->restaurantTz();

        $orders = Order::where('status', 'completed')
            ->whereBetween('created_at', [$startDt, $endDt])
            ->get(['id', 'order_type', 'payment_method', 'total', 'created_at']);

        $byType = [];
        $byPayment = [];
        $byHour = [];

        foreach ($orders as $o) {
            $type = $o->order_type ?? 'unknown';
            $byType[$type]['revenue'] = ($byType[$type]['revenue'] ?? 0) + (float) $o->total;
            $byType[$type]['orders'] = ($byType[$type]['orders'] ?? 0) + 1;

            if (! empty($o->payment_method)) {
                $m = $o->payment_method;
                $byPayment[$m]['revenue'] = ($byPayment[$m]['revenue'] ?? 0) + (float) $o->total;
                $byPayment[$m]['orders'] = ($byPayment[$m]['orders'] ?? 0) + 1;
            }

            $hour = (int) Carbon::parse($o->created_at)->timezone($tz)->format('G');
            $byHour[$hour]['revenue'] = ($byHour[$hour]['revenue'] ?? 0) + (float) $o->total;
            $byHour[$hour]['orders'] = ($byHour[$hour]['orders'] ?? 0) + 1;
        }

        $itemsSold = (int) OrderItem::whereIn('order_id', $orders->pluck('id'))
            ->sum('quantity');

        ksort($byHour);

        return [
            'period' => ['start' => $startDt, 'end' => $endDt],
            'items_sold' => $itemsSold,
            'by_order_type' => collect($byType)->map(fn ($v, $k) => [
                'type' => $k,
                'revenue' => round((float) $v['revenue'], 2),
                'orders' => (int) $v['orders'],
            ])->values()->toArray(),
            'by_payment_method' => collect($byPayment)->map(fn ($v, $k) => [
                'method' => $k,
                'revenue' => round((float) $v['revenue'], 2),
                'orders' => (int) $v['orders'],
            ])->values()->toArray(),
            // Sorted by volume descending — "busiest hours first".
            'hourly_distribution' => collect($byHour)
                ->map(fn ($v, $h) => [
                    'hour' => (int) $h,
                    'revenue' => round((float) $v['revenue'], 2),
                    'orders' => (int) $v['orders'],
                ])
                ->sortByDesc('orders')
                ->values()->toArray(),
        ];
    }

    public function sales(Request $request): JsonResponse
    {
        [$startDate, $endDate] = $this->resolveDateRange($request);
        [$prevStart, $prevEnd] = $this->previousRange($startDate, $endDate);

        $data = $this->buildSales($startDate, $endDate);

        $prevOrders = Order::where('status', 'completed')
            ->whereBetween('created_at', [$prevStart, $prevEnd])
            ->sum('total');

        $currentTotal = collect($data['by_order_type'])->sum('revenue');
        $growth = $prevOrders > 0
            ? round((($currentTotal - (float) $prevOrders) / (float) $prevOrders) * 100, 2)
            : null;

        $data['previous_period_sales'] = round((float) $prevOrders, 2);
        $data['sales_growth'] = $growth;

        return $this->success($data);
    }

    protected function buildMenuPerformance(string $startDate, string $endDate): array
    {
        // Distinct output aliases avoid "ambiguous column name" when several
        // joined tables expose a name column.
        $topItems = OrderItem::query()
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->leftJoin('menu_items', 'menu_items.id', '=', 'order_items.menu_item_id')
            ->leftJoin('menu_categories', 'menu_categories.id', '=', 'menu_items.category_id')
            ->where('orders.status', 'completed')
            ->whereBetween('orders.created_at', [$startDate, $endDate])
            ->selectRaw("
                order_items.menu_item_id,
                COALESCE(order_items.name, menu_items.name, 'Unknown') as item_name,
                COALESCE(menu_categories.name, '') as category_name,
                SUM(order_items.quantity) as total_quantity,
                SUM(order_items.total_price) as total_revenue,
                COUNT(DISTINCT orders.id) as order_count
            ")
            ->groupBy('order_items.menu_item_id', 'item_name', 'category_name')
            ->orderByDesc('total_revenue')
            ->limit(50)
            ->get();

        $totalItems = DB::table('menu_items')->where('is_active', true)->count();
        $activeItems = DB::table('menu_items')->where('is_active', true)->count();

        return [
            'period' => ['start' => $startDate, 'end' => $endDate],
            'total_menu_items' => (int) $totalItems,
            'active_items' => (int) $activeItems,
            // Recipe-level costing is not tracked yet — margins omitted
            // rather than faked.
            'top_items' => $topItems->map(fn ($item) => [
                'menu_item_id' => $item->menu_item_id,
                'name' => $item->item_name,
                'category' => $item->category_name,
                'total_quantity' => (int) $item->total_quantity,
                'total_revenue' => round((float) $item->total_revenue, 2),
                'order_count' => (int) $item->order_count,
            ])->toArray(),
        ];
    }

    public function menuPerformance(Request $request): JsonResponse
    {
        [$startDate, $endDate] = $this->resolveDateRange($request);

        return $this->success($this->buildMenuPerformance($startDate, $endDate));
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

    protected function buildInventoryPayload(string $startDate, string $endDate): array
    {
        $totalIngredients = Ingredient::where('is_active', true)->count();
        $lowStockCount = Ingredient::where('is_active', true)
            ->whereColumn('current_stock', '<=', 'minimum_stock')
            ->count();

        $stockValue = Ingredient::where('is_active', true)
            ->selectRaw('sum(current_stock * cost_per_unit) as total')
            ->value('total');

        // Wastage within the report range, with derived cost
        // (quantity x ingredient unit cost). No fabricated costs.
        $wastageRows = Wastage::query()
            ->join('ingredients', 'ingredients.id', '=', 'wastage.ingredient_id')
            ->whereBetween('wastage.created_at', [$startDate, $endDate])
            ->selectRaw('
                wastage.reason,
                COUNT(*) as count,
                SUM(wastage.quantity) as quantity,
                SUM(wastage.quantity * ingredients.cost_per_unit) as cost
            ')
            ->groupBy('wastage.reason')
            ->get();

        $wastageCount = (int) $wastageRows->sum('count');
        $wastageCost = round((float) $wastageRows->sum('cost'), 2);

        $lowStockItems = Ingredient::where('is_active', true)
            ->whereColumn('current_stock', '<=', 'minimum_stock')
            ->get();

        return [
            'period' => ['start' => $startDate, 'end' => $endDate],
            'summary' => [
                'total_ingredients' => $totalIngredients,
                'low_stock_count' => $lowStockCount,
                'total_stock_value' => round((float) ($stockValue ?? 0), 2),
                'wastage_count' => $wastageCount,
                'wastage_cost' => $wastageCost,
            ],
            'wastage_by_reason' => $wastageRows->map(fn ($r) => [
                'reason' => $r->reason,
                'count' => (int) $r->count,
                'quantity' => round((float) $r->quantity, 3),
                'cost' => round((float) $r->cost, 2),
            ])->toArray(),
            'low_stock_items' => $lowStockItems->map(fn ($i) => [
                'id' => $i->id,
                'name' => $i->name,
                'current_stock' => (float) $i->current_stock,
                'minimum_stock' => (float) $i->minimum_stock,
                'unit_cost' => (float) $i->cost_per_unit,
                'unit' => $i->unit,
            ])->toArray(),
        ];
    }

    public function inventory(Request $request): JsonResponse
    {
        [$startDate, $endDate] = $this->resolveDateRange($request);

        return $this->success($this->buildInventoryPayload($startDate, $endDate));
    }

    /**
     * Staff report derived entirely from real operational data:
     * completed orders attributed via orders.created_by, plus attendance
     * and shift-schedule counts in the period. No wage/cost data exists,
     * so labor-cost figures are intentionally absent.
     */
    protected function buildStaffPayload(string $startDate, string $endDate): array
    {
        $orderStats = Order::where('status', 'completed')
            ->whereNotNull('created_by')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->selectRaw('created_by, COUNT(*) as orders_handled, SUM(total) as revenue_generated, AVG(total) as avg_ticket')
            ->groupBy('created_by')
            ->get()
            ->keyBy('created_by');

        $profiles = StaffProfile::with('user:id,name')->get()->keyBy('user_id');

        $attendanceStats = Attendance::whereBetween('clock_in', [$startDate, $endDate])
            ->selectRaw('staff_id, status, COUNT(*) as c')
            ->groupBy('staff_id', 'status')
            ->get()
            ->groupBy('staff_id');

        $shiftCounts = ShiftSchedule::whereBetween('date', [
            Carbon::parse($startDate)->toDateString(),
            Carbon::parse($endDate)->toDateString(),
        ])
            ->selectRaw('staff_id, COUNT(*) as shifts')
            ->groupBy('staff_id')
            ->pluck('shifts', 'staff_id');

        $rows = collect();
        foreach ($orderStats as $userId => $stat) {
            $profile = $profiles->get($userId);
            if (! $profile) {
                continue;
            }

            $att = $attendanceStats->get($profile->id);
            $present = (int) ($att?->whereIn('status', ['present', 'late'])->sum('c') ?? 0);
            $totalRecords = (int) ($att?->sum('c') ?? 0);

            $rows->push([
                'staff_id' => $profile->id,
                'user_id' => $userId,
                'name' => $profile->user?->name ?? 'Unknown',
                'position' => $profile->position ?? '',
                'role' => $profile->user?->roles->first()?->name ?? '',
                'orders_handled' => (int) $stat->orders_handled,
                'revenue_generated' => round((float) $stat->revenue_generated, 2),
                'avg_ticket' => round((float) $stat->avg_ticket, 2),
                'attendance_present' => $present,
                'attendance_total' => $totalRecords,
                // Null when no attendance records exist — never a fake rate.
                'attendance_rate' => $totalRecords > 0 ? round(($present / $totalRecords) * 100, 1) : null,
                'shifts_scheduled' => (int) ($shiftCounts[$profile->id] ?? 0),
            ]);
        }

        $rows = $rows->sortByDesc('revenue_generated')->values();

        // Attendance overview across all staff (not only those with orders).
        $attSummary = Attendance::whereBetween('clock_in', [$startDate, $endDate])
            ->selectRaw('status, COUNT(*) as c')
            ->groupBy('status')
            ->pluck('c', 'status');
        $totalRecords = (int) $attSummary->sum();
        $presentish = (int) $attSummary->filter(fn ($v, $k) => in_array($k, ['present', 'late']))->sum();

        return [
            'period' => ['start' => $startDate, 'end' => $endDate],
            'total_staff' => $profiles->count(),
            'active_staff' => $profiles->where('is_active', true)->count(),
            'attendance_summary' => [
                'total_records' => $totalRecords,
                'present' => (int) ($attSummary['present'] ?? 0),
                'absent' => (int) ($attSummary['absent'] ?? 0),
                'late' => (int) ($attSummary['late'] ?? 0),
                'on_leave' => (int) ($attSummary['on_leave'] ?? 0),
                'attendance_rate' => $totalRecords > 0 ? round(($presentish / $totalRecords) * 100, 1) : null,
            ],
            'performance_ranking' => $rows->toArray(),
        ];
    }

    public function staff(Request $request): JsonResponse
    {
        [$startDate, $endDate] = $this->resolveDateRange($request);

        return $this->success($this->buildStaffPayload($startDate, $endDate));
    }

    protected function buildTaxPayload(string $startDate, string $endDate): array
    {
        $taxData = Order::where('status', 'completed')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->selectRaw($this->dateColumn('created_at').' as date, sum(tax_amount) as tax_collected')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        $totalTax = $taxData->sum('tax_collected');

        return [
            'period' => ['start' => $startDate, 'end' => $endDate],
            'summary' => [
                'total_tax_collected' => round((float) $totalTax, 2),
            ],
            'daily' => $taxData->map(fn ($row) => [
                'date' => Carbon::parse($row->date)->toDateString(),
                'tax_collected' => round((float) $row->tax_collected, 2),
            ])->toArray(),
        ];
    }

    public function tax(Request $request): JsonResponse
    {
        [$startDate, $endDate] = $this->resolveDateRange($request);

        return $this->success($this->buildTaxPayload($startDate, $endDate));
    }

    public function custom(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'metric' => 'required|string|in:revenue',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'group_by' => 'sometimes|string|in:day,week,month',
        ]);

        [$start, $end] = $this->resolveDateRange($request);
        $groupBy = $validated['group_by'] ?? 'day';

        if ($groupBy === 'day') {
            $expr = $this->dateColumn('created_at');
        } else {
            $expr = $this->dateTrunc('created_at', $groupBy);
        }

        $data = Order::where('status', 'completed')
            ->whereBetween('created_at', [$start, $end])
            ->selectRaw("{$expr} as period, sum(total) as value, count(*) as count")
            ->groupBy('period')
            ->orderBy('period')
            ->get();

        return $this->success([
            'metric' => 'revenue',
            'items' => $data->map(fn ($row) => [
                'period' => Carbon::parse($row->period)->toDateString(),
                'value' => (float) $row->value,
                'count' => (int) $row->count,
            ]),
        ]);
    }

    /**
     * Tabular projection of each report for CSV export. Only real columns —
     * no fabricated metrics.
     */
    protected function buildExportTable(string $type, Request $request): array
    {
        switch ($type) {
            case 'revenue': {
                [$s, $e] = $this->resolveDateRange($request);
                $payload = $this->buildRevenuePayload($s, $e);
                return [
                    'columns' => ['Date', 'Revenue', 'Orders'],
                    'rows' => collect($payload['daily'])->map(fn ($d) => [$d['date'], $d['revenue'], $d['orders']])->toArray(),
                    'summary' => $payload['summary'],
                ];
            }
            case 'sales': {
                [$s, $e] = $this->resolveDateRange($request);
                $payload = $this->buildSales($s, $e);
                return [
                    'columns' => ['Type/Method/Hour', 'Revenue', 'Count'],
                    'rows' => collect($payload['by_order_type'])
                        ->map(fn ($r) => ["order_type: {$r['type']}", $r['revenue'], $r['orders']])
                        ->merge(collect($payload['by_payment_method'])->map(fn ($r) => ["payment: {$r['method']}", $r['revenue'], $r['orders']]))
                        ->merge(collect($payload['hourly_distribution'])->map(fn ($r) => ["hour {$r['hour']}:00", $r['revenue'], $r['orders']]))
                        ->toArray(),
                    'summary' => ['items_sold' => $payload['items_sold']],
                ];
            }
            case 'menu':
            case 'menu-performance': {
                [$s, $e] = $this->resolveDateRange($request);
                $data = $this->buildMenuPerformance($s, $e);
                return [
                    'columns' => ['Item', 'Category', 'Quantity Sold', 'Revenue', 'Orders'],
                    'rows' => collect($data['top_items'])->map(fn ($i) => [$i['name'], $i['category'], $i['total_quantity'], $i['total_revenue'], $i['order_count']])->toArray(),
                ];
            }
            case 'inventory': {
                [$s, $e] = $this->resolveDateRange($request);
                $payload = $this->buildInventoryPayload($s, $e);
                return [
                    'columns' => ['Ingredient', 'Current Stock', 'Minimum Stock', 'Unit Cost', 'Unit'],
                    'rows' => collect($payload['low_stock_items'])->map(fn ($i) => [$i['name'], $i['current_stock'], $i['minimum_stock'], $i['unit_cost'], $i['unit']])->toArray(),
                    'summary' => $payload['summary'],
                ];
            }
            case 'staff': {
                [$s, $e] = $this->resolveDateRange($request);
                $payload = $this->buildStaffPayload($s, $e);
                return [
                    'columns' => ['Staff', 'Position', 'Role', 'Orders Handled', 'Revenue Generated', 'Avg Ticket', 'Attendance Rate %', 'Shifts Scheduled'],
                    'rows' => collect($payload['performance_ranking'])->map(fn ($r) => [
                        $r['name'], $r['position'], $r['role'], $r['orders_handled'], $r['revenue_generated'], $r['avg_ticket'],
                        $r['attendance_rate'] ?? 'n/a', $r['shifts_scheduled'],
                    ])->toArray(),
                ];
            }
            case 'tax': {
                [$s, $e] = $this->resolveDateRange($request);
                $payload = $this->buildTaxPayload($s, $e);
                return [
                    'columns' => ['Date', 'Tax Collected'],
                    'rows' => collect($payload['daily'])->map(fn ($d) => [$d['date'], $d['tax_collected']])->toArray(),
                    'summary' => $payload['summary'],
                ];
            }
            default:
                abort(422, 'Unsupported report type.');
        }
    }

    /** Streamed CSV download — a real file, not a queued stub. */
    public function export(Request $request): StreamedResponse|JsonResponse
    {
        $validated = $request->validate([
            'type' => 'required|string|in:revenue,sales,menu,inventory,staff,tax',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'format' => 'nullable|string|in:csv,json',
        ]);

        $format = $validated['format'] ?? 'csv';

        if ($format === 'json') {
            $table = $this->buildExportTable($validated['type'], $request);
            return response()->json(['success' => true, 'data' => $table]);
        }

        $filename = sprintf(
            '%s_report_%s_%s.csv',
            $validated['type'],
            $validated['start_date'],
            $validated['end_date']
        );

        $type = $validated['type'];

        return response()->streamDownload(function () use ($type, $request) {
            $out = fopen('php://output', 'w');
            // UTF-8 BOM so Excel opens Philippine peso values correctly.
            fwrite($out, "\xEF\xBB\xBF");
            $table = $this->buildExportTable($type, $request);

            if (! empty($table['summary'])) {
                fputcsv($out, ['Summary']);
                foreach ($table['summary'] as $k => $v) {
                    fputcsv($out, [ucwords(str_replace('_', ' ', $k)), is_float($v) ? number_format($v, 2) : $v]);
                }
                fputcsv($out, []);
            }

            fputcsv($out, $table['columns']);
            foreach ($table['rows'] as $row) {
                fputcsv($out, $row);
            }

            fclose($out);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }
}
