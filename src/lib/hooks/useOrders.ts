"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/client";
import { normalizePaginated } from "@/lib/utils/api";
import { addNotification } from "./useNotifications";
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
    onSuccess: (res) => {
      const order = res.data.data;
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      addNotification(queryClient, {
        type: "order",
        icon: "order",
        title: "Order created",
        description: `Order #${order.order_number} has been created.`,
        action: { label: "View order", href: `/orders/${order.id}` },
      });
    },
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: OrderFormData }) =>
      api.put<ApiResponse<Order>>(`/orders/${id}`, data),
    onSuccess: (res) => {
      const order = res.data.data;
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      addNotification(queryClient, {
        type: "order",
        icon: "order",
        title: "Order updated",
        description: `Order #${order.order_number} has been updated.`,
        action: { label: "View order", href: `/orders/${order.id}` },
      });
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      api.patch<ApiResponse<Order>>(`/orders/${id}/status`, { status }),
    onSuccess: (res, variables) => {
      const order = res.data.data;
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      addNotification(queryClient, {
        type: "info",
        icon: "info",
        title: "Order status changed",
        description: `Order #${order.order_number} is now ${variables.status}.`,
        action: { label: "View order", href: `/orders/${variables.id}` },
      });
    },
  });

  const addPayment = useMutation({
    mutationFn: ({ id, data }: { id: string; data: PaymentFormData }) =>
      api.post<ApiResponse<unknown>>(`/orders/${id}/payments`, data),
    onSuccess: (_res, variables) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["billing"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      addNotification(queryClient, {
        type: "payment",
        icon: "payment",
        title: "Payment processed",
        description: `Payment of ${variables.data.amount} has been processed.`,
        action: { label: "View order", href: `/orders/${variables.id}` },
      });
    },
  });

  const cancel = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post<ApiResponse<Order>>(`/orders/${id}/void`, { reason }),
    onSuccess: (res) => {
      const order = res.data.data;
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      addNotification(queryClient, {
        type: "warning",
        icon: "warning",
        title: "Order voided",
        description: `Order #${order.order_number} has been voided.`,
        action: { label: "View order", href: `/orders/${order.id}` },
      });
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
