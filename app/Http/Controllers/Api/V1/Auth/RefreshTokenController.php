<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RefreshTokenController extends Controller
{
    public function refresh(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->currentAccessToken()->delete();

        $token = $user->createToken('auth-token')->plainTextToken;

        return $this->success([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->roles->first()?->name ?? 'user',
                'avatar' => $user->avatar,
                'is_active' => $user->is_active,
                'last_login_at' => $user->last_login_at?->toISOString(),
                'created_at' => $user->created_at?->toISOString(),
                'updated_at' => $user->updated_at?->toISOString(),
            ],
            'token' => $token,
            'token_type' => 'Bearer',
            'expires_in' => (int) (config('sanctum.expiration')
                ? config('sanctum.expiration') * 60
                : env('JWT_EXPIRY', 900)),
        ], 'Token refreshed successfully.')
            ->withCookie(
                cookie(
                    'auth_token',
                    $token,
                    60 * 24 * 7,
                    '/',
                    null,
                    env('APP_ENV') === 'production',
                    true,
                    false,
                    'Lax',
                )
            );
    }
}
