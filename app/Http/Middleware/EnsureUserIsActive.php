<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && isset($user->is_active) && ! $user->is_active) {
            try {
                $user->tokens()->delete();
            } catch (\Throwable) {
            }

            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated.',
            ], 401)->withCookie(
                cookie('auth_token', '', -3600, '/', null, $this->isSecure(), true, false, 'Lax')
            );
        }

        return $next($request);
    }

    private function isSecure(): bool
    {
        $sessionSecure = config('session.secure');
        if ($sessionSecure !== null && $sessionSecure !== '') {
            return filter_var($sessionSecure, FILTER_VALIDATE_BOOLEAN);
        }
        return app()->isProduction();
    }
}
