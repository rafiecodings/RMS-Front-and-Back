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

export interface MenuCategoryFormData {
  name: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
  parent_id?: string;
}

export interface MenuItem {
  id: string;
  category_id: string;
  category?: MenuCategory;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface MenuItemFormData {
  category_id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  is_available: boolean;
}
