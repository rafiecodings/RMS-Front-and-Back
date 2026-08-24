export interface Table {
  id: string;
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
  name: string;
  number: string;
  capacity: number;
  shape?: string;
  zone?: string;
  section?: string;
  is_wheelchair_accessible: boolean;
}