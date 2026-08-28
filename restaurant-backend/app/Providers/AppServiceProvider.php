<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(
            \App\Repositories\BaseRepositoryInterface::class,
            \App\Repositories\BaseRepository::class
        );
    }

    public function boot(): void
    {
        $this->loadHelpers();
        $this->configureLoginRateLimiter();
        $this->configureRoutePatterns();
    }

    /**
     * Global route parameter constraints.
     *
     * Every API entity uses UUID primary keys (HasUuid trait). Constraining
     * these patterns means a malformed ID fails ROUTE MATCHING and returns
     * 404, instead of reaching SQL and triggering PostgreSQL error 22P02
     * (invalid uuid) as a 500. Explicit ->whereUuid(...) on individual routes
     * still takes precedence and remains compatible with this.
     */
    protected function configureRoutePatterns(): void
    {
        $uuid = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';

        foreach (['id', 'invoiceId', 'menuItemId', 'itemId', 'stationId'] as $param) {
            \Illuminate\Support\Facades\Route::pattern($param, $uuid);
        }
    }

    protected function configureLoginRateLimiter(): void
    {
        RateLimiter::for('login', function (Request $request) {
            $key = $request->input('email') ?: $request->ip();

            return Limit::perMinutes(
                (int) config('auth.throttle.login_decay_minutes', 1),
                (int) config('auth.throttle.login_max_attempts', 5)
            )
                ->by('login:'.$key)
                ->after(fn ($response) => $response->getStatusCode() === 401);
        });
    }

    protected function loadHelpers(): void
    {
        if (file_exists($file = $this->app->basePath('app/Helpers/helpers.php'))) {
            require $file;
        }
    }
}
