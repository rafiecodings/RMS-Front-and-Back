import axios from "axios";
import { API_URL } from "@/lib/utils/constants";

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: true,
});

let isRedirecting = false;

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
      window.dispatchEvent(new CustomEvent("rms:force-logout"));
      setTimeout(() => {
        isRedirecting = false;
      }, 5000);
    }
    return Promise.reject(error);
  },
);

export default api;
