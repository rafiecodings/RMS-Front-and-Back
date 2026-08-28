"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/client";
import { unwrapArray } from "@/lib/utils/api";
import type {
  ApiResponse,
  Table,
  TableFormData,
} from "@/lib/types";

export function useTables() {
  const queryClient = useQueryClient();

  const list = useQuery({
    queryKey: ["tables"],
    queryFn: () =>
      api
        .get<ApiResponse<Table[]>>("/tables")
        .then((res) => unwrapArray<Table>(res.data)),
    staleTime: 30_000,
  });

  const create = useMutation({
    mutationFn: (data: TableFormData) =>
      api.post<ApiResponse<Table>>("/tables", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tables"] }),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TableFormData> }) =>
      api.put<ApiResponse<Table>>(`/tables/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tables"] }),
  });

  const archive = useMutation({
    mutationFn: (id: string) => api.delete(`/tables/${id}/archive`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tables"] }),
  });

  const restore = useMutation({
    mutationFn: (id: string) => api.patch(`/tables/${id}/restore`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tables"] }),
  });

  return { list, create, update, archive, restore };
}
