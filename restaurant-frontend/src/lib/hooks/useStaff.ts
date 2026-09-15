"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/client";
import { useAuth } from "@/providers/AuthProvider";
import { normalizePaginated } from "@/lib/utils/api";
import type {
  ApiResponse,
  QueryParams,
  PaginatedResponse,
  Staff,
  StaffFormData,
  StaffPerformance,
  ShiftSchedule,
  ShiftScheduleFormData,
  StaffShiftOption,
  AttendanceRecord,
  LeaveRequest,
  LeaveRequestFormData,
} from "@/lib/types";

export function useStaff(params?: QueryParams & { role?: string }) {
  const queryClient = useQueryClient();

  const list = useQuery({
    queryKey: ["staff", params],
    queryFn: () =>
      api
        .get<PaginatedResponse<Staff>>("/staff", { params })
        .then((res) => normalizePaginated(res.data)),
    staleTime: 30_000,
  });

  const create = useMutation({
    mutationFn: (data: StaffFormData) =>
      api.post<ApiResponse<Staff>>("/staff", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["staff"] }),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<StaffFormData> }) =>
      api.put<ApiResponse<Staff>>(`/staff/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["staff"] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/staff/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["staff"] }),
  });

  return { list, create, update, remove };
}

export function useStaffMember(id: string) {
  return useQuery({
    queryKey: ["staff", id],
    queryFn: () =>
      api
        .get<ApiResponse<Staff>>(`/staff/${id}`)
        .then((res) => res.data.data),
    enabled: !!id,
  });
}

export function useStaffPerformance(id: string, params?: { start_date?: string; end_date?: string }) {
  return useQuery({
    queryKey: ["staff-performance", id, params],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<StaffPerformance>>(`/staff/${id}/performance`, { params });
      return data.data;
    },
    enabled: !!id,
  });
}

export function useShiftSchedule(params?: QueryParams & { staff_id?: string; date?: string; start_date?: string; end_date?: string }) {
  const queryClient = useQueryClient();

  const list = useQuery({
    queryKey: ["shift-schedules", params],
    queryFn: () =>
      api
        .get<PaginatedResponse<ShiftSchedule>>("/staff/schedule", { params })
        .then((res) => normalizePaginated(res.data)),
    staleTime: 30_000,
  });

  const create = useMutation({
    mutationFn: (data: ShiftScheduleFormData) =>
      api.post<ApiResponse<ShiftSchedule>>("/staff/schedule", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shift-schedules"] }),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ShiftScheduleFormData> }) =>
      api.put<ApiResponse<ShiftSchedule>>(`/staff/schedule/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shift-schedules"] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/staff/schedule/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shift-schedules"] }),
  });

  return { list, create, update, remove };
}

export function useAttendance(params?: QueryParams & { staff_id?: string; date?: string; date_from?: string; date_to?: string; status?: string }) {
  return useQuery({
    queryKey: ["attendance", params],
    queryFn: () =>
      api
        .get<PaginatedResponse<AttendanceRecord>>("/staff/attendance", { params })
        .then((res) => normalizePaginated(res.data)),
    staleTime: 30_000,
  });
}

export function useStaffShifts() {
  return useQuery({
    queryKey: ["staff-shifts"],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<StaffShiftOption[]>>("/staff/shifts");
      return data.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCurrentStaff() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["staff", "current", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Staff | null>>("/staff/me");
      return data.data;
    },
    staleTime: 60_000,
  });
}

export function useLeaveRequests(params?: QueryParams & { status?: string; staff_id?: string; date_from?: string; date_to?: string }) {
  const queryClient = useQueryClient();
  const list = useQuery({
    queryKey: ["leave-requests", params],
    queryFn: () =>
      api
        .get<PaginatedResponse<LeaveRequest>>("/staff/leave-requests", { params })
        .then((res) => normalizePaginated(res.data)),
    staleTime: 30_000,
  });
  const create = useMutation({
    mutationFn: ({ staffId, data }: { staffId: string; data: LeaveRequestFormData }) =>
      api.post<ApiResponse<LeaveRequest>>(`/staff/${staffId}/leave`, data).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leave-requests"] }),
  });
  const approve = useMutation({
    mutationFn: ({ id, decision_notes }: { id: string; decision_notes?: string }) =>
      api.post<ApiResponse<LeaveRequest>>(`/staff/leave-requests/${id}/approve`, { decision_notes }).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leave-requests"] }),
  });
  const reject = useMutation({
    mutationFn: ({ id, decision_notes }: { id: string; decision_notes?: string }) =>
      api.post<ApiResponse<LeaveRequest>>(`/staff/leave-requests/${id}/reject`, { decision_notes }).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leave-requests"] }),
  });
  const cancel = useMutation({
    mutationFn: (id: string) =>
      api.post<ApiResponse<LeaveRequest>>(`/staff/leave-requests/${id}/cancel`).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leave-requests"] }),
  });
  return { list, create, approve, reject, cancel };
}

export function useClockIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { staff_id: string; notes?: string }) =>
      api.post<ApiResponse<AttendanceRecord>>("/staff/clock-in", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
  });
}

export function useClockOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { staff_id: string; notes?: string }) =>
      api.post<ApiResponse<AttendanceRecord>>("/staff/clock-out", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
  });
}
