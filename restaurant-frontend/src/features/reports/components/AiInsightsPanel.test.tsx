import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AiInsightsPanel } from "./AiInsightsPanel";

// Mock the api client used by useAiInsights.
const postMock = vi.fn();
vi.mock("@/lib/api/client", () => ({
  default: { post: (...args: unknown[]) => postMock(...args) },
}));

function renderPanel() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <AiInsightsPanel startDate="2026-08-15" endDate="2026-08-21" auto={false} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  postMock.mockReset();
});

describe("AiInsightsPanel", () => {
  it("shows structured insights on success", async () => {
    const user = userEvent.setup();
    postMock.mockResolvedValue({
      data: {
        success: true,
        data: {
          available: true,
          summary: "Revenue is trending up week over week.",
          sales_insights: ["Total revenue reached ₱120,000 for the period."],
          inventory_insights: [],
          risks: ["Flour stock covers only 2 days at current usage."],
          recommendations: ["Schedule a flour delivery before Friday."],
          confidence: "medium",
        },
      },
    });

    renderPanel();
    await user.click(screen.getByRole("button", { name: /generate insights/i }));

    await waitFor(() => {
      expect(screen.getByText(/trending up/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/₱120,000/)).toBeInTheDocument();
    expect(screen.getByText(/medium confidence/i)).toBeInTheDocument();
  });

  it("degrades gracefully when AI is unavailable", async () => {
    const user = userEvent.setup();
    postMock.mockResolvedValue({
      data: {
        success: true,
        data: {
          available: false,
          message: "AI insights temporarily unavailable.",
          summary: "",
          sales_insights: [],
          inventory_insights: [],
          risks: [],
          recommendations: [],
          confidence: "low",
        },
      },
    });

    renderPanel();
    await user.click(screen.getByRole("button", { name: /generate insights/i }));

    await waitFor(() => {
      expect(screen.getByText(/AI insights temporarily unavailable/i)).toBeInTheDocument();
    });
    // Core reporting is unaffected — no error crash.
    expect(screen.queryByText(/failed/i)).not.toBeInTheDocument();
  });

  it("shows an error state when the request fails", async () => {
    const user = userEvent.setup();
    postMock.mockRejectedValue(new Error("network down"));

    renderPanel();
    await user.click(screen.getByRole("button", { name: /generate insights/i }));

    await waitFor(() => {
      expect(screen.getByText(/AI insights temporarily unavailable/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });
});
