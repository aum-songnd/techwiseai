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

  // Khôi phục session khi app khởi động — không gọi API,
  // chỉ đọc lại token + user đã lưu từ lần login trước.
  useEffect(() => {
    const token = getToken(); // trả về null nếu đã quá 1 tiếng
    if (!token) {
      // Dọn user cũ còn sót lại (vd phiên đã hết hạn lúc đóng tab)
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

  // Tự đăng xuất khi hết hạn phiên (1 tiếng kể từ lúc đăng nhập)
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

    // Máy sleep / tab nền bị throttle thì setTimeout có thể trễ,
    // nên kiểm tra lại mỗi khi người dùng quay lại tab.
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
    // LƯU Ý THỨ TỰ: setStoredUser phải chạy TRƯỚC setToken, vì setToken
    // bắn ra event "auth:login" ngay lập tức — nếu user chưa kịp lưu vào
    // localStorage, các listener của event này (vd Header đọc
    // isAdminUser()) sẽ đọc phải dữ liệu cũ/rỗng và hiển thị sai cho tới
    // khi F5 lại trang.
    setStoredUser(user);
    setToken(token); // setToken cũng ghi mốc hết hạn = now + 1 tiếng
    setUser(user);
  };

  // API /auth/register chỉ tạo tài khoản, không trả token, nên không
  // tự đăng nhập ở đây. Trang sign-up cần tự điều hướng sang /sign-in.
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