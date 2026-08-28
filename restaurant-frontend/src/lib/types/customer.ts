export type CustomerType = "walk_in" | "regular";

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  birthday?: string;
  dietary_restrictions?: string;
  customer_type: CustomerType;
  loyalty_points: number;
  total_orders: number;
  total_reservations?: number;
  total_spent: number;
  visit_count: number;
  notes?: string;
  is_active: boolean;
  loyalty_tier?: string;
  reservations?: CustomerReservation[];
  created_at: string;
  updated_at: string;
}

export interface CustomerReservation {
  id: string;
  reservation_number: string;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
  status: string;
  table?: {
    id: string;
    number: string;
  } | null;
}

export interface CustomerFormData {
  name: string;
  customer_type: CustomerType;
}
