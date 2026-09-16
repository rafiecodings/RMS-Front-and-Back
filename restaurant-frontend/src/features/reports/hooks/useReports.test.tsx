import { Blob as NodeBlob } from "node:buffer";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchReportExport, useCustomerReport } from "./useReports";

const api = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ default: api }));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe("report requests and exports", () => {
  it("passes explicit dates and normalizes the nested customer report", async () => {
    api.get.mockResolvedValue({ data: { data: { summary: { total_customers: 3, loyal_customers: 2 }, top_customers: [] } } });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useCustomerReport({ period: "custom", date_range: { from: "2026-09-10", to: "2026-09-10" } }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.loyal_customers).toBe(2);
    expect(api.get).toHaveBeenCalledWith("/reports/customer-analytics", { params: { start_date: "2026-09-10", end_date: "2026-09-10" } });
    client.clear();
  });
  it.each(["csv", "json"] as const)("preserves the actual %s attachment instead of extracting a nonexistent envelope", async (format) => {
    vi.stubGlobal("Blob", NodeBlob);
    const data = new NodeBlob([format === "json" ? '{"summary":{"net_revenue":204}}' : 'section,record,field,value\nsummary,,net_revenue,204'], { type: format === "json" ? "application/json" : "text/csv" });
    api.post.mockResolvedValue({ data });
    const payload = { type: "revenue", format, start_date: "2026-09-10", end_date: "2026-09-10" };
    expect(await fetchReportExport(payload)).toBe(data);
    expect(api.post).toHaveBeenCalledWith("/reports/export", payload, { responseType: "blob" });
  });
  it("surfaces JSON error blobs without downloading them", async () => {
    vi.stubGlobal("Blob", NodeBlob);
    const payload = { type: "revenue", format: "csv" as const, start_date: "bad", end_date: "bad" };
    api.post.mockRejectedValue({ isAxiosError: true, response: { data: new NodeBlob(['{"message":"Invalid dates"}'], { type: "application/json" }) } });
    await expect(fetchReportExport(payload)).rejects.toThrow("Invalid dates");
    api.post.mockResolvedValue({ data: new NodeBlob(['{"success":false,"message":"Denied"}'], { type: "application/json" }) });
    await expect(fetchReportExport(payload)).rejects.toThrow("Denied");
  });
});
