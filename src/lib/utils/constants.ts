export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "/api/v1";

export const ITEMS_PER_PAGE = 20;
export const DEBOUNCE_DELAY = 300;

// Dev-only per-tab auth: enables sessionStorage-based auth for multi-tab testing
// Only active when NODE_ENV === "development" AND NEXT_PUBLIC_DEV_PER_TAB_AUTH === "true"
export const DEV_PER_TAB_AUTH =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_DEV_PER_TAB_AUTH === "true";

export const DEV_AUTH_TOKEN_KEY = "rms_dev_auth_token";

export const CHART_TOOLTIP_STYLE = {
  backgroundColor: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  fontSize: "12px",
} as const;

export const CHART_AXIS_PROPS = {
  tick: { fontSize: 10, fill: "var(--muted-foreground)" },
  tickLine: false,
  axisLine: false,
} as const;

export const CHART_COLORS = [
  "#10b981", // emerald-500
  "#3b82f6", // blue-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#8b5cf6", // violet-500
  "#06b6d4", // cyan-500
  "#f97316", // orange-500
  "#ec4899", // pink-500
  "#14b8a6", // teal-500
  "#6366f1", // indigo-500
] as const;
