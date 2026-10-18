import { getToken } from "./auth";

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

export type GetAdminUsersParams = {
  page?: number;
  size?: number;
  keyword?: string;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "https://techwiseai-prod.up.railway.app/api/v1";

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

export async function getAdminUsers(
  params: GetAdminUsersParams = {}
): Promise<AdminUsersPage> {
  const { page = 0, size = 10, keyword = "" } = params;
  const qs = new URLSearchParams({ page: String(page), size: String(size) });
  if (keyword.trim()) qs.set("keyword", keyword.trim());

  const data = await fetchAdminEnvelope<
    | AdminUser[]
    | {
        content?: AdminUser[];
        items?: AdminUser[];
        totalElements?: number;
        total?: number;
        totalPages?: number;
      }
  >(`/admin/users?${qs.toString()}`);

  let items: AdminUser[] = [];
  let total = 0;
  let totalPages = 1;

  if (Array.isArray(data)) {
    items = data;
    total = data.length;
    totalPages = Math.max(1, Math.ceil(total / size));
  } else if (data && typeof data === "object") {
    if (Array.isArray(data.content)) {
      items = data.content;
    } else if (Array.isArray(data.items)) {
      items = data.items;
    }

    if (typeof data.totalElements === "number") {
      total = data.totalElements;
    } else if (typeof data.total === "number") {
      total = data.total;
    } else {
      total = items.length;
    }

    if (typeof data.totalPages === "number") {
      totalPages = data.totalPages;
    } else {
      totalPages = Math.max(1, Math.ceil(total / size));
    }
  }

  return { items, total, totalPages };
}

export async function setAdminUserActive(
  id: string,
  active: boolean
): Promise<void> {
  await fetchAdminEnvelope<unknown>(`/admin/users/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ active }),
  });
}