"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/client";
import { unwrapArray } from "@/lib/utils/api";
import type {
  ApiResponse,
  FloorPlan,
  FloorPlanFormData,
  Table,
  TableFormData,
} from "@/lib/types";

export function useFloorPlans() {
  const queryClient = useQueryClient();

  const list = useQuery({
    queryKey: ["floor-plans"],
    queryFn: () =>
      api
        .get<ApiResponse<FloorPlan[]>>("/tables/floor-plans")
        .then((res) => unwrapArray<FloorPlan>(res.data)),
    staleTime: 10 * 60 * 1000,
  });

  const create = useMutation({
    mutationFn: (data: FloorPlanFormData) =>
      api.post<ApiResponse<FloorPlan>>("/tables/floor-plans", data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["floor-plans"] }),
  });

  const update = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<FloorPlanFormData>;
    }) =>
      api.put<ApiResponse<FloorPlan>>(`/tables/floor-plans/${id}`, data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["floor-plans"] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/tables/floor-plans/${id}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["floor-plans"] }),
  });

  return { list, create, update, remove };
}

export function useTables(floorPlanId?: string) {
  const queryClient = useQueryClient();

  const list = useQuery({
    queryKey: ["tables", floorPlanId ?? "all"],
    queryFn: () =>
      api
        .get<ApiResponse<Table[]>>("/tables", {
          params: floorPlanId ? { floor_plan_id: floorPlanId } : {},
        })
        .then((res) => unwrapArray<Table>(res.data)),
    staleTime: 30_000,
  });

  const create = useMutation({
    mutationFn: (data: TableFormData & { floor_plan_id: string }) =>
      api.post<ApiResponse<Table>>("/tables", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tables"] }),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TableFormData> }) =>
      api.put<ApiResponse<Table>>(`/tables/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tables"] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/tables/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tables"] }),
  });

  return { list, create, update, remove };
}
