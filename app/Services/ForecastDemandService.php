<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\OrderItem;
use Illuminate\Support\Collection;

class ForecastDemandService
{
    protected const LOOKBACK_DAYS = 30;

    /**
     * Return per-menu-item forecast and historical daily demand.
     * Uses historical average as forecast (naive implementation).
     *
     * @return array<string, array{forecast: float, historical: float}>
     */
    public function dailyDemand(Collection $menuItemIds, int $horizon = 7): array
    {
        if ($menuItemIds->isEmpty()) {
            return [];
        }

        $series = $this->buildSeries($menuItemIds);

        $result = [];
        foreach ($menuItemIds as $itemId) {
            $historical = $this->lastSevenDayAverage($series['items'][$itemId] ?? []);
            $result[$itemId] = [
                'forecast' => $historical,
                'historical' => $historical,
            ];
        }

        return $result;
    }

    public function classifyTrend(float $forecast, float $historical): string
    {
        if ($historical <= 0) {
            return 'stable';
        }

        $ratio = $forecast / $historical;

        return match (true) {
            $ratio >= 1.15 => 'rising',
            $ratio <= 0.85 => 'falling',
            default => 'stable',
        };
    }

    /**
     * Build a zero-filled daily series for each menu item over the last 30 days.
     *
     * @return array{dates: string[], items: array<string, float[]>}
     */
    public function buildSeries(Collection $menuItemIds): array
    {
        $start = now()->subDays(self::LOOKBACK_DAYS - 1)->startOfDay();
        $end = now()->endOfDay();

        $dates = [];
        $period = $start->copy();
        while ($period <= $end) {
            $dates[] = $period->toDateString();
            $period->addDay();
        }

        $items = [];
        foreach ($menuItemIds as $itemId) {
            $items[$itemId] = array_fill(0, count($dates), 0.0);
        }

        if ($menuItemIds->isEmpty()) {
            return ['dates' => $dates, 'items' => $items];
        }

        $rows = OrderItem::query()
            ->selectRaw('order_items.menu_item_id, DATE(order_items.created_at) as date, SUM(order_items.quantity) as qty')
            ->whereIn('order_items.menu_item_id', $menuItemIds)
            ->whereBetween('order_items.created_at', [$start, $end])
            ->whereHas('order', function ($query) {
                $query->where('status', 'completed')
                    ->where('payment_status', 'paid');
            })
            ->groupBy('order_items.menu_item_id', 'date')
            ->get();

        $dateIndex = array_flip($dates);
        foreach ($rows as $row) {
            if (isset($items[$row->menu_item_id], $dateIndex[$row->date])) {
                $items[$row->menu_item_id][$dateIndex[$row->date]] = (float) $row->qty;
            }
        }

        return ['dates' => $dates, 'items' => $items];
    }

    /**
     * @param  float[]  $values
     */
    protected function lastSevenDayAverage(array $values): float
    {
        $recent = array_slice($values, -7);
        $numbers = array_values(array_filter($recent, fn ($value) => $value >= 0));

        if (empty($numbers)) {
            return 0.0;
        }

        return array_sum($numbers) / count($numbers);
    }
}
