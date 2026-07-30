export interface FloorPlan {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  tables: Table[];
  created_at: string;
  updated_at: string;
}

export interface Table {
  id: string;
  floor_plan_id: string;
  name: string;
  number: number;
  capacity: number;
  status: TableStatus;
  zone?: string;
  section?: string;
  is_wheelchair_accessible: boolean;
  position_x: number;
  position_y: number;
  current_order_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ReservationTable {
  id: string;
  number: string;
  capacity?: number;
  name?: string;
}

export type TableStatus =
  | "available"
  | "reserved"
  | "occupied"
  | "needs_cleaning"
  | "maintenance";

export interface TableFormData {
  name: string;
  number: number;
  capacity: number;
  zone?: string;
  section?: string;
  is_wheelchair_accessible: boolean;
  position_x: number;
  position_y: number;
}

export interface FloorPlanFormData {
  name: string;
  description?: string;
}
