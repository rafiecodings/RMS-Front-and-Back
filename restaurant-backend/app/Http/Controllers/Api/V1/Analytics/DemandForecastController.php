<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Analytics;

use App\Http\Controllers\Controller;
use App\Services\Forecasting\ForecastManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Restaurant-wide demand forecasting endpoints.
 *
 * All business logic lives in ForecastManager:
 *   - TimechoAI is the primary provider when TIMECHO_API_KEY is configured
 *     (restaurant-level daily aggregates only — never personal data).
 *   - Any provider failure falls back to the local statistical forecast so
 *     the UI stays available.
 *   - Results are cached for 6h and shared by Dashboard / Reports /
 *     Analytics / Inventory projection / AI insights. Ingredient projections
 *     never call the provider themselves.
 */
class DemandForecastController extends Controller
{
    public function __construct(private readonly ForecastManager $forecasts)
    {
    }

    /** GET /analytics/demand-forecast?horizon=7|14|30 */
    public function sales(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'horizon' => 'nullable|integer|in:7,14,30',
        ]);

        $payload = $this->forecasts->sales((int) ($validated['horizon'] ?? 7));

        return $this->success($payload);
    }

    /** GET /inventory/demand-forecast?horizon=7|14|30 */
    public function ingredients(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'horizon' => 'nullable|integer|in:7,14,30',
        ]);

        $payload = $this->forecasts->ingredients((int) ($validated['horizon'] ?? 7));

        return $this->success($payload);
    }
}
