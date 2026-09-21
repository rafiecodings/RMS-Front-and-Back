<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Support\AuthCookie;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LogoutController extends Controller
{
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        // Dev per-tab auth mode: do not clear cookie (token is in sessionStorage per tab)
        $isDevPerTabAuth = app()->environment('local') && filter_var(env('DEV_PER_TAB_AUTH', false), FILTER_VALIDATE_BOOLEAN);

        $response = $this->success(null, 'Logged out successfully.');

        if ($isDevPerTabAuth) {
            return $response;
        }

        return $response->withCookie(AuthCookie::forget());
    }
}
