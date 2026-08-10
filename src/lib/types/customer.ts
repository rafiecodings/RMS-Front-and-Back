export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  birthday?: string;
  dietary_restrictions?: string;
  customer_type: "walk_in" | "registered" | "regular" | "corporate" | "vip";
  loyalty_points: number;
  total_orders: number;
  total_spent: number;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerFormData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  birthday?: string;
  dietary_restrictions?: string;
  customer_type: "walk_in" | "registered" | "regular" | "corporate" | "vip";
  notes?: string;
}
