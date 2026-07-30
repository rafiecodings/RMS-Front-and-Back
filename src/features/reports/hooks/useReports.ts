"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import api from "@/lib/api/client";
import type { ApiResponse } from "@/lib/types";
import type {
  RevenueReport,
  SalesReport,
  MenuPerformanceReport,
  InventoryReport,
  StaffReport,
  TaxReport,
  ReportFilters,
  ExportPayload,
} from "../types";

export function useRevenueReport(filters?: ReportFilters) {
  return useQuery({
    queryKey: ["reports", "revenue", filters],
    queryFn: () =>
      api
        .get<ApiResponse<RevenueReport>>("/reports/revenue", { params: filters })
        .then((res) => res.data.data),
    staleTime: 60000,
  });
}

export function useSalesReport(filters?: ReportFilters) {
  return useQuery({
    queryKey: ["reports", "sales", filters],
    queryFn: () =>
      api
        .get<ApiResponse<SalesReport>>("/reports/sales", { params: filters })
        .then((res) => res.data.data),
    staleTime: 60000,
  });
}

export function useMenuPerformanceReport(filters?: ReportFilters) {
  return useQuery({
    queryKey: ["reports", "menu-performance", filters],
    queryFn: () =>
      api
        .get<ApiResponse<MenuPerformanceReport>>("/reports/menu-performance", { params: filters })
        .then((res) => res.data.data),
    staleTime: 60000,
  });
}

export function useInventoryReport(filters?: ReportFilters) {
  return useQuery({
    queryKey: ["reports", "inventory", filters],
    queryFn: () =>
      api
        .get<ApiResponse<InventoryReport>>("/reports/inventory", { params: filters })
        .then((res) => res.data.data),
    staleTime: 60000,
  });
}

export function useStaffReport(filters?: ReportFilters) {
  return useQuery({
    queryKey: ["reports", "staff", filters],
    queryFn: () =>
      api
        .get<ApiResponse<StaffReport>>("/reports/staff", { params: filters })
        .then((res) => res.data.data),
    staleTime: 60000,
  });
}

export function useTaxReport(filters?: ReportFilters) {
  return useQuery({
    queryKey: ["reports", "tax", filters],
    queryFn: () =>
      api
        .get<ApiResponse<TaxReport>>("/reports/tax", { params: filters })
        .then((res) => res.data.data),
    staleTime: 60000,
  });
}

export function useExportReport() {
  return useMutation({
    mutationFn: (payload: ExportPayload) =>
      api
        .post("/reports/export", payload, { responseType: "blob" })
        .then((res) => res.data),
  });
}
