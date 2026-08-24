<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Dashboard;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Ingredient;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Reservation;
use App\Models\Table;
use App\Models\Waitlist;
use App\Models\KotTicket;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function summary(Request $request): JsonResponse
    {
        $today = now()->startOfDay();
        $yesterday = now()->subDay()->startOfDay();
        $weekStart = now()->startOfWeek();
        $monthStart = now()->startOfMonth();

        $todayOrders = Order::where('created_at', '>=', $today)->count();
        $todayRevenue = Order::where('created_at', '>=', $today)
            ->where('status', 'completed')
            ->sum('total');
        $yesterdayRevenue = Order::where('created_at', '>=', $yesterday)
            ->where('created_at', '<', $today)
            ->where('status', 'completed')
            ->sum('total');
        $weekRevenue = Order::where('created_at', '>=', $weekStart)
            ->where('status', 'completed')
            ->sum('total');
        $monthRevenue = Order::where('created_at', '>=', $monthStart)
            ->where('status', 'completed')
            ->sum('total');

        $comparisonPercentage = $yesterdayRevenue > 0
            ? round((($todayRevenue - $yesterdayRevenue) / $yesterdayRevenue) * 100, 1)
            : 0;

        $dailyBreakdown = Order::where('created_at', '>=', now()->subDays(7))
            ->where('status', 'completed')
            ->selectRaw("date(created_at) as date, sum(total) as amount")
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(fn ($row) => [
                'date' => Carbon::parse($row->date)->toDateString(),
                'amount' => (float) $row->amount,
            ]);

        $transactionCount = $todayOrders;
        $averageTicket = $transactionCount > 0 ? round((float) $todayRevenue / $transactionCount, 2) : 0;

        $salesByType = Order::whereDate('created_at', $today)
            ->selectRaw("order_type, count(*) as count, sum(total) as revenue")
            ->groupBy('order_type')
            ->get()
            ->map(fn ($row) => [
                'order_type' => $row->order_type,
                'count' => (int) $row->count,
                'revenue' => (float) $row->revenue,
            ]);

        $salesByPayment = Order::whereDate('created_at', $today)
            ->where('status', 'completed')
            ->whereNotNull('payment_method')
            ->selectRaw("payment_method, count(*) as count, sum(total) as revenue")
            ->groupBy('payment_method')
            ->get()
            ->map(fn ($row) => [
                'method' => $row->payment_method,
                'count' => (int) $row->count,
                'revenue' => (float) $row->revenue,
            ]);

        $activeOrders = Order::whereIn('status', ['pending', 'confirmed', 'preparing', 'ready', 'served'])->count();
        $completedToday = Order::whereDate('created_at', $today)->where('status', 'completed')->count();
        $cancelledToday = Order::whereDate('created_at', $today)->where('status', 'cancelled')->count();

        $avgPrepTime = Order::whereDate('created_at', $today)
            ->where('status', 'completed')
            ->selectRaw("avg(extract(epoch from (updated_at - created_at)) / 60) as avg_minutes")
            ->value('avg_minutes');

        $statusBreakdown = Order::whereDate('created_at', $today)
            ->selectRaw("status, count(*) as count")
            ->groupBy('status')
            ->get()
            ->map(fn ($row) => ['status' => $row->status, 'count' => (int) $row->count]);

        $tables = Table::where('is_active', true)->get();
        $totalTables = $tables->count();
        $availableTables = $tables->where('status', 'available')->count();
        $occupiedTables = $tables->where('status', 'occupied')->count();
        $reservedTables = $tables->where('status', 'reserved')->count();
        $needsCleaning = $tables->where('status', 'needs_cleaning')->count();
        $maintenanceTables = $tables->where('status', 'maintenance')->count();
        $occupancyRate = $totalTables > 0 ? round(($occupiedTables / $totalTables) * 100, 1) : 0;

        $pendingKOTs = KotTicket::whereNotIn('status', ['completed', 'voided'])->count();
        $kotAvgWait = KotTicket::where('status', 'in_progress')
            ->where('created_at', '>=', now()->subHours(2))
            ->selectRaw("avg(extract(epoch from (now() - created_at)) / 60) as avg_minutes")
            ->value('avg_minutes') ?? 0;

        $kitchenOrders = KotTicket::whereIn('status', ['received', 'in_progress', 'ready'])
            ->with(['order.table', 'items'])
            ->orderBy('created_at', 'asc')
            ->limit(10)
            ->get()
            ->map(fn ($kot) => [
                'id' => $kot->id,
                'order_number' => $kot->order ? '#' . $kot->order->order_number : '#N/A',
                'table_number' => $kot->order?->table?->number,
                'order_type' => $kot->order?->order_type ?? 'dine_in',
                'items' => $kot->items ?? [],
                'status' => $kot->status,
                'elapsed_minutes' => (int) $kot->created_at->diffInMinutes(now()),
                'priority' => $kot->priority ?? 'normal',
            ]);

        $topSellingItems = OrderItem::whereHas('order', function ($q) use ($today) {
                $q->whereDate('created_at', $today)->where('status', 'completed');
            })
            ->selectRaw("menu_item_id, name, sum(quantity) as quantity_sold, sum(total_price) as revenue")
            ->groupBy('menu_item_id', 'name')
            ->orderByDesc('quantity_sold')
            ->limit(10)
            ->get()
            ->map(fn ($item, $index) => [
                'id' => $item->menu_item_id,
                'name' => $item->name,
                'quantity_sold' => (int) $item->quantity_sold,
                'revenue' => (float) $item->revenue,
                'category' => '',
            ]);

        $peakHours = Order::whereDate('created_at', $today)
            ->where('status', 'completed')
            ->selectRaw("extract(hour from created_at) as hour, count(*) as orders, sum(total) as revenue")
            ->groupBy('hour')
            ->orderBy('hour')
            ->get()
            ->map(fn ($row) => [
                'hour' => (int) $row->hour,
                'orders' => (int) $row->orders,
                'revenue' => (float) $row->revenue,
            ]);

        $lowStockIngredients = Ingredient::where('is_active', true)
            ->whereColumn('current_stock', '<=', 'minimum_stock')
            ->get()
            ->map(fn ($ing, $index) => [
                'id' => $ing->id,
                'ingredient_name' => $ing->name,
                'current_stock' => (float) $ing->current_stock,
                'min_threshold' => (float) $ing->minimum_stock,
                'unit' => $ing->unit,
                'severity' => $ing->current_stock <= 0 ? 'out_of_stock' : ($ing->current_stock <= ($ing->minimum_stock / 2) ? 'critical' : 'low'),
                'supplier' => $ing->supplier?->name,
            ]);

        $dashboardAlerts = [];
        foreach ($lowStockIngredients as $alert) {
            $dashboardAlerts[] = [
                'id' => $alert['id'],
                'type' => 'low_inventory',
                'title' => 'Low Stock: ' . $alert['ingredient_name'],
                'message' => "{$alert['current_stock']} {$alert['unit']} remaining. Threshold is {$alert['min_threshold']} {$alert['unit']}.",
                'severity' => $alert['severity'] === 'out_of_stock' ? 'critical' : $alert['severity'],
                'created_at' => now()->toISOString(),
            ];
        }

        $upcomingReservations = Reservation::whereDate('reservation_date', today())
            ->whereNotIn('status', ['cancelled', 'no_show'])
            ->orderBy('reservation_date')
            ->limit(3)
            ->get();
        foreach ($upcomingReservations as $res) {
            $dashboardAlerts[] = [
                'id' => $res->id,
                'type' => 'reservation',
                'title' => 'Reservation at ' . Carbon::parse($res->reservation_date)->format('g:i A'),
                'message' => "{$res->guest_name} - party of {$res->party_size}",
                'severity' => 'info',
                'created_at' => $res->created_at?->toISOString() ?? now()->toISOString(),
            ];
        }

        $recentOrders = Order::with(['customer', 'table'])
            ->withCount('items')
            ->whereDate('created_at', $today)
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get()
            ->map(fn ($o) => [
                'id' => $o->id,
                'order_number' => '#' . $o->order_number,
                'customer_name' => $o->customer?->name ?? ($o->table ? 'Table ' . $o->table->number : null),
                'table_number' => $o->table?->number,
                'order_type' => $o->order_type,
                'status' => $o->status,
                'total' => (float) $o->total,
                'items_count' => $o->items_count ?? 0,
                'created_at' => $o->created_at?->toISOString(),
            ]);

        $recentActivities = Order::with(['customer', 'table'])
            ->where('created_at', '>=', now()->subHours(4))
            ->orderBy('created_at', 'desc')
            ->limit(15)
            ->get()
            ->map(fn ($o) => [
                'id' => $o->id,
                'type' => match ($o->status) {
                    'pending' => 'order_placed',
                    'completed' => 'order_completed',
                    'cancelled' => 'order_cancelled',
                    default => 'order_placed',
                },
                'message' => 'Order #' . $o->order_number . ' ' . str_replace('_', ' ', $o->status),
                'details' => ($o->table ? 'Table ' . $o->table->number . ' — ' : '') . '₱' . number_format((float) $o->total, 0),
                'created_at' => $o->created_at?->toISOString(),
            ]);

        $totalCustomers = Customer::where('is_active', true)->count();
        $todayReservations = Reservation::whereDate('reservation_date', $today)
            ->whereNotIn('status', ['cancelled', 'no_show'])
            ->count();
        $waitlistCount = Waitlist::where('status', 'waiting')->count();

        return $this->success([
            'revenue' => [
                'today' => (float) $todayRevenue,
                'yesterday' => (float) $yesterdayRevenue,
                'this_week' => (float) $weekRevenue,
                'this_month' => (float) $monthRevenue,
                'comparison_percentage' => $comparisonPercentage,
                'daily_breakdown' => $dailyBreakdown,
            ],
            'sales' => [
                'total_today' => (float) $todayRevenue,
                'transaction_count' => $transactionCount,
                'average_ticket' => $averageTicket,
                'by_type' => $salesByType,
                'by_payment' => $salesByPayment,
            ],
            'orders' => [
                'total_today' => $todayOrders,
                'active' => $activeOrders,
                'completed' => $completedToday,
                'cancelled' => $cancelledToday,
                'average_preparation_time' => round((float) ($avgPrepTime ?? 0), 1),
                'status_breakdown' => $statusBreakdown,
            ],
            'tables' => [
                'total' => $totalTables,
                'available' => $availableTables,
                'occupied' => $occupiedTables,
                'reserved' => $reservedTables,
                'needs_cleaning' => $needsCleaning,
                'maintenance' => $maintenanceTables,
                'occupancy_rate' => $occupancyRate,
            ],
            'kitchen' => [
                'queue_length' => $pendingKOTs,
                'avg_wait_time' => round((float) $kotAvgWait, 1),
                'orders_in_progress' => $kitchenOrders,
            ],
            'top_selling_items' => $topSellingItems,
            'peak_hours' => $peakHours,
            'alerts' => $dashboardAlerts,
            'inventory_alerts' => $lowStockIngredients,
            'recent_orders' => $recentOrders,
            'recent_activities' => $recentActivities,
            'meta' => [
                'total_customers' => $totalCustomers,
                'today_reservations' => $todayReservations,
                'waitlist_count' => $waitlistCount,
            ],
        ]);
    }

    public function revenue(Request $request): JsonResponse
    {
        $period = $request->input('period', 'daily');
        $startDate = $request->input('start_date', now()->subDays(30)->toDateString());
        $endDate = $request->input('end_date', now()->toDateString());

        $query = Order::where('status', 'completed')
            ->whereBetween('created_at', [$startDate, $endDate]);

        if ($period === 'daily') {
            $data = $query->selectRaw("date(created_at) as date, sum(total) as revenue, count(*) as orders")
                ->groupBy('date')
                ->orderBy('date')
                ->get();
        } elseif ($period === 'weekly') {
            $data = $query->selectRaw("date_trunc('week', created_at) as date, sum(total) as revenue, count(*) as orders")
                ->groupBy('date')
                ->orderBy('date')
                ->get();
        } else {
            $data = $query->selectRaw("date_trunc('month', created_at) as date, sum(total) as revenue, count(*) as orders")
                ->groupBy('date')
                ->orderBy('date')
                ->get();
        }

        return $this->success([
            'period' => $period,
            'items' => $data->map(fn ($row) => [
                'date' => Carbon::parse($row->date)->toDateString(),
                'revenue' => (float) $row->revenue,
                'orders' => (int) $row->orders,
            ]),
            'total_revenue' => (float) $data->sum('revenue'),
            'total_orders' => $data->sum('orders'),
        ]);
    }

    public function orders(Request $request): JsonResponse
    {
        $statusCounts = Order::selectRaw("status, count(*) as count")
            ->groupBy('status')
            ->pluck('count', 'status');

        $typeCounts = Order::whereDate('created_at', now())
            ->selectRaw("order_type, count(*) as count")
            ->groupBy('order_type')
            ->pluck('count', 'order_type');

        $avgOrderValue = Order::where('status', 'completed')
            ->whereDate('created_at', now())
            ->avg('total');

        return $this->success([
            'by_status' => $statusCounts,
            'today_by_type' => $typeCounts,
            'today_avg_order_value' => round((float) $avgOrderValue, 2),
        ]);
    }

    public function tables(Request $request): JsonResponse
    {
        $tables = Table::with('floorPlan')
            ->where('is_active', true)
            ->orderBy('number')
            ->get();

        $byStatus = $tables->groupBy('status')->map(fn ($t) => $t->count());
        $byFloor = $tables->groupBy('floorPlan.name')->map(function ($items) {
            return [
                'total' => $items->count(),
                'available' => $items->where('status', 'available')->count(),
                'occupied' => $items->where('status', 'occupied')->count(),
                'reserved' => $items->where('status', 'reserved')->count(),
            ];
        });

        return $this->success([
            'summary' => [
                'total' => $tables->count(),
                'by_status' => $byStatus,
            ],
            'by_floor' => $byFloor,
        ]);
    }

    public function alerts(Request $request): JsonResponse
    {
        $alerts = [];

        $lowStock = Ingredient::where('is_active', true)
            ->whereColumn('current_stock', '<=', 'minimum_stock')
            ->get();

        foreach ($lowStock as $ingredient) {
            $alerts[] = [
                'type' => 'low_stock',
                'severity' => 'warning',
                'message' => "{$ingredient->name} is low on stock ({$ingredient->current_stock} {$ingredient->unit})",
                'ingredient_id' => $ingredient->id,
            ];
        }

        $longPending = Order::whereIn('status', ['pending', 'preparing'])
            ->where('created_at', '<', now()->subMinutes(30))
            ->get();

        foreach ($longPending as $order) {
            $alerts[] = [
                'type' => 'long_pending_order',
                'severity' => 'critical',
                'message' => "Order {$order->order_number} has been pending for over 30 minutes",
                'order_id' => $order->id,
            ];
        }

        $waitlistLong = Waitlist::where('status', 'waiting')
            ->where('created_at', '<', now()->subMinutes(45))
            ->get();

        foreach ($waitlistLong as $w) {
            $alerts[] = [
                'type' => 'waitlist_timeout',
                'severity' => 'info',
                'message' => "{$w->guest_name} has been on waitlist for over 45 minutes",
                'waitlist_id' => $w->id,
            ];
        }

        return $this->success([
            'items' => $alerts,
            'count' => count($alerts),
        ]);
    }
}
