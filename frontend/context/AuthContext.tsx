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
  updateProfileRequest,
  fetchCurrentUser,
  type UpdateProfilePayload,
} from "@/lib/auth";

import { broadcastTabEvent, subscribeTabSync } from "@/lib/auth/tab-sync";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isSignedIn: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  updateUser: (payload: UpdateProfilePayload) => Promise<User>;
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
        avatarUrl: storedUser.avatarUrl || saved?.avatarUrl,
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

  const refreshUserFromServer = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    try {
      const serverUser = await fetchCurrentUser(token);
      if (!serverUser || !serverUser.username) return;

      setUser((currentUser) => {
        if (!currentUser) return serverUser;

        const currentPhone =
          currentUser.phoneNumber || (currentUser.phone as string);
        const serverPhone =
          serverUser.phoneNumber || (serverUser.phone as string);

        const hasChanges =
          serverUser.fullName !== currentUser.fullName ||
          serverUser.email !== currentUser.email ||
          serverPhone !== currentPhone ||
          serverUser.avatarUrl !== currentUser.avatarUrl;

        if (hasChanges) {
          const mergedUser: User = {
            ...currentUser,
            ...serverUser,
            phoneNumber: serverPhone,
            phone: serverPhone,
          };
          setStoredUser(mergedUser);
          saveUserProfile({
            username: mergedUser.username,
            fullName: mergedUser.fullName,
            phoneNumber: mergedUser.phoneNumber,
            email: mergedUser.email,
            avatarUrl: mergedUser.avatarUrl,
          });
          return mergedUser;
        }

        return currentUser;
      });
    } catch {
      // Ignore background refresh errors
    }
  }, []);

  const logout = useCallback(() => {
    clearToken();
    clearStoredUser();
    setUser(null);
    broadcastTabEvent({ type: "AUTH_LOGOUT" });
  }, []);

  useEffect(() => {
    // 1. Initial read from localStorage + background refresh from server
    syncUserFromStorage();
    refreshUserFromServer();

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
      } else if (event.type === "USER_STATUS_CHANGED") {
        const stored = getStoredUser();
        if (
          stored &&
          (stored.id === event.payload?.id ||
            stored.username?.toLowerCase() === (event.payload?.username || "").toLowerCase())
        ) {
          if (event.payload?.active === false) {
            clearToken();
            clearStoredUser();
            setUser(null);
            setIsLoading(false);
            if (typeof window !== "undefined") {
              window.dispatchEvent(new Event("auth:logout"));
              alert("Tài khoản của bạn đã bị khóa bởi Quản trị viên.");
              window.location.href = "/sign-in";
            }
          }
        }
      }
    });

    // 3. Fallback listener for localStorage changes across duplicate tabs
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "access_token" || e.key === "auth_user") {
        syncUserFromStorage();
        refreshUserFromServer();
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

    // 4. Tab refocus & visibility change with 10s throttle
    let lastRefreshTime = 0;
    const throttledRefresh = () => {
      const now = Date.now();
      if (now - lastRefreshTime > 10000) {
        lastRefreshTime = now;
        refreshUserFromServer();
      }
    };

    const handleFocus = () => {
      syncUserFromStorage();
      throttledRefresh();
    };
    window.addEventListener("focus", handleFocus);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        syncUserFromStorage();
        throttledRefresh();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      unsubscribeSync();
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [syncUserFromStorage, refreshUserFromServer]);

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
      fullName: saved?.fullName || loggedUser.fullName,
      phoneNumber: saved?.phoneNumber || loggedUser.phoneNumber,
      email: saved?.email || loggedUser.email,
      avatarUrl: saved?.avatarUrl || loggedUser.avatarUrl,
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

  const updateUser = useCallback(async (payload: UpdateProfilePayload) => {
    const updated = await updateProfileRequest(payload);
    setUser(updated);
    return updated;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isSignedIn: !!user,
        login,
        register,
        updateUser,
        logout,
      }}
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