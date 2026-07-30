<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CorsMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $allowedOrigins = explode(',', config('app.cors_allowed_origins', 'http://localhost:3000'));

        $origin = $request->headers->get('Origin');

        if (in_array($origin, $allowedOrigins)) {
            $headers = [
                'Access-Control-Allow-Origin' => $origin,
                'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
                'Access-Control-Allow-Headers' => 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
                'Access-Control-Allow-Credentials' => 'true',
                'Access-Control-Max-Age' => '86400',
            ];
        }

        if ($request->getMethod() === 'OPTIONS') {
            return response('', 204)->withHeaders($headers ?? []);
        }

        $response = $next($request);

        if (isset($headers)) {
            foreach ($headers as $key => $value) {
                $response->headers->set($key, $value);
            }
        }

        return $response;
    }
}
