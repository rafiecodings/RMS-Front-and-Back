<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTokenHardeningTest extends TestCase
{
    use RefreshDatabase;

    private function extractAuthCookie(\Illuminate\Testing\TestResponse $res): string
    {
        $cookie = $res->getCookie('auth_token', false);
        if ($cookie) {
            return rawurldecode((string) $cookie->getValue());
        }

        return '';
    }

    private function makeAdmin(): User
    {
        $user = User::factory()->create(['password' => bcrypt('secret-password')]);
        $user->roles()->attach(Role::firstOrCreate(['name' => 'admin'], ['display_name' => 'Admin', 'module' => 'system']));

        return $user;
    }

    public function test_login_creates_usable_session_via_cookie(): void
    {
        $admin = $this->makeAdmin();

        $res = $this->postJson('/api/v1/auth/login', [
            'email' => $admin->email,
            'password' => 'secret-password',
        ]);

        $res->assertStatus(200);
        $res->assertCookie('auth_token');

        $token = $this->extractAuthCookie($res);
        $this->assertNotSame('', $token);

        $this->getJson('/api/v1/auth/profile', ['Authorization' => "Bearer {$token}"])
            ->assertStatus(200);
    }

    public function test_login_json_does_not_expose_token(): void
    {
        $admin = $this->makeAdmin();

        $res = $this->postJson('/api/v1/auth/login', [
            'email' => $admin->email,
            'password' => 'secret-password',
        ]);

        $res->assertStatus(200);
        $this->assertNull($res->json('data.token'));
        $this->assertNull($res->json('data.token_type'));
        $this->assertArrayNotHasKey('token', $res->json('data') ?? []);
    }

    public function test_login_expires_in_matches_sanctum_lifetime(): void
    {
        $admin = $this->makeAdmin();

        $res = $this->postJson('/api/v1/auth/login', [
            'email' => $admin->email,
            'password' => 'secret-password',
        ]);

        $res->assertStatus(200);
        $expected = (int) config('sanctum.expiration') * 60;
        $this->assertSame($expected, $res->json('data.expires_in'));
    }

    public function test_refresh_revokes_current_and_issues_replacement(): void
    {
        $admin = $this->makeAdmin();

        $login = $this->postJson('/api/v1/auth/login', [
            'email' => $admin->email,
            'password' => 'secret-password',
        ]);
        $token = $this->extractAuthCookie($login);

        $this->assertSame(1, $admin->tokens()->count());

        $refresh = $this->postJson('/api/v1/auth/refresh', [], ['Authorization' => "Bearer {$token}"]);
        $refresh->assertStatus(200);

        $newToken = $this->extractAuthCookie($refresh);
        $this->assertNotSame('', $newToken);
        $this->assertNotSame($token, $newToken);
        $this->assertSame(1, $admin->tokens()->count());

        $this->app->make('auth')->forgetGuards();
        $this->getJson('/api/v1/auth/profile', ['Authorization' => "Bearer {$token}"])
            ->assertStatus(401);

        $this->app->make('auth')->forgetGuards();
        $this->getJson('/api/v1/auth/profile', ['Authorization' => "Bearer {$newToken}"])
            ->assertStatus(200);
    }

    public function test_refresh_json_does_not_expose_token(): void
    {
        $admin = $this->makeAdmin();

        $login = $this->postJson('/api/v1/auth/login', [
            'email' => $admin->email,
            'password' => 'secret-password',
        ]);
        $token = $this->extractAuthCookie($login);

        $refresh = $this->postJson('/api/v1/auth/refresh', [], ['Authorization' => "Bearer {$token}"]);
        $refresh->assertStatus(200);
        $this->assertNull($refresh->json('data.token'));
        $this->assertArrayNotHasKey('token', $refresh->json('data') ?? []);
    }

    public function test_logout_revokes_current_pat(): void
    {
        $admin = $this->makeAdmin();

        $login = $this->postJson('/api/v1/auth/login', [
            'email' => $admin->email,
            'password' => 'secret-password',
        ]);
        $token = $this->extractAuthCookie($login);

        $this->app->make('auth')->forgetGuards();
        $this->postJson('/api/v1/auth/logout', [], ['Authorization' => "Bearer {$token}"])
            ->assertStatus(200);

        $this->assertSame(0, $admin->tokens()->count());
    }

    public function test_protected_request_after_logout_returns_401(): void
    {
        $admin = $this->makeAdmin();

        $login = $this->postJson('/api/v1/auth/login', [
            'email' => $admin->email,
            'password' => 'secret-password',
        ]);
        $token = $this->extractAuthCookie($login);

        $this->app->make('auth')->forgetGuards();
        $this->postJson('/api/v1/auth/logout', [], ['Authorization' => "Bearer {$token}"])
            ->assertStatus(200);

        $this->app->make('auth')->forgetGuards();
        $this->getJson('/api/v1/auth/profile', ['Authorization' => "Bearer {$token}"])
            ->assertStatus(401);
    }
}
