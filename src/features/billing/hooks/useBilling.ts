"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/client";
import { normalizePaginated } from "@/lib/utils/api";
import type {
  ApiResponse,
  PaginatedResponse,
  QueryParams,
  Order,
  Payment,
} from "@/lib/types";
import type {
  Invoice,
  Refund,
  BillingStats,
} from "../types";

function orderToInvoice(order: Order): Invoice {
  const amount_paid = order.payments?.reduce((s, p) => s + p.amount, 0) ?? 0;
  const balance = order.total_amount - amount_paid;

  let payment_status: Invoice["payment_status"] = "unpaid";
  if (order.status === "cancelled") {
    payment_status = "refunded";
  } else if (amount_paid >= order.total_amount) {
    payment_status = "paid";
  } else if (amount_paid > 0) {
    payment_status = "partial";
  }

  return {
    id: order.id,
    invoice_number: order.order_number,
    order_type: order.order_type,
    status: order.status,
    customer: order.customer,
    table: order.table,
    items: (order.items ?? []).map((item) => ({
      id: item.id,
      menu_item_name: item.menu_item_name,
      variant: item.variant,
      quantity: item.quantity,
      unit_price: item.unit_price,
      tax_amount: item.tax_amount,
      discount_amount: item.discount_amount,
      total_amount: item.total_amount,
      modifiers: item.modifiers,
    })),
    subtotal: order.subtotal,
    tax_amount: order.tax_amount,
    discount_amount: order.discount_amount,
    service_charge: order.service_charge,
    total_amount: order.total_amount,
    amount_paid,
    balance: Math.max(0, balance),
    payment_status,
    payments: order.payments ?? [],
    notes: order.notes,
    placed_at: order.placed_at,
    completed_at: order.completed_at,
    created_at: order.created_at,
  };
}

export function useInvoices(
  params?: QueryParams & { status?: string; payment_status?: string }
) {
  const list = useQuery({
    queryKey: ["invoices", params],
    queryFn: () =>
      api
        .get<PaginatedResponse<Order>>("/orders", { params })
        .then((res) => {
          const normalized = normalizePaginated(res.data);
          return {
            success: normalized.success,
            message: normalized.message,
            data: normalized.data.data.map(orderToInvoice),
            meta: normalized.data.meta,
          };
        }),
    staleTime: 30_000,
  });

  return { list };
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: ["invoices", id],
    queryFn: () =>
      api
        .get<ApiResponse<Order>>(`/orders/${id}`)
        .then((res) => orderToInvoice(res.data.data)),
    enabled: !!id,
  });
}

export function usePaymentHistory(
  params?: QueryParams & { payment_method?: string; date_from?: string; date_to?: string }
) {
  return useQuery({
    queryKey: ["payment-history", params],
    queryFn: () =>
      api
        .get<PaginatedResponse<Payment>>("/payments", { params })
        .then((res) => normalizePaginated(res.data)),
    staleTime: 30_000,
  });
}

export function useRefunds(params?: QueryParams & { status?: string }) {
  const list = useQuery({
    queryKey: ["refunds", params],
    queryFn: () =>
      api
        .get<PaginatedResponse<Refund>>("/payments/refunds", { params })
        .then((res) => normalizePaginated(res.data)),
    staleTime: 30_000,
  });

  return { list };
}

export function useRefund(id: string) {
  return useQuery({
    queryKey: ["refunds", id],
    queryFn: () =>
      api
        .get<ApiResponse<Refund>>(`/payments/refunds`, { params: { search: id } })
        .then((res) => res.data.data),
    enabled: !!id,
  });
}

/**
 * Creates a refund via the canonical backend path:
 * POST /invoices/{invoiceId}/refund { payment_id, amount, reason }.
 */
export function useProcessRefund() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      invoiceId,
      paymentId,
      amount,
      reason,
    }: {
      invoiceId: string;
      paymentId: string;
      amount: number;
      reason: string;
    }) =>
      api.post<ApiResponse<Refund>>(`/invoices/${invoiceId}/refund`, {
        payment_id: paymentId,
        amount,
        reason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["refunds"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["billing-stats"] });
    },
  });
}

export function useBillingStats() {
  return useQuery({
    queryKey: ["billing-stats"],
    queryFn: () =>
      api
        .get<ApiResponse<BillingStats>>("/payments/stats")
        .then((res) => res.data.data),
    refetchInterval: 30000,
  });
}
