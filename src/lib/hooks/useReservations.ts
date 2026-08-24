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
  Table,
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

  const availableTables = useQuery({
    queryKey: ["tables", "available", params],
    queryFn: () =>
      api
        .get<ApiResponse<{ items: Table[] }>>("/tables/available", { params })
        .then((res) => res.data.data.items ?? []),
    enabled: !!params?.reservation_date && !!params?.reservation_time,
    staleTime: 30_000,
  });

  const create = useMutation({
    mutationFn: (data: ReservationFormData) =>
      api.post<ApiResponse<Reservation>>("/reservations", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
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

  const checkIn = useMutation({
    mutationFn: (id: string) =>
      api.patch<ApiResponse<Reservation>>(`/reservations/${id}/status`, {
        status: "seated",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
  });

  const complete = useMutation({
    mutationFn: (id: string) =>
      api.patch<ApiResponse<Reservation>>(`/reservations/${id}/status`, {
        status: "completed",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
  });

  const confirm = useMutation({
    mutationFn: (id: string) =>
      api.patch<ApiResponse<Reservation>>(`/reservations/${id}/status`, {
        status: "confirmed",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
  });

  const archive = useMutation({
    mutationFn: (id: string) =>
      api.patch<ApiResponse<Reservation>>(`/reservations/${id}/archive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
    },
  });

  return { list, availableTables, create, update, cancel, checkIn, complete, confirm, archive };
}

export function useReservation(id: string) {
  return useQuery({
    queryKey: ["reservations", id],
    queryFn: () =>
      api
        .get<ApiResponse<Reservation>>(`/reservations/${id}`)
        .then((res) => res.data.data),
    enabled: !!id,
  });
}

/**
 * Dedicated month-range feed for the reservation calendar. Unlike the
 * paginated list endpoint, this returns every non-cancelled reservation in
 * the range regardless of pagination.
 */
export function useReservationCalendar(params: {
  start_date?: string;
  end_date?: string;
}) {
  return useQuery({
    queryKey: ["reservations", "calendar", params],
    queryFn: () =>
      api
        .get<ApiResponse<{ items: Reservation[] }>>("/reservations/calendar", {
          params,
        })
        .then((res) => res.data.data?.items ?? []),
    enabled: !!params.start_date && !!params.end_date,
    staleTime: 60_000,
  });
}
