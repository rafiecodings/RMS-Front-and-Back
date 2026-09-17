<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Reports;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Ingredient;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Refund;
use App\Models\Wastage;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;
use Illuminate\Validation\ValidationException;

class ReportController extends Controller
{
    private function parseDateRange(Request $request, ?string $defaultStart = null, ?string $defaultEnd = null): array
    {
        $request->validate([
            'start_date' => 'sometimes|required|date_format:Y-m-d',
            'end_date' => 'sometimes|required|date_format:Y-m-d',
        ]);
        $startDt = Carbon::parse($request->input('start_date', $defaultStart ?? now()->startOfMonth()->toDateString()))->startOfDay();
        $endDt = Carbon::parse($request->input('end_date', $defaultEnd ?? now()->toDateString()))->endOfDay();

        if ($startDt->gt($endDt)) {
            throw ValidationException::withMessages(['start_date' => ['start_date must be before or equal to end_date.']]);
        }

        return [$startDt, $endDt, $startDt->toDateString(), $endDt->toDateString()];
    }

    private function qualifyingOrders()
    {
        return Order::where('status', 'completed')->where('payment_status', 'paid');
    }

    private function refundsTotal(Carbon $startDt, Carbon $endDt): float
    {
        return (float) Refund::whereHas('payment.invoice.order', function ($q) use ($startDt, $endDt) {
            $q->where('status', 'completed')->where('payment_status', 'paid')->whereBetween('created_at', [$startDt, $endDt]);
        })->where('status', 'approved')->sum('amount');
    }

    public function revenue(Request $request): JsonResponse
    {
        [$startDt, $endDt, $startDate, $endDate] = $this->parseDateRange($request);

        $base = $this->qualifyingOrders()->whereBetween('created_at', [$startDt, $endDt]);

        $revenue = (clone $base)->selectRaw("date(created_at) as date, sum(total) as revenue, count(*) as orders")->groupBy('date')->orderBy('date')->get();
        $summary = (clone $base)->selectRaw("sum(total) as total_revenue, count(*) as total_orders, avg(total) as avg_order_value, sum(tax_amount) as total_tax, sum(discount_amount) as total_discounts, sum(service_charge) as total_service_charges")->first();

        $refundsByDay = Refund::with('payment.invoice.order')
            ->where('status', 'approved')
            ->whereHas('payment.invoice.order', fn ($q) => $q->where('status', 'completed')->where('payment_status', 'paid')->whereBetween('created_at', [$startDt, $endDt]))
            ->get()->groupBy(fn ($refund) => $refund->payment->invoice->order->created_at->toDateString())
            ->map(fn ($rows) => (float) $rows->sum('amount'));

        $gross = (float) ($summary->total_revenue ?? 0);
        $refunds = $this->refundsTotal($startDt, $endDt);
        $net = max(0, $gross - $refunds);
        $totalOrders = (int) ($summary->total_orders ?? 0);

        return $this->success([
            'period' => ['start' => $startDate, 'end' => $endDate],
            'summary' => [
                'gross_revenue' => round($gross, 2),
                'refunds' => round($refunds, 2),
                'total_revenue' => round($net, 2),
                'net_revenue' => round($net, 2),
                'total_orders' => $totalOrders,
                'avg_order_value' => $totalOrders > 0 ? round($net / $totalOrders, 2) : 0,
                'total_tax' => (float) ($summary->total_tax ?? 0),
                'total_discounts' => (float) ($summary->total_discounts ?? 0),
                'total_service_charges' => (float) ($summary->total_service_charges ?? 0),
            ],
            'daily' => $revenue->map(fn ($row) => [
                'date' => Carbon::parse($row->date)->toDateString(),
                'gross_revenue' => (float) $row->revenue,
                'refunds' => (float) ($refundsByDay[$row->date] ?? 0),
                'revenue' => round(max(0, (float) $row->revenue - ($refundsByDay[$row->date] ?? 0)), 2),
                'orders' => (int) $row->orders,
            ]),
        ]);
    }

