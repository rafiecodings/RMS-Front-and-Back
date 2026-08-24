import type { ApiResponse, PaginatedResponse } from "@/lib/types";

type PaginationMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

type NormalizedPaginatedPayload<T> = {
  data: T[];
  meta: PaginationMeta;
};

type NormalizedPaginatedResponse<T> = ApiResponse<NormalizedPaginatedPayload<T>>;

/**
 * Normalizes a paginated API response from the backend's { items, pagination }
 * shape to the frontend's expected { data, meta } shape.
 */
export function normalizePaginated<T>(
  response: PaginatedResponse<T>
): NormalizedPaginatedResponse<T> {
  return {
    success: response.success,
    message: response.message,
    data: {
      data: response.data.items,
      meta: response.data.pagination,
    },
  };
}

/**
 * Extracts an array from an ApiResponse whose data payload may be either
 * a direct array or an { items: [...] } wrapper.
 */
export function unwrapArray<T>(response: ApiResponse<unknown>): T[] {
  const payload = response.data;
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && "items" in payload) {
    return (payload as { items: T[] }).items;
  }
  return [];
}
