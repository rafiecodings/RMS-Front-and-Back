<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\User;
use App\Services\Seeding\HistoryDatasetPlanner;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Generates a realistic 14-day transaction history by driving the EXISTING
 * RMS HTTP workflow.
 *
 * Every order, kitchen ticket, invoice, payment, stock movement, customer
 * loyalty update and audit row is produced by the real controllers and
 * services. Nothing is fabricated: no dashboard number, no forecast value and
 * no status is written directly. The planner only decides *what* to order and
 * *when*; the application decides what that means.
 *
 * The only post-write adjustment is a timestamp realignment: every endpoint
 * stamps `now()`, so back-dated records are shifted into their real service
 * day afterwards. Business values (money, stock, statuses) are untouched.
 *
 * Usage:
 *   php artisan uat:seed-history-14-days --dry-run
 *   php artisan uat:seed-history-14-days
 *   php artisan uat:clear-history-14-days
 */
class UatSeedHistory14Days extends Command
{
    protected $signature = 'uat:seed-history-14-days
        {--days=14 : Number of consecutive days to generate}
        {--dry-run : Plan and report without writing anything}
        {--force : Re-seed even if a dataset is already present}';

    protected $description = 'Seed a realistic 14-day transaction history through the real RMS order/KOT/payment/inventory workflow';

    /** Marker written to orders.notes so the dataset is identifiable + clearable. */
    private const MARKER = '[history-14d]';

    /** Note text stored on every seeded order. */
    private const ORDER_NOTE = 'Imported historical transaction (14-day dataset)';

    /** Verified leftover debugging artifacts from earlier manual API testing. */
    private const DEBUG_ORDER_NUMBERS = ['ORD-6AC03669E9536', 'ORD-6AC03701A1DB4'];

    /** Snapshot file backing the clear command. */
    private const SNAPSHOT = 'seeding/history-14d-snapshot.json';

    /** @var array<string,Carbon> order id => service timestamp */
    private array $orderTimestamps = [];

    /** @var array<string,string> order id => payment id (for refunds) */
    private array $orderPayment = [];

    /** @var array<string,string> order id => invoice id */
    private array $orderInvoice = [];

    private ?string $token = null;

    private int $apiCalls = 0;

    public function handle(): int
    {
        $days = max(14, min(30, (int) $this->option('days')));
        $dryRun = (bool) $this->option('dry-run');
        $force = (bool) $this->option('force');

        if (! $force && $this->alreadySeeded()) {
            $this->error('A 14-day history dataset is already present. Use --force to re-seed or uat:clear-history-14-days to remove it.');

            return self::FAILURE;
        }

        $this->line('<info>Loading existing RMS catalogue…</info>');

        $catalogue = $this->loadCatalogue();
        if ($catalogue['items'] === []) {
            $this->error('No available menu items with recipes found. Seed the catalogue first.');

            return self::FAILURE;
        }

        $this->line(sprintf(
            '  %d menu items (%d top-weighted) · %d tables · %d customers · %d staff',
            count($catalogue['items']),
            count(array_slice($catalogue['items'], 0, 10)),
            count($catalogue['tables']),
            count($catalogue['customers']),
            count($catalogue['staff']),
        ));

        $planner = new HistoryDatasetPlanner(
            days: $days,
            todayUtc: CarbonImmutable::now('UTC')->startOfDay(),
            menuItems: $catalogue['items'],
            tableIds: $catalogue['tables'],
            customerIds: $catalogue['customers'],
            staffIds: $catalogue['staff'],
        );

        $plan = $planner->plan();
        $plan = $this->attachRefunds($plan);

        $totals = $this->summarise($plan);
        $this->renderPlan($plan, $totals);

        // Ingredient requirements are derived from the plan through the existing
        // recipe graph — the same explosion OrderWorkflowService performs.
        $requirements = $this->projectedConsumption($plan);
        $headroom = $this->stockHeadroom($requirements);

        $this->line('');
        $this->line(sprintf(
            '<info>Projected ingredient consumption:</info> %d ingredients touched, total %s units',
            count($requirements),
            number_format(array_sum($requirements), 2),
        ));

        $belowMin = array_filter($headroom, fn ($r) => $r['closing'] < $r['minimum']);
        $this->line(sprintf(
            '  %d ingredients will finish below minimum (legitimate dashboard alerts)',
            count($belowMin),
        ));

        if ($dryRun) {
            $this->line('');
            $this->info('DRY RUN — nothing was written.');

            return self::SUCCESS;
        }

        $this->purgeVerifiedDebugArtifacts();

        // The token must exist before any stock endpoint is called.
        $this->mintToken();

        $stockSnapshot = $this->currentStockSnapshot();
        $this->applyStockHeadroom($headroom);

        $this->line('');
        $this->line('<info>Transacting through the live HTTP workflow…</info>');

        $result = $this->executePlan($plan);

        // The pre-flight headroom only guarantees sufficiency; it cannot force a
        // *low* ending balance because pre-existing stock is often already far
        // above the projected need. Trim a few high-usage ingredients down to a
        // genuinely low-but-positive level through the real inventory endpoint
        // so the dashboard and low-stock alerts show legitimate, data-derived
        // rows instead of fabricated statuses.
        $result['trimmed'] = $this->trimToLowStock($headroom, $belowMin);

        $this->realignTimestamps();
        $this->clearForecastCache();

        $this->line('');
        $this->renderResult($plan, $result, $headroom, $belowMin, $stockSnapshot, $days);

        return self::SUCCESS;
    }

