"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/client";
import { normalizePaginated } from "@/lib/utils/api";
import type { ApiResponse, PaginatedResponse, QueryParams } from "@/lib/types";

export interface ReplenishmentRequest {
  id: string;
  request_number: string;
  ingredient_id: string;
  ingredient?: {
    id: string;
    name: string;
    unit: string;
    current_stock: number;
    minimum_stock: number;
  } | null;
  quantity: number;
  unit?: string | null;
  priority: "low" | "normal" | "high" | "urgent";
  status:
    | "draft"
    | "submitted"
    | "approved"
    | "processing"
    | "fulfilled"
    | "rejected"
    | "cancelled";
  requested_by?: string;
  requester?: { id: string; name: string } | null;
  notes?: string | null;
  created_at?: string;
}

export interface ReplenishmentFormData {
  ingredient_id: string;
  quantity: number;
  priority?: "low" | "normal" | "high" | "urgent";
  notes?: string;
  status?: "draft" | "submitted";
}

export function useReplenishmentRequests(params?: QueryParams & { status?: string; priority?: string }) {
  const queryClient = useQueryClient();

  const list = useQuery({
    queryKey: ["replenishment", params],
    queryFn: () =>
      api
        .get<PaginatedResponse<ReplenishmentRequest>>("/inventory/replenishment", { params })
        .then((res) => normalizePaginated(res.data)),
    staleTime: 30_000,
  });

  const create = useMutation({
    mutationFn: (data: ReplenishmentFormData) =>
      api.post<ApiResponse<ReplenishmentRequest>>("/inventory/replenishment", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["replenishment"] }),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ReplenishmentRequest["status"] }) =>
      api.patch<ApiResponse<ReplenishmentRequest>>(`/inventory/replenishment/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["replenishment"] });
      queryClient.invalidateQueries({ queryKey: ["ingredients"] });
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/inventory/replenishment/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["replenishment"] }),
  });

  return { list, create, updateStatus, remove };
}
