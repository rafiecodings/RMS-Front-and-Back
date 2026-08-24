"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/client";
import { normalizePaginated } from "@/lib/utils/api";
import type {
  ApiResponse,
  QueryParams,
  PaginatedResponse,
  Customer,
  CustomerFormData,
} from "@/lib/types";

export function useCustomers(params?: QueryParams) {
  const queryClient = useQueryClient();

  const list = useQuery({
    queryKey: ["customers", params],
    queryFn: () =>
      api
        .get<PaginatedResponse<Customer>>("/customers", { params })
        .then((res) => normalizePaginated(res.data)),
    staleTime: 30_000,
  });

  const create = useMutation({
    mutationFn: (data: CustomerFormData) =>
      api.post<ApiResponse<Customer>>("/customers", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customers"] }),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CustomerFormData> }) =>
      api.put<ApiResponse<Customer>>(`/customers/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customers"] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/customers/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customers"] }),
  });

  const archive = useMutation({
    mutationFn: (id: string) => api.delete(`/customers/${id}/archive`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customers"] }),
  });

  return { list, create, update, remove, archive };
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ["customers", id],
    queryFn: () =>
      api
        .get<ApiResponse<Customer>>(`/customers/${id}`)
        .then((res) => res.data.data),
    enabled: !!id,
    staleTime: 30_000,
  });
}
