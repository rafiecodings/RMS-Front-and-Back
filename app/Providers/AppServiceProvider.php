<?php

namespace App\Providers;

use App\Repositories\BaseRepository;
use App\Repositories\BaseRepositoryInterface;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(
            BaseRepositoryInterface::class,
            BaseRepository::class
        );
    }

    public function boot(): void
    {
        $this->loadHelpers();
        $this->configureLoginRateLimiter();
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
