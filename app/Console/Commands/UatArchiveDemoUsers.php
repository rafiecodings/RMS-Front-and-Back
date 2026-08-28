<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Safely ARCHIVES (deactivates) demo/seeded user accounts instead of
 * deleting them.
 *
 * Policy:
 *  - Users referenced by audit_logs / stock_movements / any business record
 *    must never be hard-deleted — deactivation preserves referential and
 *    audit integrity while hiding them from login + default listings.
 *  - Targets seeded demo accounts by email domain (@kainanexpress.com).
 *  - Never touches admin@rms.com or any account outside the domain.
 *
 * Usage: php artisan uat:archive-demo-users {--domain=kainanexpress.com}
 */
class UatArchiveDemoUsers extends Command
{
    protected $signature = 'uat:archive-demo-users {--domain=kainanexpress.com}';

    protected $description = 'Deactivate seeded demo user accounts (safe archive; no deletion)';

    public function handle(): int
    {
        $domain = strtolower(trim((string) $this->option('domain'), '@'));

        $targets = DB::table('users')
            ->where('is_active', 1)
            ->where('email', 'like', "%@{$domain}")
            ->get(['id', 'email']);

        if ($targets->isEmpty()) {
            $this->info("No active @{$domain} accounts found. Nothing to do.");

            return self::SUCCESS;
        }

        if (! $this->confirm("Deactivate {$targets->count()} @{$domain} account(s)? They will no longer be able to log in.")) {
            $this->info('Aborted.');

            return self::SUCCESS;
        }

        DB::transaction(function () use ($targets) {
            foreach ($targets as $t) {
                DB::table('users')->where('id', $t->id)->update([
                    'is_active' => 0,
                    'updated_at' => now(),
                ]);
            }

            // Revoke any outstanding API tokens so archived sessions die.
            DB::table('personal_access_tokens')->whereIn(
                'tokenable_id',
                $targets->pluck('id')
            )->where('tokenable_type', (new \App\Models\User)->getMorphClass())->delete();
        });

        $this->table(['email'], $targets->map(fn ($t) => ['email' => $t->email])->all());
        $this->info("Archived {$targets->count()} account(s). Tokens revoked.");

        return self::SUCCESS;
    }
}
