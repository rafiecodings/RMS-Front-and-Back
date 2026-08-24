"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import api from "@/lib/api/client";
import type { ApiResponse } from "@/lib/types";
import type { ReportFilters, ExportPayload } from "../types";
import { resolveReportRange } from "../utils/resolveReportRange";
import {
  normalizeRevenueReport,
  normalizeSalesReport,
  normalizeMenuPerformanceReport,
  normalizeInventoryReport,
  normalizeStaffReport,
  normalizeTaxReport,
} from "../normalizers";

/**
 * Single contract with the backend: presets are expanded into explicit
 * start_date/end_date here; the opaque `period` value is never sent.
 */
function buildReportParams(filters?: ReportFilters): Record<string, string> {
  if (!filters) {
    return resolveReportRange("this_month");
  }
  const range = resolveReportRange(filters.period, filters.date_range);
  const params: Record<string, string> = { ...range };
  if (filters.group_by) {
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

/**
 * CSV/JSON export. The backend streams a real file (CSV with UTF-8 BOM) or a
 * JSON payload — never a "pending" stub.
 */
export function useExportReport() {
  return useMutation({
    mutationFn: async (payload: ExportPayload) => {
      const res = await api.post("/reports/export", payload, {
        responseType: payload.format === "json" ? "json" : "blob",
      });

      if (payload.format === "json") {
        return new Blob([JSON.stringify(res.data?.data ?? {}, null, 2)], {
          type: "application/json",
        });
      }

      // Guard against an error JSON body being saved as a .csv.
      if (res.data instanceof Blob && res.data.type.includes("json")) {
        const text = await res.data.text();
        let message = "Export failed";
        try {
          message = JSON.parse(text)?.message ?? message;
        } catch {
          /* keep default */
        }
        throw new Error(message);
      }

      return res.data as Blob;
    },
  });
}
