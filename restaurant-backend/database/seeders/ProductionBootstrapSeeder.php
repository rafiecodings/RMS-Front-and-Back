<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ProductionBootstrapSeeder extends Seeder
{
    public function run(): void
    {
        $this->ensureRoles();
        $this->ensureAdminUser();
    }

    private function ensureRoles(): void
    {
        $roles = [
            ['name' => 'admin', 'display_name' => 'Administrator', 'description' => 'Full system access', 'is_system' => true],
            ['name' => 'manager', 'display_name' => 'Manager', 'description' => 'Restaurant manager with broad access', 'is_system' => true],
            ['name' => 'cashier', 'display_name' => 'Cashier', 'description' => 'POS and billing operations', 'is_system' => true],
            ['name' => 'waiter', 'display_name' => 'Waiter', 'description' => 'Order taking and table management', 'is_system' => true],
            ['name' => 'kitchen_staff', 'display_name' => 'Kitchen Staff', 'description' => 'Kitchen operations and KOT management', 'is_system' => true],
        ];

        foreach ($roles as $role) {
            Role::firstOrCreate(['name' => $role['name']], $role);
        }
    }

    private function ensureAdminUser(): void
    {
        $email = (string) env('ADMIN_EMAIL');
        $password = (string) env('ADMIN_PASSWORD');

        if ($email === '' || $password === '') {
            $this->command?->warn('ADMIN_EMAIL/ADMIN_PASSWORD not set — skipping admin bootstrap.');

            return;
        }

        $admin = User::firstOrCreate(
            ['email' => $email],
            [
                'id' => (string) Str::uuid(),
                'name' => 'Administrator',
                'password' => Hash::make($password),
                'is_active' => true,
                'email_verified_at' => now(),
            ]
        );

        $adminRole = Role::where('name', 'admin')->first();

        if ($adminRole !== null && ! $admin->roles()->where('role_id', $adminRole->id)->exists()) {
            $admin->roles()->attach($adminRole);
        }
    }
}
