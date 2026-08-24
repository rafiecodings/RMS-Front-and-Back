<?php

namespace App\Console\Commands;

use App\Models\Role;
use App\Models\User;
use Illuminate\Console\Command;

class SyncDemoRoles extends Command
{
    protected $signature = 'rms:sync-roles';

    protected $description = 'Idempotently reconcile role assignments for known demo users';

    public function handle(): int
    {
        $map = [
            'admin@rms.com' => 'admin',
            'ricardo.santos@kainanexpress.com' => 'manager',
            'maria.lopez@kainanexpress.com' => 'manager',
            'angela.cruz@kainanexpress.com' => 'cashier',
            'brian.tan@kainanexpress.com' => 'cashier',
            'catherine.reyes@kainanexpress.com' => 'cashier',
            'dennis.villanueva@kainanexpress.com' => 'cashier',
            'elena.garcia@kainanexpress.com' => 'waiter',
            'francisco.diaz@kainanexpress.com' => 'waiter',
            'gloria.mendoza@kainanexpress.com' => 'waiter',
            'henry.ramirez@kainanexpress.com' => 'waiter',
            'isabel.torres@kainanexpress.com' => 'waiter',
            'jose.gonzales@kainanexpress.com' => 'waiter',
            'katherine.sanches@kainanexpress.com' => 'waiter',
            'luis.fernandez@kainanexpress.com' => 'kitchen_staff',
            'martha.rivera@kainanexpress.com' => 'kitchen_staff',
            'nicolas.castillo@kainanexpress.com' => 'kitchen_staff',
            'olivia.santiago@kainanexpress.com' => 'kitchen_staff',
            'pedro.alvarez@kainanexpress.com' => 'kitchen_staff',
            'queen.delacruz@kainanexpress.com' => 'kitchen_staff',
            'ramon.guerrero@kainanexpress.com' => 'inventory_staff',
            'sofia.mercado@kainanexpress.com' => 'inventory_staff',
            'tomas.aguilar@kainanexpress.com' => 'inventory_staff',
            'ursula.navarro@kainanexpress.com' => 'inventory_staff',
            'victor.ramos@kainanexpress.com' => 'manager',
            'wendy.chua@kainanexpress.com' => 'manager',
            'xavier.lim@kainanexpress.com' => 'waiter',
            'yvonne.ong@kainanexpress.com' => 'cashier',
            'zandro.bautista@kainanexpress.com' => 'kitchen_staff',
        ];

        $attached = 0;

        foreach ($map as $email => $roleName) {
            $user = User::where('email', $email)->first();
            if (! $user) {
                continue;
            }

            $role = Role::firstOrCreate(
                ['name' => $roleName],
                [
                    'name' => $roleName,
                    'display_name' => ucwords(str_replace('_', ' ', $roleName)),
                    'is_system' => false,
                ]
            );

            if (! $user->roles()->where('role_id', $role->id)->exists()) {
                $user->roles()->attach($role->id);
                $attached++;
                $this->info("Attached role [{$roleName}] to {$email}");
            }
        }

        $this->info("Done. {$attached} role assignment(s) attached.");

        return self::SUCCESS;
    }
}
