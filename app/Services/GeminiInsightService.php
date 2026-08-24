<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Thin Laravel-only client for the Gemini REST API.
 *
 * The API key never leaves the backend: it is read from server config and
 * the frontend only ever talks to this service through Laravel endpoints.
 *
 * Gemini NEVER produces authoritative figures — it only receives aggregates
 * already computed by Laravel and returns narrative insights, which are
 * validated/normalized here before being returned to callers.
 */
class GeminiInsightService
{
    public function configured(): bool
    {
        return (bool) config('services.gemini.key');
    }

    public function model(): string
    {
        return (string) config('services.gemini.model', 'gemini-3.7-flash');
    }

    /**
     * @param  array<string, mixed>  $metrics  Aggregated, non-sensitive
     *                                         operational metrics computed by Laravel.
     * @return array{summary:string,sales_insights:list<string>,inventory_insights:list<string>,risks:list<string>,recommendations:list<string>,confidence:string}
     *
     * @throws \RuntimeException on transport errors or malformed responses.
     */
    public function generateInsights(array $metrics): array
    {
        if (! $this->configured()) {
            throw new \RuntimeException('Gemini is not configured.');
        }

        $systemPrompt = <<<'PROMPT'
You are a restaurant business analyst. You receive AGGREGATED operational
metrics (daily sales totals, item quantities, hourly order counts, stock
levels, wastage totals). These numbers are authoritative — do not invent
new figures; you may reference only the provided values.

Respond with ONLY a JSON object in exactly this shape:
{
  "summary": "2-3 sentence executive summary",
  "sales_insights": ["...", "..."],
  "forecast_insights": ["..."],
  "inventory_insights": ["..."],
  "risks": ["..."],
  "recommendations": ["...", "..."],
  "confidence": "low" | "medium" | "high"
}
Rules:
- Every insight must cite at least one concrete number from the input.
- Max 4 items per list; each item max 220 characters.
- All monetary amounts are in the currency given by the input's
  "currency"/"currency_symbol" fields (e.g. Philippine Peso, ₱). NEVER
  use $ or USD unless the input explicitly says so.
- If data is too sparse for a list, return an empty array for it.
PROMPT;

        // Strip anything potentially sensitive before leaving the server.
        $safeMetrics = $this->sanitize($metrics);

        $payload = [
            'system_instruction' => [
                'parts' => [['text' => $systemPrompt]],
            ],
            'contents' => [
                [
                    'role' => 'user',
                    'parts' => [[
                        'text' => "Analyze these aggregated restaurant metrics:\n"
                            . json_encode($safeMetrics, JSON_UNESCAPED_SLASHES),
                    ]],
                ],
            ],
            'generationConfig' => [
                'temperature' => 0.4,
                'maxOutputTokens' => 2048,
                'responseMimeType' => 'application/json',
            ],
        ];

        $url = sprintf(
            'https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent',
            $this->model()
        );

        $response = Http::timeout(30)
            ->withHeaders(['x-goog-api-key' => (string) config('services.gemini.key')])
            ->post($url, $payload);

        if ($response->failed()) {
            Log::warning('Gemini insights request failed', ['status' => $response->status()]);
            throw new \RuntimeException('Gemini request failed.');
        }

        $body = $response->json();
        $text = $body['candidates'][0]['content']['parts'][0]['text'] ?? null;

        if (! is_string($text) || trim($text) === '') {
            throw new \RuntimeException('Empty Gemini response.');
        }

        $decoded = $this->decodeJson($text);
        if ($decoded === null) {
            throw new \RuntimeException('Malformed Gemini JSON.');
        }

        return $this->normalize($decoded);
    }

    /**
     * Decode model text into JSON, tolerating common Gemini quirks:
     * markdown code fences and stray prose around the JSON object.
     */
    private function decodeJson(string $text): ?array
    {
        $candidates = [];

        $trimmed = trim($text);
        $candidates[] = $trimmed;

        // Strip ```json ... ``` fences.
        if (preg_match('/```(?:json)?\s*(.+?)\s*```/s', $trimmed, $m)) {
            $candidates[] = trim($m[1]);
        }

        // Extract the outermost {...} block (handles leading prose).
        $firstBrace = strpos($trimmed, '{');
        $lastBrace = strrpos($trimmed, '}');
        if ($firstBrace !== false && $lastBrace !== false && $lastBrace > $firstBrace) {
            $candidates[] = substr($trimmed, $firstBrace, $lastBrace - $firstBrace + 1);
        }

        foreach ($candidates as $candidate) {
            $decoded = json_decode($candidate, true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }

        return null;
    }

    /**
     * Remove any keys we do not explicitly allow and coerce to scalars.
     */
    private function sanitize(array $metrics): array
    {
        $allowed = [
            'period', 'total_revenue', 'total_orders', 'average_order_value',
            'revenue_growth', 'previous_period_revenue', 'sales_trend',
            'top_items', 'low_stock_items', 'wastage_summary',
            'peak_hours', 'quietest_day', 'busiest_day',
            // TimechoAI forecast aggregates (Laravel-authoritative numbers).
            'forecast_direction', 'forecast_next_7_days',
            'inventory_risks',
            // Currency context from Settings.
            'currency', 'currency_symbol',
        ];

        return array_intersect_key($metrics, array_flip($allowed));
    }

    /**
     * Server-side validation/normalization of the AI response. Malformed
     * entries are dropped, never passed through blindly.
     */
    private function normalize(array $decoded): array
    {
        $listOfStrings = function ($value): array {
            if (! is_array($value)) {
                return [];
            }

            return collect($value)
                ->filter(fn ($item) => is_string($item) && trim($item) !== '')
                ->map(fn ($item) => mb_substr(trim($item), 0, 300))
                ->take(6)
                ->values()
                ->toArray();
        };

        // Models may return "High"/"MEDIUM" etc. — normalize casing first.
        $confidenceRaw = is_string($decoded['confidence'] ?? null)
            ? strtolower(trim($decoded['confidence']))
            : '';
        $confidence = in_array($confidenceRaw, ['low', 'medium', 'high'], true)
            ? $confidenceRaw
            : 'medium';

        return [
            'summary' => is_string($decoded['summary'] ?? null)
                ? mb_substr(trim($decoded['summary']), 0, 600)
                : '',
            'sales_insights' => $listOfStrings($decoded['sales_insights'] ?? []),
            'forecast_insights' => $listOfStrings($decoded['forecast_insights'] ?? []),
            'inventory_insights' => $listOfStrings($decoded['inventory_insights'] ?? []),
            'risks' => $listOfStrings($decoded['risks'] ?? []),
            'recommendations' => $listOfStrings($decoded['recommendations'] ?? []),
            'confidence' => $confidence,
        ];
    }
}
