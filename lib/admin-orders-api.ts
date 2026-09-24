// lib/admin-orders-api.ts
//
// ĐÃ ĐỔI giống orders-api.ts: gọi THẲNG backend (không qua proxy "/api")
// vì app chưa có route handler /api/admin/orders -> trước đó bị Next.js
// tự trả 404. Dùng getToken() từ lib/auth như api.ts; token này phải
// thuộc tài khoản có ROLE_ADMIN, nếu không backend trả 403.

import { getToken } from "./auth";
import type {
  OrderData,
  OrderItem,
  OrderStatus,
  OrderStatusHistoryEntry,
  PaymentMethod,
} from "./orders-api";

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

export class OrderAuthRequiredError extends Error {
  constructor() {
    super("Cần đăng nhập bằng tài khoản quản trị để thực hiện thao tác này");
    this.name = "OrderAuthRequiredError";
  }
}

function requireAuthHeaders(extra?: HeadersInit): HeadersInit {
  const token = getToken();
  if (!token) {
    throw new OrderAuthRequiredError();
  }
  return {
    ...(extra || {}),
    Authorization: `Bearer ${token}`,
  };
}

async function fetchAdminOrderEnvelope<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const headers = requireAuthHeaders(init?.headers);

  const res = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store",
    ...init,
    headers,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `API quản trị đơn hàng lỗi (${res.status}) tại ${path}: ${
        text || res.statusText
      }`
    );
  }

  const json = (await res.json()) as ApiEnvelope<T>;

  if (json.success === false) {
    throw new Error(
      json.message || `API quản trị đơn hàng báo lỗi tại ${path}`
    );
  }

  return json.data;
}

// ---------- ADMIN ORDERS ----------

// Đơn hàng nhìn từ phía admin — cùng shape với OrderData khách hàng nhưng
// kèm thêm thông tin chủ đơn (khách hàng nào đặt). Field customer* chưa
// được xác nhận thực tế, cần đối chiếu response thật khi tích hợp.
export interface AdminOrderListItem {
  id: string;
  status: OrderStatus;
  customerId?: string;
  customerName?: string;
  totalAmount: number;
  totalItems: number;
  paymentMethod: PaymentMethod;
  createdAt: string;
}

export interface AdminOrderDetail {
  id: string;
  status: OrderStatus;
  customerId?: string;
  customerName?: string;
  recipientName: string;
  recipientPhone: string;
  shippingAddress: string;
  paymentMethod: PaymentMethod;
  note?: string;
  items: OrderItem[];
  totalAmount: number;
  createdAt: string;
  statusHistory: OrderStatusHistoryEntry[];
}

export interface PagedAdminOrders {
  items: AdminOrderListItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface GetAdminOrdersParams {
  page?: number;
  size?: number;
  /** Lọc theo trạng thái, vd "PENDING" — chỉ áp dụng nếu controller đã khai báo tham số này. */
  status?: OrderStatus;
}

export async function getAdminOrders(
  params: GetAdminOrdersParams = {}
): Promise<PagedAdminOrders> {
  const { page = 0, size = 10, status } = params;
  const query = new URLSearchParams({
    page: String(page),
    size: String(size),
    ...(status ? { status } : {}),
  }).toString();

  return fetchAdminOrderEnvelope<PagedAdminOrders>(`/admin/orders?${query}`);
}

export async function getAdminOrderById(
  orderId: string
): Promise<AdminOrderDetail> {
  return fetchAdminOrderEnvelope<AdminOrderDetail>(`/admin/orders/${orderId}`);
}

export interface UpdateOrderStatusPayload {
  status: OrderStatus;
  note?: string;
}

// LƯU Ý (theo đúng cảnh báo trong đặc tả mục 8): nếu AdminOrderController
// thực tế dùng các endpoint riêng theo hành động (vd PATCH .../confirm,
// .../processing, .../shipping, .../delivered) thay vì một endpoint
// .../status dùng chung, thì cần đổi lại hàm này — hoặc tách thành nhiều
// hàm updateStatusToConfirmed/…/updateStatusToDelivered gọi đúng
// @PatchMapping thực tế của backend.
export async function updateOrderStatus(
  orderId: string,
  payload: UpdateOrderStatusPayload
): Promise<AdminOrderDetail> {
  return fetchAdminOrderEnvelope<AdminOrderDetail>(
    `/admin/orders/${orderId}/status`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
}