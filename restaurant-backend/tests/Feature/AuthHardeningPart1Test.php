<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthHardeningPart1Test extends TestCase
{
    use RefreshDatabase;

    private function extractCookie(\Illuminate\Testing\TestResponse $res): string
    {
        $c = $res->getCookie('auth_token', false);
        return $c ? rawurldecode((string) $c->getValue()) : '';
    }

    private function makeUser(string $role = 'admin', bool $active = true): User
    {
        $u = User::factory()->create(['password' => bcrypt('secret-password'), 'is_active' => $active]);
        $u->roles()->attach(Role::firstOrCreate(['name' => $role], ['display_name' => ucfirst($role), 'is_system' => true]));
        return $u->fresh();
    }

    private function loginToken(User $user, string $password = 'secret-password'): string
    {
        $res = $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => $password]);
        if ($res->status() !== 200) return '';
        return $this->extractCookie($res);
    }

    public function test_a_valid_active_login_success(): void
    {
        $u = $this->makeUser();
        $res = $this->postJson('/api/v1/auth/login', ['email' => $u->email, 'password' => 'secret-password']);
        $res->assertStatus(200)->assertJson(['success' => true]);
        $this->assertNotSame('', $this->extractCookie($res));
    }

    public function test_b_invalid_credentials_generic_401(): void
    {
        $u = $this->makeUser();
        $this->postJson('/api/v1/auth/login', ['email' => $u->email, 'password' => 'wrong'])->assertStatus(401)->assertJson(['success' => false, 'message' => 'Invalid credentials.']);
        $this->postJson('/api/v1/auth/login', ['email' => 'nonexistent@example.com', 'password' => 'wrong'])->assertStatus(401)->assertJson(['message' => 'Invalid credentials.']);
    }

    public function test_c_inactive_valid_credentials_same_generic_401(): void
    {
        $u = $this->makeUser('waiter', false);
        $res = $this->postJson('/api/v1/auth/login', ['email' => $u->email, 'password' => 'secret-password']);
        $res->assertStatus(401)->assertJson(['message' => 'Invalid credentials.']);
        $this->assertStringNotContainsString('deactivat', strtolower($res->json('message') ?? ''), 'Must not leak deactivation');
    }

    public function test_d_inactive_login_does_not_create_token(): void
    {
        $u = $this->makeUser('waiter', false);
        $this->postJson('/api/v1/auth/login', ['email' => $u->email, 'password' => 'secret-password'])->assertStatus(401);
        $this->assertSame(0, $u->fresh()->tokens()->count());
        $fresh = User::where('email', $u->email)->first();
        $this->assertNull($fresh->last_login_at);
    }

    public function test_e_repeated_inactive_login_eventually_429(): void
    {
        $u = $this->makeUser('waiter', false);
        $saw429 = false;
        for ($i = 0; $i < 8; $i++) {
            $res = $this->postJson('/api/v1/auth/login', ['email' => $u->email, 'password' => 'secret-password']);
            if ($res->status() === 429) { $saw429 = true; break; }
        }
        $this->assertTrue($saw429, 'Repeated inactive logins must eventually 429');
    }

    public function test_f_active_token_accesses_protected_endpoint(): void
    {
        $u = $this->makeUser();
        $token = $this->loginToken($u);
        $this->assertNotSame('', $token);
        $this->getJson('/api/v1/auth/profile', ['Authorization' => "Bearer {$token}"])->assertStatus(200);
    }

    public function test_g_admin_deactivates_user_revokes_all_tokens(): void
    {
        $admin = $this->makeUser('admin');
        $target = $this->makeUser('waiter');
        $t1 = $this->loginToken($target);
        $this->app->make('auth')->forgetGuards();
        $second = $target->createToken('auth-token')->plainTextToken;
        $this->assertSame(2, $target->fresh()->tokens()->count());
        $this->actingAs($admin)->putJson("/api/v1/admin/users/{$target->id}", ['is_active' => false])->assertStatus(200);
        $this->assertSame(0, $target->fresh()->tokens()->count());
    }

    public function test_h_token_after_deactivation_returns_401(): void
    {
        $admin = $this->makeUser('admin');
        $target = $this->makeUser('waiter');
        $token = $this->loginToken($target);
        $this->app->make('auth')->forgetGuards();
        $this->actingAs($admin)->putJson("/api/v1/admin/users/{$target->id}", ['is_active' => false])->assertStatus(200);
        $this->app->make('auth')->forgetGuards();
        $this->getJson('/api/v1/auth/profile', ['Authorization' => "Bearer {$token}"])->assertStatus(401);
        $this->getJson('/api/v1/dashboard/summary', ['Authorization' => "Bearer {$token}"])->assertStatus(401);
    }

    public function test_i_reactivation_does_not_revive_old_token(): void
    {
        $admin = $this->makeUser('admin');
        $target = $this->makeUser('waiter');
        $token = $this->loginToken($target);
        $this->app->make('auth')->forgetGuards();
        $this->actingAs($admin)->putJson("/api/v1/admin/users/{$target->id}", ['is_active' => false])->assertStatus(200);
        $this->actingAs($admin)->putJson("/api/v1/admin/users/{$target->id}", ['is_active' => true])->assertStatus(200);
        $this->app->make('auth')->forgetGuards();
        $this->getJson('/api/v1/auth/profile', ['Authorization' => "Bearer {$token}"])->assertStatus(401);
    }

    public function test_j_active_token_refresh_works(): void
    {
        $u = $this->makeUser();
        $token = $this->loginToken($u);
        $this->app->make('auth')->forgetGuards();
        $res = $this->postJson('/api/v1/auth/refresh', [], ['Authorization' => "Bearer {$token}"]);
        $res->assertStatus(200);
        $new = $this->extractCookie($res);
        $this->assertNotSame('', $new);
        $this->assertNotSame($token, $new);
        $this->app->make('auth')->forgetGuards();
        $this->getJson('/api/v1/auth/profile', ['Authorization' => "Bearer {$token}"])->assertStatus(401);
        $this->getJson('/api/v1/auth/profile', ['Authorization' => "Bearer {$new}"])->assertStatus(200);
    }

    public function test_k_inactive_user_cannot_refresh(): void
    {
        $u = $this->makeUser();
        $token = $this->loginToken($u);
        $u->update(['is_active' => false]);
        $u->tokens()->delete();
        $freshToken = $u->createToken('auth-token')->plainTextToken;
        $this->app->make('auth')->forgetGuards();
        $this->postJson('/api/v1/auth/refresh', [], ['Authorization' => "Bearer {$freshToken}"])->assertStatus(401);
    }

    public function test_l_change_password_succeeds_with_correct_current(): void
    {
        $u = $this->makeUser();
        $token = $this->loginToken($u);
        $this->app->make('auth')->forgetGuards();
        $res = $this->postJson('/api/v1/auth/change-password', [
            'current_password' => 'secret-password',
            'password' => 'new-secret-123',
            'password_confirmation' => 'new-secret-123',
        ], ['Authorization' => "Bearer {$token}"]);
        $res->assertStatus(200);
        $this->assertTrue(Hash::check('new-secret-123', $u->fresh()->password));
    }

    public function test_m_wrong_current_password_422(): void
    {
        $u = $this->makeUser();
        $token = $this->loginToken($u);
        $this->app->make('auth')->forgetGuards();
        $this->postJson('/api/v1/auth/change-password', [
            'current_password' => 'wrong',
            'password' => 'new-secret-123',
            'password_confirmation' => 'new-secret-123',
        ], ['Authorization' => "Bearer {$token}"])->assertStatus(422)->assertJsonPath('errors.current_password.0', 'Current password is incorrect.');
    }

    public function test_n_new_password_same_as_current_rejected(): void
    {
        $u = $this->makeUser();
        $token = $this->loginToken($u);
        $this->app->make('auth')->forgetGuards();
        $this->postJson('/api/v1/auth/change-password', [
            'current_password' => 'secret-password',
            'password' => 'secret-password',
            'password_confirmation' => 'secret-password',
        ], ['Authorization' => "Bearer {$token}"])->assertStatus(422);
    }

    public function test_o_password_confirmation_mismatch_422(): void
    {
        $u = $this->makeUser();
        $token = $this->loginToken($u);
        $this->app->make('auth')->forgetGuards();
        $this->postJson('/api/v1/auth/change-password', [
            'current_password' => 'secret-password',
            'password' => 'new-secret-123',
            'password_confirmation' => 'different',
        ], ['Authorization' => "Bearer {$token}"])->assertStatus(422);
    }

    public function test_p_successful_change_revokes_all_tokens(): void
    {
        $u = $this->makeUser();
        $token = $this->loginToken($u);
        $u->createToken('auth-token')->plainTextToken;
        $this->assertSame(2, $u->fresh()->tokens()->count());
        $this->app->make('auth')->forgetGuards();
        $this->postJson('/api/v1/auth/change-password', [
            'current_password' => 'secret-password',
            'password' => 'new-secret-123',
            'password_confirmation' => 'new-secret-123',
        ], ['Authorization' => "Bearer {$token}"])->assertStatus(200);
        $this->assertSame(0, $u->fresh()->tokens()->count());
    }

    public function test_q_old_token_after_password_change_401(): void
    {
        $u = $this->makeUser();
        $token = $this->loginToken($u);
        $this->app->make('auth')->forgetGuards();
        $this->postJson('/api/v1/auth/change-password', [
            'current_password' => 'secret-password',
            'password' => 'new-secret-123',
            'password_confirmation' => 'new-secret-123',
        ], ['Authorization' => "Bearer {$token}"])->assertStatus(200);
        $this->app->make('auth')->forgetGuards();
        $this->getJson('/api/v1/auth/profile', ['Authorization' => "Bearer {$token}"])->assertStatus(401);
    }

    public function test_r_auth_cookie_cleared_after_password_change(): void
    {
        $u = $this->makeUser();
        $token = $this->loginToken($u);
        $this->app->make('auth')->forgetGuards();
        $res = $this->postJson('/api/v1/auth/change-password', [
            'current_password' => 'secret-password',
            'password' => 'new-secret-123',
            'password_confirmation' => 'new-secret-123',
        ], ['Authorization' => "Bearer {$token}"]);
        $res->assertStatus(200);
        $cookie = $res->getCookie('auth_token', false);
        $this->assertNotNull($cookie);
        $this->assertSame('', $cookie->getValue());
    }

    public function test_s_admin_resets_other_user_password_revokes_target_tokens(): void
    {
        $admin = $this->makeUser('admin');
        $target = $this->makeUser('waiter');
        $tToken = $this->loginToken($target);
        $target->createToken('auth-token')->plainTextToken;
        $this->assertSame(2, $target->fresh()->tokens()->count());
        $this->app->make('auth')->forgetGuards();
        $this->actingAs($admin)->putJson("/api/v1/admin/users/{$target->id}", [
            'password' => 'admin-reset-123',
            'password_confirmation' => 'admin-reset-123',
        ])->assertStatus(200);
        $this->assertSame(0, $target->fresh()->tokens()->count());
        $this->app->make('auth')->forgetGuards();
        $this->getJson('/api/v1/auth/profile', ['Authorization' => "Bearer {$tToken}"])->assertStatus(401);
    }

    public function test_t_admin_cannot_bypass_own_password_via_generic_update(): void
    {
        $admin = $this->makeUser('admin');
        $token = $this->loginToken($admin);
        $this->app->make('auth')->forgetGuards();
        $this->actingAs($admin)->putJson("/api/v1/admin/users/{$admin->id}", [
            'password' => 'new-admin-pass123',
            'password_confirmation' => 'new-admin-pass123',
        ])->assertStatus(422)->assertJson(['success' => false]);
        $this->assertTrue(Hash::check('secret-password', $admin->fresh()->password));
    }

    public function test_u_logout_still_revokes_current_token(): void
    {
        $u = $this->makeUser();
        $token = $this->loginToken($u);
        $this->app->make('auth')->forgetGuards();
        $this->postJson('/api/v1/auth/logout', [], ['Authorization' => "Bearer {$token}"])->assertStatus(200);
        $this->assertSame(0, $u->fresh()->tokens()->count());
        $this->app->make('auth')->forgetGuards();
        $this->getJson('/api/v1/auth/profile', ['Authorization' => "Bearer {$token}"])->assertStatus(401);
    }

    public function test_v_logout_cookie_consistent_secure_flag(): void
    {
        $u = $this->makeUser();
        $token = $this->loginToken($u);
        $loginCookie = $this->postJson('/api/v1/auth/login', ['email' => $u->email, 'password' => 'secret-password'])->getCookie('auth_token', false);
        $this->app->make('auth')->forgetGuards();
        $logoutCookie = $this->postJson('/api/v1/auth/logout', [], ['Authorization' => "Bearer {$token}"])->getCookie('auth_token', false);
        $this->assertNotNull($loginCookie);
        $this->assertNotNull($logoutCookie);
        $this->assertSame($loginCookie->isSecure(), $logoutCookie->isSecure(), 'Secure flag must be consistent');
        $this->assertTrue($logoutCookie->isHttpOnly());
        $this->assertSame('lax', strtolower((string) $logoutCookie->getSameSite()));
    }

    public function test_w_login_json_does_not_expose_token(): void
    {
        $u = $this->makeUser();
        $res = $this->postJson('/api/v1/auth/login', ['email' => $u->email, 'password' => 'secret-password']);
        $res->assertStatus(200);
        $this->assertNull($res->json('data.token'));
        $this->assertArrayNotHasKey('token', $res->json('data') ?? []);
    }

    public function test_x_profile_does_not_expose_hash_or_token(): void
    {
        $u = $this->makeUser();
        $token = $this->loginToken($u);
        $res = $this->getJson('/api/v1/auth/profile', ['Authorization' => "Bearer {$token}"]);
        $res->assertStatus(200);
        $data = $res->json('data');
        $this->assertArrayNotHasKey('password', $data);
        $this->assertArrayNotHasKey('token', $data);
        $this->assertArrayNotHasKey('remember_token', $data);
    }

    public function test_active_middleware_blocks_inactive_token_on_protected_route(): void
    {
        $u = $this->makeUser();
        $token = $this->loginToken($u);
        $u->update(['is_active' => false]);
        $this->app->make('auth')->forgetGuards();
        $res = $this->getJson('/api/v1/auth/profile', ['Authorization' => "Bearer {$token}"]);
        $res->assertStatus(401)->assertJson(['message' => 'Unauthenticated.']);
        $this->assertSame(0, $u->fresh()->tokens()->count());
    }
}
