"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api/client";
import type { ApiResponse } from "@/lib/types";

export interface ForecastPoint {
  date: string;
  predicted_orders: number;
  lower_orders?: number | null;
  upper_orders?: number | null;
  predicted_revenue?: number;
}

export interface SalesForecast {
  available: boolean;
  reason?: string;
  message?: string;
  model?: string;
  metric: "sales";
  horizon: number;
  forecast_direction?: "up" | "down";
  highest_day?: { date: string; predicted_orders: number } | null;
  historical_summary?: {
    days_of_history: number;
    avg_daily_orders: number;
    total_revenue: number;
  };
  forecast: ForecastPoint[];
  cached?: boolean;
}

export interface IngredientRequirement {
  ingredient_id: string;
  name: string;
  unit: string;
  current_stock: number;
  projected_requirement: number;
  projected_shortage: number;
  status: string;
}

export interface IngredientForecast {
  available: boolean;
  reason?: string;
  message?: string;
  metric: "ingredients";
  horizon: number;
  items_considered?: number;
  projected_requirements: IngredientRequirement[];
}

/**
 * TimechoAI forecasting via the Laravel API. All numbers are computed/
 * normalized server-side; failures degrade to available:false.
 */
export function useDemandForecast(params?: { horizon?: 7 | 14 | 30 }) {
  const horizon = params?.horizon ?? 7;
  return useQuery({
    queryKey: ["analytics", "demand-forecast", horizon],
    queryFn: () =>
      api
        .get<ApiResponse<SalesForecast>>("/analytics/demand-forecast", {
          params: { horizon },
        })
        .then((res) => res.data.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function useIngredientForecast(params?: { horizon?: 7 | 14 | 30 }) {
  const horizon = params?.horizon ?? 7;
  return useQuery({
    queryKey: ["inventory", "demand-forecast", horizon],
    queryFn: () =>
      api
        .get<ApiResponse<IngredientForecast>>("/inventory/demand-forecast", {
          params: { scope: "ingredients", horizon },
        })
        .then((res) => res.data.data),
    staleTime: 5 * 60 * 1000,
  });
}
