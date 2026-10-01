// lib/admin-orders-api.ts
//
// ĐÃ ĐỔI giống orders-api.ts: gọi THẲNG backend (không qua proxy "/api")
// vì app chưa có route handler /api/admin/orders -> trước đó bị Next.js
// tự trả 404. Dùng getToken() từ lib/auth như api.ts; token này phải
// thuộc tài khoản có ROLE_ADMIN, nếu không backend trả 403.

import { getToken } from "./auth";
import { normalizeStatusHistory } from "./orders-api";
import type {
  OrderData,
  OrderItem,
  OrderStatus,
  OrderStatusHistoryEntry,
  PaymentMethod,
  PaymentStatus,
} from "./orders-api";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "https://techwiseai-backend.up.railway.app/api/v1";

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
  orderCode?: string;
  status: OrderStatus;
  customerId?: string;
  customerName?: string;
  username?: string;
  totalAmount: number;
  totalItems: number;
  paymentMethod?: PaymentMethod;
  createdAt: string;
}

// Shape thật của GET /admin/orders/{id} (đã đối chiếu response thực tế):
// có orderCode, userId, username, subtotal, discountAmount, shippingFee,
// totalQuantity, updatedAt; KHÔNG có paymentMethod / paymentStatus.
export interface AdminOrderDetail {
  id: string;
  orderCode?: string;
  status: OrderStatus;
  userId?: string;
  username?: string;
  customerId?: string;
  customerName?: string;
  subtotal?: number;
  discountAmount?: number;
  shippingFee?: number;
  totalQuantity?: number;
  updatedAt?: string;
  recipientName: string;
  recipientPhone: string;
  shippingAddress: string;
  // Endpoint /payments/orders/{id} chỉ dành cho chủ đơn (admin bị 404), nên
  // thông tin thanh toán phải nằm ngay trong response /admin/orders/{id}.
  // Các field dưới đây là tuỳ chọn vì BE có thể chưa trả đủ.
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  transactionNo?: string;
  paidAt?: string;
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

  const result = await fetchAdminOrderEnvelope<PagedAdminOrders>(
    `/admin/orders?${query}`
  );
  // BE có thể trả danh sách ở "items" (DTO tuỳ biến) hoặc "content" (Page của
  // Spring). Giữ nguyên cấu trúc gốc, chỉ bổ sung customerName từ username.
  const raw = result as unknown as Record<string, unknown>;
  const withCustomer = (list: unknown) =>
    (list as AdminOrderListItem[]).map((o) => ({
      ...o,
      customerName: o.customerName ?? o.username,
    }));

  if (Array.isArray(raw.items)) {
    return { ...result, items: withCustomer(raw.items) };
  }
  if (Array.isArray(raw.content)) {
    return {
      ...(raw as object),
      content: withCustomer(raw.content),
    } as unknown as PagedAdminOrders;
  }
  return result;
}

const METHOD_KEYS = [
  "paymentMethod",
  "paymentMethodCode",
  "paymentMethodName",
  "paymentType",
  "payment_method",
  "method",
];

function pickValue(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    const v = obj[key];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

// Đưa thông tin thanh toán về các field phẳng paymentMethod / paymentStatus /
// transactionNo / paidAt, dù BE trả phẳng hay lồng trong "payment",
// "paymentInfo", "payments[0]".
function normalizeAdminOrder(order: AdminOrderDetail): AdminOrderDetail {
  const rec = (order ?? {}) as unknown as Record<string, unknown>;

  const nestedRaw =
    pickValue(rec, ["payment", "paymentInfo", "paymentDetail"]) ??
    (Array.isArray(rec.payments) ? rec.payments[0] : undefined);
  const nested =
    nestedRaw && typeof nestedRaw === "object"
      ? (nestedRaw as Record<string, unknown>)
      : {};

  let method = pickValue(rec, METHOD_KEYS) ?? pickValue(nested, [...METHOD_KEYS, "code", "name"]);
  if (method && typeof method === "object") {
    method = pickValue(method as Record<string, unknown>, ["code", "name", "method"]);
  }

  const status =
    pickValue(rec, ["paymentStatus"]) ?? pickValue(nested, ["paymentStatus", "status"]);
  const transactionNo =
    pickValue(rec, ["transactionNo"]) ?? pickValue(nested, ["transactionNo"]);
  const paidAt = pickValue(rec, ["paidAt"]) ?? pickValue(nested, ["paidAt"]);

  const paymentMethod =
    typeof method === "string" ? (method.trim().toUpperCase() as PaymentMethod) : undefined;

  if (!paymentMethod) {
    // eslint-disable-next-line no-console
    console.warn(
      "[admin-orders-api] /admin/orders/{id} không có phương thức thanh toán. Các field BE trả:",
      Object.keys(rec)
    );
  }

  return {
    ...order,
    customerName: order.customerName ?? order.username,
    paymentMethod,
    paymentStatus: typeof status === "string" ? (status as PaymentStatus) : undefined,
    transactionNo: typeof transactionNo === "string" ? transactionNo : undefined,
    paidAt: typeof paidAt === "string" ? paidAt : undefined,
  };
}

export async function getAdminOrderById(
  orderId: string
): Promise<AdminOrderDetail> {
  const order = await fetchAdminOrderEnvelope<AdminOrderDetail>(
    `/admin/orders/${orderId}`
  );
  return normalizeAdminOrder({
    ...order,
    statusHistory: normalizeStatusHistory(order.statusHistory),
  });
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
  const order = await fetchAdminOrderEnvelope<AdminOrderDetail>(
    `/admin/orders/${orderId}/status`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  return normalizeAdminOrder({
    ...order,
    statusHistory: normalizeStatusHistory(order.statusHistory),
  });
}