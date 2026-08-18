"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api/client";
import type { ApiResponse } from "@/lib/types";
import type { ForecastHorizon } from "../types";
import { normalizeForecast } from "../normalizers";

export function useForecast(itemId?: string, horizon: ForecastHorizon = 7) {
  return useQuery({
    queryKey: ["analytics", "forecast", itemId, horizon],
    queryFn: () =>
      api
        .get<ApiResponse<unknown>>(`/analytics/forecast/${itemId}`, {
          params: { horizon },
        })
        .then((res) => normalizeForecast(res.data.data)),
    enabled: Boolean(itemId),
    staleTime: 5 * 60 * 1000,
  });
}