    public function sales(Request $request): JsonResponse
    {
        [$startDt, $endDt, $startDate, $endDate] = $this->parseDateRange($request);

        $base = $this->qualifyingOrders()->whereBetween('created_at', [$startDt, $endDt]);

        $byType = (clone $base)->selectRaw("order_type, sum(total) as revenue, count(*) as orders")->groupBy('order_type')->get();
        $byPayment = (clone $base)->whereNotNull('payment_method')->selectRaw("payment_method, sum(total) as revenue, count(*) as orders")->groupBy('payment_method')->get();

        $hourly = (clone $base)->get(['created_at', 'total'])->groupBy(fn ($order) => (int) $order->created_at->format('G'))->sortKeys()->map(fn ($rows, $hour) => (object) [
            'hour' => $hour,
            'revenue' => (float) $rows->sum('total'),
            'orders' => $rows->count(),
        ])->values();

        return $this->success([
            'period' => ['start' => $startDate, 'end' => $endDate],
            'items_sold' => (int) OrderItem::whereHas('order', fn ($q) => $q->where('status', 'completed')->where('payment_status', 'paid')->whereBetween('created_at', [$startDt, $endDt]))->sum('quantity'),
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
        [$startDt, $endDt, $startDate, $endDate] = $this->parseDateRange($request, now()->subDays(30)->toDateString(), now()->toDateString());

        $topItems = OrderItem::whereHas('order', function ($q) use ($startDt, $endDt) {
            $q->where('status', 'completed')->where('payment_status', 'paid')->whereBetween('created_at', [$startDt, $endDt]);
        })->selectRaw("menu_item_id, name, sum(quantity) as total_quantity, sum(total_price) as total_revenue, count(distinct order_id) as order_count")->groupBy('menu_item_id', 'name')->orderBy('total_revenue', 'desc')->limit(20)->get();

        $bottomItems = OrderItem::whereHas('order', function ($q) use ($startDt, $endDt) {
            $q->where('status', 'completed')->where('payment_status', 'paid')->whereBetween('created_at', [$startDt, $endDt]);
        })->selectRaw("menu_item_id, name, sum(quantity) as total_quantity, sum(total_price) as total_revenue, count(distinct order_id) as order_count")->groupBy('menu_item_id', 'name')->orderBy('total_revenue', 'asc')->limit(10)->get();

        $topIds = $topItems->pluck('menu_item_id')->all();
        if (count($topIds) > 10) {
            $bottomItems = $bottomItems->reject(fn ($item) => in_array($item->menu_item_id, $topIds, true))->values();
        }

        return $this->success([
            'total_menu_items' => \App\Models\MenuItem::count(),
            'active_items' => \App\Models\MenuItem::where('is_available', true)->count(),
            'period' => ['start' => $startDate, 'end' => $endDate],
            'top_items' => $topItems->map(fn ($item) => [
                'menu_item_id' => $item->menu_item_id,
                'name' => $item->name,
                'total_quantity' => (int) $item->total_quantity,
                'total_revenue' => (float) $item->total_revenue,
                'order_count' => (int) $item->order_count,
            ]),
            'bottom_items' => $bottomItems->map(fn ($item) => [
                'menu_item_id' => $item->menu_item_id,
                'name' => $item->name,
                'total_quantity' => (int) $item->total_quantity,
                'total_revenue' => (float) $item->total_revenue,
                'order_count' => (int) $item->order_count,
            ]),
        ]);
    }

    public function customerAnalytics(Request $request): JsonResponse
    {
        [$startDt, $endDt, $startDate, $endDate] = $this->parseDateRange($request);
        $customers = Customer::where('is_active', true);
        $totalCustomers = (clone $customers)->count();
        $newCustomers = (clone $customers)->whereBetween('created_at', [now()->startOfMonth(), now()->endOfDay()])->count();
        $avgSpent = (clone $customers)->where('visit_count', '>', 0)->avg('total_spent');
        $avgVisits = (clone $customers)->avg('visit_count');

        $loyalCounts = [
            'Member' => 0,
            'Bronze' => 0,
            'Silver' => 0,
            'Gold' => 0,
            'Platinum' => 0,
        ];
        foreach (Customer::where('is_active', true)->get() as $c) {
            $tier = $c->loyaltyTier();
            if (isset($loyalCounts[$tier])) {
                $loyalCounts[$tier]++;
            }
        }
        $loyalCustomers = $loyalCounts['Bronze'] + $loyalCounts['Silver'] + $loyalCounts['Gold'] + $loyalCounts['Platinum'];

        $topCustomers = (clone $customers)->orderBy('total_spent', 'desc')->limit(10)->get();

        return $this->success([
            'period' => ['start' => $startDate, 'end' => $endDate],
            'summary' => [
                'total_customers' => $totalCustomers,
                'new_in_period' => (clone $customers)->whereBetween('created_at', [$startDt, $endDt])->count(),
                'new_this_month' => $newCustomers,
                'loyal_customers' => $loyalCustomers,
                'loyalty_tiers' => $loyalCounts,
                'avg_total_spent' => round((float) ($avgSpent ?? 0), 2),
                'avg_visit_count' => round((float) ($avgVisits ?? 0), 1),
            ],
            'top_customers' => $topCustomers->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'total_spent' => (float) $c->total_spent,
                'visit_count' => $c->visit_count,
                'loyalty_tier' => $c->loyaltyTier(),
                'loyalty_points' => $c->loyalty_points,
            ]),
        ]);
    }