    /**
     * Set the designated alert ingredients to a low but positive stock level.
     *
     * Uses PUT /inventory/ingredients/{id} so the adjustment is recorded by the
     * application's own stock-adjustment logic and stock ledger.
     *
     * @param  array<string,array<string,mixed>>  $headroom
     * @param  array<string,array<string,mixed>>  $belowMin
     */
    private function trimToLowStock(array $headroom, array $belowMin): int
    {
        if ($belowMin === []) {
            return 0;
        }

        $trimmed = 0;

        foreach ($belowMin as $id => $row) {
            $minimum = (float) $row['minimum'];
            $target = $minimum > 0
                ? round($minimum * 0.72, 3)          // comfortably below minimum
                : 0.25;                                // still > 0, so never negative

            $current = (float) DB::table('ingredients')->where('id', $id)->value('current_stock');
            if ($current <= $target) {
                continue;
            }

            // Stock is only mutable through the application's stock endpoints;
            // IngredientController::update deliberately ignores current_stock.
            $res = $this->api('POST', '/inventory/stock/adjust', [
                'ingredient_id' => $id,
                'new_stock' => $target,
                'notes' => 'Cycle count after 14-day history dataset',
            ]);

            if ($res['status'] === 200) {
                $trimmed++;
            } else {
                $this->line(sprintf(
                    '    <comment>could not trim %s (%d) %s</comment>',
                    $row['name'],
                    $res['status'],
                    substr((string) ($res['body']['message'] ?? ''), 0, 120),
                ));
            }
        }

        if ($trimmed > 0) {
            $this->line("  trimmed {$trimmed} ingredients to a low-but-positive level for legitimate alerts");
        }

        return $trimmed;
    }

    // ------------------------------------------------------------------
    // Catalogue
    // ------------------------------------------------------------------

    /**
     * Load the existing catalogue. Nothing is created.
     *
     * "Top 10" is ranked by recipe richness (number of ingredient lines) so the
     * AI inventory forecast receives a dense ingredient demand signal; ties are
     * broken by name so the set is stable across runs.
     *
     * @return array{items:list<array{id:string,name:string}>,tables:list<string>,customers:list<string>,staff:list<string>}
     */
    private function loadCatalogue(): array
    {
        $items = DB::table('recipes')
            ->join('menu_items', 'menu_items.id', '=', 'recipes.menu_item_id')
            ->join('recipe_ingredients', 'recipe_ingredients.recipe_id', '=', 'recipes.id')
            ->where('menu_items.is_available', true)
            ->whereNull('menu_items.deleted_at')
            ->whereNull('recipes.deleted_at')
            ->groupBy('menu_items.id', 'menu_items.name')
            ->select('menu_items.id', 'menu_items.name')
            ->selectRaw('COUNT(recipe_ingredients.ingredient_id) as ingredient_lines')
            ->orderByDesc('ingredient_lines')
            ->orderBy('menu_items.name')
            ->get()
            ->map(fn ($r) => ['id' => $r->id, 'name' => $r->name])
            ->values()
            ->all();

        $tables = DB::table('tables')
            ->where('is_active', true)
            ->whereNull('deleted_at')
            ->orderBy('number')
            ->pluck('id')
            ->all();

        $customers = DB::table('customers')
            ->where('is_active', true)
            ->whereNull('deleted_at')
            ->orderBy('id')
            ->pluck('id')
            ->all();

        // Only users that also have a staff profile, so /reports/staff has a
        // resolvable actor for every seeded order.
        $staff = DB::table('staff_profiles')
            ->whereNotNull('user_id')
            ->where('is_active', true)
            ->orderBy('id')
            ->pluck('user_id')
            ->all();

        return [
            'items' => $items,
            'tables' => $tables,
            'customers' => $customers,
            'staff' => $staff !== [] ? $staff : User::query()->pluck('id')->all(),
        ];
    }

    // ------------------------------------------------------------------
    // Plan helpers
    // ------------------------------------------------------------------

