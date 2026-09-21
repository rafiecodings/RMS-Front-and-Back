<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\AuthCookie;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class LoginController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password) || ! $user->is_active) {
            return $this->error('Invalid credentials.', 401);
        }

        $user->update(['last_login_at' => now()]);

        $token = $user->createToken('auth-token')->plainTextToken;

        $userData = [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->roles->first()?->name ?? 'user',
            'avatar' => $user->avatar,
            'is_active' => $user->is_active,
            'last_login_at' => $user->last_login_at?->toISOString(),
            'created_at' => $user->created_at?->toISOString(),
            'updated_at' => $user->updated_at?->toISOString(),
        ];

        $expiresIn = (int) config('sanctum.expiration') * 60;

        // Dev per-tab auth mode: return token in JSON, do not set cookie
        $isDevPerTabAuth = app()->environment('local') && filter_var(env('DEV_PER_TAB_AUTH', false), FILTER_VALIDATE_BOOLEAN);

        $data = [
            'user' => $userData,
            'expires_in' => $expiresIn,
        ];

        if ($isDevPerTabAuth) {
            $data['token'] = $token;
        }

        $response = $this->success($data, 'Login successful.');

        if ($isDevPerTabAuth) {
            return $response;
        }

        return $response->withCookie(
            AuthCookie::make($token, $expiresIn / 60)
        );
    }
}
