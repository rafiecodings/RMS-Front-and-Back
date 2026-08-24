"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/client";
import type { ApiResponse } from "@/lib/types";
import { normalizeSettings } from "../types";
import type {
  RestaurantSettings,
  RestaurantInfoFormData,
  SystemPreferencesFormData,
} from "../types";

/**
 * Single source of truth: one query key for the one backend row. Both forms
 * consume it; every mutation invalidates the shared key so both stay fresh.
 */
export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () =>
      api
        .get<ApiResponse<Record<string, unknown>>>("/admin/settings")
        .then((res) => normalizeSettings(res.data.data)),
    staleTime: 2 * 60 * 1000,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      data: Partial<RestaurantInfoFormData & SystemPreferencesFormData>,
    ) => api.put<ApiResponse<unknown>>("/admin/settings", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings"] }),
  });
}

export type { RestaurantSettings };

/**
 * The backend-configured VAT rate (authoritative for order pricing).
 * Falls back to the Philippine default of 12% until settings load.
 */
export function useTaxRate(): number {
  const { data } = useSettings();
  const rate = data?.default_tax_rate;
  return typeof rate === "number" && rate > 0 ? rate : 12;
}
