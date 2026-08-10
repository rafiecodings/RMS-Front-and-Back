"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/client";
import { normalizePaginated } from "@/lib/utils/api";
import type {
  ApiResponse,
  PaginatedResponse,
  QueryParams,
  User,
} from "@/lib/types";

export function useUsers(params?: QueryParams) {
  const queryClient = useQueryClient();

  const list = useQuery({
    queryKey: ["users", params],
    queryFn: () =>
      api
        .get<PaginatedResponse<User>>("/admin/users", { params })
        .then((res) => normalizePaginated(res.data)),
    staleTime: 60_000,
  });

  const create = useMutation({
    mutationFn: (data: {
      name: string;
      email: string;
      password: string;
      password_confirmation: string;
      role: string;
    }) => api.post<ApiResponse<User>>("/admin/users", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  return { list, create };
}
