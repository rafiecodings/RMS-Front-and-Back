import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RolesPage from "./page";

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));

vi.mock("@/lib/api/client", () => ({
  default: { get: mockGet },
}));

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <RolesPage />
    </QueryClientProvider>
  );
}

describe("Staff Roles page (view-only)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ data: { data: [] } });
  });

  it("renders the role matrix with no permission-edit controls", async () => {
    renderPage();
    expect(await screen.findByText("Roles & Permissions")).toBeInTheDocument();
    expect(screen.getByText("Permission Matrix")).toBeInTheDocument();
    // No mutation UI: no text inputs, dropdowns, checkboxes, or buttons.
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