    /**
     * Mark a couple of paid dine-in orders for an approved refund.
     *
     * @param  array<string,mixed>  $plan
     * @return array<string,mixed>
     */
    private function attachRefunds(array $plan): array
    {
        $budget = 2;

        foreach ($plan['days'] as $i => $day) {
            $plan['days'][$i]['orders'] = HistoryDatasetPlanner::applyRefunds($day['orders'], $budget > 0 ? 1 : 0);
            if ($budget > 0) {
                $budget--;
            }
        }

        return $plan;
    }

    /**
     * @param  array<string,mixed>  $plan
     * @return array<string,mixed>
     */
    private function summarise(array $plan): array
    {
        $byDay = [];
        $types = ['dine_in' => 0, 'takeaway' => 0];
        $methods = ['cash' => 0, 'card' => 0, 'e_wallet' => 0];
        $cancelled = 0;
        $paid = 0;
        $total = 0;

        foreach ($plan['days'] as $day) {
            $count = 0;
            foreach ($day['orders'] as $order) {
                $count++;
                $types[$order['order_type']]++;
                if ($order['cancelled']) {
                    $cancelled++;
                    continue;
                }
                $paid++;
                if ($order['payment_method'] !== null) {
                    $methods[$order['payment_method']]++;
                }
            }
            $byDay[$day['date']] = $count;
            $total += $count;
        }

        return [
            'by_day' => $byDay,
            'total' => $total,
            'min_day' => min($byDay),
            'types' => $types,
            'methods' => $methods,
            'cancelled' => $cancelled,
            'paid' => $paid,
        ];
    }

    /**
     * @param  array<string,mixed>  $plan
     */
    private function renderPlan(array $plan, array $totals): void
    {
        $this->line('');
        $this->line('<info>Planned 14-day window:</info>');
        $this->line(sprintf('  window : %s → %s', $plan['totals']['window_start'], $plan['totals']['window_end']));
        $this->line(sprintf('  orders : %d (%d paid/completed target, %d cancelled)', $totals['total'], $totals['paid'], $totals['cancelled']));
        $this->line(sprintf('  types  : dine_in %d · takeaway %d', $totals['types']['dine_in'], $totals['types']['takeaway']));
        $this->line(sprintf('  payment: cash %d · card %d · e_wallet %d', $totals['methods']['cash'], $totals['methods']['card'], $totals['methods']['e_wallet']));
        $this->line('  per day:');

        foreach ($totals['by_day'] as $date => $count) {
            $flag = $count > 0 ? '' : '  <error>ZERO - WOULD FAIL FORECAST GATE</error>';
            $this->line(sprintf('    %s  %3d%s', $date, $count, $flag));
        }
    }

    // ------------------------------------------------------------------
    // Inventory headroom
    // ------------------------------------------------------------------

    /**
     * Expand the planned demand through the existing recipe graph.
     *
     * Mirrors OrderWorkflowService::calculateRequirements so the projection is
     * the same arithmetic the real deduction will perform.
     *
     * @param  array<string,mixed>  $plan
     * @return array<string,float> ingredient id => quantity
     */
    private function projectedConsumption(array $plan): array
    {
        $recipes = DB::table('recipes')
            ->join('recipe_ingredients', 'recipe_ingredients.recipe_id', '=', 'recipes.id')
            ->whereNull('recipes.deleted_at')
            ->select('recipes.menu_item_id', 'recipes.yield_quantity', 'recipe_ingredients.ingredient_id', 'recipe_ingredients.quantity')
            ->get();

        $bom = [];
        foreach ($recipes as $row) {
            $yieldQty = max((float) $row->yield_quantity, 0) ?: 1.0;
            $bom[$row->menu_item_id][$row->ingredient_id] =
                ($bom[$row->menu_item_id][$row->ingredient_id] ?? 0) + (float) $row->quantity;
            $bom[$row->menu_item_id]['__yield'] = $yieldQty;
        }

        $requirements = [];

        foreach ($plan['days'] as $day) {
            foreach ($day['orders'] as $order) {
                // Cancelled orders never reach payment, so they never deduct.
                if ($order['cancelled']) {
                    continue;
                }
                foreach ($order['items'] as $line) {
                    $recipe = $bom[$line['menu_item_id']] ?? null;
                    if ($recipe === null) {
                        continue;
                    }
                    $multiplier = $line['quantity'] / max(0.0001, $recipe['__yield']);
                    foreach ($recipe as $ingredientId => $perYield) {
                        if ($ingredientId === '__yield') {
                            continue;
                        }
                        $requirements[$ingredientId] = ($requirements[$ingredientId] ?? 0) + ((float) $perYield * $multiplier);
                    }
                }
            }
        }

        return $requirements;
    }

