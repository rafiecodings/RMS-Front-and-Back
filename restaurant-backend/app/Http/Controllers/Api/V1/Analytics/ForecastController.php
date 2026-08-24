<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Analytics;

use App\Http\Controllers\Controller;
use App\Models\MenuItem;
use App\Models\OrderItem;
use App\Services\AiInsightService;
use App\Services\LowStockProjectionService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ForecastController extends Controller
{
    protected const MAX_HISTORY_DAYS = 730;

    public function forecast(Request $request, string $menuItemId): JsonResponse
    {
        $validated = $request->validate([
            'horizon' => ['sometimes', 'integer', 'in:7,14,30'],
        ]);

        $horizon = (int) ($validated['horizon'] ?? 7);

        if (! MenuItem::whereKey($menuItemId)->exists()) {
            return $this->notFound('Menu item not found');
        }

        $rows = OrderItem::query()
            ->selectRaw('DATE(order_items.created_at) as date, SUM(order_items.quantity) as qty')
            ->where('order_items.menu_item_id', $menuItemId)
            ->whereBetween('order_items.created_at', [
                now()->subDays(self::MAX_HISTORY_DAYS - 1)->startOfDay(),
                now()->endOfDay(),
            ])
            ->whereHas('order', function ($query) {
                $query->where('status', 'completed')
                    ->where('payment_status', 'paid');
            })
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        if ($rows->isEmpty()) {
            return $this->error('No historical sales data for this menu item', 422);
        }

        $values = $rows->map(fn ($row) => (int) $row->qty)->implode(',');

        $payload = $this->fallbackForecast($menuItemId, $horizon, $values);

        return $this->success($payload, 'Forecast generated successfully');
    }

    public function lowStockProjection(Request $request, LowStockProjectionService $service): JsonResponse
    {
        $validated = $request->validate([
            'horizon' => ['sometimes', 'integer', 'in:7,14,30'],
        ]);

        $horizon = (int) ($validated['horizon'] ?? 7);

        $items = $service->project($horizon);
        $countBySeverity = fn (string $severity) => count(
            array_filter($items, fn (array $item) => $item['severity'] === $severity)
        );

        return $this->success([
            'horizon_days' => $horizon,
            'summary' => [
                'total' => count($items),
                'out_of_stock' => $countBySeverity('out_of_stock'),
                'low' => $countBySeverity('low'),
                'critical' => $countBySeverity('critical'),
                'high' => $countBySeverity('high'),
                'medium' => $countBySeverity('medium'),
            ],
            'items' => $items,
        ], 'Low stock projection generated successfully');
    }

    public function insights(Request $request, AiInsightService $service): JsonResponse
    {
        $validated = $request->validate([
            'start_date' => ['required', 'date_format:Y-m-d'],
            'end_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:start_date'],
        ]);

        return $this->success(
            $service->generate($validated['start_date'], $validated['end_date']),
            'AI insights generated successfully'
        );
    }

    protected function fallbackForecast(string $menuItemId, int $horizon, string $values): array
    {
        $last = $this->lastSevenDayAverage($values);

        $predictions = [];
        $start = now()->addDay()->startOfDay();

        for ($i = 0; $i < $horizon; $i++) {
            $spread = max($last * 0.15, 1.0);
            $predictions[] = [
                'date' => $start->copy()->addDays($i)->toDateString(),
                'qty' => round($last, 2),
                'lower_ci' => round(max(0.0, $last - 1.96 * $spread), 2),
                'upper_ci' => round($last + 1.96 * $spread, 2),
            ];
        }

        return [
            'item_id' => $menuItemId,
            'horizon' => $horizon,
            'model' => 'naive',
            'fallback' => true,
            'predictions' => $predictions,
        ];
    }

    protected function lastSevenDayAverage(string $values): float
    {
        $numbers = collect(explode(',', $values))
            ->map(fn ($value) => (float) $value)
            ->filter(fn ($value) => $value >= 0)
            ->values();

        if ($numbers->isEmpty()) {
            return 0.0;
        }

        return (float) $numbers->splice(-7)->avg();
    }
}
