"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/client";
import { normalizePaginated } from "@/lib/utils/api";
import type {
  ApiResponse,
  QueryParams,
  PaginatedResponse,
  Ingredient,
  IngredientFormData,
  PurchaseOrder,
  PurchaseOrderFormData,
  PurchaseOrderStatus,
  Supplier,
  SupplierFormData,
  Recipe,
  RecipeFormData,
  StockMovement,
  StockAdjustFormData,
  StockTransferFormData,
  WastageFormData,
} from "@/lib/types";

export function useIngredients(params?: QueryParams & { category?: string }) {
  const queryClient = useQueryClient();

  const list = useQuery({
    queryKey: ["ingredients", params],
    queryFn: () =>
      api
        .get<PaginatedResponse<Ingredient>>("/inventory/ingredients", {
          params,
        })
        .then((res) => normalizePaginated(res.data)),
    staleTime: 30_000,
  });

  const create = useMutation({
    mutationFn: (data: IngredientFormData) =>
      api.post<ApiResponse<Ingredient>>("/inventory/ingredients", data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["ingredients"] }),
  });

  const update = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<IngredientFormData>;
    }) =>
      api.put<ApiResponse<Ingredient>>(
        `/inventory/ingredients/${id}`,
        data
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["ingredients"] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      api.delete(`/inventory/ingredients/${id}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["ingredients"] }),
  });

  return { list, create, update, remove };
}

export function useSuppliers(params?: QueryParams) {
  const queryClient = useQueryClient();

  const list = useQuery({
    queryKey: ["suppliers", params],
    queryFn: () =>
      api
        .get<PaginatedResponse<Supplier>>("/inventory/suppliers", { params })
        .then((res) => normalizePaginated(res.data)),
    staleTime: 30_000,
  });

  const create = useMutation({
    mutationFn: (data: SupplierFormData) =>
      api.post<ApiResponse<Supplier>>("/inventory/suppliers", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
  });

  const update = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<SupplierFormData>;
    }) =>
      api.put<ApiResponse<Supplier>>(`/inventory/suppliers/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/inventory/suppliers/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
  });

  return { list, create, update, remove };
}

export function usePurchaseOrders(params?: QueryParams & { status?: string }) {
  const queryClient = useQueryClient();

  const list = useQuery({
    queryKey: ["purchase-orders", params],
    queryFn: () =>
      api
        .get<PaginatedResponse<PurchaseOrder>>(
          "/inventory/purchase-orders",
          { params }
        )
        .then((res) => normalizePaginated(res.data)),
    staleTime: 30_000,
  });

  const create = useMutation({
    mutationFn: (data: PurchaseOrderFormData) =>
      api.post<ApiResponse<PurchaseOrder>>(
        "/inventory/purchase-orders",
        data
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] }),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: PurchaseOrderStatus }) =>
      api.patch<ApiResponse<PurchaseOrder>>(
        `/inventory/purchase-orders/${id}/status`,
        { status }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["ingredients"] });
    },
  });

  return { list, create, updateStatus };
}

export function usePurchaseOrder(id: string) {
  return useQuery({
    queryKey: ["purchase-orders", id],
    queryFn: () =>
      api
        .get<ApiResponse<PurchaseOrder>>(`/inventory/purchase-orders/${id}`)
        .then((res) => res.data.data),
    enabled: !!id,
  });
}

export function useRecipes(params?: QueryParams) {
  const queryClient = useQueryClient();

  const list = useQuery({
    queryKey: ["recipes", params],
    queryFn: () =>
      api
        .get<PaginatedResponse<Recipe>>("/inventory/recipes", { params })
        .then((res) => normalizePaginated(res.data)),
    staleTime: 30_000,
  });

  const create = useMutation({
    mutationFn: (data: RecipeFormData) =>
      api.post<ApiResponse<Recipe>>("/inventory/recipes", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["recipes"] }),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RecipeFormData> }) =>
      api.put<ApiResponse<Recipe>>(`/inventory/recipes/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["recipes"] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/inventory/recipes/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["recipes"] }),
  });

  return { list, create, update, remove };
}

export function useRecipe(id: string) {
  return useQuery({
    queryKey: ["recipes", id],
    queryFn: () =>
      api
        .get<ApiResponse<Recipe>>(`/inventory/recipes/${id}`)
        .then((res) => res.data.data),
    enabled: !!id,
  });
}

export function useStockMovements(params?: QueryParams & { ingredient_id?: string; type?: string }) {
  return useQuery({
    queryKey: ["stock-movements", params],
    queryFn: () =>
      api
        .get<PaginatedResponse<StockMovement>>("/inventory/stock", { params })
        .then((res) => normalizePaginated(res.data)),
    staleTime: 30_000,
  });
}

export function useStockAdjust() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: StockAdjustFormData) =>
      api.post<ApiResponse<StockMovement>>("/inventory/stock/adjust", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      queryClient.invalidateQueries({ queryKey: ["ingredients"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useStockTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: StockTransferFormData) =>
      api.post<ApiResponse<StockMovement>>("/inventory/stock/transfer", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      queryClient.invalidateQueries({ queryKey: ["ingredients"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useLogWastage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: WastageFormData) =>
      api.post<ApiResponse<StockMovement>>("/inventory/wastage", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      queryClient.invalidateQueries({ queryKey: ["ingredients"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
