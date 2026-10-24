import {
  fetchEnvelope,
  normalizeList,
  mapProduct,
  type ApiProductRaw,
  type ApiPaginated,
  type ApiImageSearchDataRaw,
} from "../core";
import type { Product } from "@/app/data/types";

export interface RecommendedProduct {
  product: Product;
  badge: "BEST" | "HOT" | "CHOICE" | null;
  reason: string | null;
  keySpecs: Record<string, string>;
  score: number;
}

interface ApiRecommendedRaw {
  product: ApiProductRaw;
  badge: "BEST" | "HOT" | "CHOICE" | null;
  reason: string | null;
  keySpecs: Record<string, string> | null;
  score: number;
}

export async function searchProducts(
  keyword: string,
  signal?: AbortSignal
): Promise<Product[]> {
  const query = new URLSearchParams({
    keyword,
  }).toString();

  const data = await fetchEnvelope<ApiPaginated<ApiProductRaw>>(
    `/products/search?${query}`,
    { cache: "no-store", signal }
  );
  return normalizeList(data).map(mapProduct);
}

export async function searchProductsByImage(
  file: File,
  topK = 10
): Promise<Product[]> {
  const formData = new FormData();
  formData.append("file", file);

  const query = new URLSearchParams({
    topK: String(topK),
  }).toString();

  const data = await fetchEnvelope<ApiImageSearchDataRaw>(
    `/products/search-by-image?${query}`,
    {
      method: "POST",
      body: formData,
      cache: "no-store",
    }
  );

  return data.results.map((result) =>
    mapProduct({
      id: result.productId,
      slug: result.productId,
      sku: result.sku,
      name: result.name,
      brand: result.brand,
      price: result.price,
      originalPrice: result.originalPrice ?? undefined,
      thumbnailUrl: result.thumbnailUrl,
      shortDescription: result.shortDescription,
      stockQuantity: result.stockQuantity,
      ratingAverage: result.ratingAverage,
      reviewCount: result.reviewCount,
      category: result.category,
      inStock: result.stockQuantity > 0,
    })
  );
}

export async function getProductRecommendations(productId: string, limit = 8): Promise<Product[]> {
  const safeLimit = Math.max(1, Math.min(limit, 20));

  const rawProducts = await fetchEnvelope<ApiProductRaw[]>(
    `/products/${encodeURIComponent(productId)}/recommendations?limit=${safeLimit}`, {
    next: { revalidate: 60 }
  });

  return rawProducts.map(mapProduct);
}

export async function getAiRecommendations(
  productId: string,
  limit = 8
): Promise<RecommendedProduct[]> {
  const safeLimit = Math.max(1, Math.min(limit, 12));

  const raw = await fetchEnvelope<ApiRecommendedRaw[]>(
    `/products/${encodeURIComponent(productId)}/recommendations/ai?limit=${safeLimit}`,
    { next: { revalidate: 60 } }
  );

  return (raw ?? []).map((r) => ({
    product: mapProduct(r.product),
    badge: r.badge ?? null,
    reason: r.reason ?? null,
    keySpecs: r.keySpecs ?? {},
    score: r.score,
  }));
}
