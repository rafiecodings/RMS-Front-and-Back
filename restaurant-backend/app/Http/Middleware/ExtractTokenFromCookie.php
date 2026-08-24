<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class ExtractTokenFromCookie
{
    public function handle(Request $request, Closure $next)
    {
        $token = rawurldecode((string) $request->cookie('auth_token'));

        if ($token && ! $request->header('Authorization')) {
            $request->headers->set('Authorization', 'Bearer ' . $token);
        }

        return $next($request);
    }
}
