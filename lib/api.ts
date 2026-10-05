
import type { Product, Category, Brand } from "../app/data/types";
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

interface ApiCategoryRaw {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  displayOrder?: number;
}

interface ApiProductRaw {
  id: string;
  name: string;
  slug: string;
  sku?: string;

  brand?: string;
  shortDescription?: string;
  description?: string;
  thumbnailUrl?: string;
  category?: ApiCategoryRaw;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  stockQuantity: number;
  ratingAverage?: number;
  reviewCount?: number;
  featured?: boolean;
  hot?: boolean;
  onSale?: boolean;
  inStock?: boolean;
}

interface ApiPaginated<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

async function fetchEnvelope<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, init);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API lỗi (${res.status}) tại ${path}: ${text || res.statusText}`);
  }

  const json = (await res.json()) as ApiEnvelope<T>;

  if (json.success === false) {
    throw new Error(json.message || `API báo lỗi tại ${path}`);
  }

  return json.data;
}

async function fetchEnvelopeAuthed<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const token = getToken();
  if (!token) {
    throw new Error("Chưa đăng nhập");
  }

  return fetchEnvelope<T>(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });
}

function normalizeList<T>(
  data: T[] | ApiPaginated<T> | null | undefined
): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray((data as ApiPaginated<T>).items)) {
    return (data as ApiPaginated<T>).items;
  }
  return [];
}

function mapCategory(raw: ApiCategoryRaw): Category {
  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.name,
    description: raw.description,
    imageUrl: raw.imageUrl,

    displayOrder: raw.displayOrder,

    featured: false,
  };
}

function mapProduct(raw: ApiProductRaw): Product {

  const price = raw.originalPrice ?? raw.price;
  const discount = Math.max(0, price - raw.price);
  const finalPrice = raw.price;

  let status: "new" | "hot" | "sale" | undefined;
  if (raw.hot) status = "hot";
  else if (raw.onSale) status = "sale";
  else if (raw.featured) status = "new";

  return {
    id: raw.id,
    slug: raw.slug,
    name: raw.name,
    price,
    discount,
    finalPrice,
    images: raw.thumbnailUrl ? [raw.thumbnailUrl] : [],

    categories: raw.category ? [raw.category.name] : [],

    brand: raw.brand,
    stock: raw.stockQuantity ?? 0,
    status,
    isFeatured: !!raw.featured,

    description: raw.description ?? raw.shortDescription,
  };
}

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
  category?: string
): Promise<Product[]> {
  const query = new URLSearchParams({
    page: "0",
    size: "2000",
    ...(category ? { category } : {}),
  }).toString();

  const data = await fetchEnvelope<ApiPaginated<ApiProductRaw>>(
    `/products?${query}`,
    { next: { revalidate: 60 } }
  );
  return normalizeList(data).map(mapProduct);
}

export async function searchProducts(
  keyword: string,
  signal?: AbortSignal
): Promise<Product[]> {
  const query = new URLSearchParams({
    keyword
  }).toString();

  const data = await fetchEnvelope<ApiPaginated<ApiProductRaw>>(
    `/products/search?${query}`,
    { cache: "no-store", signal }
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

interface ApiFavoriteRaw {
  id: string;
  createdAt: string;
  product: ApiProductRaw;
}

interface ApiFavoriteCreatedRaw {
  id: string;
  createdAt: string;
  product?: ApiProductRaw;
}

export async function getFavorites(): Promise<Product[]> {
  const data = await fetchEnvelopeAuthed<ApiFavoriteRaw[]>("/favorites", {
    cache: "no-store",
  });

  const list = normalizeList(data);
  return list
    .filter((f) => !!f.product)
    .map((f) => mapProduct(f.product));
}

export async function addFavorite(productId: string): Promise<void> {
  await fetchEnvelopeAuthed<ApiFavoriteCreatedRaw>("/favorites", {
    method: "POST",
    body: JSON.stringify({ productId }),
  });
}

export async function removeFavorite(productId: string): Promise<void> {
  await fetchEnvelopeAuthed<null>(`/favorites/${productId}`, {
    method: "DELETE",
  });
}

export async function removeAllFavorites(): Promise<void> {
  await fetchEnvelopeAuthed<null>("/favorites", {
    method: "DELETE",
  });
}

export async function checkFavorite(productId: string): Promise<boolean> {
  const data = await fetchEnvelopeAuthed<{ isFavorite: boolean }>(
    `/favorites/check?productId=${encodeURIComponent(productId)}`
  );
  return data.isFavorite;
}