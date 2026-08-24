<?php

declare(strict_types=1);

namespace App\Services\Forecasting;

use Carbon\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Laravel-only client for the TimechoAI time-series forecasting REST API.
 *
 * Documented contract (https://ai.timecho.com/docs/en/api/prediction):
 *   POST {base}{forecast_path}
 *   Headers: Content-Type: application/json, Authorization: Bearer {key}
 *   Body: { targets:[{columns, data}], output_length:[N], time_col:["time"] }
 *   Response: { code:200, message, data:{ results:[{ columns, data:[[time,value],...] } ] } }
 *
 * The REST API documents point forecasts only (no quantile fields) and does
 * not expose a model-selection field at the REST layer — requests use the
 * service default (auto routing). TIMECHO_MODEL is kept in config for future
 * use but is never sent as an undocumented parameter.
 *
 * The API key never leaves the backend. TimechoAI receives ONLY anonymous
 * daily aggregates — never customer or employee data.
 */
class TimechoForecastService
{
    public function configured(): bool
    {
        return (bool) config('services.timecho.api_key');
    }

    /** Configured model label (informational; not sent — see class docblock). */
    public function model(): string
    {
        return (string) (config('services.timecho.model') ?: 'auto');
    }

    public function baseUrl(): string
    {
        return rtrim((string) config('services.timecho.base_url', 'https://ai.timecho.com'), '/');
    }

    public function forecastPath(): string
    {
        return (string) config('services.timecho.forecast_path', '/ai/api/v1/forecast');
    }

    /**
     * Forecast a single daily series.
     *
     * @param  list<float>  $values     Chronological daily values (oldest first).
     * @param  string       $startDate  YYYY-MM-DD of the FIRST history point.
     * @param  int          $horizon    Prediction length in days (7|14|30).
     * @param  string       $valueName  Column label for the value (metadata only).
     * @return list<array{date:string,predicted:float,lower:null,upper:null}>
     *         Point forecasts only — lower/upper are always null because the
     *         TimechoAI REST contract returns no uncertainty interval.
     *
     * @throws InsufficientHistoryException when history is too short.
     * @throws \RuntimeException on auth/quota/provider/normalization failures.
     */
    public function forecastDailySeries(
        array $values,
        string $startDate,
        int $horizon = 7,
        string $valueName = 'value',
    ): array {
        if (! $this->configured()) {
            throw new \RuntimeException('TimechoAI is not configured.');
        }

        $horizon = in_array($horizon, [7, 14, 30], true) ? $horizon : 7;
        $points = array_values(array_map('floatval', $values));

        // Minimum usable history; checked BEFORE spending provider quota.
        if (count($points) < 14) {
            throw new InsufficientHistoryException();
        }

        $data = [];
        $cursor = Carbon::parse($startDate)->startOfDay();
        foreach ($points as $value) {
            $data[] = [$cursor->format('Y-m-d\T00:00:00'), $value];
            $cursor->addDay();
        }

        $payload = [
            'targets' => [
                [
                    'columns' => ['time', $valueName],
                    'data' => $data,
                ],
            ],
            'output_length' => [$horizon],
            'time_col' => ['time'],
        ];

        try {
            $response = Http::timeout(30)
                ->withToken((string) config('services.timecho.api_key'))
                ->acceptJson()
                ->post($this->baseUrl().$this->forecastPath(), $payload);
        } catch (\Throwable $e) {
            Log::warning('TimechoAI forecast transport error', ['error' => $e->getMessage()]);
            throw new \RuntimeException('Forecast service unreachable.');
        }

        if ($response->status() === 401 || $response->status() === 403) {
            throw new \RuntimeException('Forecast authentication failed.');
        }

        if ($response->status() === 429) {
            throw new \RuntimeException('Forecast quota/rate limit reached.');
        }

        if ($response->failed()) {
            Log::warning('TimechoAI forecast request failed', ['status' => $response->status()]);
            throw new \RuntimeException('Forecast request failed.');
        }

        $normalized = $this->normalize($response->json(), $startDate, count($points));

        if ($normalized === []) {
            throw new \RuntimeException('Malformed forecast response.');
        }

        return $normalized;
    }

    /**
     * Normalize the documented response envelope into the internal RMS
     * forecast contract. The frontend never sees TimechoAI's raw schema.
     */
    private function normalize(mixed $body, string $startDate, int $historyCount): array
    {
        if (! is_array($body) || ($body['code'] ?? null) !== 200) {
            return [];
        }

        $rows = $body['data']['results'][0]['data'] ?? null;
        if (! is_array($rows) || $rows === []) {
            return [];
        }

        // Forecast dates start after the last history point.
        $firstDate = Carbon::parse($startDate)->startOfDay()->addDays(max(0, $historyCount));
        $fallbackCursor = $firstDate->copy();

        $out = [];
        foreach ($rows as $row) {
            if (! is_array($row) || count($row) < 2 || ! is_numeric($row[1])) {
                continue;
            }

            // Prefer the returned timestamp; fall back to sequential dates.
            $date = is_string($row[0]) && strtotime($row[0]) !== false
                ? Carbon::parse($row[0])->toDateString()
                : $fallbackCursor->toDateString();
            $fallbackCursor = Carbon::parse($date)->addDay();

            $out[] = [
                'date' => $date,
                'predicted' => round(max(0.0, (float) $row[1]), 2),
                'lower' => null,
                'upper' => null,
            ];
        }

        return $out;
    }
}
