"use client";

import React, {
  createContext,
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

  // Khôi phục session khi app khởi động — không gọi API,
  // chỉ đọc lại token + user đã lưu từ lần login trước.
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    const storedUser = getStoredUser();
    if (storedUser) {
      setUser(storedUser);
    } else {
      // Có token nhưng không có user lưu kèm (dữ liệu cũ/thiếu) -> coi như hết hạn
      clearToken();
      setUser(null);
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    const { token, user } = await loginRequest(username, password);
    // LƯU Ý THỨ TỰ: setStoredUser phải chạy TRƯỚC setToken, vì setToken
    // bắn ra event "auth:login" ngay lập tức — nếu user chưa kịp lưu vào
    // localStorage, các listener của event này (vd Header đọc
    // isAdminUser()) sẽ đọc phải dữ liệu cũ/rỗng và hiển thị sai cho tới
    // khi F5 lại trang.
    setStoredUser(user);
    setToken(token);
    setUser(user);
  };

  // API /auth/register chỉ tạo tài khoản, không trả token, nên không
  // tự đăng nhập ở đây. Trang sign-up cần tự điều hướng sang /sign-in.
  const register = async (payload: RegisterPayload) => {
    await registerRequest(payload);
  };

  const logout = () => {
    clearToken();
    clearStoredUser();
    setUser(null);
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