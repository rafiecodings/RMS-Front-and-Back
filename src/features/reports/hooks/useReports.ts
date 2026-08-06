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
import {
  normalizeRevenueReport,
  normalizeSalesReport,
  normalizeMenuPerformanceReport,
  normalizeInventoryReport,
  normalizeStaffReport,
  normalizeTaxReport,
} from "../normalizers";

export function useRevenueReport(filters?: ReportFilters) {
  return useQuery({
    queryKey: ["reports", "revenue", filters],
    queryFn: () =>
      api
        .get<ApiResponse<unknown>>("/reports/revenue", { params: filters })
        .then((res) => normalizeRevenueReport(res.data.data)),
    staleTime: 60000,
  });
}

export function useSalesReport(filters?: ReportFilters) {
  return useQuery({
    queryKey: ["reports", "sales", filters],
    queryFn: () =>
      api
        .get<ApiResponse<unknown>>("/reports/sales", { params: filters })
        .then((res) => normalizeSalesReport(res.data.data)),
    staleTime: 60000,
  });
}

export function useMenuPerformanceReport(filters?: ReportFilters) {
  return useQuery({
    queryKey: ["reports", "menu-performance", filters],
    queryFn: () =>
      api
        .get<ApiResponse<unknown>>("/reports/menu-performance", { params: filters })
        .then((res) => normalizeMenuPerformanceReport(res.data.data)),
    staleTime: 60000,
  });
}

export function useInventoryReport(filters?: ReportFilters) {
  return useQuery({
    queryKey: ["reports", "inventory", filters],
    queryFn: () =>
      api
        .get<ApiResponse<unknown>>("/reports/inventory", { params: filters })
        .then((res) => normalizeInventoryReport(res.data.data)),
    staleTime: 60000,
  });
}

export function useStaffReport(filters?: ReportFilters) {
  return useQuery({
    queryKey: ["reports", "staff", filters],
    queryFn: () =>
      api
        .get<ApiResponse<unknown>>("/reports/staff", { params: filters })
        .then((res) => normalizeStaffReport(res.data.data)),
    staleTime: 60000,
  });
}

export function useTaxReport(filters?: ReportFilters) {
  return useQuery({
    queryKey: ["reports", "tax", filters],
    queryFn: () =>
      api
        .get<ApiResponse<unknown>>("/reports/tax", { params: filters })
        .then((res) => normalizeTaxReport(res.data.data)),
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
