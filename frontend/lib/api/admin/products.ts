import { getProductsPaginated } from "../catalog";
import { mapProduct } from "../core";
import { getToken } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config/api";
import type { Category, Product } from "@/app/data/types";

const FETCH_SIZE = 2000;
const MAX_PAGES = 100;

export const normalizeAdminText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();

const HIDDEN_PRODUCTS_KEY = "admin_hidden_products_map";

export function getHiddenProductsMap(): Record<string, Product> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(HIDDEN_PRODUCTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveHiddenProduct(product: Product) {
  if (typeof window === "undefined" || !product?.id) return;
  try {
    const map = getHiddenProductsMap();
    map[product.id] = { ...product, active: false };
    localStorage.setItem(HIDDEN_PRODUCTS_KEY, JSON.stringify(map));
  } catch {}
}

export function removeHiddenProduct(productId: string) {
  if (typeof window === "undefined" || !productId) return;
  try {
    const map = getHiddenProductsMap();
    delete map[productId];
    localStorage.setItem(HIDDEN_PRODUCTS_KEY, JSON.stringify(map));
  } catch {}
}

export const fetchAllAdminProducts = async (): Promise<Product[]> => {
  const token = getToken();

  if (token) {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/products?size=2000`, {
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const body = await res.json();
        if (body.success && Array.isArray(body.data?.items)) {
          return body.data.items.map(mapProduct);
        }
      }
    } catch {
      // Fallback to client endpoint below
    }
  }

  const products: Product[] = [];
  const seenIds = new Set<string>();

  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await getProductsPaginated({
      size: FETCH_SIZE,
      page,
      noStore: true,
    });

    for (const product of result.items) {
      if (seenIds.has(product.id)) continue;
      seenIds.add(product.id);
      products.push(product);
    }

    if (page + 1 >= result.totalPages || result.items.length === 0) break;
  }

  // Fallback: nếu Backend chưa có GET /admin/products và chỉ trả về sản phẩm active từ /products,
  // khôi phục các sản phẩm đã bị ẩn từ cache cục bộ để hiển thị đầy đủ trong tab Đã ẩn / Ngưng bán
  const hiddenMap = getHiddenProductsMap();
  for (const product of products) {
    if (hiddenMap[product.id]) {
      product.active = false;
    }
  }
  for (const [id, hiddenProd] of Object.entries(hiddenMap)) {
    if (!seenIds.has(id)) {
      products.push({ ...hiddenProd, active: false });
    }
  }

  return products;
};

export const countProductsByCategory = (
  products: Product[],
  categories: Category[]
): Record<string, number> => {
  const counts: Record<string, number> = Object.fromEntries(
    categories.map((category) => [category.id, 0])
  );
  const categoryIdsByName = new Map(
    categories.map((category) => [normalizeAdminText(category.title), category.id])
  );

  for (const product of products) {
    const matchedCategoryIds = new Set(
      (product.categories ?? [])
        .map(normalizeAdminText)
        .map((name) => categoryIdsByName.get(name))
        .filter((id): id is string => Boolean(id))
    );

    for (const categoryId of matchedCategoryIds) {
      counts[categoryId] += 1;
    }
  }

  return counts;
};