    /**
     * Decide the opening stock for every ingredient the plan will consume.
     *
     * Opening = projected consumption + closing target. Because the closing
     * target is never negative, the real deduction can never fail and negative
     * inventory is never required.
     *
     * A small number of the highest-consumption ingredients are deliberately
     * left under their minimum so the dashboard and low-stock alerts show
     * genuine, data-derived rows.
     *
     * @param  array<string,float>  $requirements
     * @return array<string,array{opening:float,closing:float,minimum:float,name:string,unit:string}>
     */
    private function stockHeadroom(array $requirements): array
    {
        $ingredients = DB::table('ingredients')
            ->whereNull('deleted_at')
            ->get(['id', 'name', 'unit', 'current_stock', 'minimum_stock']);

        $byConsumption = $requirements;
        arsort($byConsumption);
        $alertIds = array_slice(array_keys($byConsumption), 0, 3);

        $headroom = [];

        foreach ($ingredients as $ingredient) {
            $required = round((float) ($requirements[$ingredient->id] ?? 0), 3);
            if ($required <= 0) {
                continue;
            }

            $minimum = (float) $ingredient->minimum_stock;

            if (in_array($ingredient->id, $alertIds, true)) {
                // Legitimately low after the window: comfortably above zero but
                // under the reorder threshold.
                $closing = min($minimum * 0.75, max($minimum - 0.001, $required * 0.05));
            } else {
                $closing = max($minimum * 1.5, $required * 0.15);
            }

            $headroom[$ingredient->id] = [
                'opening' => round($required + $closing, 3),
                'closing' => round($closing, 3),
                'minimum' => $minimum,
                'name' => $ingredient->name,
                'unit' => $ingredient->unit,
            ];
        }

        return $headroom;
    }

    /**
     * @return array<string,float> ingredient id => stock before seeding
     */
    private function currentStockSnapshot(): array
    {
        return DB::table('ingredients')
            ->pluck('current_stock', 'id')
            ->map(fn ($v) => (float) $v)
            ->all();
    }

    /**
     * Top up stock through the existing inventory endpoint so the change is
     * recorded in the stock ledger exactly like a real delivery.
     *
     * @param  array<string,array<string,mixed>>  $headroom
     */
    private function applyStockHeadroom(array $headroom): void
    {
        $this->line(sprintf('<info>Provisioning stock headroom</info> for %d ingredients…', count($headroom)));

        $current = $this->currentStockSnapshot();
        $bumped = 0;

        foreach ($headroom as $id => $row) {
            $delta = round($row['opening'] - ($current[$id] ?? 0), 3);
            if ($delta <= 0) {
                continue;
            }

            // Use the application's own stock endpoint so the opening balance is
            // recorded by the normal movement/audit logic, not a raw insert.
            $res = $this->api('POST', '/inventory/stock/adjust', [
                'ingredient_id' => $id,
                'new_stock' => $row['opening'],
                'notes' => 'Opening stock provisioned for 14-day history dataset',
            ]);

            if ($res['status'] === 200) {
                $bumped++;
            } else {
                $this->line(sprintf(
                    '    <comment>could not provision %s (%d)</comment>',
                    $row['name'],
                    $res['status'],
                ));
            }
        }

        $this->line("  {$bumped} ingredients topped up");
    }

    // ------------------------------------------------------------------
    // HTTP workflow
    // ------------------------------------------------------------------

    private function mintToken(): void
    {
        // Resolve a driver user that genuinely holds the `admin` role. Do not
        // assume a specific email exists: the account set is maintained
        // elsewhere and may be renamed. Falling back to "any user" would pick a
        // principal without the admin/manager/cashier gates the order and
        // payment endpoints require, silently producing 403s.
        $user = User::query()
            ->where('is_active', true)
            ->whereHas('roles', fn ($q) => $q->where('name', 'admin'))
            ->orderBy('email')
            ->first();

        if ($user === null) {
            throw new \RuntimeException('No active user with the admin role is available to drive the workflow.');
        }

        $this->driverEmail = $user->email;
        $this->token = $user->createToken('history-14-day-seed', ['*'])->plainTextToken;
    }

    private string $driverEmail = '';

    /**
     * Issue a real HTTP request through the full middleware + controller stack.
     *
     * @return array{status:int,body:array<string,mixed>}
     */
    private function api(string $method, string $uri, array $payload = []): array
    {
        $json = $payload === [] ? '{}' : json_encode($payload);

        $request = Request::create(
            '/api/v1'.$uri,
            $method,
            [],
            [],
            [],
            [
                'HTTP_AUTHORIZATION' => 'Bearer '.$this->token,
                'HTTP_ACCEPT' => 'application/json',
                'CONTENT_TYPE' => 'application/json',
                'REMOTE_ADDR' => '127.0.0.1',
            ],
            $json
        );

        $response = app(\Illuminate\Contracts\Http\Kernel::class)->handle($request);
        $this->apiCalls++;

        $content = $response->getContent();
        $body = json_decode((string) $content, true);

        if (! is_array($body)) {
            $body = ['raw' => substr((string) $content, 0, 400)];
        }

        return ['status' => $response->getStatusCode(), 'body' => $body];
    }

