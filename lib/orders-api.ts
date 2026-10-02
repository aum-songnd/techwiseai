

import { getToken } from "./auth";

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

function normalizePagedOrders<TRaw, TMapped>(
  raw: unknown,
  mapItem: (item: TRaw) => TMapped
): { items: TMapped[]; page: number; size: number; totalElements: number; totalPages: number } {
  const data = (raw ?? {}) as Record<string, unknown>;

  const rawItems: TRaw[] = Array.isArray(data.items)
    ? (data.items as TRaw[])
    : Array.isArray(data.content)
    ? (data.content as TRaw[])
    : Array.isArray(raw)
    ? (raw as TRaw[])
    : [];

  return {
    items: rawItems.map(mapItem),
    page: (data.page as number) ?? (data.number as number) ?? 0,
    size: (data.size as number) ?? rawItems.length,
    totalElements:
      (data.totalElements as number) ?? rawItems.length,
    totalPages: (data.totalPages as number) ?? 1,
  };
}

export type PaymentMethod = "COD" | "VNPAY" | "MOMO";

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPING"
  | "DELIVERED"
  | "CANCELLED"
  | "RETURNED";

export interface OrderStatusHistoryEntry {
  status: OrderStatus;
  note?: string;
  changedAt: string;
}

export function normalizeStatusHistory(raw: unknown): OrderStatusHistoryEntry[] {
  if (!Array.isArray(raw)) return [];

  const pick = (obj: Record<string, unknown>, keys: string[]) => {
    for (const key of keys) {
      const value = obj[key];
      if (value !== undefined && value !== null && value !== "") return value;
    }
    return undefined;
  };

  return raw.map((item) => {
    const entry = (item ?? {}) as Record<string, unknown>;

    const status = pick(entry, [
      "status",
      "newStatus",
      "toStatus",
      "orderStatus",
      "currentStatus",
      "statusTo",
    ]) as OrderStatus | undefined;

    const changedAt = pick(entry, [
      "changedAt",
      "createdAt",
      "updatedAt",
      "changedTime",
      "timestamp",
      "time",
      "date",
    ]) as string | undefined;

    const note = pick(entry, ["note", "comment", "reason", "description"]) as
      | string
      | undefined;

    return {
      status: (status ?? "PENDING") as OrderStatus,
      changedAt: changedAt ?? "",
      note,
    };
  });
}

function withHistory<T extends { statusHistory?: unknown }>(order: T): T {
  if (!order || order.statusHistory === undefined) return order;
  return { ...order, statusHistory: normalizeStatusHistory(order.statusHistory) };
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
  productSku?: string;

  productThumbnailUrl?: string;
  thumbnailUrl?: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface OrderData {
  id: string;
  orderCode?: string;
  userId?: string;
  username?: string;
  status: OrderStatus;
  recipientName: string;
  recipientPhone: string;
  shippingAddress: string;
  paymentMethod?: PaymentMethod;
  note?: string | null;
  items: OrderItem[];
  subtotal?: number;
  discountAmount?: number;
  shippingFee?: number;
  totalQuantity?: number;
  totalAmount: number;
  createdAt: string;
  updatedAt?: string;

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
  const order = await fetchOrderEnvelope<OrderData>("/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return withHistory(order);
}

export async function getOrders(page = 0, size = 10): Promise<PagedOrders> {
  const query = new URLSearchParams({
    page: String(page),
    size: String(size),
  }).toString();
  const raw = await fetchOrderEnvelope<unknown>(`/orders?${query}`);
  const result = normalizePagedOrders<OrderListItem, OrderListItem>(
    raw,
    (item) => item
  );

  return result;
}

export async function getOrderById(orderId: string): Promise<OrderData> {
  const order = await fetchOrderEnvelope<OrderData>(`/orders/${orderId}`);
  return withHistory(order);
}

export async function cancelOrder(
  orderId: string,
  reason?: string
): Promise<OrderData> {
  const trimmed = reason?.trim();
  const order = await fetchOrderEnvelope<OrderData>(
    `/orders/${orderId}/cancel`,
    trimmed
      ? {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: trimmed, note: trimmed }),
        }
      : { method: "PATCH" }
  );
  return withHistory(order);
}

export interface CreatePaymentPayload {
  orderId: string;
  paymentMethod: PaymentMethod;
}

export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "CANCELLED";

export interface PaymentData {
  paymentId: string;
  orderId: string;
  paymentMethod: PaymentMethod;

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