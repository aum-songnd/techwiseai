

import { getToken } from "./auth";
import { normalizeStatusHistory } from "./orders-api";
import type {
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

export interface AdminPaymentInfo {
  id: string;
  orderId: string;
  paymentMethod?: PaymentMethod;
  status?: PaymentStatus;
  amount?: number;
  currency?: string;
  transactionCode?: string | null;
  providerTransactionId?: string | null;
  paymentUrl?: string | null;
  failureReason?: string | null;
  paidAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export async function getAdminPaymentByOrderId(
  orderId: string
): Promise<AdminPaymentInfo> {
  return fetchAdminOrderEnvelope<AdminPaymentInfo>(
    `/admin/payments/orders/${orderId}`
  );
}

export interface UpdateOrderStatusPayload {
  status: OrderStatus;
  note?: string;
}

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