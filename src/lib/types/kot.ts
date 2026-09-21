import { Order } from "./order";
import { User } from "./api";

export interface Kot {
  id: string;
  kot_number: string;
  order_id: string;
  order?: Order;
  station: string;
  status: KotStatus;
  priority: KotPriority;
  estimated_time?: number;
  started_at?: string;
  completed_at?: string;
  archived_at?: string;
  notes?: string;
  items?: KotItem[];
  assigned_to?: User;
  assigned_to_id?: string;
  created_at: string;
  updated_at: string;
}

export interface KotItem {
  id: string;
  order_item_id: string;
  name?: string;
  menu_item_name?: string;
  quantity: number;
  variant?: string;
  notes?: string;
  status: KotItemStatus;
  modifiers?: { name: string; price: number }[];
}

export type KotStatus = "received" | "pending" | "in_progress" | "ready" | "completed" | "voided";

export type KotItemStatus = "pending" | "in_progress" | "ready";

export type KotPriority = "low" | "normal" | "high" | "urgent";
