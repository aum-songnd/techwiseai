// lib/api.ts
import type { Product, Category, Brand } from "../app/data/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "https://techwiseai-production.up.railway.app/api/v1";

// ---------- Shape thật của API (theo response thực tế đã kiểm tra) ----------
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

// ---------- Helper gọi API + giải nén envelope { success, data } ----------
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

// Một số danh sách (categories, brands) có thể được backend trả về dưới
// dạng mảng thuần HOẶC dưới dạng object phân trang { items: [...] } giống
// /products. Nếu chỉ giả định là mảng thuần và thực tế backend trả object
// phân trang, `data.map` sẽ ném lỗi (hoặc bị catch và fallback về rỗng),
// khiến sidebar danh mục/thương hiệu hiển thị trống hoặc sai. Hàm này
// chuẩn hoá cả 2 trường hợp về một mảng duy nhất.
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

// ---------- Hàm map dữ liệu API -> type mà frontend đang dùng ----------
function mapCategory(raw: ApiCategoryRaw): Category {
  return {
    id: raw.id,
    slug: raw.slug,
    title: raw.name,
    imageUrl: raw.imageUrl,
  } as Category;
}

function mapProduct(raw: ApiProductRaw): Product {
  const originalPrice = raw.originalPrice ?? raw.price;
  const discount = Math.max(0, originalPrice - raw.price);

  // API chưa gắn brand cho sản phẩm -> để undefined, UI tự ẩn phần liên quan brand
  let status: "new" | "hot" | "sale" | undefined;
  if (raw.hot) status = "hot";
  else if (raw.onSale) status = "sale";
  else if (raw.featured) status = "new";

  return {
    id: raw.id,
    slug: raw.slug,
    name: raw.name,
    price: originalPrice,
    discount,
    images: raw.thumbnailUrl ? [raw.thumbnailUrl] : [],
    categoryIds: raw.category ? [raw.category.id] : [],
    categories: raw.category ? [raw.category.name] : [],
    brandId: undefined,
    stock: raw.stockQuantity ?? 0,
    status,
    isFeatured: !!raw.featured,
  } as unknown as Product;
}

// ---------- PRODUCTS ----------
export interface GetProductsParams {
  page?: number;
  size?: number;
  /** Slug danh mục, dùng để lọc server-side qua query param `category`. */
  category?: string;
  /** Slug thương hiệu, dùng để lọc server-side qua query param `brand`. */
  brand?: string;
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

export async function getProducts(
  params: GetProductsParams = {}
): Promise<Product[]> {
  const { page = 0, size = 20, category, brand } = params;
  const query = new URLSearchParams({
    page: String(page),
    size: String(size),
    ...(category ? { category } : {}),
    ...(brand ? { brand } : {}),
  }).toString();

  const data = await fetchEnvelope<ApiPaginated<ApiProductRaw>>(
    `/products?${query}`,
    { next: { revalidate: 60 } }
  );
  return normalizeList(data).map(mapProduct);
}

// Bản đầy đủ, trả kèm thông tin phân trang (dùng khi cần hiển thị/điều khiển trang)
export async function getProductsPaginated(
  params: GetProductsParams = {}
): Promise<GetProductsResult> {
  const { page = 0, size = 20, category, brand } = params;
  const query = new URLSearchParams({
    page: String(page),
    size: String(size),
    ...(category ? { category } : {}),
    ...(brand ? { brand } : {}),
  }).toString();

  const data = await fetchEnvelope<ApiPaginated<ApiProductRaw>>(
    `/products?${query}`,
    { next: { revalidate: 60 } }
  );

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

export async function getProductBySlug(slug: string): Promise<Product> {
  const raw = await fetchEnvelope<ApiProductRaw>(`/products/${slug}`, {
    next: { revalidate: 60 },
  });
  return mapProduct(raw);
}

// ---------- CATEGORIES ----------
export async function getCategories(): Promise<Category[]> {
  const data = await fetchEnvelope<ApiCategoryRaw[] | ApiPaginated<ApiCategoryRaw>>(
    "/categories",
    { next: { revalidate: 300 } }
  );
  return normalizeList(data).map(mapCategory);
}

// ---------- BRANDS ----------
// Ghi chú: khi kiểm tra thực tế, backend chưa có brand gắn trên sản phẩm,
// và /brands có thể chưa tồn tại (404) hoặc trả rỗng. Hàm này tự bọc
// try/catch để luôn trả về mảng rỗng khi lỗi, không phụ thuộc nơi gọi
// phải tự xử lý — tránh crash trang khi backend chưa có endpoint này.
export async function getBrands(): Promise<Brand[]> {
  try {
    const data = await fetchEnvelope<
      ApiCategoryRaw[] | ApiPaginated<ApiCategoryRaw>
    >("/brands", { next: { revalidate: 300 } });

    return normalizeList(data).map((b) => ({
      id: b.id,
      slug: b.slug,
      title: b.name,
    })) as Brand[];
  } catch {
    return [];
  }
}

// ---------- CART ----------
export interface AddToCartPayload {
  productId: string;
  quantity: number;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface CartResponse {
  id: string;
  items: CartItem[];
  total: number;
}

export async function addToCart(
  payload: AddToCartPayload
): Promise<CartResponse> {
  return fetchEnvelope<CartResponse>("/cart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
}

export async function getProductById(id: string): Promise<Product> {
  const raw = await fetchEnvelope<ApiProductRaw>(`/products/${id}`, {
    next: { revalidate: 60 },
  });
  return mapProduct(raw);
}