    public function inventory(Request $request): JsonResponse
    {
        [$startDt, $endDt, $startDate, $endDate] = $this->parseDateRange($request);

        $totalIngredients = Ingredient::where('is_active', true)->count();
        $lowStockCount = Ingredient::where('is_active', true)->whereColumn('current_stock', '<=', 'minimum_stock')->count();
        $stockValue = Ingredient::where('is_active', true)->selectRaw("sum(current_stock * cost_per_unit) as total")->value('total');
        $wastageTotal = Wastage::whereBetween('created_at', [$startDt, $endDt])->sum('quantity');
        $wastage = Wastage::with('ingredient')->whereBetween('created_at', [$startDt, $endDt])->get();
        $wastageCost = fn ($row) => (float) $row->quantity * (float) ($row->ingredient?->cost_per_unit ?? 0);
        $lowStockItems = Ingredient::where('is_active', true)->whereColumn('current_stock', '<=', 'minimum_stock')->get();

        return $this->success([
            'summary' => [
                'total_ingredients' => $totalIngredients,
                'low_stock_count' => $lowStockCount,
                'total_stock_value' => round((float) ($stockValue ?? 0), 2),
                'wastage_quantity' => round((float) $wastageTotal, 3),
                'wastage_count' => $wastage->count(),
                'wastage_cost' => round($wastage->sum($wastageCost), 2),
            ],
            'period' => ['start' => $startDate, 'end' => $endDate],
            'wastage_by_reason' => $wastage->groupBy('reason')->map(fn ($rows, $reason) => [
                'reason' => $reason, 'count' => $rows->count(),
                'quantity' => (float) $rows->sum('quantity'), 'cost' => round($rows->sum($wastageCost), 2),
            ])->values(),
            'low_stock_items' => $lowStockItems->map(fn ($i) => [
                'id' => $i->id,
                'name' => $i->name,
                'current_stock' => (float) $i->current_stock,
                'minimum_stock' => (float) $i->minimum_stock,
                'unit_cost' => (float) $i->cost_per_unit,
                'unit' => $i->unit,
            ]),
        ]);
    }

