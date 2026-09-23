// lib/api.ts
import type { Product, Category, Brand } from "../app/data/types";
import { getToken } from "./auth"; // === ĐỔI Ở ĐÂY === nếu api.ts không nằm cùng thư mục với lib/auth.ts

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
  // API trả brand dưới dạng STRING thuần (vd "Microsoft"), không phải
  // object có id/slug như category. Không có bảng brand riêng gắn theo id.
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

// Giống fetchEnvelope, nhưng tự đính kèm header `Authorization: Bearer <token>`.
// Dùng cho các endpoint bắt buộc đăng nhập (favorites, cart, orders...).
// Nếu chưa có token (chưa đăng nhập / hết hạn), ném lỗi ngay để nơi gọi
// (FavoriteContext) bắt và xử lý thay vì để backend trả 401 khó phân biệt.
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
    // displayOrder không có trong Category type gốc (mock) nhưng API có
    // trả về; gắn thêm để nơi gọi (vd HomeCategories) có thể sort đúng
    // thứ tự backend cấu hình. Field này giờ đã khai báo optional sẵn
    // trong Category type nên không cần ép kiểu nữa.
    displayOrder: raw.displayOrder,
    // Category type yêu cầu field `featured` (bắt buộc), nhưng API
    // /categories không trả field này (chỉ sản phẩm mới có featured).
    // Gán mặc định false để thoả type; không có ý nghĩa nghiệp vụ thật.
    featured: false,
  };
}

function mapProduct(raw: ApiProductRaw): Product {
  // price      = giá GỐC (trước giảm)
  // discount   = số tiền được giảm
  // finalPrice = giá bán thực tế = raw.price (giá API trả về để bán)
  //
  // Trước đây nơi gọi (vd trang chi tiết sản phẩm) phải tự tính lại
  // `product.price - product.discount` mỗi khi cần hiển thị giá bán,
  // rất dễ nhầm vì tên field `price` gây cảm giác đó đã là giá bán.
  // Giờ tính sẵn `finalPrice` ở đây, chỉ một chỗ duy nhất.
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
    // Chỉ có tên category, không có id liên kết riêng để lọc -> dùng
    // thẳng `categories` (tên).
    categories: raw.category ? [raw.category.name] : [],
    // Không có brand entity riêng theo id/slug -> chỉ có `brand` (tên
    // hiển thị, dùng luôn để lọc/so khớp nếu cần). Field này optional
    // trong type nên không cần ép kiểu (as unknown as Product) nữa.
    brand: raw.brand,
    stock: raw.stockQuantity ?? 0,
    status,
    isFeatured: !!raw.featured,
    // description ưu tiên bản đầy đủ, fallback về bản rút gọn nếu thiếu.
    description: raw.description ?? raw.shortDescription,
  };
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

// Backend không có bảng brand riêng gắn theo id/slug cho sản phẩm (chỉ có
// field `brand` dạng string thô trên mỗi product). Vì vậy không thể lọc
// brand đáng tin cậy ở server qua query param `brand`. Hàm này lấy TOÀN
// BỘ sản phẩm của một category (size lớn, 1 lần gọi) để nơi gọi (Shop)
// tự dựng danh sách brand duy nhất và tự lọc/phân trang ở client.
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

// api search
export async function searchProducts(keyword: string): Promise<Product[]> {
  const query = new URLSearchParams({
    keyword
  }).toString();

  const data = await fetchEnvelope<ApiPaginated<ApiProductRaw>>(
    `/products/search?${query}`,
    { cache: "no-store" }
  );
  return normalizeList(data).map(mapProduct);
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

// ---------- FAVORITES (WISHLIST) ----------
// Backend lưu wishlist theo user (bắt buộc đăng nhập), không còn dùng
// localStorage nữa. Xem mục 7 trong đặc tả API.

// LƯU Ý: shape thật của backend KHÁC với tài liệu đặc tả (đã kiểm tra qua
// DevTools). Thực tế mỗi phần tử trả về là bản ghi favorite kèm nguyên object
// `product` đầy đủ (giống hệt ApiProductRaw của /products), KHÔNG phải bản
// rút gọn { productId, productName, price, thumbnailUrl } như spec mô tả.
interface ApiFavoriteRaw {
  id: string; // id của BẢN GHI favorite, không phải id sản phẩm
  createdAt: string;
  product: ApiProductRaw;
}

interface ApiFavoriteCreatedRaw {
  id: string;
  createdAt: string;
  product?: ApiProductRaw;
}

// Vì `product` trả về đã đầy đủ (slug, category, brand, stockQuantity...)
// giống hệt /products, chỉ cần map thẳng bằng mapProduct() có sẵn — KHÔNG
// cần gọi thêm getProductById cho từng sản phẩm (tránh N+1 request và các
// lỗi 500 do gọi nhầm /products/undefined trước đây).
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

// Lưu ý: endpoint xoá dùng productId trên URL (`/favorites/{productId}`),
// KHÔNG phải favoriteId, nên nơi gọi (FavoriteContext) chỉ cần giữ productId.
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

// Không bắt buộc dùng ngay, nhưng hữu ích nếu sau này cần đồng bộ trạng thái
// tim (yêu thích) trên trang chi tiết sản phẩm mà không tải cả danh sách.
export async function checkFavorite(productId: string): Promise<boolean> {
  const data = await fetchEnvelopeAuthed<{ isFavorite: boolean }>(
    `/favorites/check?productId=${encodeURIComponent(productId)}`
  );
  return data.isFavorite;
}