<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/** Removes the compact forecasting demo/history fixture created by uat:seed-forecast-history. */
class UatClearForecastHistory extends Command
{
    protected $signature = 'uat:clear-forecast-history';

    protected $description = 'Remove demo forecast-fixture orders (notes = "Forecast demo fixture") and their lines';

    public function handle(): int
    {
        DB::transaction(function () {
            $ids = DB::table('orders')->where('notes', 'Forecast demo fixture')->pluck('id');
            if ($ids->isEmpty()) {
                $this->info('No fixture orders found.');

                return;
            }
            DB::table('order_items')->whereIn('order_id', $ids)->delete();
            DB::table('kot_ticket_items')->whereIn('kot_ticket_id', DB::table('kot_tickets')->whereIn('order_id', $ids)->pluck('id'))->delete();
            DB::table('kot_tickets')->whereIn('order_id', $ids)->delete();
            DB::table('order_status_history')->whereIn('order_id', $ids)->delete();
            $deleted = DB::table('orders')->whereIn('id', $ids)->delete();
            $this->info("Removed {$deleted} fixture orders.");
        });

        return self::SUCCESS;
    }
}
