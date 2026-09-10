const TOKEN_KEY = "access_token";

export interface User {
  id?: string;
  username: string;
  email?: string;
  fullName?: string;
  phoneNumber?: string;
  authorities?: string[];
  active?: boolean;
  [key: string]: unknown;
}

export interface AuthResponse {
  token: string;
  user: User;
}

interface ApiWrapper<T> {
  success?: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, unknown>;
  [key: string]: unknown;
}

interface ApiErrorResponse {
  message?: string;
  [key: string]: unknown;
}

interface LoginData {
  token?: string;
  accessToken?: string;
  access_token?: string;
  user?: User;
  [key: string]: unknown;
}

function normalizeLoginResponse(raw: unknown): AuthResponse {
  const wrapper = raw as ApiWrapper<LoginData>;
  const authData = wrapper.data || (raw as LoginData);

  const token =
    authData.token || authData.accessToken || authData.access_token;
  const user: User = authData.user || (authData as unknown as User);

  if (!token) {
    throw new Error(
      "Không tìm thấy token trong response đăng nhập — kiểm tra lại field name thực tế từ API"
    );
  }

  return { token, user };
}

const USER_KEY = "auth_user";

// ---- Token storage ----
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// ---- User info storage (thay cho việc gọi API /me, vì backend chưa có) ----
export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function setStoredUser(user: User) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredUser() {
  localStorage.removeItem(USER_KEY);
}

// ---- API calls (đi qua Next.js API route nội bộ, không còn CORS) ----
export async function loginRequest(username: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const body: ApiWrapper<LoginData> = await res.json().catch(() => ({}));

  if (!res.ok || body.success === false) {
    throw new Error(body.message || "Đăng nhập thất bại");
  }

  return normalizeLoginResponse(body);
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  fullName: string;
  phoneNumber: string;
}

export async function registerRequest(payload: RegisterPayload): Promise<User> {
  const res = await fetch(`/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body: ApiWrapper<User> = await res.json().catch(() => ({}));

  if (!res.ok || body.success === false) {
    const err = body as ApiErrorResponse;
    throw new Error(err.message || "Đăng ký thất bại");
  }

  if (!body.data) {
    throw new Error("Response đăng ký không hợp lệ");
  }

  return body.data;
}

// ---- Lấy thông tin user hiện tại bằng token (dùng để khôi phục session) ----
export async function fetchCurrentUser(token: string): Promise<User> {
  const res = await fetch(`/api/auth/me`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const body: ApiWrapper<User> = await res.json().catch(() => ({}));

  if (!res.ok || body.success === false) {
    const err = body as ApiErrorResponse;
    throw new Error(err.message || "Không lấy được thông tin người dùng");
  }

  const user = body.data || (body as unknown as User);

  if (!user || !user.username) {
    throw new Error("Response /me không hợp lệ");
  }

  return user;
}