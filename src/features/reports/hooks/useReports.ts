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

function buildReportParams(filters?: ReportFilters): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters?.period && filters.period !== "custom") {
    params.period = filters.period;
  }
  if (filters?.date_range?.from) {
    params.start_date = filters.date_range.from;
  }
  if (filters?.date_range?.to) {
    params.end_date = filters.date_range.to;
  }
  if (filters?.group_by) {
    params.group_by = filters.group_by;
  }
  return params;
}

export function useRevenueReport(filters?: ReportFilters) {
  return useQuery({
    queryKey: ["reports", "revenue", filters],
    queryFn: () =>
      api
        .get<ApiResponse<unknown>>("/reports/revenue", { params: buildReportParams(filters) })
        .then((res) => normalizeRevenueReport(res.data.data)),
    staleTime: 60000,
  });
}

export function useSalesReport(filters?: ReportFilters) {
  return useQuery({
    queryKey: ["reports", "sales", filters],
    queryFn: () =>
      api
        .get<ApiResponse<unknown>>("/reports/sales", { params: buildReportParams(filters) })
        .then((res) => normalizeSalesReport(res.data.data)),
    staleTime: 60000,
  });
}

export function useMenuPerformanceReport(filters?: ReportFilters) {
  return useQuery({
    queryKey: ["reports", "menu-performance", filters],
    queryFn: () =>
      api
        .get<ApiResponse<unknown>>("/reports/menu-performance", { params: buildReportParams(filters) })
        .then((res) => normalizeMenuPerformanceReport(res.data.data)),
    staleTime: 60000,
  });
}

export function useInventoryReport(filters?: ReportFilters) {
  return useQuery({
    queryKey: ["reports", "inventory", filters],
    queryFn: () =>
      api
        .get<ApiResponse<unknown>>("/reports/inventory", { params: buildReportParams(filters) })
        .then((res) => normalizeInventoryReport(res.data.data)),
    staleTime: 60000,
  });
}

export function useStaffReport(filters?: ReportFilters) {
  return useQuery({
    queryKey: ["reports", "staff", filters],
    queryFn: () =>
      api
        .get<ApiResponse<unknown>>("/reports/staff", { params: buildReportParams(filters) })
        .then((res) => normalizeStaffReport(res.data.data)),
    staleTime: 60000,
  });
}

export function useTaxReport(filters?: ReportFilters) {
  return useQuery({
    queryKey: ["reports", "tax", filters],
    queryFn: () =>
      api
        .get<ApiResponse<unknown>>("/reports/tax", { params: buildReportParams(filters) })
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
