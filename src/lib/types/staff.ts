import { User } from "./api";

export interface Staff {
  id: string;
  user_id: string;
  user?: User;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: StaffRole;
  shift?: StaffShift;
  hourly_rate?: number;
  commission_rate?: number;
  is_active: boolean;
  hire_date: string;
  performance_score?: number;
  total_orders_handled?: number;
  total_tips_earned?: number;
  average_rating?: number;
  created_at: string;
  updated_at: string;
}

export type StaffRole =
  | "manager"
  | "cashier"
  | "waiter"
  | "kitchen_staff"
  | "host"
  | "bartender";

export type StaffShift = "morning" | "afternoon" | "evening" | "night";

export const STAFF_ROLES: { value: StaffRole; label: string }[] = [
  { value: "manager", label: "Manager" },
  { value: "cashier", label: "Cashier" },
  { value: "waiter", label: "Waiter / Server" },
  { value: "kitchen_staff", label: "Kitchen Staff" },
  { value: "host", label: "Host" },
  { value: "bartender", label: "Bartender" },
];

export const STAFF_SHIFTS: { value: StaffShift; label: string; time: string }[] = [
  { value: "morning", label: "Morning", time: "6:00 AM – 2:00 PM" },
  { value: "afternoon", label: "Afternoon", time: "2:00 PM – 10:00 PM" },
  { value: "evening", label: "Evening", time: "4:00 PM – 12:00 AM" },
  { value: "night", label: "Night", time: "10:00 PM – 6:00 AM" },
];

export interface StaffFormData {
  user_id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: StaffRole;
  shift?: StaffShift;
  hourly_rate?: number;
  commission_rate?: number;
  hire_date: string;
}

export interface ShiftSchedule {
  id: string;
  staff_id: string;
  staff?: Staff;
  date: string;
  shift: StaffShift;
  start_time: string;
  end_time: string;
  status: "scheduled" | "confirmed" | "completed" | "absent";
  clock_in?: string;
  clock_out?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ShiftScheduleFormData {
  staff_id: string;
  date: string;
  shift: StaffShift;
  start_time: string;
  end_time: string;
  notes?: string;
}

export interface AttendanceRecord {
  id: string;
  staff_id: string;
  staff?: Staff;
  date: string;
  clock_in: string;
  clock_out?: string;
  total_hours?: number;
  overtime_hours?: number;
  status: "present" | "absent" | "late" | "half_day" | "on_leave";
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface StaffPerformance {
  id: string;
  staff_id: string;
  staff?: Staff;
  period: string;
  orders_handled: number;
  tables_served: number;
  total_sales: number;
  tips_earned: number;
  average_rating: number;
  attendance_rate: number;
  punctuality_score: number;
  customer_feedback_count: number;
  created_at: string;
  updated_at: string;
}

export interface StaffStatsData {
  totalStaff: number;
  activeStaff: number;
  onShiftToday: number;
  averageRating: number;
}
