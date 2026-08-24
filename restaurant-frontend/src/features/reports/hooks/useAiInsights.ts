"use client";

import { useMutation } from "@tanstack/react-query";
import api from "@/lib/api/client";
import type { ApiResponse } from "@/lib/types";

export interface AiInsights {
  available: boolean;
  summary: string;
  sales_insights: string[];
  inventory_insights: string[];
  risks: string[];
  recommendations: string[];
  confidence: "low" | "medium" | "high";
  message?: string;
  cached?: boolean;
  generated_at?: string;
}

/**
 * Requests AI-generated narrative insights for a date range. Laravel computes
 * all authoritative metrics server-side; only aggregates are sent to Gemini.
 * Failures degrade to `available: false` — reports never depend on this.
 */
export function useAiInsights() {
  return useMutation({
    mutationFn: async (params: { start_date: string; end_date: string }) => {
      const res = await api.post<ApiResponse<AiInsights>>(
        "/analytics/insights",
        params,
      );
      return res.data.data;
    },
  });
}
