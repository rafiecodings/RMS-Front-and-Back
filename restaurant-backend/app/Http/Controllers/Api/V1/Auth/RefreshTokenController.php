<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Support\AuthCookie;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RefreshTokenController extends Controller
{
    public function refresh(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->currentAccessToken()->delete();

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

        $response = $this->success($data, 'Token refreshed successfully.');

        if ($isDevPerTabAuth) {
            return $response;
        }

        return $response->withCookie(
            AuthCookie::make($token, $expiresIn / 60)
        );
    }
}
