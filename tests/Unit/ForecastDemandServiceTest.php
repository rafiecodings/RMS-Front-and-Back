<?php

namespace Tests\Unit;

use App\Services\ForecastDemandService;
use PHPUnit\Framework\TestCase;

class ForecastDemandServiceTest extends TestCase
{
    private ForecastDemandService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new ForecastDemandService;
    }

    public function test_rising_trend_when_forecast_exceeds_history_by_threshold(): void
    {
        $this->assertSame('rising', $this->service->classifyTrend(23.0, 20.0));
    }

    public function test_falling_trend_when_forecast_below_history_by_threshold(): void
    {
        $this->assertSame('falling', $this->service->classifyTrend(10.0, 20.0));
    }

    public function test_stable_trend_within_thresholds(): void
    {
        $this->assertSame('stable', $this->service->classifyTrend(21.0, 20.0));
    }

    public function test_stable_when_no_historical_data(): void
    {
        $this->assertSame('stable', $this->service->classifyTrend(50.0, 0.0));
    }
}