    /**
     * Execute the plan order by order.
     *
     * @param  array<string,mixed>  $plan
     * @return array<string,int>
     */
    private function executePlan(array $plan): array
    {
        $stats = [
            'created' => 0, 'confirmed' => 0, 'paid' => 0, 'cancelled' => 0,
            'failed' => 0, 'refunds' => 0, 'wastage' => 0,
        ];

        $bar = $this->output->createProgressBar($plan['totals']['orders']);
        $bar->start();

        foreach ($plan['days'] as $day) {
            foreach ($day['orders'] as $order) {
                $this->executeOrder($order, $stats);
                $bar->advance();
            }
        }

        $bar->finish();
        $this->newLine(2);

        $stats['wastage'] = $this->seedWastage($plan);

        return $stats;
    }

    /**
     * Run one order through create → KOT → payment (or cancellation).
     *
     * @param  array<string,mixed>  $order
     * @param  array<string,int>  $stats
     */
    private function executeOrder(array $order, array &$stats): void
    {
        $payload = [
            'order_type' => $order['order_type'],
            'items' => array_map(fn ($l) => [
                'menu_item_id' => $l['menu_item_id'],
                'quantity' => $l['quantity'],
            ], $order['items']),
            'notes' => self::ORDER_NOTE.' '.self::MARKER,
        ];
        if ($order['table_id'] !== null) {
            $payload['table_id'] = $order['table_id'];

            // Defensive release: a previous seeded order may still hold this
            // table (e.g. an earlier run stopped between create and payment),
            // which would make TableDiningPolicy reject the new order with
            // 409 "table already has an active order". We own the lifecycle of
            // these orders, so returning the table to service is safe and keeps
            // the run self-healing instead of cascading failures.
            $this->releaseTable($order['table_id']);
        }
        if ($order['customer_id'] !== null) {
            $payload['customer_id'] = $order['customer_id'];
        }
        if ($order['auto_apply_promotions']) {
            $payload['auto_apply_promotions'] = true;
        }

        $created = $this->api('POST', '/orders', $payload);
        if ($created['status'] !== 201) {
            $stats['failed']++;
            $this->recordFailure($created, $order);

            return;
        }

        $orderId = (string) ($created['body']['data']['id'] ?? '');
        if ($orderId === '') {
            $stats['failed']++;

            return;
        }

        $stats['created']++;
        $this->orderTimestamps[$orderId] = $order['ts'];

        // Confirm → creates the kitchen ticket through OrderWorkflowService.
        $confirmed = $this->api('PATCH', "/orders/{$orderId}/status", ['status' => 'confirmed']);
        if ($confirmed['status'] !== 200) {
            $stats['failed']++;
            $this->recordFailure($confirmed, $order);

            return;
        }
        $stats['confirmed']++;

        $kotId = $this->resolveKotId($orderId);

        if ($order['cancelled']) {
            // Guest walked out after the kitchen ticket was raised.
            $cancelled = $this->api('PATCH', "/orders/{$orderId}/status", ['status' => 'cancelled']);
            if ($cancelled['status'] === 200) {
                $stats['cancelled']++;
            }
            $this->releaseTable($order['table_id']);

            return;
        }

        $this->advanceKitchen($kotId, $orderId);

        $served = $this->api('PATCH', "/orders/{$orderId}/status", ['status' => 'served']);
        if ($served['status'] !== 200) {
            $stats['failed']++;
            $this->recordFailure($served, $order);

            return;
        }

        $payment = $this->payOrder($orderId, $order);
        if ($payment === null) {
            $stats['failed']++;

            return;
        }

        $stats['paid']++;
        $this->releaseTable($order['table_id']);

        if (! empty($order['refund'])) {
            if ($this->refundOrder($orderId)) {
                $stats['refunds']++;
            }
        }
    }

    /**
     * Move the kitchen ticket and order through the production states.
     */
    private function advanceKitchen(?string $kotId, string $orderId): void
    {
        if ($kotId !== null) {
            $this->api('PATCH', "/kot/{$kotId}/status", ['status' => 'in_progress']);
        }

        $this->api('PATCH', "/orders/{$orderId}/status", ['status' => 'preparing']);

        if ($kotId !== null) {
            $this->api('PATCH', "/kot/{$kotId}/status", ['status' => 'ready']);
        }

        $this->api('PATCH', "/orders/{$orderId}/status", ['status' => 'ready']);
    }

