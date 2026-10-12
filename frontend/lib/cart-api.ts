// lib/cart-api.ts
const API_BASE_URL = "/api";

const ACCESS_TOKEN_KEY = "access_token";

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
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
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

export async function getCart(): Promise<CartData> {
  return fetchCartEnvelope<CartData>("/cart");
}

export async function addCartItem(
  productId: string,
  quantity: number
): Promise<CartData> {
  const payload: AddCartItemPayload = { productId, quantity };
  return fetchCartEnvelope<CartData>("/cart/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function updateCartItemQuantity(
  itemId: string,
  quantity: number
): Promise<CartData> {
  const payload: UpdateCartItemPayload = { quantity };
  return fetchCartEnvelope<CartData>(`/cart/items/${itemId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function removeCartItem(itemId: string): Promise<void> {
  const headers = requireAuthHeaders();
  await fetch(`${API_BASE_URL}/cart/items/${itemId}`, {
    method: "DELETE",
    cache: "no-store",
    headers,
  });
}

export async function clearCartApi(): Promise<void> {
  const headers = requireAuthHeaders();
  await fetch(`${API_BASE_URL}/cart`, {
    method: "DELETE",
    cache: "no-store",
    headers,
  });
}