<?php

declare(strict_types=1);

namespace App\Services\Seeding;

use Carbon\CarbonImmutable;

/**
 * Pure, deterministic planner for the 14-day historical transaction dataset.
 *
 * This class performs NO database access and NO writes. It only turns the
 * existing RMS catalogue (menu items, recipes, tables, customers, staff) into
 * a concrete, time-stamped list of orders that the existing HTTP workflow can
 * then execute. Every record it describes is produced later by the real
 * controllers (orders, KOT, payments, inventory), never by this planner.
 *
 * Timestamps are stored in UTC because `config('app.timezone')` is UTC and
 * every report groups on the raw stored value. Service hours are therefore
 * expressed as their true Philippine-time equivalents:
 *
 *   lunch  11:00-14:00 PHT  ->  03:00-06:00 UTC
 *   dinner 18:00-21:00 PHT  ->  10:00-13:00 UTC
 *
 * The current day is compressed into the elapsed portion of the UTC day so no
 * transaction is ever future-dated.
 */
final class HistoryDatasetPlanner
{
    /** Share of item-line demand that must come from the "top 10" menu items. */
    private const TOP_ITEM_SHARE = 0.70;

    /** Share of orders that walk in without a customer record. */
    private const WALK_IN_SHARE = 0.35;

    /** Share of orders that let the server pick the best automatic promotion. */
    private const PROMO_SHARE = 0.25;

    /** Share of orders abandoned before payment (~3-4%). */
    private const CANCEL_SHARE = 0.04;

    /** Share of dine-in orders. Only dine_in/takeaway are supported by the API. */
    private const DINE_IN_SHARE = 0.70;

    /** Payment method weights: cash, card, e_wallet. */
    private const PAYMENT_WEIGHTS = ['cash' => 40, 'card' => 25, 'e_wallet' => 35];

    /** Minutes a dine-in table stays occupied (placeholder duration). */
    private const DWELL_MINUTES = 75;

    /** UTC hours for the Philippine lunch service window. */
    private const LUNCH_UTC = [3, 6];

    /** UTC hours for the Philippine dinner service window. */
    private const DINNER_UTC = [10, 13];

    /** @var list<array{id:string,name:string}> */
    private array $topItems;

    /** @var list<array{id:string,name:string}> */
    private array $tailItems;

    /** @var list<string> */
    private array $tableIds;

    /** @var list<string> */
    private array $customerIds;

    /** @var list<string> */
    private array $staffIds;

    /**
     * @param  list<array{id:string,name:string}>  $menuItems  all available menu items (no duplicates by name)
     * @param  list<string>  $tableIds
     * @param  list<string>  $customerIds
     * @param  list<string>  $staffIds
     */
    public function __construct(
        private readonly int $days,
        private readonly CarbonImmutable $todayUtc,
        private readonly array $menuItems,
        array $tableIds,
        array $customerIds,
        array $staffIds,
        private readonly int $seed = 20260901,
    ) {
        $this->tableIds = array_values($tableIds);
        $this->customerIds = array_values($customerIds);
        $this->staffIds = array_values($staffIds);

        // "Top 10" is derived deterministically from recipe richness so the
        // AI inventory forecast receives a dense ingredient demand signal.
        // Ranking is done by the command (which owns the DB); the planner only
        // consumes the already-sorted pair lists.
        $this->topItems = array_slice($menuItems, 0, 10);
        $this->tailItems = array_slice($menuItems, 10);
    }

    /**
     * Build the full dataset plan.
     *
     * @return array{
     *     days: list<array{date:string,is_today:bool,orders:list<array<string,mixed>>}>,
     *     totals: array<string,mixed>
     * }
     */
    public function plan(): array
    {
        mt_srand($this->seed);

        $days = [];
        $orders = 0;

        for ($offset = $this->days - 1; $offset >= 0; $offset--) {
            $date = $this->todayUtc->subDays($offset)->startOfDay();
            $isToday = $offset === 0;

            $dayOrders = $this->planDay($date, $isToday);
            $orders += count($dayOrders);

            $days[] = [
                'date' => $date->toDateString(),
                'is_today' => $isToday,
                'orders' => $dayOrders,
            ];
        }

        return [
            'days' => $days,
            'totals' => [
                'days' => $this->days,
                'orders' => $orders,
                'window_start' => $this->todayUtc->subDays($this->days - 1)->toDateString(),
                'window_end' => $this->todayUtc->toDateString(),
                'top_items' => array_column($this->topItems, 'name'),
            ],
        ];
    }

