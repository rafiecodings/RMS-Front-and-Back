import axios from "axios";
import { API_URL, DEV_PER_TAB_AUTH, DEV_AUTH_TOKEN_KEY } from "@/lib/utils/constants";

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  // In dev per-tab auth mode, disable credentials to prevent cookie-based auth fallback
  withCredentials: !DEV_PER_TAB_AUTH,
});

let isRedirecting = false;

api.interceptors.request.use((config) => {
  // Dev per-tab auth: read token from sessionStorage and set Authorization header
  if (DEV_PER_TAB_AUTH && typeof window !== "undefined") {
    const token = sessionStorage.getItem(DEV_AUTH_TOKEN_KEY);
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Session expiration → single canonical 401 handler. Skipped while the
    // user is already on /login (failed login attempts return 401 as well)
    // so the login page's own error handling stays authoritative.
    if (
      error.response?.status === 401 &&
      !isRedirecting &&
      typeof window !== "undefined" &&
      window.location.pathname !== "/login"
    ) {
      isRedirecting = true;
      // In dev per-tab mode, only force logout current tab
      if (DEV_PER_TAB_AUTH) {
        if (typeof window !== "undefined") {
          sessionStorage.removeItem(DEV_AUTH_TOKEN_KEY);
        }
        window.location.href = "/login";
      } else {
        window.dispatchEvent(new CustomEvent("rms:force-logout"));
      }
      setTimeout(() => {
        isRedirecting = false;
      }, 5000);
    }
    return Promise.reject(error);
  },
);

export default api;
