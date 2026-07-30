"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/client";
import { normalizePaginated } from "@/lib/utils/api";
import type {
  ApiResponse,
  QueryParams,
  PaginatedResponse,
  Order,
  OrderFormData,
  OrderStatus,
  PaymentFormData,
} from "@/lib/types";

export function useOrders(
  params?: QueryParams & { status?: string; order_type?: string }
) {
  const queryClient = useQueryClient();

  const list = useQuery({
    queryKey: ["orders", params],
    queryFn: () =>
      api
        .get<PaginatedResponse<Order>>("/orders", { params })
        .then((res) => normalizePaginated(res.data)),
    staleTime: 10_000,
  });

  const create = useMutation({
    mutationFn: (data: OrderFormData) =>
      api.post<ApiResponse<Order>>("/orders", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: OrderFormData }) =>
      api.put<ApiResponse<Order>>(`/orders/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      api.patch<ApiResponse<Order>>(`/orders/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const addPayment = useMutation({
    mutationFn: ({ id, data }: { id: string; data: PaymentFormData }) =>
      api.post<ApiResponse<unknown>>(`/orders/${id}/payments`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["billing"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });

  const cancel = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post<ApiResponse<Order>>(`/orders/${id}/void`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  return { list, create, update, updateStatus, addPayment, cancel };
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ["orders", id],
    queryFn: () =>
      api
        .get<ApiResponse<Order>>(`/orders/${id}`)
        .then((res) => res.data.data),
    enabled: !!id,
  });
}
