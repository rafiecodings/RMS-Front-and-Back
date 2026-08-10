export interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
  image_url?: string;
  parent_id?: string;
  children?: MenuCategory[];
  items_count: number;
  created_at: string;
  updated_at: string;
}

export interface MenuItem {
  id: string;
  category_id: string;
  category?: MenuCategory;
  name: string;
  description?: string;
  price: number;
  cost_price?: number;
  image_url?: string;
  is_available: boolean;
  is_vegetarian: boolean;
  is_vegan: boolean;
  is_gluten_free: boolean;
  preparation_time?: number;
  calories?: number;
  allergens?: string[];
  tags?: string[];
  variants?: MenuItemVariant[];
  modifiers?: MenuItemModifier[];
  station?: string;
  created_at: string;
  updated_at: string;
}

export interface MenuItemVariant {
  id: string;
  name: string;
  price: number;
  is_default: boolean;
}

export interface MenuItemModifier {
  id: string;
  name: string;
  type: "single" | "multiple";
  required: boolean;
  options: ModifierOption[];
}

export interface ModifierOption {
  id: string;
  name: string;
  price: number;
}

export interface MenuCategoryFormData {
  name: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
  parent_id?: string;
}

export interface MenuItemFormData {
  category_id: string;
  name: string;
  description?: string;
  price: number;
  cost_price?: number;
  is_available: boolean;
  is_vegetarian: boolean;
  is_vegan: boolean;
  is_gluten_free: boolean;
  preparation_time?: number;
  calories?: number;
  allergens?: string[];
  tags?: string[];
  station?: string;
}
