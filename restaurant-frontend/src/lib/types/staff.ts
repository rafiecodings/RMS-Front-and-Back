import { User } from "./api";

export interface Staff {
  id: string;
  user_id: string;
  user?: User;
  employee_id: string;
  phone?: string;
  position?: string;
  department?: string;
  hourly_rate?: number;
  base_salary?: number;
  employment_type?: string;
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
  | "admin"
  | "manager"
  | "inventory_staff"
  | "cashier"
  | "waiter"
  | "kitchen_staff";

export type StaffShift = "morning" | "afternoon" | "evening" | "night";

export const STAFF_ROLES: { value: StaffRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "inventory_staff", label: "Inventory Staff" },
  { value: "cashier", label: "Cashier" },
  { value: "waiter", label: "Waiter / Server" },
  { value: "kitchen_staff", label: "Kitchen Staff" },
];

export const STAFF_SHIFTS: { value: StaffShift; label: string; time: string }[] = [
  { value: "morning", label: "Morning", time: "6:00 AM – 2:00 PM" },
  { value: "afternoon", label: "Afternoon", time: "2:00 PM – 10:00 PM" },
  { value: "evening", label: "Evening", time: "4:00 PM – 12:00 AM" },
  { value: "night", label: "Night", time: "10:00 PM – 6:00 AM" },
];

export interface StaffFormData {
  user_id?: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  password?: string;
  phone?: string;
  role: StaffRole;
  shift?: StaffShift;
  position?: string;
  department?: string;
  hourly_rate?: number;
  commission_rate?: number;
  hire_date: string;
}

export interface ShiftSchedule {
  id: string;
  staff_id: string;
  staff?: {
    id: string;
    employee_id: string;
    name?: string | null;
  } | null;
  date: string;
  shift?: StaffShiftOption | null;
  status: "scheduled" | "confirmed" | "completed" | "absent" | "swap" | "cancelled";
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ShiftScheduleFormData {
  staff_id: string;
  date: string;
  shift_id: string;
  notes?: string;
}

export interface StaffShiftOption {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
}

export interface AttendanceRecord {
  id: string;
  staff_id: string;
  staff?: {
    id: string;
    employee_id: string;
    name?: string | null;
  } | null;
  date?: string;
  clock_in: string;
  clock_out?: string;
  total_hours?: number;
  status: "present" | "absent" | "late" | "half_day" | "on_leave";
  notes?: string;
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
