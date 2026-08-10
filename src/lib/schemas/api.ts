import { z } from "zod"

const PermissionModuleSchema = z.enum([
  "dashboard", "customers", "tables", "reservations", "menu",
  "orders", "kitchen", "pos", "billing", "inventory",
  "staff", "reports", "analytics", "settings", "admin",
  "kot", "integration",
])

export const PermissionSchema = z.object({
  id: z.string(),
  name: z.string(),
  display_name: z.string(),
  module: PermissionModuleSchema,
  description: z.string().nullish(),
})

export const RoleSchema = z.object({
  id: z.string(),
  name: z.string(),
  display_name: z.string(),
  description: z.string().optional(),
  permissions: z.array(PermissionSchema),
  users_count: z.number(),
  is_system: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
})

export const TaxSchema = z.object({
  id: z.string(),
  name: z.string(),
  rate: z.number(),
  type: z.enum(["percentage", "fixed"]),
  is_compound: z.boolean(),
  is_active: z.boolean(),
  applies_to: z.enum(["all", "food", "beverage", "service"]),
  description: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
})

export const DiscountSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string().optional(),
  type: z.enum(["percentage", "fixed"]),
  value: z.number(),
  min_order_amount: z.number().optional(),
  max_discount_amount: z.number().optional(),
  max_uses: z.number().optional(),
  used_count: z.number(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  is_active: z.boolean(),
  applies_to: z.enum(["all", "menu_item", "category", "order_type"]),
  description: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
})


