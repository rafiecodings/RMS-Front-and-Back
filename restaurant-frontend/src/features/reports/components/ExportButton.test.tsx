import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { ExportButton } from "./ExportButton";

const mocks = vi.hoisted(() => ({ mutateAsync: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock("../hooks/useReports", () => ({ useExportReport: () => ({ mutateAsync: mocks.mutateAsync, isPending: false }) }));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }));
afterEach(() => { vi.restoreAllMocks(); vi.clearAllMocks(); });

it("downloads the attachment with the selected date range and releases the URL", async () => {
  const blob = new Blob(["report"]);
  mocks.mutateAsync.mockResolvedValue(blob);
  const create = vi.fn(() => "blob:report");
  const revoke = vi.fn();
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: create });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revoke });
  let filename = "";
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) { filename = this.download; });
  render(<ExportButton reportType="revenue" period="custom" dateRange={{ from: "2026-09-10", to: "2026-09-10" }} />);
  await userEvent.click(screen.getByRole("button", { name: "Export CSV" }));
  expect(mocks.mutateAsync).toHaveBeenCalledWith({ type: "revenue", format: "csv", start_date: "2026-09-10", end_date: "2026-09-10" });
  expect(create).toHaveBeenCalledWith(blob);
  expect(filename).toBe("revenue_report_2026-09-10_to_2026-09-10.csv");
  expect(document.querySelector('a[download]')).toBeNull();
  await waitFor(() => expect(revoke).toHaveBeenCalledWith("blob:report"), { timeout: 2000 });
});

it("reports export failures without success", async () => {
  mocks.mutateAsync.mockRejectedValue(new Error("Export unavailable"));
  render(<ExportButton reportType="revenue" period="today" />);
  await userEvent.click(screen.getByRole("button", { name: "Export CSV" }));
  expect(mocks.error).toHaveBeenCalledWith("Export unavailable");
  expect(mocks.success).not.toHaveBeenCalled();
});
