"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api/client";
import type { ApiResponse, DashboardSummary } from "@/lib/types";

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () =>
      api
        .get<ApiResponse<DashboardSummary>>("/dashboard/summary")
        .then((res) => res.data.data),
    refetchInterval: 30000,
  });
}
