"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api/client";
import type { ApiResponse } from "@/lib/types";
import { normalizeDashboardSummary } from "@/features/dashboard/normalizer";

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () =>
      api
        .get<ApiResponse<unknown>>("/dashboard/summary")
        .then((res) => normalizeDashboardSummary(res.data.data)),
    staleTime: 30000,
    refetchInterval: 30000,
  });
}
