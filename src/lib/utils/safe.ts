export function safeNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function safeString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (value === null || value === undefined) return fallback;
  return String(value);
}

export function safeBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") return value === "true" || value === "1";
  return false;
}

export function safeArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function safeObject<T extends Record<string, unknown> = Record<string, unknown>>(
  value: unknown,
): T {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as T) : ({} as T);
}

export function safePercentage(value: unknown): number {
  return safeNumber(value);
}

export function safeHours(value: unknown): number {
  return safeNumber(value);
}

export function safeCurrency(value: unknown): number {
  return safeNumber(value);
}

export function safeDate(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" || typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}
