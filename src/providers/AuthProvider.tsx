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

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; same-site=lax`;
}

function removeCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

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

  const refreshUser = useCallback(async () => {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        setUser(null);
        return;
      }
      const response = await api.get("/auth/profile");
      if (mountedRef.current) {
        setUser(response.data.data);
      }
    } catch {
      localStorage.removeItem("auth_token");
      removeCookie("auth_token");
      if (mountedRef.current) {
        setUser(null);
      }
    }
  }, []);

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
    };
  }, [refreshUser]);

  const login = async (email: string, password: string, rememberMe = false) => {
    const response = await api.post("/auth/login", {
      email,
      password,
      remember: rememberMe,
    });
    const { token, user: userData } = response.data.data;
    localStorage.setItem("auth_token", token);
    setCookie("auth_token", token, rememberMe ? 30 : 1);
    setUser(userData);
    router.push("/dashboard");
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      localStorage.removeItem("auth_token");
      removeCookie("auth_token");
      setUser(null);
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
