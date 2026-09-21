import type {
  Customer,
  Table,
  User,
  OrderType,
  OrderStatus,
  Payment,
  OrderItemModifier,
} from "@/lib/types";

export type InvoiceStatus =
  | "unpaid"
  | "pending"
  | "partial"
  | "paid"
  | "refunded";

export type StatutoryDiscountType =
  | "senior_citizen"
  | "pwd"
  | null;

export interface Invoice {
  id: string;
  invoice_number: string;
  order_type: OrderType;
  status: InvoiceStatus;
  customer?: Customer;
  table?: Table;
  items: InvoiceItem[];
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  service_charge: number;
  total_amount: number;
  amount_paid: number;
  balance: number;
  payment_status: PaymentStatus;
  payments: Payment[];
  notes?: string;
  placed_at?: string;
  completed_at?: string;
  created_at: string;
  statutory_discount_type?: StatutoryDiscountType;
  statutory_discount_reference?: string;
  statutory_discount_name?: string;
  qualified_amount?: number;
  statutory_discount_amount?: number;
  vat_exempt_sales?: number;
}

export interface InvoiceItem {
  id: string;
  menu_item_name: string;
  variant?: string;
  quantity: number;
  unit_price: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  modifiers?: OrderItemModifier[];
}

export type PaymentStatus =
  | "unpaid"
  | "partial"
  | "paid"
  | "refunded"
  | "partially_refunded";

export interface Refund {
  id: string;
  refund_number: string;
  invoice_id: string;
  invoice?: Invoice;
  order_number: string;
  type: RefundType;
  status: RefundStatus;
  reason: string;
  total_amount: number;
  items?: RefundItem[];
  processed_by?: User;
  approved_by?: User;
  processed_at?: string;
  created_at: string;
}

export interface RefundItem {
  id: string;
  order_item_id: string;
  menu_item_name: string;
  quantity: number;
  unit_price: number;
  refund_amount: number;
}

export type RefundType = "full" | "partial" | "item_level";
export type RefundStatus = "pending" | "approved" | "completed" | "rejected";

export interface BillingStats {
  total_revenue: number;
  outstanding_amount: number;
  total_refunds: number;
  net_revenue: number;
  orders_count: number;
  avg_order_value: number;
  payment_method_breakdown: {
    method: string;
    amount: number;
    count: number;
  }[];
}

export interface RefundFormData {
  refund_type: RefundType;
  reason: string;
  amount?: number;
  items?: {
    order_item_id: string;
    quantity: number;
    refund_amount: number;
  }[];
}
