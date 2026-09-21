export interface Ingredient {
  id: string;
  name: string;
  description?: string;
  unit: string;
  current_stock: number;
  minimum_stock: number;
  maximum_stock: number;
  cost_per_unit: number;
  category?: string;
  supplier_id?: string;
  supplier?: Supplier;
  is_active: boolean;
  storage_location?: string;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  payment_terms?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Recipe {
  id: string;
  menu_item_id: string;
  menu_item_name?: string;
  instructions?: string | null;
  yield_quantity?: number;
  yield_unit?: string;
  ingredients: RecipeIngredient[];
  ingredients_count?: number;
  created_at: string;
  updated_at: string;
}

export interface RecipeIngredient {
  id: string;
  ingredient_id: string;
  name?: string;
  ingredient?: Ingredient;
  quantity: number;
  unit: string;
  cost: number;
}

export interface RecipeFormData {
  menu_item_id: string;
  instructions?: string;
  yield_quantity: number;
  yield_unit: string;
  ingredients: { ingredient_id: string; quantity: number; unit: string }[];
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  supplier?: Supplier;
  status: PurchaseOrderStatus;
  order_date?: string;
  expected_date?: string;
  expected_delivery_date?: string;
  received_at?: string;
  received_date?: string;
  subtotal?: number;
  tax_amount?: number;
  total_amount: number;
  notes?: string;
  items: PurchaseOrderItem[];
  created_by?: string;
  creator?: { name?: string };
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderItem {
  id: string;
  ingredient_id: string;
  ingredient?: Ingredient;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  received_quantity?: number;
}

export type ActivePurchaseOrderStatus =
  | "pending"
  | "confirmed"
  | "received"
  | "cancelled";

export type LegacyPurchaseOrderStatus =
  | "draft"
  | "approved"
  | "ordered"
  | "partial"
  | "delivered";

export type PurchaseOrderStatus =
  | ActivePurchaseOrderStatus
  | LegacyPurchaseOrderStatus;

export interface StockMovement {
  id: string;
  ingredient_id: string;
  ingredient?: Ingredient;
  type: "inward" | "outward" | "adjustment" | "wastage";
  quantity: number;
  reference_type?: string;
  reference_id?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

export interface StockLevel {
  id: string;
  ingredient_id: string;
  ingredient?: Ingredient;
  location: string;
  current_stock: number;
  reserved_stock: number;
  incoming_stock: number;
  updated_at: string;
}

export interface StockAdjustFormData {
  ingredient_id: string;
  type: "in" | "out" | "adjustment";
  quantity?: number;
  new_stock?: number;
  reference_type?: string;
  reference_id?: string;
  notes?: string;
}

export interface StockTransferFormData {
  ingredient_id: string;
  from_location: string;
  to_location: string;
  quantity: number;
  notes?: string;
}

export interface WastageRecord {
  id: string;
  ingredient_id: string;
  ingredient?: Ingredient;
  quantity: number;
  reason: string;
  recorded_by?: string;
  created_at: string;
}

export interface WastageFormData {
  ingredient_id: string;
  quantity: number;
  reason: string;
}

export interface IngredientFormData {
  name: string;
  unit: string;
  current_stock: number;
  minimum_stock: number;
  maximum_stock: number;
  cost_per_unit: number;
  category?: string;
  supplier_id?: string;
  storage_location?: string;
  is_active?: boolean;
}

export interface SupplierFormData {
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  payment_terms?: string;
  is_active?: boolean;
}

export interface PurchaseOrderFormData {
  supplier_id: string;
  expected_date?: string;
  notes?: string;
  items: { ingredient_id: string; quantity: number; unit_cost: number }[];
}
