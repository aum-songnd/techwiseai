// lib/admin-api.ts
//
// Các hàm gọi API ADMIN (tạo/sửa/xóa category, product) — gọi THẲNG ra
// backend từ client kèm Bearer token (đã xác nhận không bị CORS).
// Khác với lib/api.ts (chạy ở server/RSC, chỉ đọc, không cần token) và
// lib/cart-api.ts (đi qua proxy nội bộ /api/cart) — file này chạy ở
// CLIENT và tự gắn Authorization header lấy từ lib/auth.ts.
//
// LƯU Ý: tên field trong payload request (CategoryPayload, ProductPayload)
// được SUY RA từ field response (ApiCategoryRaw, ApiProductRaw trong
// lib/api.ts) vì chưa có doc chính thức cho body request. Nếu backend trả
// lỗi 400 "field X is required/invalid" khi test thực tế, chỉnh lại tên
// field tương ứng ở đây — chỉ cần sửa 1 chỗ này, không phải sửa UI.

import { getToken } from "./auth";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "https://techwiseai-production.up.railway.app/api/v1";

interface ApiEnvelope<T> {
  success: boolean;
  status: number;
  code: string;
  message: string;
  data: T;
  errors?: Record<string, unknown>;
  timestamp?: string;
  path?: string;
}

export class AdminAuthRequiredError extends Error {
  constructor() {
    super("Cần đăng nhập với tài khoản ADMIN để thực hiện thao tác này");
    this.name = "AdminAuthRequiredError";
  }
}

function extractErrorMessage(
  body: Partial<ApiEnvelope<unknown>>,
  fallback: string
): string {
  const errors = body.errors;
  if (errors && typeof errors === "object") {
    const detailMessages = Object.values(errors).filter(
      (v): v is string => typeof v === "string" && v.length > 0
    );
    if (detailMessages.length > 0) return detailMessages.join(" ");
  }
  return body.message || fallback;
}

async function fetchAdminEnvelope<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const token = getToken();
  if (!token) {
    throw new AdminAuthRequiredError();
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

  // Response DELETE có thể không trả body -> bọc try/catch, coi {} là hợp lệ
  const body = (await res.json().catch(() => ({}))) as Partial<
    ApiEnvelope<T>
  >;

  if (!res.ok || body.success === false) {
    throw new Error(
      extractErrorMessage(body, `API admin lỗi (${res.status}) tại ${path}`)
    );
  }

  return body.data as T;
}

// ---------- CATEGORIES ----------
export interface CategoryPayload {
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  displayOrder?: number;
  active?: boolean;
}

export async function adminCreateCategory(payload: CategoryPayload) {
  return fetchAdminEnvelope("/admin/categories", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function adminUpdateCategory(
  id: string,
  payload: CategoryPayload
) {
  return fetchAdminEnvelope(`/admin/categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

// ---------- PRODUCTS ----------
export interface ProductPayload {
  name: string;
  slug: string;
  sku: string;
  // LƯU Ý: GET /products (lib/api.ts) không trả categoryId, chỉ trả tên
  // category -> khi sửa sản phẩm, không thể tự chọn sẵn category trong
  // dropdown, người dùng phải tự chọn lại mỗi lần sửa.
  categoryId: string;
  brand?: string;
  shortDescription?: string;
  description?: string;
  thumbnailUrl?: string;
  price: number;
  originalPrice?: number;
  stockQuantity: number;
  featured?: boolean;
  hot?: boolean;
  onSale?: boolean;
  active?: boolean;
}

export async function adminCreateProduct(payload: ProductPayload) {
  return fetchAdminEnvelope("/admin/products", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function adminUpdateProduct(
  id: string,
  payload: ProductPayload
) {
  return fetchAdminEnvelope(`/admin/products/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

// Xóa mềm: backend set active=false, giữ lại dữ liệu cho lịch sử đơn hàng
export async function adminDeleteProduct(id: string) {
  return fetchAdminEnvelope(`/admin/products/${id}`, {
    method: "DELETE",
  });
}