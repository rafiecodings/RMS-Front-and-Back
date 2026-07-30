"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/client";
import { unwrapArray } from "@/lib/utils/api";
import type { ApiResponse, Kot, KotStatus } from "@/lib/types";

export function useKitchenOrders() {
  const queryClient = useQueryClient();

  const active = useQuery({
    queryKey: ["kitchen-orders"],
    queryFn: () =>
      api
        .get<ApiResponse<Kot[]>>("/kot", {
          params: { status: "received,in_progress" },
        })
        .then((res) => unwrapArray<Kot>(res.data)),
    refetchInterval: 5000,
    staleTime: 5000,
  });

  const all = useQuery({
    queryKey: ["kitchen-orders-all"],
    queryFn: () =>
      api
        .get<ApiResponse<Kot[]>>("/kot", {
          params: { status: "received,in_progress,ready" },
        })
        .then((res) => unwrapArray<Kot>(res.data)),
    refetchInterval: 5000,
    staleTime: 5000,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: KotStatus }) =>
      api.patch<ApiResponse<Kot>>(`/kot/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] });
      queryClient.invalidateQueries({ queryKey: ["kitchen-orders-all"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  const updatePriority = useMutation({
    mutationFn: ({ id, priority }: { id: string; priority: string }) =>
      api.patch<ApiResponse<Kot>>(`/kot/${id}/priority`, { priority }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] });
      queryClient.invalidateQueries({ queryKey: ["kitchen-orders-all"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  return { active, all, updateStatus, updatePriority };
}
