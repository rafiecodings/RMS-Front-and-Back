"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
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
  normalizeCustomerReport,
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

export function useCustomerReport(filters?: ReportFilters) {
  return useQuery({
    queryKey: ['reports', 'customers', filters],
    queryFn: () =>
      api
        .get<ApiResponse<unknown>>('/reports/customer-analytics', { params: buildReportParams(filters) })
        .then((res) => normalizeCustomerReport(res.data.data)),
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

/** Download the attachment body exactly as returned by the report endpoint. */
export async function fetchReportExport(payload: ExportPayload): Promise<Blob> {
  try {
    const res = await api.post("/reports/export", payload, { responseType: "blob" });
    const blob = res.data as Blob;
    if (!(blob instanceof Blob)) throw new Error("Invalid export response");
    if (blob.type.includes("json")) {
      const body = JSON.parse(await blob.text());
      if (body?.success === false || payload.format !== "json") {
        throw new Error(body?.message || "Export failed");
      }
    }
    return blob;
  } catch (error) {
    if (isAxiosError(error) && error.response?.data instanceof Blob) {
      try {
        const body = JSON.parse(await error.response.data.text());
        throw new Error(body?.message || "Export failed");
      } catch (parsed) {
        if (parsed instanceof Error && !(parsed instanceof SyntaxError)) throw parsed;
      }
    }
    throw error;
  }
}

export function useExportReport() {
  return useMutation({ mutationFn: fetchReportExport });
}
