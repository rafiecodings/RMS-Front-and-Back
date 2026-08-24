<?php

use Illuminate\Foundation\Console\Kernel;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('forecast:retrain')
    ->weeklyOn(1, '02:00')
    ->withoutOverlapping()
    ->onFailure(function (Kernel $kernel) {
        logger()->warning('Scheduled forecast retrain failed.');
    });