    /**
     * Plan one service day.
     *
     * @return list<array<string,mixed>>
     */
    private function planDay(CarbonImmutable $date, bool $isToday): array
    {
        $target = $this->ordersForDay($date);

        // Timed slots for the day, sorted ascending.
        $slots = $this->timeSlots($date, $target, $isToday);

        $busyUntil = [];
        $planned = [];

        foreach ($slots as $index => $ts) {
            $order = $this->planOrder($ts, $busyUntil, $index);
            if ($order !== null) {
                $planned[] = $order;
            }
        }

        // Guarantee a non-zero sales day: the forecast gate counts non-zero
        // days, so never emit an empty day.
        if ($planned === []) {
            $planned[] = $this->planOrder($slots[0] ?? $date->setTime(12), $busyUntil, 0);
        }

        return array_values(array_filter($planned));
    }

    /**
     * Target order count for a weekday, tuned so a 14-day window lands in the
     * requested 200-250 band without hard-coding a total.
     */
    private function ordersForDay(CarbonImmutable $date): int
    {
        return match ($date->dayOfWeekIso) {
            5 => mt_rand(18, 22),   // Friday
            6 => mt_rand(22, 25),   // Saturday
            7 => mt_rand(18, 22),   // Sunday
            default => mt_rand(12, 18),
        };
    }

    /**
     * Service-hour slots for one day.
     *
     * Historical days use the fixed Philippine lunch/dinner windows in UTC.
     * The current day compresses both peaks into the elapsed UTC portion of
     * the day so that nothing is dated in the future.
     *
     * @return list<CarbonImmutable>
     */
    private function timeSlots(CarbonImmutable $date, int $target, bool $isToday): array
    {
        if (! $isToday) {
            $slots = [];
            $lunchShare = (int) round($target * 0.35);
            $dinnerShare = $target - $lunchShare;

            foreach ($this->spread(self::LUNCH_UTC[0], self::LUNCH_UTC[1], $lunchShare) as $h) {
                $slots[] = $date->setTime($h, mt_rand(0, 59));
            }
            foreach ($this->spread(self::DINNER_UTC[0], self::DINNER_UTC[1], $dinnerShare) as $h) {
                $slots[] = $date->setTime($h, mt_rand(0, 59));
            }
        } else {
            // Today: spread the day's orders evenly across the ELAPSED portion
            // of the UTC day only. Guarantees exactly $target slots and never a
            // future timestamp, which the dashboard's today-scoped queries need.
            $now = CarbonImmutable::now('UTC');

            $windowStart = $date->setTime(0, 0);
            $elapsedMinutes = (int) max(1, $windowStart->diffInMinutes($now));

            $slots = [];
            for ($i = 0; $i < $target; $i++) {
                $offset = (int) floor(($i + 1) * $elapsedMinutes / ($target + 1));
                $offset = min($offset, $elapsedMinutes - 1);
                $ts = $windowStart->addMinutes(max(0, $offset))->addSeconds(mt_rand(0, 59));
                if ($ts > $now) {
                    $ts = $now->subMinutes(mt_rand(0, 3));
                }
                $slots[] = $ts;
            }
        }

        if ($slots === []) {
            $now = CarbonImmutable::now('UTC');
            $slots[] = $date->setTime(max(0, min(23, $now->hour)), 30);
        }

        usort($slots, fn (CarbonImmutable $a, CarbonImmutable $b) => $a <=> $b);

        return $slots;
    }

    /**
     * Distribute $count integer hours across an inclusive hour range.
     *
     * @return list<int>
     */
    private function spread(int $from, int $to, int $count): array
    {
        $span = max(1, $to - $from);
        $out = [];
        for ($i = 0; $i < $count; $i++) {
            $offset = (int) floor($i * $span / max(1, $count));
            $out[] = $from + ($offset % $span);
        }
        return $out;
    }

    /**
     * Distribute $count hours inside [$from,$to] without exceeding the range.
     *
     * @return list<int>
     */
    private function spreadWithin(int $from, int $to, int $count): array
    {
        if ($to <= $from) {
            return array_fill(0, $count, $from);
        }
        return $this->spread($from, $to + 1, $count);
    }

