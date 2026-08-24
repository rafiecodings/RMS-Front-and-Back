"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api/client";
import type { User } from "@/lib/types";

const LOGIN_EVENT = "rms:force-logout";
const TOKEN_REFRESH_THRESHOLD_MS = 60_000;
const ROLE_COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days, matches auth_token

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const router = useRouter();
  const mountedRef = useRef(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshingRef = useRef(false);
  const scheduleRefreshRef = useRef<(expiresInSeconds: number) => void>(() => {});

  const setRoleCookie = useCallback((role: string) => {
    document.cookie = `rms_role=${role}; path=/; max-age=${ROLE_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
  }, []);

  const clearRoleCookie = useCallback(() => {
    document.cookie = "rms_role=; path=/; max-age=0; SameSite=Lax";
  }, []);

  const clearAuth = useCallback(() => {
    setUser(null);
    clearRoleCookie();
  }, [clearRoleCookie]);

  const scheduleRefreshImpl = useCallback(
    (expiresInSeconds: number) => {
      if (expiresInSeconds <= 0) return;

      const refreshAt = Date.now() + Math.max(expiresInSeconds * 1000 - TOKEN_REFRESH_THRESHOLD_MS, 1000);

      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }

      const delay = refreshAt - Date.now();
      if (delay > 0) {
        refreshTimerRef.current = setTimeout(() => {
          if (mountedRef.current && !refreshingRef.current) {
            refreshingRef.current = true;
             api
               .post("/auth/refresh")
               .then((res) => {
                 refreshingRef.current = false;
                 const data = res.data.data;
                 if (data?.user?.role) {
                   setUser(data.user);
                   setRoleCookie(data.user.role);
                 }
                 if (data?.expires_in) {
                   scheduleRefreshRef.current(data.expires_in);
                 }
               })
              .catch(() => {
                refreshingRef.current = false;
                clearAuth();
                router.push("/login");
              });
          }
        }, delay);
      }
    },
     [clearAuth, router, setUser, setRoleCookie]
  );

  useEffect(() => {
    scheduleRefreshRef.current = scheduleRefreshImpl;
  }, [scheduleRefreshImpl]);

  const scheduleRefresh = (expiresInSeconds: number) => {
    scheduleRefreshRef.current(expiresInSeconds);
  };

  const refreshUser = useCallback(async () => {
    try {
      const response = await api.get("/auth/profile");
      if (mountedRef.current) {
        const userData = response.data.data;
        setUser(userData);
        setRoleCookie(userData.role);
      }
    } catch {
      if (mountedRef.current) {
        clearAuth();
      }
    }
  }, [clearAuth, setRoleCookie]);

  useEffect(() => {
    mountedRef.current = true;

    async function load() {
      await refreshUser();
      if (mountedRef.current) {
        setIsLoaded(true);
      }
    }

    load();

    return () => {
      mountedRef.current = false;
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [refreshUser]);

  useEffect(() => {
    function handleForceLogout() {
      clearAuth();
      router.push("/login");
    }

    window.addEventListener(LOGIN_EVENT, handleForceLogout);
    return () => window.removeEventListener(LOGIN_EVENT, handleForceLogout);
  }, [clearAuth, router]);

  const login = async (email: string, password: string, rememberMe = false) => {
    const response = await api.post("/auth/login", {
      email,
      password,
      remember: rememberMe,
    });
    const { user: userData, expires_in } = response.data.data;
    setUser(userData);
    setRoleCookie(userData.role);

    if (expires_in) {
      scheduleRefresh(expires_in);
    }

    router.push("/dashboard");
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      clearAuth();
      router.push("/login");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: !isLoaded,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function forceLogout() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(LOGIN_EVENT));
  }
}
