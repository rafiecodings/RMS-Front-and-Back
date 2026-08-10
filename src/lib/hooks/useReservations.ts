"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/client";
import { normalizePaginated } from "@/lib/utils/api";
import type {
  ApiResponse,
  QueryParams,
  PaginatedResponse,
  Reservation,
  ReservationFormData,
} from "@/lib/types";

export function useReservations(params?: QueryParams) {
  const queryClient = useQueryClient();

  const list = useQuery({
    queryKey: ["reservations", params],
    queryFn: () =>
      api
        .get<PaginatedResponse<Reservation>>("/reservations", { params })
        .then((res) => normalizePaginated(res.data)),
    staleTime: 30_000,
  });

  const create = useMutation({
    mutationFn: (data: ReservationFormData) =>
      api.post<ApiResponse<Reservation>>("/reservations", data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["reservations"] }),
  });

  const update = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<ReservationFormData>;
    }) =>
      api.put<ApiResponse<Reservation>>(`/reservations/${id}`, data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["reservations"] }),
  });

  const cancel = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.patch<ApiResponse<Reservation>>(`/reservations/${id}/status`, {
        status: "cancelled",
        cancellation_reason: reason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
  });

  return { list, create, update, cancel };
}
