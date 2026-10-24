import {
  fetchEnvelope,
  normalizeList,
  mapProduct,
  mapCategory,
  flattenSpecs,
  type ApiProductRaw,
  type ApiCategoryRaw,
  type ApiPaginated,
} from "../core";
import type { Category, Product, Brand } from "@/app/data/types";

export interface GetProductsParams {
  page?: number;
  size?: number;
  category?: string;
  brand?: string;
  noStore?: boolean;
}

export interface GetProductsResult {
  items: Product[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

function buildProductsQuery(params: GetProductsParams): string {
  const { page = 0, size = 20, category, brand } = params;
  return new URLSearchParams({
    page: String(page),
    size: String(size),
    ...(category ? { category } : {}),
    ...(brand ? { brand } : {}),
  }).toString();
}

async function fetchProductsPage(
  params: GetProductsParams
): Promise<ApiPaginated<ApiProductRaw>> {
  const query = buildProductsQuery(params);
  const data = await fetchEnvelope<ApiPaginated<ApiProductRaw>>(
    `/products?${query}`,
    params.noStore ? { cache: "no-store" } : { next: { revalidate: 60 } }
  );
  return data;
}

export async function getProducts(
  params: GetProductsParams = {}
): Promise<Product[]> {
  const data = await fetchProductsPage(params);
  return normalizeList(data).map(mapProduct);
}

export async function getProductsPaginated(
  params: GetProductsParams = {}
): Promise<GetProductsResult> {
  const data = await fetchProductsPage(params);

  return {
    items: normalizeList(data).map(mapProduct),
    page: data.page,
    size: data.size,
    totalElements: data.totalElements,
    totalPages: data.totalPages,
    first: data.first,
    last: data.last,
  };
}

export async function getAllProductsByCategory(
  category?: string,
  noStore = true
): Promise<Product[]> {
  const query = new URLSearchParams({
    page: "0",
    size: "2000",
    ...(category ? { category } : {}),
  }).toString();

  const data = await fetchEnvelope<ApiPaginated<ApiProductRaw>>(
    `/products?${query}`,
    noStore ? { cache: "no-store" } : { next: { revalidate: 60 } }
  );
  return normalizeList(data).map(mapProduct);
}

export async function getProductBySlug(slug: string): Promise<Product> {
  const raw = await fetchEnvelope<ApiProductRaw>(`/products/${slug}`, {
    next: { revalidate: 60 },
  });
  return mapProduct(raw);
}

export async function getCategories(
  options: { noStore?: boolean } = {}
): Promise<Category[]> {
  const data = await fetchEnvelope<ApiCategoryRaw[] | ApiPaginated<ApiCategoryRaw>>(
    "/categories",
    options.noStore ? { cache: "no-store" } : { next: { revalidate: 300 } }
  );
  return normalizeList(data).map(mapCategory);
}

export async function getBrands(): Promise<Brand[]> {
  try {
    const data = await fetchEnvelope<
      ApiCategoryRaw[] | ApiPaginated<ApiCategoryRaw>
    >("/brands", { next: { revalidate: 300 } });

    return normalizeList(data).map((b) => ({
      id: b.id,
      slug: b.slug,
      title: b.name,
    }));
  } catch {
    return [];
  }
}

export async function getProductById(id: string): Promise<Product> {
  const raw = await fetchEnvelope<ApiProductRaw>(`/products/${id}`, {
    next: { revalidate: 60 },
  });
  return mapProduct(raw);
}

export async function getProductSpecs(id: string): Promise<Record<string, string>> {
  const raw = await fetchEnvelope<ApiProductRaw & { specifications?: unknown }>(
    `/products/${id}`,
    { next: { revalidate: 60 } }
  );
  return flattenSpecs(raw.specifications);
}