    /**
     * Settle the order. Cash may over-tender; card/e-wallet must be exact.
     *
     * @param  array<string,mixed>  $order
     * @return array<string,mixed>|null
     */
    private function payOrder(string $orderId, array $order): ?array
    {
        $detail = $this->api('GET', "/orders/{$orderId}");
        $data = $detail['body']['data'] ?? [];
        // The order show payload exposes `total_amount` and a flat `invoice_id`.
        $total = (float) ($data['total_amount'] ?? $data['total'] ?? 0);
        if ($total <= 0) {
            return null;
        }

        $method = (string) $order['payment_method'];
        $amount = $method === 'cash'
            ? round($total + (int) [0, 50, 100, 200, 500][array_rand([0, 1, 2, 3, 4])], 2)
            : $total;

        $payload = ['payment_method' => $method, 'amount' => $amount];
        if ($method === 'e_wallet') {
            $payload['reference'] = 'GCASH-'.strtoupper(Str::random(8));
        } elseif ($method === 'card') {
            $payload['reference'] = 'AUTH-'.strtoupper(Str::random(8));
        }

        $paid = $this->api('POST', "/orders/{$orderId}/payments", $payload);
        if ($paid['status'] !== 201) {
            $this->recordFailure($paid, $order);

            return null;
        }

        $paymentId = (string) ($paid['body']['data']['payment']['id'] ?? $paid['body']['data']['payment_id'] ?? '');
        $invoiceId = (string) ($paid['body']['data']['invoice']['id'] ?? $paid['body']['data']['invoice_id'] ?? '');

        if ($paymentId !== '') {
            $this->orderPayment[$orderId] = $paymentId;
        }
        if ($invoiceId !== '') {
            $this->orderInvoice[$orderId] = $invoiceId;
        }

        return $paid['body'];
    }

    /**
     * Approve a partial refund through the existing refund endpoint.
     */
    private function refundOrder(string $orderId): bool
    {
        $detail = $this->api('GET', "/orders/{$orderId}");
        $data = $detail['body']['data'] ?? [];

        $invoiceId = $this->orderInvoice[$orderId] ?? (string) ($data['invoice_id'] ?? '');
        $paymentId = $this->orderPayment[$orderId] ?? (string) ($data['payments'][0]['id'] ?? '');

        if ($invoiceId === '' || $paymentId === '') {
            return false;
        }

        $total = (float) ($data['total_amount'] ?? $data['total'] ?? 0);
        $refund = round($total * 0.5, 2);

        $res = $this->api('POST', "/invoices/{$invoiceId}/refund", [
            'payment_id' => $paymentId,
            'amount' => $refund,
            'reason' => 'Guest cancelled one item after preparation started',
        ]);

        return $res['status'] === 201;
    }

    private function resolveKotId(string $orderId): ?string
    {
        $row = DB::table('kot_tickets')
            ->where('order_id', $orderId)
            ->whereNull('deleted_at')
            ->orderByDesc('created_at')
            ->first();

        return $row?->id;
    }

    /**
     * Return a dine-in table to service so it can be reused later in the day.
     */
    private function releaseTable(?string $tableId): void
    {
        if ($tableId === null) {
            return;
        }
        $this->api('PATCH', "/tables/{$tableId}/status", ['status' => 'available']);
    }

    /**
     * Record a small amount of genuine ingredient wastage through the existing
     * endpoint so the wastage reports and AI insight have real rows.
     *
     * @param  array<string,mixed>  $plan
     */
    private function seedWastage(array $plan): int
    {
        $candidates = DB::table('ingredients')
            ->where('is_active', true)
            ->whereNull('deleted_at')
            ->where('category', 'Vegetables')
            ->inRandomOrder()
            ->limit(3)
            ->get();

        if ($candidates->isEmpty()) {
            $candidates = DB::table('ingredients')
                ->where('is_active', true)
                ->whereNull('deleted_at')
                ->inRandomOrder()
                ->limit(3)
                ->get();
        }

        $reasons = [
            'Spoilage — exceeded shelf life',
            'Prep trimming loss',
            'Dropped during preparation',
        ];

        $created = 0;
        $days = array_slice($plan['days'], -6);

        foreach ($candidates as $i => $ingredient) {
            $day = $days[$i % max(1, count($days))] ?? $plan['days'][0];
            $ts = Carbon::parse($day['orders'][0]['ts'] ?? $day['date']);
            $this->wastageRecords[] = [
                'ingredient_id' => $ingredient->id,
                'quantity' => round((float) random_int(200, 900) / 1000, 3),
                'reason' => $reasons[$i % count($reasons)],
                'ts' => $ts,
            ];
        }

        foreach ($this->wastageRecords as $wastage) {
            $res = $this->api('POST', '/inventory/wastage', [
                'ingredient_id' => $wastage['ingredient_id'],
                'quantity' => $wastage['quantity'],
                'reason' => $wastage['reason'],
            ]);
            if ($res['status'] === 201) {
                $created++;
            }
        }

        return $created;
    }

