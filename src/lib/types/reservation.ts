import { Customer } from "./customer";
import type { ReservationTable } from "./table";

export interface Reservation {
  id: string;
  customer_id?: string;
  customer?: Customer | null;
  table_id?: string;
  table?: ReservationTable | null;
  guest_name?: string;
  guest_phone?: string;
  reservation_number: string;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  status: ReservationStatus;
  special_requests?: string;
  arrival_time?: string;
  seated_time?: string;
  completed_time?: string;
  no_show: boolean;
  cancelled: boolean;
  cancellation_reason?: string;
  created_at: string;
  updated_at: string;
}

export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "seated"
  | "completed"
  | "no_show"
  | "cancelled";

export interface ReservationFormData {
  customer_id?: string;
  guest_name: string;
  guest_phone?: string;
  guest_email?: string;
  table_id?: string;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  source?: string;
  special_requests?: string;
}
