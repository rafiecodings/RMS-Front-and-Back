/**
 * Canonical opening-hours shape used across the UI.
 */
export interface OpeningHourRow {
  day: string; // "monday" .. "sunday"
  open: string; // "HH:MM"
  close: string; // "HH:MM"
  is_closed: boolean;
}

export const WEEK_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

/** Backend storage shape: { monday: { open, close }, ... } */
export type RawOpeningHours = Record<string, { open?: string; close?: string }> | null;

function normalizeHours(raw: RawOpeningHours): OpeningHourRow[] {
  return WEEK_DAYS.map((day) => {
    const entry = raw?.[day];
    const closed =
      !entry || (!entry.open && !entry.close) || entry.open === "" ? true : false;
    return {
      day,
      open: entry?.open ?? "09:00",
      close: entry?.close ?? "22:00",
      is_closed: closed,
    };
  });
}

/**
 * Flat settings contract — matches the backend's flat JSON payload.
 */
export interface RestaurantSettings {
  name: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
  email?: string;
  timezone?: string;
  currency?: string;
  currency_symbol?: string;
  tax_id?: string;
  default_tax_rate: number;
  default_service_charge: number;
  service_charge_enabled: boolean;
  allow_negative_inventory: boolean;
  opening_hours: OpeningHourRow[];
  updated_at?: string;
}

export function normalizeSettings(raw: unknown): RestaurantSettings {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    name: typeof r.name === "string" ? r.name : "",
    description: typeof r.description === "string" ? r.description : undefined,
    address: typeof r.address === "string" ? r.address : "",
    city: typeof r.city === "string" ? r.city : "",
    state: typeof r.state === "string" ? r.state : "",
    postal_code: typeof r.postal_code === "string" ? r.postal_code : "",
    country: typeof r.country === "string" ? r.country : "",
    phone: typeof r.phone === "string" ? r.phone : "",
    email: typeof r.email === "string" ? r.email : "",
    timezone: typeof r.timezone === "string" ? r.timezone : "Asia/Manila",
    currency: typeof r.currency === "string" ? r.currency : "PHP",
    currency_symbol: typeof r.currency_symbol === "string" ? r.currency_symbol : "₱",
    tax_id: typeof r.tax_id === "string" ? r.tax_id : "",
    default_tax_rate:
      typeof r.default_tax_rate === "number"
        ? r.default_tax_rate
        : Number(r.default_tax_rate ?? 0),
    default_service_charge:
      typeof r.default_service_charge === "number"
        ? r.default_service_charge
        : Number(r.default_service_charge ?? 0),
    service_charge_enabled: Boolean(r.service_charge_enabled),
    allow_negative_inventory: Boolean(r.allow_negative_inventory),
    opening_hours: normalizeHours((r.opening_hours as RawOpeningHours) ?? null),
    updated_at: typeof r.updated_at === "string" ? r.updated_at : undefined,
  };
}

export interface RestaurantInfoFormData {
  name: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
  email?: string;
  tax_id?: string;
  opening_hours: RawOpeningHours;
}

export interface SystemPreferencesFormData {
  currency: string;
  currency_symbol: string;
  timezone: string;
  default_tax_rate: number;
  default_service_charge: number;
  service_charge_enabled: boolean;
  allow_negative_inventory: boolean;
}
