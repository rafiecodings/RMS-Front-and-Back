export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedData<T> {
  items: T[];
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: PaginatedData<T>;
}

/** Normalized list response that consumers use */
export interface NormalizedPaginatedResponse<T> {
  success: boolean;
  message: string;
  data: {
    data: T[];
    meta: PaginatedData<T>["pagination"];
  };
}

export interface QueryParams {
  page?: number;
  per_page?: number;
  search?: string;
  sort?: string;
  order?: "asc" | "desc";
  customer_type?: string;
  is_active?: boolean;
  status?: string;
  reservation_date?: string;
  reservation_time?: string;
  party_size?: number;
  exclude_reservation_id?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  token_type: string;
  expires_in: number;
}
