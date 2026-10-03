<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Removes the 14-day history dataset created by `uat:seed-history-14-days`
 * and restores ingredient stock to its pre-seed values.
 *
 * Deliberately surgical: it touches only orders carrying the seed marker (and
 * the records that cascade from them), the opening-balance movements it wrote,
 * and its own cache keys. Legacy data, security counters and unrelated
 * records are never touched.
 */
class UatClearHistory14Days extends Command
{
    protected $signature = 'uat:clear-history-14-days {--force : Skip the confirmation prompt}';

    protected $description = 'Remove the seeded 14-day history dataset and restore pre-seed inventory levels';

    private const MARKER = '[history-14d]';

    private const SNAPSHOT = 'seeding/history-14d-snapshot.json';

    public function handle(): int
    {
        $ids = DB::table('orders')->where('notes', 'like', '%'.self::MARKER.'%')->pluck('id')->all();

        if ($ids === [] && ! Storage::exists(self::SNAPSHOT)) {
            $this->info('No seeded 14-day history dataset found.');

            return self::SUCCESS;
        }

        $this->line(sprintf('Found %d seeded orders in the dataset.', count($ids)));

        if (! $this->option('force') && ! $this->confirm('Remove the seeded 14-day dataset and restore inventory?', true)) {
            $this->info('Aborted.');

            return self::SUCCESS;
        }

        $removed = DB::transaction(function () use ($ids) {
            $itemIds = DB::table('order_items')->whereIn('order_id', $ids)->pluck('id')->all();
            $kotIds = DB::table('kot_tickets')->whereIn('order_id', $ids)->pluck('id')->all();
            $invoiceIds = DB::table('invoices')->whereIn('order_id', $ids)->pluck('id')->all();

            if ($invoiceIds !== []) {
                DB::table('refunds')->whereIn('payment_id', DB::table('payments')->whereIn('invoice_id', $invoiceIds)->pluck('id'))->delete();
                DB::table('payments')->whereIn('invoice_id', $invoiceIds)->delete();
                DB::table('invoices')->whereIn('id', $invoiceIds)->delete();
            }

            // Reverse the stock the dataset consumed before deleting the ledger rows.
            if ($itemIds !== []) {
                DB::table('kot_ticket_items')->whereIn('order_item_id', $itemIds)->delete();
            }
            if ($kotIds !== []) {
                DB::table('kot_ticket_items')->whereIn('kot_ticket_id', $kotIds)->delete();
                DB::table('kot_tickets')->whereIn('id', $kotIds)->delete();
            }

            DB::table('stock_movements')->where('reference_type', 'order')->whereIn('reference_id', $ids)->delete();
            DB::table('order_status_history')->whereIn('order_id', $ids)->delete();
            DB::table('order_item_modifiers')->whereIn('order_item_id', $itemIds)->delete();
            DB::table('order_items')->whereIn('order_id', $ids)->delete();
            DB::table('audit_logs')->where('auditable_type', 'App\Models\Order')->whereIn('auditable_id', $ids)->delete();

            return DB::table('orders')->whereIn('id', $ids)->delete();
        });

        // Drop the wastage records this dataset filed.
        $wastage = DB::table('wastage')
            ->whereIn('reason', [
                'Spoilage — exceeded shelf life',
                'Prep trimming loss',
                'Dropped during preparation',
            ])
            ->delete();

        // Drop the provisioning / trim movements this dataset wrote. Both are
        // identifiable by their notes so unrelated adjustments are untouched.
        $movements = DB::table('stock_movements')
            ->where(function ($q) {
                $q->where('notes', 'like', '%14-day history dataset%')
                    ->orWhere('notes', 'like', '%Cycle count after 14-day history dataset%');
            })
            ->delete();

        // Restore ingredient stock from the snapshot.
        $restored = 0;
        if (Storage::exists(self::SNAPSHOT)) {
            $snapshot = json_decode((string) Storage::get(self::SNAPSHOT), true);

            foreach (($snapshot['stock_before'] ?? []) as $ingredientId => $stock) {
                DB::table('ingredients')->where('id', $ingredientId)->update([
                    'current_stock' => $stock,
                    'updated_at' => now(),
                ]);
                $restored++;
            }
            Storage::delete(self::SNAPSHOT);
        }

        DB::table('tables')->where('status', '!=', 'available')->update(['status' => 'available']);

        $cache = DB::table('cache')
            ->where(function ($q) {
                $q->where('key', 'like', 'laravel-cache-demand_forecast:%')
                    ->orWhere('key', 'like', 'laravel-cache-ai_insights:%');
            })
            ->delete();

        $this->info(sprintf(
            'Removed %d orders, %d wastage records, %d stock movements; restored %d ingredient stocks; cleared %d cache keys.',
            $removed,
            $wastage,
            $movements,
            $restored,
            $cache,
        ));

        return self::SUCCESS;
    }
}
