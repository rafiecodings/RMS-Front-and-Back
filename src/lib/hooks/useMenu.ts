"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/client";
import { normalizePaginated, unwrapArray } from "@/lib/utils/api";
import type {
  ApiResponse,
  QueryParams,
  PaginatedResponse,
  MenuCategory,
  MenuCategoryFormData,
  MenuItem,
  MenuItemFormData,
} from "@/lib/types";

export function useMenuCategories() {
  const queryClient = useQueryClient();

  const list = useQuery({
    queryKey: ["menu-categories"],
    queryFn: () =>
      api
        .get<ApiResponse<MenuCategory[]>>("/menu/categories")
        .then((res) => unwrapArray<MenuCategory>(res.data)),
    staleTime: 5 * 60 * 1000,
  });

  const create = useMutation({
    mutationFn: (data: MenuCategoryFormData) =>
      api.post<ApiResponse<MenuCategory>>("/menu/categories", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-categories"] });
      // Menu-item rows embed a category name snapshot — keep them fresh.
      queryClient.invalidateQueries({ queryKey: ["menu-items"] });
    },
  });

  const update = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<MenuCategoryFormData>;
    }) =>
      api.put<ApiResponse<MenuCategory>>(`/menu/categories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-categories"] });
      queryClient.invalidateQueries({ queryKey: ["menu-items"] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/menu/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-categories"] });
      queryClient.invalidateQueries({ queryKey: ["menu-items"] });
    },
  });

  return { list, create, update, remove };
}

export function useMenuItems(
  params?: QueryParams & { category_id?: string; is_available?: boolean }
) {
  const queryClient = useQueryClient();

  const list = useQuery({
    queryKey: ["menu-items", params],
    queryFn: () =>
      api
        .get<PaginatedResponse<MenuItem>>("/menu/items", { params })
        .then((res) => normalizePaginated(res.data)),
    staleTime: 30_000,
  });

  const create = useMutation({
    mutationFn: (data: MenuItemFormData) =>
      api.post<ApiResponse<MenuItem>>("/menu/items", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["menu-items"] }),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MenuItemFormData> }) =>
      api.put<ApiResponse<MenuItem>>(`/menu/items/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["menu-items"] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/menu/items/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["menu-items"] }),
  });

  const toggleAvailability = useMutation({
    mutationFn: (id: string) => api.patch(`/menu/items/${id}/availability`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["menu-items"] }),
  });

  return { list, create, update, remove, toggleAvailability };
}
