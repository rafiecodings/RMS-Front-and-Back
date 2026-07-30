export interface RestaurantInfo {
  id: string;
  name: string;
  description?: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone: string;
  email: string;
  website?: string;
  logo_url?: string;
  timezone: string;
  currency: string;
  currency_symbol: string;
  tax_id?: string;
  business_registration?: string;
  opening_hours: OpeningHours[];
  created_at: string;
  updated_at: string;
}

export interface OpeningHours {
  day: string;
  open: string;
  close: string;
  is_closed: boolean;
}

export interface RestaurantInfoFormData {
  name: string;
  description?: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone: string;
  email: string;
  website?: string;
  timezone: string;
  currency: string;
  currency_symbol: string;
  tax_id?: string;
  business_registration?: string;
  opening_hours: OpeningHours[];
}

export interface Tax {
  id: string;
  name: string;
  rate: number;
  type: TaxType;
  is_compound: boolean;
  is_active: boolean;
  applies_to: TaxAppliesTo;
  description?: string;
  created_at: string;
  updated_at: string;
}

export type TaxType = "percentage" | "fixed";
export type TaxAppliesTo = "all" | "food" | "beverage" | "service";

export interface TaxFormData {
  name: string;
  rate: number;
  type: TaxType;
  is_compound: boolean;
  is_active: boolean;
  applies_to: TaxAppliesTo;
  description?: string;
}

export interface Discount {
  id: string;
  name: string;
  code?: string;
  type: DiscountType;
  value: number;
  min_order_amount?: number;
  max_discount_amount?: number;
  max_uses?: number;
  used_count: number;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  applies_to: DiscountAppliesTo;
  description?: string;
  created_at: string;
  updated_at: string;
}

export type DiscountType = "percentage" | "fixed";
export type DiscountAppliesTo = "all" | "menu_item" | "category" | "order_type";

export interface DiscountFormData {
  name: string;
  code?: string;
  type: DiscountType;
  value: number;
  min_order_amount?: number;
  max_discount_amount?: number;
  max_uses?: number;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  applies_to: DiscountAppliesTo;
  description?: string;
}

export interface Role {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  permissions: Permission[];
  users_count: number;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoleFormData {
  name: string;
  display_name: string;
  description?: string;
  permission_ids: string[];
}

export interface Permission {
  id: string;
  name: string;
  display_name: string;
  module: PermissionModule;
  description?: string;
}

export type PermissionModule =
  | "dashboard"
  | "customers"
  | "tables"
  | "reservations"
  | "menu"
  | "orders"
  | "kitchen"
  | "pos"
  | "billing"
  | "inventory"
  | "staff"
  | "reports"
  | "analytics"
  | "settings"
  | "admin";

export interface UserManagement {
  id: string;
  name: string;
  email: string;
  role: Role;
  is_active: boolean;
  avatar?: string;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UserFormData {
  name: string;
  email: string;
  password?: string;
  role_id: string;
  is_active: boolean;
}

export interface SystemSettings {
  id: string;
  default_tax_rate: number;
  default_service_charge: number;
  service_charge_enabled: boolean;
  currency: string;
  currency_symbol: string;
  receipt_footer: string;
  receipt_header: string;
  order_prefix: string;
  invoice_prefix: string;
  table_reservation_timeout: number;
  kitchen_display_timeout: number;
  auto_cancel_timeout: number;
  allow_negative_inventory: boolean;
  low_stock_threshold: number;
  created_at: string;
  updated_at: string;
}

export interface SystemSettingsFormData {
  default_tax_rate: number;
  default_service_charge: number;
  service_charge_enabled: boolean;
  currency: string;
  currency_symbol: string;
  receipt_footer: string;
  receipt_header: string;
  order_prefix: string;
  invoice_prefix: string;
  table_reservation_timeout: number;
  kitchen_display_timeout: number;
  auto_cancel_timeout: number;
  allow_negative_inventory: boolean;
  low_stock_threshold: number;
}