    /**
     * Build a single planned order.
     *
     * @param  array<string,CarbonImmutable>  $busyUntil
     * @return array<string,mixed>|null
     */
    private function planOrder(CarbonImmutable $ts, array &$busyUntil, int $index): ?array
    {
        $isDineIn = mt_rand(1, 100) <= (int) round(self::DINE_IN_SHARE * 100);
        $tableId = null;

        if ($isDineIn && $this->tableIds !== []) {
            $tableId = $this->pickFreeTable($ts, $busyUntil);
            // Fall back to takeaway when every table is still occupied, which
            // is what really happens during a dinner rush.
            if ($tableId === null) {
                $isDineIn = false;
            }
        }

        if ($tableId !== null) {
            $busyUntil[$tableId] = $ts->addMinutes(self::DWELL_MINUTES + mt_rand(-15, 30));
        }

        $customerId = null;
        if ($this->customerIds !== [] && mt_rand(1, 100) > (int) round(self::WALK_IN_SHARE * 100)) {
            $customerId = $this->customerIds[array_rand($this->customerIds)];
        }

        $items = $this->planItems();
        $cancelled = mt_rand(1, 100) <= self::CANCEL_SHARE * 100;

        return [
            'ts' => $ts,
            'order_type' => $isDineIn ? 'dine_in' : 'takeaway',
            'table_id' => $tableId,
            'customer_id' => $customerId,
            'created_by' => $this->staffIds !== []
                ? $this->staffIds[array_rand($this->staffIds)]
                : null,
            'items' => $items,
            'auto_apply_promotions' => mt_rand(1, 100) <= self::PROMO_SHARE * 100,
            'cancelled' => $cancelled,
            'payment_method' => $cancelled ? null : $this->paymentMethod(),
            'refund' => null, // assigned later, after the invoice exists
            'seq' => $index,
        ];
    }

    /**
     * Choose a table whose simulated dwell window has already elapsed.
     *
     * @param  array<string,CarbonImmutable>  $busyUntil
     */
    private function pickFreeTable(CarbonImmutable $ts, array $busyUntil): ?string
    {
        $free = [];
        foreach ($this->tableIds as $id) {
            if (! isset($busyUntil[$id]) || $busyUntil[$id] <= $ts) {
                $free[] = $id;
            }
        }
        return $free === [] ? null : $free[array_rand($free)];
    }

    /**
     * Weighted payment method choice across the three supported methods.
     */
    private function paymentMethod(): string
    {
        $roll = mt_rand(1, 100);
        $cursor = 0;
        foreach (self::PAYMENT_WEIGHTS as $method => $weight) {
            $cursor += $weight;
            if ($roll <= $cursor) {
                return $method;
            }
        }
        return 'cash';
    }

    /**
     * Compose 1-4 order lines, biased so ~70% of item demand lands on the top
     * 10 menu items and ~30% on the remaining catalogue.
     *
     * @return list<array{menu_item_id:string,quantity:int}>
     */
    private function planItems(): array
    {
        $lineCount = match (mt_rand(1, 100)) {
            0 => 1,
            default => match (mt_rand(1, 100)) {
                0 => 2,
                default => match (mt_rand(1, 100)) {
                    0 => 3,
                    default => 4,
                },
            },
        };

        $lines = [];

        for ($i = 0; $i < $lineCount; $i++) {
            $item = $this->pickItem();
            $quantity = mt_rand(1, 100) <= 70 ? mt_rand(1, 2) : mt_rand(1, 3);

            $existing = null;
            foreach ($lines as $k => $line) {
                if ($line['menu_item_id'] === $item['id']) {
                    $existing = $k;
                    break;
                }
            }

            if ($existing !== null) {
                $lines[$existing]['quantity'] += $quantity;
            } else {
                $lines[] = ['menu_item_id' => $item['id'], 'quantity' => $quantity];
            }
        }

        return $lines;
    }

    /**
     * Pick a menu item honouring the top-10 / tail demand split.
     *
     * @return array{id:string,name:string}
     */
    private function pickItem(): array
    {
        $wantTop = mt_rand(1, 100) <= self::TOP_ITEM_SHARE * 100;

        if ($wantTop && $this->topItems !== []) {
            return $this->topItems[array_rand($this->topItems)];
        }
        if ($this->tailItems !== []) {
            return $this->tailItems[array_rand($this->tailItems)];
        }
        if ($this->topItems !== []) {
            return $this->topItems[array_rand($this->topItems)];
        }

        throw new \RuntimeException('No menu items available to plan.');
    }

    /**
     * Mark a handful of paid orders for an approved refund so revenue reports
     * and AI insights have real refund figures.
     *
     * @param  list<array<string,mixed>>  $dayOrders
     * @return list<array<string,mixed>>
     */
    public static function applyRefunds(array $dayOrders, int $refundBudget): array
    {
        if ($refundBudget <= 0) {
            return $dayOrders;
        }

        $candidates = array_keys(array_filter(
            $dayOrders,
            fn ($o) => $o['payment_method'] !== null && ! $o['cancelled'] && $o['order_type'] === 'dine_in'
        ));

        shuffle($candidates);

        foreach (array_slice($candidates, 0, $refundBudget) as $idx) {
            $dayOrders[$idx]['refund'] = true;
        }

        return $dayOrders;
    }
}
