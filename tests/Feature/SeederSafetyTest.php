<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Database\Seeders\CapstoneUatSeeder;
use Database\Seeders\ProductionDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class SeederSafetyTest extends TestCase
{
    use RefreshDatabase;

    private function ensureRoles(): void
    {
        foreach (['admin', 'manager', 'cashier', 'waiter', 'kitchen_staff'] as $name) {
            Role::firstOrCreate(['name' => $name], ['display_name' => ucfirst($name), 'is_system' => true]);
        }
    }

    private function createAdmin(string $email = 'admin@rms.com'): User
    {
        $u = User::factory()->create(['email' => $email, 'name' => $email === 'admin@rms.com' ? 'Administrator' : 'Admin']);
        $u->roles()->attach(Role::where('name', 'admin')->firstOrFail());
        return $u->fresh();
    }

    private function createJayson(): User
    {
        $u = User::factory()->create(['email' => 'jaysonkitchenstaff@gmail.com', 'name' => 'Jayson Statham']);
        $u->roles()->attach(Role::where('name', 'kitchen_staff')->firstOrFail());
        DB::table('staff_profiles')->insert([
            'id' => (string) Str::uuid(),
            'user_id' => $u->id,
            'employee_id' => 'EMP-JAYSON01',
            'position' => 'Kitchen Staff',
            'department' => 'Kitchen',
            'hire_date' => now()->subMonths(2),
            'employment_type' => 'full_time',
            'phone' => '09919999999',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        return $u->fresh();
    }

    public function test_production_seeder_preserves_unrelated_users(): void
    {
        $this->ensureRoles();
        $admin = $this->createAdmin();
        $jayson = $this->createJayson();
        $unrelated = User::factory()->create(['email' => 'unrelated@example.com', 'name' => 'Unrelated Legit']);
        $unrelated->roles()->attach(Role::where('name', 'waiter')->firstOrFail());
        $unrelatedId = $unrelated->id;

        $this->assertDatabaseHas('users', ['email' => 'unrelated@example.com']);
        $this->assertDatabaseHas('users', ['email' => 'admin@rms.com']);
        $this->assertDatabaseHas('users', ['email' => 'jaysonkitchenstaff@gmail.com']);

        (new ProductionDataSeeder())->run();

        $this->assertDatabaseHas('users', ['id' => $unrelatedId, 'email' => 'unrelated@example.com']);
        $this->assertDatabaseHas('users', ['email' => 'admin@rms.com']);
        $this->assertDatabaseHas('users', ['email' => 'jaysonkitchenstaff@gmail.com']);
        $this->assertSame(1, User::where('email', 'admin@rms.com')->count());
        $this->assertSame(1, User::where('email', 'jaysonkitchenstaff@gmail.com')->count());
        $this->assertTrue(User::where('email', 'unrelated@example.com')->exists());
        $this->assertGreaterThanOrEqual(3, User::count());
    }

    public function test_capstone_uat_seeder_produces_exactly_two_users(): void
    {
        $this->ensureRoles();
        $this->createAdmin();
        $this->createJayson();
        $extra1 = User::factory()->create(['email' => 'extra1@example.com']);
        $extra1->roles()->attach(Role::where('name', 'cashier')->firstOrFail());
        $extra2 = User::factory()->create(['email' => 'extra2@example.com']);
        $extra2->roles()->attach(Role::where('name', 'manager')->firstOrFail());

        $this->assertSame(4, User::count());

        (new CapstoneUatSeeder())->run();

        $this->assertSame(2, User::count());
        $this->assertDatabaseHas('users', ['email' => 'admin@rms.com']);
        $this->assertDatabaseHas('users', ['email' => 'jaysonkitchenstaff@gmail.com']);
        $this->assertDatabaseMissing('users', ['email' => 'extra1@example.com']);
        $this->assertDatabaseMissing('users', ['email' => 'extra2@example.com']);

        $admin = User::where('email', 'admin@rms.com')->firstOrFail();
        $this->assertTrue($admin->roles()->where('name', 'admin')->exists());

        $jayson = User::where('email', 'jaysonkitchenstaff@gmail.com')->firstOrFail();
        $this->assertTrue($jayson->roles()->where('name', 'kitchen_staff')->exists());
        $this->assertDatabaseHas('staff_profiles', ['user_id' => $jayson->id]);
        $this->assertSame(1, DB::table('staff_profiles')->where('user_id', $jayson->id)->count());
        $this->assertSame(1, DB::table('model_has_roles')->where('model_id', $jayson->id)->where('model_type', 'App\Models\User')->count());
    }

    public function test_capstone_uat_seeder_is_idempotent(): void
    {
        $this->ensureRoles();
        $this->createAdmin();
        $this->createJayson();
        User::factory()->create(['email' => 'temp@example.com']);

        (new CapstoneUatSeeder())->run();
        $firstCount = User::count();
        $firstJaysonProfile = DB::table('staff_profiles')->where('user_id', User::where('email', 'jaysonkitchenstaff@gmail.com')->value('id'))->count();
        $firstAdminRoles = DB::table('model_has_roles')->where('model_id', User::where('email', 'admin@rms.com')->value('id'))->count();

        (new CapstoneUatSeeder())->run();

        $this->assertSame(2, User::count());
        $this->assertSame($firstCount, User::count());
        $this->assertSame(1, User::where('email', 'admin@rms.com')->count());
        $this->assertSame(1, User::where('email', 'jaysonkitchenstaff@gmail.com')->count());
        $jaysonId = User::where('email', 'jaysonkitchenstaff@gmail.com')->value('id');
        $this->assertSame(1, DB::table('staff_profiles')->where('user_id', $jaysonId)->count());
        $this->assertSame($firstJaysonProfile, DB::table('staff_profiles')->where('user_id', $jaysonId)->count());
        $adminId = User::where('email', 'admin@rms.com')->value('id');
        $this->assertSame(1, DB::table('model_has_roles')->where('model_id', $adminId)->where('model_type', 'App\Models\User')->count());
        $this->assertSame($firstAdminRoles, DB::table('model_has_roles')->where('model_id', $adminId)->count());
    }

    public function test_capstone_uat_seeder_guard_blocks_production(): void
    {
        $originalEnv = $this->app['env'];
        $this->app['env'] = 'production';

        try {
            $this->expectException(\RuntimeException::class);
            $this->expectExceptionMessageMatches('/may only run in local\/testing/');
            (new CapstoneUatSeeder())->run();
        } finally {
            $this->app['env'] = $originalEnv;
        }
    }
}
