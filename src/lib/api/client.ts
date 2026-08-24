import axios from "axios";
import { API_URL } from "@/lib/utils/constants";

const api = axios.create({
  baseURL: API_URL,
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
    if (error.response?.status === 401 && !isRedirecting) {
      isRedirecting = true;
      if (typeof window !== "undefined") {
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
