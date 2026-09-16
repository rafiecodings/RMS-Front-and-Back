<?php

use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'role' => \App\Http\Middleware\RoleMiddleware::class,
            'active' => \App\Http\Middleware\EnsureUserIsActive::class,
        ]);

        $middleware->api(prepend: [
            \App\Http\Middleware\ExtractTokenFromCookie::class,
            \App\Http\Middleware\SanitizePagination::class,
        ]);

        // API-only backend: the Next.js web client handles auth itself and no
        // server-side `login` route is defined. Laravel 12 defaults the auth
        // redirect target to route('login'); that throws a RouteNotFoundException
        // for unauthenticated non-JSON requests, which was masked as a 500
        // (e.g. GET /api/v1/dashboard/summary -> 500). Returning null makes the
        // Authenticate middleware throw an AuthenticationException, which the
        // handler below renders as a clean 401 JSON response.
        $middleware->redirectGuestsTo(fn () => null);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (\Throwable $e, Request $request) {
            if (! $request->is('api/*') && ! $request->expectsJson()) {
                return;
            }

            if ($e instanceof ValidationException) {
                return response()->json([
                    'success' => false,
                    'message' => $e->getMessage(),
                    'errors' => $e->errors(),
                ], $e->status);
            }

            if ($e instanceof AuthenticationException) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthenticated.',
                ], 401);
            }

            if ($e instanceof AuthorizationException) {
                return response()->json([
                    'success' => false,
                    'message' => $e->getMessage() ?: 'Forbidden.',
                ], $e->status() ?: 403);
            }

            if ($e instanceof ThrottleRequestsException) {
                return response()->json([
                    'success' => false,
                    'message' => 'Too many login attempts. Please try again later.',
                ], 429, $e->getHeaders());
            }

            $status = $e instanceof HttpExceptionInterface ? $e->getStatusCode() : 500;

            $message = match (true) {
                $status >= 500 => 'An unexpected error occurred. Please try again later.',
                $e instanceof NotFoundHttpException => 'Not Found.',
                default => $e->getMessage() ?: 'An error occurred.',
            };

            return response()->json([
                'success' => false,
                'message' => $message,
                'error' => app()->isLocal() ? $e->getMessage() : null,
            ], $status);
        });
    })->create();