    public function staff(Request $request): JsonResponse
    {
        [$startDt, $endDt, $startDate, $endDate] = $this->parseDateRange($request);

        $staffProfiles = \App\Models\StaffProfile::with('user.roles')->get();
        $attendance = \App\Models\Attendance::whereBetween('clock_in', [$startDt, $endDt])->get();
        $shifts = \App\Models\ShiftSchedule::whereBetween('date', [$startDate, $endDate])->get();
        $attendanceSummary = function ($rows) {
            $counts = $rows->countBy('status');
            $present = ($counts['present'] ?? 0) + ($counts['late'] ?? 0) + ($counts['half_day'] ?? 0);
            return [
                'total_records' => $rows->count(), 'present' => $counts['present'] ?? 0,
                'absent' => $counts['absent'] ?? 0, 'late' => $counts['late'] ?? 0,
                'on_leave' => $counts['on_leave'] ?? 0,
                'attendance_rate' => $rows->count() ? round($present / $rows->count() * 100, 1) : null,
            ];
        };
        $staffData = $staffProfiles->map(function ($staff) use ($startDt, $endDt, $attendance, $shifts, $attendanceSummary) {
            if (!$staff->user_id) {
                return null;
            }
            $ordersQ = \App\Models\Order::where('created_by', $staff->user_id)
                ->where('status', 'completed')->where('payment_status', 'paid')
                ->whereBetween('created_at', [$startDt, $endDt]);
            $totalOrders = (int) $ordersQ->count();
            $totalSales = (float) $ordersQ->sum('total');
            if ($totalOrders === 0) {
                return null;
            }
            return [
                'staff_id' => $staff->id,
                'name' => $staff->user?->name ?? 'Unknown',
                'position' => $staff->position ?? '',
                'total_orders' => $totalOrders,
                'total_sales' => $totalSales,
                'orders_handled' => $totalOrders,
                'revenue_generated' => $totalSales,
                'avg_ticket' => $totalOrders > 0 ? round($totalSales / $totalOrders, 2) : 0,
                'role' => $staff->user?->roles->first()?->name,
                'attendance_rate' => $attendanceSummary($attendance->where('staff_id', $staff->id))['attendance_rate'],
                'shifts_scheduled' => $shifts->where('staff_id', $staff->id)->count(),
            ];
        })->filter()->sortByDesc('total_sales')->values();

        return $this->success([
            'period' => ['start' => $startDate, 'end' => $endDate],
            'staff_performance' => $staffData,
            'performance_ranking' => $staffData,
            'total_staff' => $staffProfiles->count(),
            'active_staff' => $staffProfiles->where('is_active', true)->count(),
            'attendance_summary' => $attendanceSummary($attendance),
        ]);
    }

