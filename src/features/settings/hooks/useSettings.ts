"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/client";
import { normalizePaginated } from "@/lib/utils/api";
import { safeExtractArray } from "@/lib/schemas/extract";
import { RoleSchema, TaxSchema, DiscountSchema, PermissionSchema } from "@/lib/schemas/api";
import type { ApiResponse, PaginatedResponse, QueryParams } from "@/lib/types";
import type {
  RestaurantInfo,
  RestaurantInfoFormData,
  Tax,
  TaxFormData,
  Discount,
  DiscountFormData,
  Role,
  RoleFormData,
  Permission,
  UserManagement,
  UserFormData,
  SystemSettings,
  SystemSettingsFormData,
} from "../types";

export function useRestaurantInfo() {
  return useQuery({
    queryKey: ["settings", "restaurant"],
    queryFn: () =>
      api
        .get<ApiResponse<RestaurantInfo>>("/admin/settings")
        .then((res) => res.data.data),
    staleTime: 2 * 60 * 1000,
  });
}

export function useUpdateRestaurantInfo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RestaurantInfoFormData) =>
      api.put<ApiResponse<RestaurantInfo>>("/admin/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "restaurant"] });
    },
  });
}

export function useTaxes() {
  return useQuery({
    queryKey: ["settings", "taxes"],
    queryFn: () =>
      api
        .get<ApiResponse<Tax[]>>("/admin/taxes")
        .then((res) => safeExtractArray(res.data, TaxSchema, "useTaxes")),
    staleTime: 2 * 60 * 1000,
  });
}

export function useTax(id: string) {
  return useQuery({
    queryKey: ["settings", "taxes", id],
    queryFn: () =>
      api
        .get<ApiResponse<Tax>>(`/admin/taxes/${id}`)
        .then((res) => res.data.data),
    enabled: !!id,
  });
}

export function useCreateTax() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: TaxFormData) =>
      api.post<ApiResponse<Tax>>("/admin/taxes", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "taxes"] });
    },
  });
}

export function useUpdateTax() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TaxFormData }) =>
      api.put<ApiResponse<Tax>>(`/admin/taxes/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "taxes"] });
    },
  });
}

export function useDeleteTax() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/taxes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "taxes"] });
    },
  });
}

export function useDiscounts() {
  return useQuery({
    queryKey: ["settings", "discounts"],
    queryFn: () =>
      api
        .get<ApiResponse<Discount[]>>("/admin/discounts")
        .then((res) => safeExtractArray(res.data, DiscountSchema, "useDiscounts")),
    staleTime: 2 * 60 * 1000,
  });
}

export function useDiscount(id: string) {
  return useQuery({
    queryKey: ["settings", "discounts", id],
    queryFn: () =>
      api
        .get<ApiResponse<Discount>>(`/admin/discounts/${id}`)
        .then((res) => res.data.data),
    enabled: !!id,
  });
}

export function useCreateDiscount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: DiscountFormData) =>
      api.post<ApiResponse<Discount>>("/admin/discounts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "discounts"] });
    },
  });
}

export function useUpdateDiscount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: DiscountFormData }) =>
      api.put<ApiResponse<Discount>>(`/admin/discounts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "discounts"] });
    },
  });
}

export function useDeleteDiscount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/discounts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "discounts"] });
    },
  });
}

export function useUsers(params?: QueryParams) {
  return useQuery({
    queryKey: ["settings", "users", params],
    queryFn: () =>
      api
        .get<PaginatedResponse<UserManagement>>("/admin/users", { params })
        .then((res) => normalizePaginated(res.data)),
    staleTime: 30_000,
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ["settings", "users", id],
    queryFn: () =>
      api
        .get<ApiResponse<UserManagement>>(`/admin/users/${id}`)
        .then((res) => res.data.data),
    enabled: !!id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UserFormData) =>
      api.post<ApiResponse<UserManagement>>("/admin/users", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "users"] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UserFormData }) =>
      api.put<ApiResponse<UserManagement>>(`/admin/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "users"] });
    },
  });
}

export function useRoles() {
  return useQuery({
    queryKey: ["settings", "roles"],
    queryFn: () =>
      api
        .get<ApiResponse<Role[]>>("/admin/roles")
        .then((res) => safeExtractArray(res.data, RoleSchema, "useRoles")),
    staleTime: 2 * 60 * 1000,
  });
}

export function useRole(id: string) {
  return useQuery({
    queryKey: ["settings", "roles", id],
    queryFn: () =>
      api
        .get<ApiResponse<Role>>(`/admin/roles/${id}`)
        .then((res) => res.data.data),
    enabled: !!id,
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RoleFormData) =>
      api.post<ApiResponse<Role>>("/admin/roles", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "roles"] });
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RoleFormData }) =>
      api.put<ApiResponse<Role>>(`/admin/roles/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "roles"] });
    },
  });
}

export function usePermissions() {
  return useQuery({
    queryKey: ["settings", "permissions"],
    queryFn: () =>
      api
        .get<ApiResponse<Permission[]>>("/admin/permissions")
        .then((res) => safeExtractArray(res.data, PermissionSchema, "usePermissions")),
    staleTime: 2 * 60 * 1000,
  });
}

export function useSystemSettings() {
  return useQuery({
    queryKey: ["settings", "system"],
    queryFn: () =>
      api
        .get<ApiResponse<SystemSettings>>("/admin/settings")
        .then((res) => res.data.data),
    staleTime: 2 * 60 * 1000,
  });
}

export function useUpdateSystemSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SystemSettingsFormData) =>
      api.put<ApiResponse<SystemSettings>>("/admin/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "system"] });
    },
  });
}
