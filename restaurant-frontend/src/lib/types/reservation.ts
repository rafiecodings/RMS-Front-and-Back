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
  guest_email?: string;
  source?: string;
  reservation_number: string;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  status: ReservationStatus;
  special_requests?: string;
  cancellation_reason?: string;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
}

export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "seated"
  | "completed"
  | "cancelled"
  | "no_show";

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
  status?: ReservationStatus;
}