    public function tax(Request $request): JsonResponse
    {
        [$startDt, $endDt, $startDate, $endDate] = $this->parseDateRange($request);

        $taxData = $this->qualifyingOrders()->whereBetween('created_at', [$startDt, $endDt])
            ->selectRaw("date(created_at) as date, sum(tax_amount) as tax_collected")
            ->groupBy('date')->orderBy('date')->get();

        $totalTax = $taxData->sum('tax_collected');

        return $this->success([
            'period' => ['start' => $startDate, 'end' => $endDate],
            'summary' => [
                'total_tax_collected' => round((float) $totalTax, 2),
                'note' => 'Tax is based on stored order tax; refunded tax reversal not separately tracked.',
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
            'start_date' => 'required|date_format:Y-m-d',
            'end_date' => 'required|date_format:Y-m-d|after_or_equal:start_date',
            'group_by' => 'sometimes|string|in:day,week,month',
        ]);

        [$startDt, $endDt] = [Carbon::parse($validated['start_date'])->startOfDay(), Carbon::parse($validated['end_date'])->endOfDay()];
        $groupBy = $validated['group_by'] ?? 'day';

        if ($validated['metric'] === 'revenue') {
            $daily = $this->revenue($request)->getData(true)['data']['daily'];
            $data = collect($daily)->groupBy(function ($row) use ($groupBy) {
                $date = Carbon::parse($row['date']);
                return match ($groupBy) {
                    'week' => $date->startOfWeek()->toDateString(),
                    'month' => $date->startOfMonth()->toDateString(),
                    default => $date->toDateString(),
                };
            })->sortKeys()->map(fn ($rows, $period) => (object) [
                'period' => $period, 'value' => $rows->sum('revenue'), 'count' => $rows->sum('orders'),
            ])->values();

            return $this->success([
                'metric' => 'revenue',
                'items' => $data->map(fn ($row) => [
                    'period' => Carbon::parse($row->period)->toDateString(),
                    'value' => (float) $row->value,
                    'count' => (int) $row->count,
                ]),
            ]);
        }

        if ($validated['metric'] === 'orders') {
            $query = $this->qualifyingOrders()->whereBetween('created_at', [$startDt, $endDt]);
            $rows = $query->get(['created_at']);
            $groupFormat = match ($groupBy) {
                'week' => 'o-W',
                'month' => 'Y-m',
                default => 'Y-m-d',
            };
            $data = $rows->groupBy(fn ($order) => $order->created_at->format($groupFormat))->sortKeys()->map(function ($group) use ($groupBy) {
                $anchor = $group->first()->created_at->copy();
                $label = match ($groupBy) {
                    'week' => $anchor->startOfWeek()->toDateString(),
                    'month' => $anchor->startOfMonth()->toDateString(),
                    default => $anchor->toDateString(),
                };
                return (object) ['period' => $label, 'count' => $group->count()];
            })->values();

            return $this->success([
                'metric' => 'orders',
                'items' => $data->map(fn ($row) => [
                    'period' => Carbon::parse($row->period)->toDateString(),
                    'count' => (int) $row->count,
                ]),
            ]);
        }

        return $this->error('Custom report for ' . $validated['metric'] . ' is not implemented.', 501);
    }

    public function export(Request $request): \Symfony\Component\HttpFoundation\Response
    {
        $validated = $request->validate([
            'type' => 'required|string|in:revenue,sales,menu,customers,inventory,staff,tax',
            'start_date' => 'required|date_format:Y-m-d',
            'end_date' => 'required|date_format:Y-m-d|after_or_equal:start_date',
            'format' => 'sometimes|string|in:csv,json',
        ]);

        $format = $validated['format'] ?? 'csv';
        $start = $validated['start_date'];
        $end = $validated['end_date'];
        $type = $validated['type'];

        $dataReq = new Request(['start_date' => $start, 'end_date' => $end]);
        $reportData = match ($type) {
            'revenue' => $this->revenue($dataReq)->getData(true)['data'] ?? [],
            'sales' => $this->sales($dataReq)->getData(true)['data'] ?? [],
            'menu' => $this->menuPerformance($dataReq)->getData(true)['data'] ?? [],
            'customers' => $this->customerAnalytics($dataReq)->getData(true)['data'] ?? [],
            'inventory' => $this->inventory($dataReq)->getData(true)['data'] ?? [],
            'staff' => $this->staff($dataReq)->getData(true)['data'] ?? [],
            'tax' => $this->tax($dataReq)->getData(true)['data'] ?? [],
            default => null,
        };

        if ($reportData === null) {
            return $this->error('Export type not supported.', 422);
        }

        if ($format === 'json') {
            return Response::json($reportData, 200, [
                'Content-Disposition' => "attachment; filename=\"{$type}-report-{$start}-{$end}.json\"",
            ]);
        }

        $csv = $this->toCsv($type, $reportData);
        return Response::make($csv, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$type}-report-{$start}-{$end}.csv\"",
        ]);
    }

    private function toCsv(string $type, array $data): string
    {
        $stream = fopen('php://temp', 'r+');
        fwrite($stream, "\xEF\xBB\xBF");
        fputcsv($stream, ['section', 'record', 'field', 'value'], ',', '"', '');
        $write = function (array $values, string $path = '', string $record = '') use (&$write, $stream): void {
            foreach ($values as $key => $value) {
                if (is_array($value)) {
                    $write($value, is_int($key) ? $path : ltrim($path.'.'.$key, '.'), is_int($key) ? (string) ($key + 1) : $record);
                    continue;
                }
                // User-controlled names must remain text when opened in a spreadsheet.
                if (is_string($value) && preg_match('/^[\s]*[=+@-]/u', $value)) {
                    $value = "'".$value;
                }
                fputcsv($stream, [$path, $record, $key, $value], ',', '"', '');
            }
        };
        $write($data);
        rewind($stream);
        $csv = stream_get_contents($stream);
        fclose($stream);
        return $csv;
    }
}
