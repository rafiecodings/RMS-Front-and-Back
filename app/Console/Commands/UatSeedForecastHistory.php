<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Intentionally loads a COMPACT forecasting demo/history dataset.
 *
 * The normal UAT database keeps Orders = 0 so manual testing starts clean.
 * TimechoAI/statistical forecasting needs >= 14 days of order history, so
 * when a forecast DEMO is required, run this command explicitly:
 *
 *   php artisan uat:seed-forecast-history          # 30 days, ~2-4 orders/day
 *   php artisan uat:seed-forecast-history --days=45
 *
 * It generates a small, clearly-labelled set of completed orders spread over
 * the requested window using ONLY retained menu items. Run
 * `php artisan uat:clear-forecast-history` to remove the fixture again.
 */
class UatSeedForecastHistory extends Command
{
    protected $signature = 'uat:seed-forecast-history {--days=30}';

    protected $description = 'Load a compact demo order history (30 days) solely to power AI sales/inventory forecasting';

    public function handle(): int
    {
        $days = min(90, max(14, (int) $this->option('days')));

        $items = DB::table('menu_items')
            ->join('recipes', 'recipes.menu_item_id', '=', 'menu_items.id')
            ->where('menu_items.is_available', 1)
            ->groupBy('menu_items.id', 'menu_items.name', 'menu_items.price')
            ->select('menu_items.id', 'menu_items.name', 'menu_items.price')
            ->limit(12)
            ->get();

        if ($items->isEmpty()) {
            $this->error('No menu items with recipes found. Nothing to seed.');

            return self::FAILURE;
        }

        if (DB::table('orders')->count() > 0) {
            if (! $this->confirm('Orders table is not empty. Seed demo history anyway?')) {
                $this->info('Aborted.');

                return self::SUCCESS;
            }
        }

        $adminId = DB::table('users')->where('email', 'admin@rms.com')->value('id')
            ?? DB::table('users')->value('id');

        $created = 0;
        DB::transaction(function () use ($days, $items, $adminId, &$created) {
            $now = now();
            for ($d = $days; $d >= 1; $d--) {
                // Weekend uplift for a realistic demand curve.
                $date = $now->copy()->subDays($d);
                $base = $date->isWeekend() ? random_int(3, 5) : random_int(1, 3);
                for ($o = 0; $o < $base; $o++) {
                    $orderId = (string) \Illuminate\Support\Str::uuid();
                    $ts = $date->copy()->setTime(random_int(10, 20), random_int(0, 59));

                    $lineCount = random_int(1, 3);
                    $total = 0.0;
                    $lines = [];
                    for ($l = 0; $l < $lineCount; $l++) {
                        $item = $items->random();
                        $qty = random_int(1, 2);
                        $lineTotal = (float) $item->price * $qty;
                        $total += $lineTotal;
                        $lines[] = [
                        'id' => (string) \Illuminate\Support\Str::uuid(),
                        'order_id' => $orderId,
                        'menu_item_id' => $item->id,
                        'name' => $item->name,
                        'quantity' => $qty,
                        'unit_price' => $item->price,
                        'total_price' => $lineTotal,
                        'discount_amount' => 0,
                        'notes' => null,
                        'status' => 'served',
                        'created_at' => $ts,
                        'updated_at' => $ts,
                    ];
                    }

                    DB::table('orders')->insert([
                        'id' => $orderId,
                        'order_number' => 'DEMO-'.$date->format('Ymd').'-'.str_pad((string) ($o + 1), 3, '0', STR_PAD_LEFT),
                        'status' => 'completed',
                        'order_type' => 'dine_in',
                        'table_id' => null,
                        'customer_id' => null,
                        'subtotal' => $total,
                        'tax_amount' => 0,
                        'discount_amount' => 0,
                        'service_charge' => 0,
                        'total' => $total,
                        'payment_status' => 'paid',
                        'notes' => 'Forecast demo fixture',
                        'created_by' => $adminId,
                        'created_at' => $ts,
                        'updated_at' => $ts,
                    ]);

                    foreach ($lines as $line) {
                        DB::table('order_items')->insert($line);
                    }
                    $created++;
                }
            }
        });

        $this->info("Seeded {$created} demo orders across {$days} days.");
        $this->line('Remove later with: php artisan uat:clear-forecast-history');

        return self::SUCCESS;
    }
}
