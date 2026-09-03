<?php

namespace App\Services;

use App\Models\Ingredient;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\StockMovement;
use App\Models\Wastage;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AiInsightService
{
    private const CACHE_TTL_SECONDS = 600;

    public function generate(string $startDate, string $endDate): array
    {
        $aggregates = $this->buildAggregates($startDate, $endDate);
        $cacheKey = 'ai_insights:' . md5($startDate . '|' . $endDate . '|' . json_encode($aggregates));

        $cached = Cache::get($cacheKey);
        if (is_array($cached)) {
            $cached['cached'] = true;
            return $cached;
        }

        $result = $this->resolveInsights($aggregates, $startDate, $endDate);

        if (($result['available'] ?? false) === true) {
            $result['generated_at'] = now()->toIso8601String();
            Cache::put($cacheKey, $result, self::CACHE_TTL_SECONDS);
        }

        return $result;
    }

    private function resolveInsights(array $aggregates, string $startDate, string $endDate): array
    {
        $key = (string) config('services.gemini.key');

        if ($key !== '') {
            $aiResult = $this->callGemini($aggregates, $startDate, $endDate);
            if (($aiResult['available'] ?? false) === true) {
                return $aiResult;
            }
        }

        return $this->buildLocalInsights($aggregates);
    }

    private function buildAggregates(string $startDate, string $endDate): array
    {
        $rangeStart = $startDate . ' 00:00:00';
        $rangeEnd = $endDate . ' 23:59:59';

        $orders = Order::whereBetween('created_at', [$rangeStart, $rangeEnd]);

        $completed = (clone $orders)->where('status', 'completed');
        $revenue = (float) (clone $completed)->sum('total');
        $orderCount = (int) (clone $completed)->count();
        $cancelledCount = (int) (clone $orders)->whereIn('status', ['cancelled', 'voided'])->count();

        $topItems = OrderItem::query()
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->where('orders.status', 'completed')
            ->whereBetween('orders.created_at', [$rangeStart, $rangeEnd])
            ->selectRaw('order_items.name, SUM(order_items.quantity) as qty, SUM(order_items.quantity * order_items.unit_price) as revenue')
            ->groupBy('order_items.name')
            ->orderByDesc('qty')
            ->limit(5)
            ->get()
            ->map(fn ($row) => [
                'name' => $row->name,
                'qty' => (int) $row->qty,
                'revenue' => round((float) $row->revenue, 2),
            ])
            ->all();

        $paymentMix = Order::query()
            ->where('orders.status', 'completed')
            ->whereBetween('orders.created_at', [$rangeStart, $rangeEnd])
            ->join('invoices', 'invoices.order_id', '=', 'orders.id')
            ->join('payments', 'payments.invoice_id', '=', 'invoices.id')
            ->selectRaw('payments.payment_method as method, SUM(payments.amount) as amount')
            ->groupBy('payments.payment_method')
            ->get()
            ->map(fn ($row) => ['method' => $row->method, 'amount' => round((float) $row->amount, 2)])
            ->all();

        $lowStock = Ingredient::where('is_active', true)
            ->whereColumn('current_stock', '<=', 'minimum_stock')
            ->orderByRaw('current_stock / NULLIF(minimum_stock, 0) ASC')
            ->limit(5)
            ->get(['name', 'current_stock', 'minimum_stock', 'unit'])
            ->map(fn ($row) => [
                'name' => $row->name,
                'current_stock' => (float) $row->current_stock,
                'minimum_stock' => (float) $row->minimum_stock,
                'unit' => $row->unit,
            ])
            ->all();

        $wastageCost = (float) Wastage::query()
            ->join('ingredients', 'wastage.ingredient_id', '=', 'ingredients.id')
            ->whereBetween('wastage.created_at', [$rangeStart, $rangeEnd])
            ->selectRaw('SUM(wastage.quantity * ingredients.cost_per_unit) as cost')
            ->value('cost');

        $stockOutCost = (float) StockMovement::where('type', 'outward')
            ->whereBetween('created_at', [$rangeStart, $rangeEnd])
            ->selectRaw('SUM(quantity * unit_cost) as cost')
            ->value('cost');

        $days = max(1, Carbon::parse($startDate)->diffInDays(Carbon::parse($endDate)) + 1);
        $prevStart = Carbon::parse($startDate)->subDays($days)->toDateString();
        $prevEnd = Carbon::parse($startDate)->subDay()->toDateString();
        $prevRevenue = (float) Order::where('status', 'completed')
            ->whereBetween('created_at', [$prevStart . ' 00:00:00', $prevEnd . ' 23:59:59'])
            ->sum('total');

        return [
            'period' => ['start_date' => $startDate, 'end_date' => $endDate],
            'sales' => [
                'revenue' => round($revenue, 2),
                'completed_orders' => $orderCount,
                'avg_order_value' => $orderCount > 0 ? round($revenue / $orderCount, 2) : 0,
                'cancelled_or_voided_orders' => $cancelledCount,
                'top_items' => $topItems,
                'payment_mix' => $paymentMix,
            ],
            'inventory' => [
                'low_stock_items' => $lowStock,
                'low_stock_count' => Ingredient::where('is_active', true)
                    ->whereColumn('current_stock', '<=', 'minimum_stock')->count(),
                'wastage_cost' => round($wastageCost, 2),
                'stock_usage_cost' => round($stockOutCost ?? 0, 2),
            ],
            'comparison' => [
                'previous_period' => ['start_date' => $prevStart, 'end_date' => $prevEnd],
                'previous_revenue' => round($prevRevenue, 2),
                'revenue_change_pct' => $prevRevenue > 0 ? round((($revenue - $prevRevenue) / $prevRevenue) * 100, 1) : null,
            ],
        ];
    }

    private function buildLocalInsights(array $aggregates): array
    {
        $sales = $aggregates['sales'];
        $inventory = $aggregates['inventory'];
        $comparison = $aggregates['comparison'];

        $currency = 'PHP ';
        $money = fn (float $amount): string => $currency . number_format($amount, 2);

        $summaryParts = [];
        if ($sales['completed_orders'] > 0) {
            $summaryParts[] = sprintf(
                '%d completed orders generated %s in revenue with an average order value of %s.',
                $sales['completed_orders'],
                $money($sales['revenue']),
                $money($sales['avg_order_value'])
            );
        } else {
            $summaryParts[] = 'No completed orders were recorded for this period.';
        }

        $changePct = $comparison['revenue_change_pct'] ?? null;
        if ($changePct !== null) {
            $summaryParts[] = $changePct >= 0
                ? sprintf('Revenue is up %.1f%% versus the previous comparable period.', $changePct)
                : sprintf('Revenue declined %.1f%% versus the previous comparable period.', abs($changePct));
        }

        if ($inventory['low_stock_count'] > 0) {
            $summaryParts[] = sprintf('%d ingredient(s) need restocking attention.', $inventory['low_stock_count']);
        }

        $salesInsights = [];
        if (($top = $sales['top_items'][0] ?? null) !== null) {
            $salesInsights[] = sprintf(
                'Best seller: %s — %d units sold (%s revenue).',
                $top['name'],
                $top['qty'],
                $money($top['revenue'])
            );

            if (count($sales['top_items']) > 1) {
                $runnerUp = $sales['top_items'][1];
                $salesInsights[] = sprintf(
                    '%s follows with %d units (%s revenue).',
                    $runnerUp['name'],
                    $runnerUp['qty'],
                    $money($runnerUp['revenue'])
                );
            }
        }

        if (($method = $sales['payment_mix'][0] ?? null) !== null) {
            $totalCollected = array_sum(array_column($sales['payment_mix'], 'amount'));
            $share = $totalCollected > 0 ? round(($method['amount'] / $totalCollected) * 100) : 0;
            $salesInsights[] = sprintf(
                'Preferred payment method: %s, accounting for about %d%% of collections.',
                ucwords(str_replace('_', ' ', (string) $method['method'])),
                $share
            );
        }

        $inventoryInsights = [];
        foreach (array_slice($inventory['low_stock_items'], 0, 3) as $item) {
            $inventoryInsights[] = sprintf(
                '%s is at %s%s — below its minimum of %s%s.',
                $item['name'],
                rtrim(rtrim(number_format($item['current_stock'], 2), '0'), '.'),
                $item['unit'],
                rtrim(rtrim(number_format($item['minimum_stock'], 2), '0'), '.'),
                $item['unit']
            );
        }

        if ($inventory['wastage_cost'] > 0) {
            $inventoryInsights[] = sprintf('Wastage cost recorded this period: %s.', $money($inventory['wastage_cost']));
        }

        if ($inventoryInsights === []) {
            $inventoryInsights[] = 'Inventory levels are healthy — nothing is below minimum stock.';
        }

        $risks = [];
        if ($inventory['low_stock_count'] > 0) {
            $risks[] = sprintf('%d ingredient(s) at or below minimum stock could cause menu-item stockouts.', $inventory['low_stock_count']);
        }

        $attempted = $sales['completed_orders'] + $sales['cancelled_or_voided_orders'];
        if ($attempted > 0 && $sales['cancelled_or_voided_orders'] / $attempted > 0.05) {
            $rate = round(($sales['cancelled_or_voided_orders'] / $attempted) * 100, 1);
            $risks[] = sprintf('Cancellation rate is %.1f%% (%d of %d orders), above the healthy 5%% threshold.', $rate, $sales['cancelled_or_voided_orders'], $attempted);
        }

        if (
            $sales['revenue'] > 0
            && $inventory['wastage_cost'] / max($sales['revenue'], 0.01) > 0.02
        ) {
            $risks[] = 'Wastage cost exceeds 2% of revenue — review portioning and storage practices.';
        }

        if ($risks === []) {
            $risks[] = 'No significant operational risks detected for this period.';
        }

        $recommendations = [];
        $restockNames = array_slice(array_column($inventory['low_stock_items'], 'name'), 0, 2);
        if ($restockNames !== []) {
            $recommendations[] = sprintf('Reorder %s before they run out.', implode(' and ', $restockNames));
        }

        if (($best = $sales['top_items'][0] ?? null) !== null) {
            $recommendations[] = sprintf('Feature "%s" in promos or combos to maximize proven demand.', $best['name']);
        }

        if ($changePct !== null && $changePct < 0) {
            $recommendations[] = 'Launch a targeted promo or discount campaign to recover the revenue dip.';
        }

        if ($attempted > 0 && $sales['cancelled_or_voided_orders'] / $attempted > 0.05) {
            $recommendations[] = 'Investigate common cancellation reasons with staff to reduce order fallout.';
        }

        if ($recommendations === []) {
            $recommendations[] = 'Maintain current operations — performance metrics look stable.';
        }

        return [
            'available' => true,
            'summary' => implode(' ', $summaryParts),
            'sales_insights' => $salesInsights,
            'inventory_insights' => $inventoryInsights,
            'risks' => $risks,
            'recommendations' => $recommendations,
            'confidence' => $this->localConfidence($sales['completed_orders'], $changePct),
            'cached' => false,
        ];
    }

    private function localConfidence(int $orderCount, ?float $changePct): string
    {
        if ($orderCount >= 30) {
            return $changePct !== null ? 'high' : 'medium';
        }

        if ($orderCount >= 10) {
            return 'medium';
        }

        return 'low';
    }

    private function callGemini(array $aggregates, string $startDate, string $endDate): array
    {
        $model = (string) config('services.gemini.model', 'gemini-3.1-flash-lite');
        $key = (string) config('services.gemini.key');

        $prompt = "You are a restaurant business analyst. Today is " . now()->toDateString() . ".\n"
            . "Analyze the following authoritative metrics from our restaurant management system "
            . "for the period {$startDate} to {$endDate}.\n\n"
            . json_encode($aggregates) . "\n\n"
            . "Reply with ONLY a valid JSON object (no markdown fences) with exactly these keys:\n"
            . '{"summary": string (2-3 sentence executive summary), '
            . '"sales_insights": string[] (2-4 items), '
            . '"inventory_insights": string[] (2-4 items), '
            . '"risks": string[] (1-3 items), '
            . '"recommendations": string[] (2-4 actionable items), '
            . '"confidence": "low"|"medium"|"high" based on data volume and consistency}';

        try {
            $response = Http::timeout(25)
                ->acceptJson()
                ->post("https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$key}", [
                    'contents' => [['parts' => [['text' => $prompt]]]],
                    'generationConfig' => [
                        'temperature' => 0.4,
                        'responseMimeType' => 'application/json',
                    ],
                ]);
        } catch (\Throwable $e) {
            Log::warning('Gemini insights request failed', ['error' => $e->getMessage()]);
            return $this->buildLocalInsights($aggregates);
        }

        if ($response->failed()) {
            Log::warning('Gemini insights returned error status', ['status' => $response->status()]);
            return $this->buildLocalInsights($aggregates);
        }

        $text = $response->json('candidates.0.content.parts.0.text');
        if (! is_string($text) || trim($text) === '') {
            return $this->buildLocalInsights($aggregates);
        }

        $decoded = json_decode(trim($text), true);
        if (! is_array($decoded)) {
            return $this->buildLocalInsights($aggregates);
        }

        return [
            'available' => true,
            'summary' => (string) ($decoded['summary'] ?? ''),
            'sales_insights' => array_values(array_filter(array_map('strval', (array) ($decoded['sales_insights'] ?? [])))),
            'inventory_insights' => array_values(array_filter(array_map('strval', (array) ($decoded['inventory_insights'] ?? [])))),
            'risks' => array_values(array_filter(array_map('strval', (array) ($decoded['risks'] ?? [])))),
            'recommendations' => array_values(array_filter(array_map('strval', (array) ($decoded['recommendations'] ?? [])))),
            'confidence' => in_array($decoded['confidence'] ?? '', ['low', 'medium', 'high'], true)
                ? $decoded['confidence']
                : 'medium',
            'cached' => false,
        ];
    }
}