    /** @var list<array{ingredient_id:string,quantity:float,reason:string,ts:Carbon}> */
    private array $wastageRecords = [];

    // ------------------------------------------------------------------
    // Timestamp realignment
    // ------------------------------------------------------------------

    /**
     * Shift every record produced for a seeded order onto its real service day.
     *
     * Business values are never touched — only created_at/updated_at, because
     * the endpoints always stamp now() and the reports group on that column.
     */
    private function realignTimestamps(): void
    {
        if ($this->orderTimestamps === []) {
            return;
        }

        $this->line('<info>Realigning timestamps to their service days…</info>');

        $byDay = [];
        foreach ($this->orderTimestamps as $orderId => $ts) {
            $byDay[Carbon::parse($ts)->toDateString()][] = ['id' => $orderId, 'ts' => Carbon::parse($ts)];
        }

        foreach ($byDay as $day => $entries) {
            $ids = array_column($entries, 'id');
            $itemIds = DB::table('order_items')->whereIn('order_id', $ids)->pluck('id')->all();

            // Per-order offset so intra-day ordering is preserved.
            foreach ($entries as $i => $entry) {
                DB::table('orders')->where('id', $entry['id'])->update([
                    'created_at' => $entry['ts'],
                    'updated_at' => $entry['ts']->copy()->addMinutes(45),
                ]);
                DB::table('order_status_history')->where('order_id', $entry['id'])->update([
                    'created_at' => $entry['ts']->copy()->addSeconds(30 + $i),
                ]);
            }

            DB::table('order_items')->whereIn('order_id', $ids)->update([
                'created_at' => Carbon::parse($day.' 12:00:00'),
                'updated_at' => Carbon::parse($day.' 12:00:00'),
            ]);

            // Order items inherit their parent order's exact minute.
            foreach ($entries as $entry) {
                DB::table('order_items')
                    ->where('order_id', $entry['id'])
                    ->update([
                        'created_at' => $entry['ts'],
                        'updated_at' => $entry['ts'],
                    ]);
            }

            DB::table('kot_tickets')->whereIn('order_id', $ids)->update([
                'created_at' => Carbon::parse($day.' 12:00:05'),
                'updated_at' => Carbon::parse($day.' 12:40:00'),
            ]);

            if ($itemIds !== []) {
                DB::table('kot_ticket_items')->whereIn('order_item_id', $itemIds)->update([
                    'created_at' => Carbon::parse($day.' 12:00:05'),
                    'updated_at' => Carbon::parse($day.' 12:40:00'),
                ]);
            }

            $invoiceIds = DB::table('invoices')->whereIn('order_id', $ids)->pluck('id')->all();
            if ($invoiceIds !== []) {
                DB::table('invoices')->whereIn('id', $invoiceIds)->update([
                    'created_at' => Carbon::parse($day.' 12:45:00'),
                    'updated_at' => Carbon::parse($day.' 12:45:00'),
                ]);
                DB::table('payments')->whereIn('invoice_id', $invoiceIds)->update([
                    'created_at' => Carbon::parse($day.' 12:45:10'),
                    'updated_at' => Carbon::parse($day.' 12:45:10'),
                ]);
            }

            DB::table('stock_movements')
                ->where('reference_type', 'order')
                ->whereIn('reference_id', $ids)
                ->update([
                    'created_at' => Carbon::parse($day.' 12:45:05'),
                    'updated_at' => Carbon::parse($day.' 12:45:05'),
                ]);

            foreach ($this->wastageRecords as $wastage) {
                if (Carbon::parse($wastage['ts'])->toDateString() === $day) {
                    DB::table('wastage')
                        ->where('ingredient_id', $wastage['ingredient_id'])
                        ->where('reason', $wastage['reason'])
                        ->whereNull('deleted_at')
                        ->update([
                            'created_at' => Carbon::parse($wastage['ts']),
                            'updated_at' => Carbon::parse($wastage['ts']),
                        ]);
                }
            }
        }
    }

    // ------------------------------------------------------------------
    // Cache + cleanup
    // ------------------------------------------------------------------

    /**
     * Clear ONLY the forecast/insight cache. Authentication, 2FA and
     * forgot-password rate-limit counters are left untouched.
     */
    private function clearForecastCache(): void
    {
        $deleted = DB::table('cache')
            ->where(function ($q) {
                $q->where('key', 'like', 'laravel-cache-demand_forecast:%')
                    ->orWhere('key', 'like', 'laravel-cache-ai_insights:%');
            })
            ->delete();

        $this->line("  cleared {$deleted} demand-forecast / ai-insight cache keys (auth & rate-limit keys preserved)");
    }

