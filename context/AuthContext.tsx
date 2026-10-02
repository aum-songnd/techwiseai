"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  User,
  RegisterPayload,
  getToken,
  setToken,
  clearToken,
  getStoredUser,
  setStoredUser,
  clearStoredUser,
  getSessionExpiry,
  loginRequest,
  registerRequest,
} from "@/lib/auth";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isSignedIn: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    clearToken();
    clearStoredUser();
    setUser(null);
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {

      clearToken();
      clearStoredUser();
      setIsLoading(false);
      return;
    }

    const storedUser = getStoredUser();
    if (storedUser) {
      setUser(storedUser);
    } else {
      clearToken();
      setUser(null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;

    let timer: ReturnType<typeof setTimeout> | undefined;

    const expireNow = () => {
      logout();
      window.location.href = "/sign-in?expired=1";
    };

    const schedule = () => {
      if (timer) clearTimeout(timer);
      const expiresAt = getSessionExpiry();
      if (expiresAt === null) return;

      const remaining = expiresAt - Date.now();
      if (remaining <= 0) {
        expireNow();
      } else {
        timer = setTimeout(expireNow, remaining);
      }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") schedule();
    };

    schedule();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user, logout]);

  const login = async (username: string, password: string) => {
    const { token, user } = await loginRequest(username, password);

    setStoredUser(user);
    setToken(token);
    setUser(user);
  };

  const register = async (payload: RegisterPayload) => {
    await registerRequest(payload);
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isSignedIn: !!user, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth phải được dùng bên trong <AuthProvider>");
  return ctx;
}