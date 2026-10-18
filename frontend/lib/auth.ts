import { broadcastTabEvent } from "./tab-sync";

const TOKEN_KEY = "access_token";
const USER_KEY = "auth_user";
const EXPIRES_KEY = "auth_expires_at";

export const SESSION_DURATION_MS = 60 * 60* 1000;

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

export interface SavedProfile {
  username: string;
  fullName?: string;
  phoneNumber?: string;
  email?: string;
}

export function saveUserProfile(profile: SavedProfile) {
  if (typeof window === "undefined" || !profile?.username) return;
  try {
    const key = `user_profile_${profile.username.trim().toLowerCase()}`;
    localStorage.setItem(key, JSON.stringify(profile));
    const allRaw = localStorage.getItem("all_user_profiles");
    const all = allRaw ? JSON.parse(allRaw) : {};
    all[profile.username.trim().toLowerCase()] = {
      ...all[profile.username.trim().toLowerCase()],
      ...profile,
    };
    localStorage.setItem("all_user_profiles", JSON.stringify(all));
  } catch {}
}

export function getSavedUserProfile(username?: string): SavedProfile | null {
  if (typeof window === "undefined" || !username) return null;
  try {
    const key = `user_profile_${username.trim().toLowerCase()}`;
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
    const allRaw = localStorage.getItem("all_user_profiles");
    if (allRaw) {
      const all = JSON.parse(allRaw);
      if (all[username.trim().toLowerCase()]) {
        return all[username.trim().toLowerCase()];
      }
    }
    return null;
  } catch {
    return null;
  }
}

function extractErrorMessage(body: ApiWrapper<unknown> | ApiErrorResponse, fallback = "Yêu cầu thất bại"): string {
  const errors = (body as ApiWrapper<unknown>).errors;

  if (errors && typeof errors === "object") {
    const detailMessages = Object.values(errors)
      .filter((v): v is string => typeof v === "string" && v.length > 0);

    if (detailMessages.length > 0) {
      return detailMessages.join(" ");
    }
  }

  return (body as ApiErrorResponse).message || fallback;
}

function normalizeLoginResponse(raw: unknown): AuthResponse {
  const wrapper = raw as ApiWrapper<LoginData>;
  const authData = wrapper.data || (raw as LoginData);

  const token =
    authData.token || authData.accessToken || authData.access_token;
  let user: User = authData.user || (authData as unknown as User);

  if (!token) {
    throw new Error(
      "Không tìm thấy token trong response đăng nhập — kiểm tra lại field name thực tế từ API"
    );
  }

  // Restore & enrich phoneNumber, fullName, email from response or local profile
  if (user?.username) {
    const authRecord = authData as Record<string, unknown>;
    const userRecord = (user as unknown) as Record<string, unknown>;
    const saved = getSavedUserProfile(user.username);

    const resolvedFullName =
      (typeof user.fullName === "string" && user.fullName) ||
      (typeof authRecord.fullName === "string" && authRecord.fullName) ||
      saved?.fullName;

    const resolvedPhone =
      (typeof user.phoneNumber === "string" && user.phoneNumber) ||
      (typeof userRecord.phone === "string" && (userRecord.phone as string)) ||
      (typeof authRecord.phoneNumber === "string" && (authRecord.phoneNumber as string)) ||
      (typeof authRecord.phone === "string" && (authRecord.phone as string)) ||
      saved?.phoneNumber;

    const resolvedEmail =
      (typeof user.email === "string" && user.email) ||
      (typeof authRecord.email === "string" && authRecord.email) ||
      saved?.email;

    user = {
      ...user,
      fullName: resolvedFullName,
      phoneNumber: resolvedPhone,
      phone: resolvedPhone,
      email: resolvedEmail,
    };

    if (resolvedPhone || resolvedFullName || resolvedEmail) {
      saveUserProfile({
        username: user.username,
        fullName: resolvedFullName,
        phoneNumber: resolvedPhone,
        email: resolvedEmail,
      });
    }
  }

  return { token, user };
}