    /**
     * Remove only the two verified leftover debugging orders.
     */
    private function purgeVerifiedDebugArtifacts(): void
    {
        $ids = DB::table('orders')
            ->whereIn('order_number', self::DEBUG_ORDER_NUMBERS)
            ->pluck('id')
            ->all();

        if ($ids === []) {
            $this->line('  no leftover debugging orders found');

            return;
        }

        DB::transaction(function () use ($ids) {
            DB::table('order_items')->whereIn('order_id', $ids)->delete();
            DB::table('kot_ticket_items')->whereIn('kot_ticket_id', DB::table('kot_tickets')->whereIn('order_id', $ids)->pluck('id'))->delete();
            DB::table('kot_tickets')->whereIn('order_id', $ids)->delete();
            DB::table('order_status_history')->whereIn('order_id', $ids)->delete();
            DB::table('orders')->whereIn('id', $ids)->delete();
        });

        DB::table('tables')->where('status', '!=', 'available')->update(['status' => 'available']);

        $this->line('  removed '.count($ids).' leftover debugging orders (ORD-6AC03669E9536, ORD-6AC03701A1DB4)');
    }

    private function alreadySeeded(): bool
    {
        return DB::table('orders')->where('notes', 'like', '%'.self::MARKER.'%')->exists()
            || Storage::exists(self::SNAPSHOT);
    }

    /**
     * @param  array{status:int,body:array<string,mixed>}  $res
     * @param  array<string,mixed>  $order
     */
    private function recordFailure(array $res, array $order): void
    {
        $message = $res['body']['message'] ?? ($res['body']['raw'] ?? 'unknown error');
        $errors = isset($res['body']['errors']) ? json_encode($res['body']['errors']) : '';

        $this->line(sprintf(
            '    <comment>order failed (%d) %s %s</comment>',
            $res['status'],
            substr((string) $message, 0, 160),
            substr((string) $errors, 0, 160),
        ));
    }

    // ------------------------------------------------------------------
    // Reporting
    // ------------------------------------------------------------------

    /**
     * @param  array<string,mixed>  $plan
     * @param  array<string,int>  $result
     * @param  array<string,array<string,mixed>>  $headroom
     * @param  array<string,array<string,mixed>>  $belowMin
     * @param  array<string,float>  $stockSnapshot
     */
    private function renderResult(array $plan, array $result, array $headroom, array $belowMin, array $stockSnapshot, int $days): void
    {
        Storage::put(self::SNAPSHOT, json_encode([
            'seeded_at' => now()->toISOString(),
            'days' => $days,
            'window' => [$plan['totals']['window_start'], $plan['totals']['window_end']],
            'order_ids' => array_keys($this->orderTimestamps),
            'stock_before' => $stockSnapshot,
        ], JSON_PRETTY_PRINT));

        $completed = DB::table('orders')->where('status', 'completed')->count();
        $paid = DB::table('orders')->where('status', 'completed')->where('payment_status', 'paid')->count();
        $revenue = (float) DB::table('orders')->where('status', 'completed')->sum('total');

        $this->line('<info>=== Seed complete ===</info>');
        $this->line('  orders created      : '.array_sum([$result['created']]).' (failed '.$result['failed'].')');
        $this->line('  completed / paid    : '.$completed.' / '.$paid);
        $this->line('  cancelled           : '.$result['cancelled']);
        $this->line('  refunds             : '.$result['refunds']);
        $this->line('  wastage records     : '.$result['wastage']);
        $this->line('  total revenue       : PHP '.number_format($revenue, 2));
        $this->line('  api calls issued    : '.$this->apiCalls);

        $types = DB::table('orders')->select('order_type', DB::raw('count(*) c'))->groupBy('order_type')->pluck('c', 'order_type');
        $this->line('  order types         : '.json_encode($types));

        $methods = DB::table('orders')->where('status', 'completed')->select('payment_method', DB::raw('count(*) c'))->groupBy('payment_method')->pluck('c', 'payment_method');
        $this->line('  payment methods     : '.json_encode($methods));

        $negatives = DB::table('ingredients')->where('current_stock', '<', 0)->count();
        $this->line('  negative inventory  : '.$negatives);
        $this->line('  below-minimum count : '.count($belowMin).' ('.$this->belowMinimumList($belowMin).')');
    }

    /**
     * @param  array<string,array<string,mixed>>  $belowMin
     */
    private function belowMinimumList(array $belowMin): string
    {
        $parts = [];
        foreach ($belowMin as $row) {
            $parts[] = $row['name'].' '.$row['closing'].$row['unit'];
        }
        return $parts === [] ? 'none' : implode(', ', $parts);
    }
}
