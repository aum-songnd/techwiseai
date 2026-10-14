

import { getToken } from "./auth";

export const USE_MOCK_USERS = true;

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "https://techwiseai-backend.up.railway.app/api/v1";

export type AdminUser = {
  id: string;
  username: string;
  email?: string;
  fullName?: string;
  phoneNumber?: string;
  authorities?: string[];

  active?: boolean;
  createdAt?: string;
};

export type AdminUsersPage = {
  items: AdminUser[];
  total: number;
  totalPages: number;
};

type GetAdminUsersParams = {
  page?: number;
  size?: number;
  keyword?: string;
};

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
  errors?: Record<string, unknown>;
}

async function fetchAdminEnvelope<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const token = getToken();
  if (!token) {
    throw new Error("Cần đăng nhập với tài khoản ADMIN để thực hiện thao tác này");
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  const body = (await res.json().catch(() => ({}))) as Partial<ApiEnvelope<T>>;

  if (!res.ok || body.success === false) {
    const details =
      body.errors && typeof body.errors === "object"
        ? Object.values(body.errors).filter(
            (v): v is string => typeof v === "string" && v.length > 0
          )
        : [];
    throw new Error(
      details.join(" ") || body.message || `API admin lỗi (${res.status}) tại ${path}`
    );
  }

  return body.data as T;
}

const MOCK_NAMES = [
  "Nguyễn Văn An", "Trần Thị Bình", "Lê Hoàng Cường", "Phạm Minh Dũng",
  "Hoàng Thị Em", "Vũ Quang Huy", "Đặng Thu Hà", "Bùi Gia Khánh",
  "Đỗ Ngọc Lan", "Ngô Đức Mạnh", "Dương Thị Ngân", "Lý Tuấn Phong",
];

let mockUsers: AdminUser[] = [
  {
    id: "mock-admin",
    username: "admin",
    email: "admin@example.com",
    fullName: "Quản trị viên",
    authorities: ["ROLE_ADMIN"],
    active: true,
    createdAt: "2026-01-01T00:00:00Z",
  },
  ...Array.from({ length: 23 }, (_, i): AdminUser => {
    const n = i + 1;
    const d = new Date(Date.UTC(2026, 0, 10 + n * 6));
    return {
      id: `mock-${n}`,
      username: `user${n}`,
      email: `user${n}@example.com`,
      fullName: MOCK_NAMES[i % MOCK_NAMES.length],
      phoneNumber: `09${String(10000000 + n * 7919).slice(0, 8)}`,
      authorities: ["ROLE_USER"],
      active: n % 7 !== 0,
      createdAt: d.toISOString(),
    };
  }),
];

const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));

async function mockGetUsers({
  page = 0,
  size = 10,
  keyword = "",
}: GetAdminUsersParams): Promise<AdminUsersPage> {
  await delay();
  const kw = keyword.trim().toLowerCase();
  const filtered = kw
    ? mockUsers.filter((u) =>
        [u.username, u.fullName, u.email, u.phoneNumber].some((v) =>
          v?.toLowerCase().includes(kw)
        )
      )
    : mockUsers;
  const total = filtered.length;
  return {
    items: filtered.slice(page * size, page * size + size),
    total,
    totalPages: Math.max(1, Math.ceil(total / size)),
  };
}

async function mockSetActive(id: string, active: boolean) {
  await delay(150);
  mockUsers = mockUsers.map((u) => (u.id === id ? { ...u, active } : u));
}

export async function getAdminUsers(
  params: GetAdminUsersParams = {}
): Promise<AdminUsersPage> {
  if (USE_MOCK_USERS) return mockGetUsers(params);

  const { page = 0, size = 10, keyword = "" } = params;
  const qs = new URLSearchParams({ page: String(page), size: String(size) });
  if (keyword.trim()) qs.set("keyword", keyword.trim());

  const data = await fetchAdminEnvelope<
    AdminUser[] | { items?: AdminUser[]; totalElements?: number; totalPages?: number }
  >(`/admin/users?${qs.toString()}`);

  const items = Array.isArray(data) ? data : data?.items ?? [];
  const total =
    !Array.isArray(data) && typeof data?.totalElements === "number"
      ? data.totalElements
      : items.length;
  const totalPages =
    !Array.isArray(data) && typeof data?.totalPages === "number"
      ? data.totalPages
      : Math.max(1, Math.ceil(total / size));

  return { items, total, totalPages };
}

export async function setAdminUserActive(
  id: string,
  active: boolean
): Promise<void> {
  if (USE_MOCK_USERS) return mockSetActive(id, active);

  await fetchAdminEnvelope<unknown>(`/admin/users/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ active }),
  });
}