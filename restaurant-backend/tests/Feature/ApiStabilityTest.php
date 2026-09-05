<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Auth API lifecycle, login rate limiting and pagination hardening.
 */
class ApiStabilityTest extends TestCase
{
    use RefreshDatabase;

    private function loginAs(User $user): string
    {
        $res = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'secret-password',
        ]);
        $res->assertStatus(200);

        $cookie = $res->getCookie('auth_token', false);
        if ($cookie) {
            return rawurldecode((string) $cookie->getValue());
        }

        return '';
    }

    public function test_login_profile_refresh_logout_lifecycle(): void
    {
        $admin = User::factory()->create(['password' => bcrypt('secret-password')]);
        $admin->roles()->attach(
            Role::firstOrCreate(['name' => 'admin'], ['display_name' => 'Admin', 'module' => 'system'])
        );

        $token = $this->loginAs($admin);
        $this->assertNotSame('', $token);

        // Profile works with the fresh token.
        $this->getJson('/api/v1/auth/profile', ['Authorization' => "Bearer {$token}"])
            ->assertStatus(200);

        // Refresh issues a working token.
        $refresh = $this->postJson('/api/v1/auth/refresh', [], ['Authorization' => "Bearer {$token}"]);
        $refresh->assertStatus(200);
        $newCookie = $refresh->getCookie('auth_token', false);
        $newToken = $newCookie ? rawurldecode((string) $newCookie->getValue()) : '';
        $this->assertNotSame('', $newToken);

        $this->getJson('/api/v1/auth/profile', ['Authorization' => "Bearer {$newToken}"])
            ->assertStatus(200);

        // Logout invalidates.
        // NOTE: Sanctum's guard caches its resolved user/token for the whole
        // process inside feature tests, which would make this request act on
        // a STALE token object. Forget the guards so the request authenticates
        // freshly, exactly like a real HTTP round-trip does.
        $this->app->make('auth')->forgetGuards();
        $this->postJson('/api/v1/auth/logout', [], ['Authorization' => "Bearer {$newToken}"])
            ->assertStatus(200);

        // Server-side revocation proof: the access-token row must be gone.
        $this->assertSame(0, $admin->tokens()->count(), 'Logout must revoke the access token row.');

        // And the revoked token must no longer authenticate (fresh guard).
        $this->app->make('auth')->forgetGuards();
        $this->getJson('/api/v1/auth/profile', ['Authorization' => "Bearer {$newToken}"])
            ->assertStatus(401);
    }

    public function test_wrong_password_returns_401_with_clean_envelope(): void
    {
        $user = User::factory()->create(['password' => bcrypt('right-password')]);

        $res = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'wrong-password',
        ]);

        $res->assertStatus(401)
            ->assertJson(['success' => false])
            ->assertJsonStructure(['success', 'message']);
    }

    public function test_repeated_failed_logins_are_rate_limited(): void
    {
        $user = User::factory()->create(['password' => bcrypt('right-password')]);

        $saw429 = false;
        for ($i = 0; $i < 8; $i++) {
            $res = $this->postJson('/api/v1/auth/login', [
                'email' => $user->email,
                'password' => 'wrong-'.$i,
            ]);
            if ($res->status() === 429) {
                $saw429 = true;
                $res->assertJson(['success' => false]);
                break;
            }
        }

        $this->assertTrue($saw429, 'Expected 429 after repeated failed logins.');
    }

    public function test_negative_page_and_per_page_do_not_crash(): void
    {
        Customer::create([
            'name' => 'Pagination Test',
            'email' => 'pag@test.local',
            'phone' => '09170000001',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->adminUser())
            ->getJson('/api/v1/customers?page=-1&per_page=-5');

        $response->assertStatus(200)->assertJson(['success' => true]);
    }

    public function test_per_page_is_capped(): void
    {
        $response = $this->actingAs($this->adminUser())
            ->getJson('/api/v1/customers?per_page=99999');

        $response->assertStatus(200);
        $this->assertLessThanOrEqual(
            100,
            $response->json('data.pagination.per_page'),
            'per_page must be clamped server-side.'
        );
    }

    private function adminUser(): User
    {
        $user = User::factory()->create(['password' => bcrypt('secret-password')]);
        $user->roles()->attach(
            Role::firstOrCreate(['name' => 'admin'], ['display_name' => 'Admin', 'module' => 'system'])
        );

        return $user;
    }
}
