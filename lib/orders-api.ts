// lib/orders-api.ts
//
// ĐÃ ĐỔI: ban đầu viết theo convention của cart-api.ts (gọi qua proxy nội
// bộ "/api/..."), nhưng thực tế app KHÔNG có route handler /api/orders,
// /api/payments -> Next.js tự trả 404 (HTML "This page could not be
// found", không phải lỗi từ backend). Vì chưa có proxy cho các route
// này, đổi sang gọi THẲNG backend giống api.ts (dùng getToken() từ
// lib/auth) để không phụ thuộc việc phải viết thêm route handler.
//
// Nếu sau này bạn dựng proxy /api/orders riêng (giống /api/cart), chỉ
// cần đổi lại API_BASE_URL thành "/api" và requireAuthHeaders đọc token
// từ localStorage như cart-api.ts.

import { getToken } from "./auth"; // đổi đường dẫn nếu auth.ts không nằm cùng thư mục lib/

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
    super("Cần đăng nhập để thực hiện thao tác này");
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

async function fetchOrderEnvelope<T>(
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
      `API đơn hàng lỗi (${res.status}) tại ${path}: ${text || res.statusText}`
    );
  }

  const json = (await res.json()) as ApiEnvelope<T>;

  if (json.success === false) {
    throw new Error(json.message || `API đơn hàng báo lỗi tại ${path}`);
  }

  return json.data;
}

// ---------- ORDERS ----------

export type PaymentMethod = "COD" | "VNPAY" | "MOMO";

// Luồng đã kiểm thử: PENDING → CONFIRMED → PROCESSING → SHIPPING → DELIVERED.
// CANCELLED chỉ được chuyển từ các trạng thái còn cho phép hủy (xem đặc tả
// mục 8.1).
export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPING"
  | "DELIVERED"
  | "CANCELLED";

export interface OrderStatusHistoryEntry {
  status: OrderStatus;
  note?: string;
  changedAt: string;
}

export interface CreateOrderPayload {
  recipientName: string;
  recipientPhone: string;
  shippingAddress: string;
  paymentMethod: PaymentMethod;
  note?: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  thumbnailUrl?: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

// LƯU Ý: shape thật của response /orders (POST & GET chi tiết) CHƯA được
// xác nhận qua DevTools như api.ts đã làm với /favorites. Cần kiểm tra
// response thực tế và chỉnh lại field cho khớp trước khi dùng production.
export interface OrderData {
  id: string;
  status: OrderStatus;
  recipientName: string;
  recipientPhone: string;
  shippingAddress: string;
  paymentMethod: PaymentMethod;
  note?: string;
  items: OrderItem[];
  totalAmount: number;
  createdAt: string;
  // Chỉ chắc chắn có khi gọi GET chi tiết đơn (/orders/{orderId}); response
  // của POST /orders có thể không kèm field này.
  statusHistory?: OrderStatusHistoryEntry[];
}

export interface OrderListItem {
  id: string;
  status: OrderStatus;
  totalAmount: number;
  totalItems: number;
  createdAt: string;
}

export interface PagedOrders {
  items: OrderListItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export async function createOrder(
  payload: CreateOrderPayload
): Promise<OrderData> {
  return fetchOrderEnvelope<OrderData>("/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function getOrders(page = 0, size = 10): Promise<PagedOrders> {
  const query = new URLSearchParams({
    page: String(page),
    size: String(size),
  }).toString();
  return fetchOrderEnvelope<PagedOrders>(`/orders?${query}`);
}

export async function getOrderById(orderId: string): Promise<OrderData> {
  return fetchOrderEnvelope<OrderData>(`/orders/${orderId}`);
}

export async function cancelOrder(orderId: string): Promise<OrderData> {
  return fetchOrderEnvelope<OrderData>(`/orders/${orderId}/cancel`, {
    method: "PATCH",
  });
}

// ---------- PAYMENTS ----------

export interface CreatePaymentPayload {
  orderId: string;
  paymentMethod: PaymentMethod;
}

export type PaymentStatus = "PENDING" | "COMPLETED" | "FAILED";

export interface PaymentData {
  paymentId: string;
  orderId: string;
  paymentMethod: PaymentMethod;
  // Chỉ có giá trị với cổng thanh toán online (VNPAY, MOMO). Với COD sẽ
  // không có field này -> nơi gọi coi như thanh toán đã "khởi tạo xong".
  paymentUrl?: string;
  amount: number;
  status: PaymentStatus;
  transactionNo?: string;
  paidAt?: string;
}

export async function createPayment(
  payload: CreatePaymentPayload
): Promise<PaymentData> {
  return fetchOrderEnvelope<PaymentData>("/payments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function getPaymentByOrder(orderId: string): Promise<PaymentData> {
  return fetchOrderEnvelope<PaymentData>(`/payments/orders/${orderId}`);
}