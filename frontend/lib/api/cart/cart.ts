import { cachedRequest, clearRequestCache } from "../core";
import { getToken, clearToken, clearStoredUser } from "@/lib/auth";

const API_BASE_URL = "/api";

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

export interface CartItem {
  id: string;
  productId: string;
  sku?: string;
  name: string;
  slug?: string;
  thumbnailUrl?: string;
  unitPrice: number;
  originalPrice?: number;
  quantity: number;
  subtotal: number;
  stockQuantity: number;
  available: boolean;
}

export interface CartData {
  cartId: string;
  items: CartItem[];
  totalItems: number;
  totalQuantity: number;
  totalAmount: number;
  updatedAt: string;
}

interface AddCartItemPayload {
  productId: string;
  quantity: number;
}

interface UpdateCartItemPayload {
  quantity: number;
}

export class CartAuthRequiredError extends Error {
  constructor() {
    super("Cần đăng nhập để sử dụng giỏ hàng");
    this.name = "CartAuthRequiredError";
  }
}

function getAccessToken(): string | null {
  return getToken();
}

function requireAuthHeaders(extra?: HeadersInit): HeadersInit {
  const token = getAccessToken();
  if (!token) {
    throw new CartAuthRequiredError();
  }
  return {
    ...(extra || {}),
    Authorization: `Bearer ${token}`,
  };
}

async function fetchCartEnvelope<T>(
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
    if (res.status === 401) {
      clearToken();
      clearStoredUser();
      throw new CartAuthRequiredError();
    }
    const text = await res.text().catch(() => "");
    throw new Error(
      `API giỏ hàng lỗi (${res.status}) tại ${path}: ${text || res.statusText}`
    );
  }

  const json = (await res.json()) as ApiEnvelope<T>;

  if (json.success === false) {
    throw new Error(json.message || `API giỏ hàng báo lỗi tại ${path}`);
  }

  return json.data;
}

async function ensureCartMutationSucceeded(
  response: Response,
  path: string
): Promise<void> {
  if (response.ok) return;

  if (response.status === 401) {
    clearToken();
    clearStoredUser();
    throw new CartAuthRequiredError();
  }

  const text = await response.text().catch(() => "");
  throw new Error(
    `API giỏ hàng lỗi (${response.status}) tại ${path}: ${text || response.statusText}`
  );
}

// Cache is scoped to the current login token, never shared between accounts.
// Concurrent callers reuse one promise instead of sending duplicate GET requests.

export function invalidateCartCache(): void {
  clearRequestCache("cart:");
}

export async function getCart(): Promise<CartData> {
  const token = getAccessToken();
  if (!token) throw new CartAuthRequiredError();
  return cachedRequest<CartData>(`cart:${token}:GET`, 30_000, () =>
    fetchCartEnvelope<CartData>("/cart")
  );
}

export async function addCartItem(
  productId: string,
  quantity: number
): Promise<CartData> {
  const payload: AddCartItemPayload = { productId, quantity };
  invalidateCartCache();
  const result = await fetchCartEnvelope<CartData>("/cart/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  invalidateCartCache();
  return result;
}

export async function updateCartItemQuantity(
  itemId: string,
  quantity: number
): Promise<CartData> {
  if (!itemId || itemId.startsWith("temp-")) {
    throw new Error(`Không thể cập nhật số lượng cho item tạm thời: ${itemId}`);
  }
  const payload: UpdateCartItemPayload = { quantity };
  invalidateCartCache();
  const result = await fetchCartEnvelope<CartData>(`/cart/items/${itemId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  invalidateCartCache();
  return result;
}

export async function removeCartItem(itemId: string): Promise<void> {
  if (!itemId || itemId.startsWith("temp-")) {
    return;
  }
  invalidateCartCache();
  const headers = requireAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/cart/items/${itemId}`, {
    method: "DELETE",
    cache: "no-store",
    headers,
  });
  await ensureCartMutationSucceeded(response, `/cart/items/${itemId}`);
  invalidateCartCache();
}

export async function clearCartApi(): Promise<void> {
  invalidateCartCache();
  const headers = requireAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/cart`, {
    method: "DELETE",
    cache: "no-store",
    headers,
  });
  await ensureCartMutationSucceeded(response, "/cart");
  invalidateCartCache();
}