import { Customer } from "./customer";
import { Table } from "./table";
import { User } from "./api";

export interface Order {
  id: string;
  order_number: string;
  order_type: OrderType;
  status: OrderStatus;
  payment_status?: string;
  customer_id?: string;
  customer?: Customer;
  table_id?: string;
  table?: Table;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  service_charge: number;
  total_amount: number;
  notes?: string;
  items: OrderItem[];
  items_count?: number;
  payments: Payment[];
  placed_at?: string;
  confirmed_at?: string;
  preparing_at?: string;
  ready_at?: string;
  served_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  created_at: string;
  updated_at: string;
  archived_at?: string | null;
}

export interface OrderItem {
  id: string;
  menu_item_id: string;
  menu_item_name: string;
  variant?: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
  status: OrderItemStatus;
  modifiers?: OrderItemModifier[];
  created_at: string;
  updated_at: string;
}

export interface OrderItemModifier {
  id: string;
  modifier_option_id: string;
  name: string;
  price: number;
}

export type OrderType = "dine_in" | "takeaway" | "delivery";

export type OrderStatus =
  | "draft"
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "served"
  | "completed"
  | "cancelled";

export type OrderItemStatus =
  | "pending"
  | "preparing"
  | "ready"
  | "cancelled";

export interface Payment {
  id: string;
  payment_method: PaymentMethod;
  amount: number;
  reference?: string;
  processed_by?: User;
  processed_by_id?: string;
  processed_at: string;
  created_at: string;
}

export type PaymentMethod =
  | "cash"
  | "card"
  | "bank_transfer"
  | "gift_card"
  | "loyalty_points"
  | "digital_wallet"
  | "room_charge";

export interface OrderFormData {
  order_type: OrderType;
  customer_id?: string;
  table_id?: string;
  items: OrderItemFormData[];
  notes?: string;
}

export interface OrderItemFormData {
  menu_item_id: string;
  variant?: string;
  quantity: number;
  unit_price: number;
  notes?: string;
  modifiers?: { modifier_option_id: string; price: number }[];
}

export interface PaymentFormData {
  payment_method: PaymentMethod;
  amount: number;
  reference?: string;
}
