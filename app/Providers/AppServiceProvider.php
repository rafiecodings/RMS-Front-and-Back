<?php

namespace App\Providers;

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
    }

    protected function loadHelpers(): void
    {
        if (file_exists($file = $this->app->basePath('app/Helpers/helpers.php'))) {
            require $file;
        }
    }
}
