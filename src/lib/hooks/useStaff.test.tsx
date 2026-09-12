import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { expect, it, vi } from "vitest";
import { useCurrentStaff } from "./useStaff";

const mock = vi.hoisted(() => ({ user: { id: "first-user" }, get: vi.fn() }));
vi.mock("@/providers/AuthProvider", () => ({ useAuth: () => ({ user: mock.user }) }));
vi.mock("@/lib/api/client", () => ({ default: { get: mock.get } }));

it("fetches only the authenticated profile and does not reuse it after switching users", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  mock.get.mockResolvedValueOnce({ data: { data: { id: "first-profile" } } })
    .mockResolvedValueOnce({ data: { data: null } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const { result, rerender } = renderHook(() => useCurrentStaff(), { wrapper });
  await waitFor(() => expect(result.current.data?.id).toBe("first-profile"));
  mock.user = { id: "second-user" };
  rerender();
  expect(result.current.data).toBeUndefined();
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toBeNull();
  expect(mock.get).toHaveBeenCalledTimes(2);
  expect(mock.get).toHaveBeenLastCalledWith("/staff/me");
  client.clear();
});
