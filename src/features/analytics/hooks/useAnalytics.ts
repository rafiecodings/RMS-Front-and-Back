"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api/client";
import type { ApiResponse } from "@/lib/types";
import type {
  RevenueAnalytics,
  SalesTrends,
  PeakHours,
  InventoryUsage,
  CustomerAnalytics,
  AnalyticsFilters,
} from "../types";
import {
  normalizeRevenueAnalytics,
  normalizeSalesAnalytics,
  normalizePeakHours,
  normalizeInventoryUsage,
  normalizeCustomerAnalytics,
} from "../normalizers";

export function useRevenueAnalytics(filters?: AnalyticsFilters) {
  return useQuery({
    queryKey: ["analytics", "revenue", filters],
    queryFn: () =>
      api
        .get<ApiResponse<unknown>>("/analytics/revenue", { params: filters })
        .then((res) => normalizeRevenueAnalytics(res.data.data)),
    staleTime: 60000,
  });
}

export function useSalesTrends(filters?: AnalyticsFilters) {
  return useQuery({
    queryKey: ["analytics", "sales", filters],
    queryFn: () =>
      api
        .get<ApiResponse<unknown>>("/analytics/sales", { params: filters })
        .then((res) => normalizeSalesAnalytics(res.data.data)),
    staleTime: 60000,
  });
}

export function usePeakHours(filters?: AnalyticsFilters) {
  return useQuery({
    queryKey: ["analytics", "peak-hours", filters],
    queryFn: () =>
      api
        .get<ApiResponse<unknown>>("/analytics/peak-hours", { params: filters })
        .then((res) => normalizePeakHours(res.data.data)),
    staleTime: 60000,
  });
}

export function useInventoryUsage(filters?: AnalyticsFilters) {
  return useQuery({
    queryKey: ["analytics", "inventory", filters],
    queryFn: () =>
      api
        .get<ApiResponse<unknown>>("/analytics/inventory", { params: filters })
        .then((res) => normalizeInventoryUsage(res.data.data)),
    staleTime: 60000,
  });
}

export function useCustomerAnalytics(filters?: AnalyticsFilters) {
  return useQuery({
    queryKey: ["analytics", "customers", filters],
    queryFn: () =>
      api
        .get<ApiResponse<unknown>>("/analytics/customers", { params: filters })
        .then((res) => normalizeCustomerAnalytics(res.data.data)),
    staleTime: 60000,
  });
}