export function getSessionExpiry(): number | null {
  if (typeof window === "undefined") return null;
  if (!localStorage.getItem(TOKEN_KEY)) return null;

  const raw = localStorage.getItem(EXPIRES_KEY);
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isFinite(parsed)) return parsed;

  const expiresAt = Date.now() + SESSION_DURATION_MS;
  localStorage.setItem(EXPIRES_KEY, String(expiresAt));
  return expiresAt;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;

  const expiresAt = getSessionExpiry();
  if (expiresAt !== null && Date.now() >= expiresAt) return null;

  return token;
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);

  localStorage.setItem(EXPIRES_KEY, String(Date.now() + SESSION_DURATION_MS));

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("auth:login"));
  }
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EXPIRES_KEY);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("auth:logout"));
    broadcastTabEvent({ type: "AUTH_LOGOUT" });
  }
}

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

export function isAdminUser(user: User | null = getStoredUser()): boolean {
  const authorities = user?.authorities ?? [];
  return authorities.includes("ADMIN") || authorities.includes("ROLE_ADMIN");
}

export async function loginRequest(username: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const body: ApiWrapper<LoginData> = await res.json().catch(() => ({}));

  if (!res.ok || body.success === false) {
    throw new Error(extractErrorMessage(body, "Đăng nhập thất bại"));
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
  saveUserProfile({
    username: payload.username,
    fullName: payload.fullName,
    phoneNumber: payload.phoneNumber,
    email: payload.email,
  });

  const res = await fetch(`/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body: ApiWrapper<User> = await res.json().catch(() => ({}));

  if (!res.ok || body.success === false) {
    throw new Error(extractErrorMessage(body, "Đăng ký thất bại"));
  }

  if (!body.data) {
    throw new Error("Response đăng ký không hợp lệ");
  }

  const user = body.data;
  saveUserProfile({
    username: user.username || payload.username,
    fullName: user.fullName || payload.fullName,
    phoneNumber: user.phoneNumber || payload.phoneNumber,
    email: user.email || payload.email,
  });

  return user;
}

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
    throw new Error(extractErrorMessage(body, "Không lấy được thông tin người dùng"));
  }

  const user = body.data || (body as unknown as User);

  if (!user || !user.username) {
    throw new Error("Response /me không hợp lệ");
  }

  return user;
}

export interface ForgotPasswordResponseData {
  email: string;
  message: string;
  devOtp?: string;
}

export async function changePasswordRequest(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const token = getToken();
  if (!token) {
    throw new Error("Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn");
  }

  const res = await fetch(`/api/auth/change-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  const body: ApiWrapper<null> = await res.json().catch(() => ({}));

  if (!res.ok || body.success === false) {
    throw new Error(extractErrorMessage(body, "Đổi mật khẩu thất bại"));
  }
}

export async function forgotPasswordRequest(
  email: string
): Promise<ForgotPasswordResponseData> {
  const res = await fetch(`/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  const body: ApiWrapper<ForgotPasswordResponseData> = await res
    .json()
    .catch(() => ({}));

  if (!res.ok || body.success === false) {
    throw new Error(
      extractErrorMessage(body, "Yêu cầu mã khôi phục mật khẩu thất bại")
    );
  }

  return (
    body.data || {
      email,
      message: body.message || "Đã gửi mã xác thực khôi phục mật khẩu",
    }
  );
}

export async function resetPasswordRequest(payload: {
  email: string;
  otp: string;
  newPassword: string;
}): Promise<void> {
  const res = await fetch(`/api/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body: ApiWrapper<null> = await res.json().catch(() => ({}));

  if (!res.ok || body.success === false) {
    throw new Error(extractErrorMessage(body, "Đặt lại mật khẩu thất bại"));
  }
}