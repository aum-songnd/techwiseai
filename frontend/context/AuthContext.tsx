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
  saveUserProfile,
  getSavedUserProfile,
} from "@/lib/auth";

import { broadcastTabEvent, subscribeTabSync } from "@/lib/tab-sync";

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

  const syncUserFromStorage = useCallback(() => {
    const token = getToken();
    if (!token) {
      setUser((prev) => (prev ? null : prev));
      setIsLoading(false);
      return;
    }

    const storedUser = getStoredUser();
    if (storedUser) {
      const saved = getSavedUserProfile(storedUser.username);
      const fullUser: User = {
        ...storedUser,
        fullName: storedUser.fullName || saved?.fullName,
        phoneNumber: storedUser.phoneNumber || saved?.phoneNumber,
        email: storedUser.email || saved?.email,
      };
      if (!storedUser.phoneNumber && saved?.phoneNumber) {
        setStoredUser(fullUser);
      }
      setUser(fullUser);
    } else {
      setUser((prev) => (prev ? null : prev));
    }
    setIsLoading(false);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    clearStoredUser();
    setUser(null);
    broadcastTabEvent({ type: "AUTH_LOGOUT" });
  }, []);

  useEffect(() => {
    // 1. Initial read from localStorage
    syncUserFromStorage();

    // 2. Real-time cross-tab synchronization via BroadcastChannel
    const unsubscribeSync = subscribeTabSync((event) => {
      if (event.type === "AUTH_LOGIN") {
        setUser(event.payload.user);
        setIsLoading(false);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("auth:login"));
        }
      } else if (event.type === "AUTH_LOGOUT") {
        setUser(null);
        setIsLoading(false);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("auth:logout"));
        }
      }
    });

    // 3. Fallback listener for localStorage changes across duplicate tabs
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "access_token" || e.key === "auth_user") {
        syncUserFromStorage();
        if (typeof window !== "undefined") {
          if (e.newValue) {
            window.dispatchEvent(new Event("auth:login"));
          } else {
            window.dispatchEvent(new Event("auth:logout"));
          }
        }
      }
    };
    window.addEventListener("storage", handleStorage);

    // 4. Tab refocus check to verify session freshness
    const handleFocus = () => {
      syncUserFromStorage();
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      unsubscribeSync();
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleFocus);
    };
  }, [syncUserFromStorage]);

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
    const { token, user: loggedUser } = await loginRequest(username, password);
    const saved = getSavedUserProfile(username);
    const fullUser: User = {
      ...loggedUser,
      fullName: loggedUser.fullName || saved?.fullName,
      phoneNumber: loggedUser.phoneNumber || saved?.phoneNumber,
      email: loggedUser.email || saved?.email,
    };

    setStoredUser(fullUser);
    setToken(token);
    setUser(fullUser);
    broadcastTabEvent({
      type: "AUTH_LOGIN",
      payload: { user: fullUser, token },
    });
  };

  const register = async (payload: RegisterPayload) => {
    saveUserProfile({
      username: payload.username,
      fullName: payload.fullName,
      phoneNumber: payload.phoneNumber,
      email: payload.email,
    });
    const registeredUser = await registerRequest(payload);
    saveUserProfile({
      username: registeredUser.username || payload.username,
      fullName: registeredUser.fullName || payload.fullName,
      phoneNumber: registeredUser.phoneNumber || payload.phoneNumber,
      email: registeredUser.email || payload.email,
    });
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