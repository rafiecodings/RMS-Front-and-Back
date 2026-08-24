import type { PaymentMethod } from "@/lib/types";

export interface CartItem {
  id: string;
  menu_item_id: string;
  name: string;
  price: number;
  variant?: string;
  quantity: number;
  modifiers?: { name: string; price: number }[];
  notes?: string;
}

export interface PosDiscount {
  type: "percentage" | "fixed";
  value: number;
}

export interface PaymentLine {
  id: string;
  method: PaymentMethod;
  amount: number;
  reference?: string;
}

export interface PosState {
  items: CartItem[];
  discount?: PosDiscount;
  serviceChargePercent: number;
  notes?: string;
}

export type PosAction =
  | { type: "ADD_ITEM"; item: CartItem }
  | { type: "REMOVE_ITEM"; id: string }
  | { type: "UPDATE_QUANTITY"; id: string; quantity: number }
  | { type: "UPDATE_ITEM_NOTES"; id: string; notes: string }
  | { type: "SET_DISCOUNT"; discount?: PosDiscount }
  | { type: "SET_SERVICE_CHARGE"; percent: number }
  | { type: "SET_NOTES"; notes: string }
  | { type: "CLEAR_CART" };
