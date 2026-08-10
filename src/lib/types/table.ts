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
  number: string;
  capacity: number;
  status: TableStatus;
  shape?: string;
  zone?: string;
  section?: string;
  is_wheelchair_accessible: boolean;
  pos_x: number;
  pos_y: number;
  width: number;
  height: number;
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
  floor_plan_id?: string;
  name: string;
  number: string;
  capacity: number;
  shape?: string;
  zone?: string;
  section?: string;
  is_wheelchair_accessible: boolean;
  pos_x: number;
  pos_y: number;
  width: number;
  height: number;
}

export interface FloorPlanFormData {
  name: string;
  description?: string;
}
