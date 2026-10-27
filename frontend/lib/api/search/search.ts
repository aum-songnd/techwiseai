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
  badge: "BEST" | "HOT" | "CHOICE" | "FOR_YOU" | null;
  reason: string | null;
  keySpecs: Record<string, string>;
  score: number;
}

interface ApiRecommendedRaw {
  product: ApiProductRaw;
  badge: "BEST" | "HOT" | "CHOICE" | "FOR_YOU" | null;
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
