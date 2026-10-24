import { cachedRequest } from "./cache";
import type { Product, Category, Brand, ProductVariant } from "@/app/data/types";
import { getToken } from "@/lib/auth";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "https://techwiseai-prod.up.railway.app/api/v1";

export interface ApiEnvelope<T> {
  success: boolean;
  status: number;
  code: string;
  message: string;
  data: T;
  errors?: Record<string, unknown>;
  timestamp?: string;
  path?: string;
}

export interface ApiImageSearchResultRaw {
  rank: number;
  productId: string;
  sku?: string;
  name: string;
  brand?: string;
  price: number;
  originalPrice?: number | null;
  thumbnailUrl?: string;
  shortDescription?: string;
  ratingAverage?: number;
  reviewCount?: number;
  stockQuantity: number;
  category?: ApiCategoryRaw;
  imageCount: number;
  imageWeight: number;
  textWeight: number;
  imageSimilarity: number;
  textSimilarity: number;
  similarity: number;
}

export interface ApiImageSearchDataRaw {
  queryFileName: string;
  topK: number;
  resultCount: number;
  processingTimeMs: number;
  results: ApiImageSearchResultRaw[];
}

export interface ApiCategoryRaw {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  displayOrder?: number;
}

export interface ApiProductRaw {
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
  active?: boolean;
  specifications?: unknown;
  images?: Array<{ imageUrl?: string }>;
}

export interface ApiPaginated<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export function getApiErrorMessage(
  status: number,
  response?: Partial<ApiEnvelope<unknown>>,
): string {
  if (
    status === 503 ||
    response?.code === "AI_SERVICE_UNAVAILABLE"
  ) {
    return "Dịch vụ tìm kiếm hình ảnh tạm thời không khả dụng.";
  }

  if (
    status === 504 ||
    response?.code === "AI_SERVICE_TIMEOUT"
  ) {
    return "Hệ thống xử lý quá lâu, vui lòng thử lại.";
  }

  if (status >= 500) {
    return "Hệ thống xảy ra lỗi, vui lòng thử lại.";
  }

  return response?.message || "Yêu cầu không thể thực hiện.";
}

export async function fetchEnvelopeUncached<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, init);
  } catch {
    throw new Error(
      "Không thể kết nối đến hệ thống, vui lòng thử lại.",
    );
  }

  const body = (await response
    .json()
    .catch(() => null)) as ApiEnvelope<T> | null;

  if (!response.ok) {
    throw new Error(
      getApiErrorMessage(
        response.status,
        body ?? undefined,
      ),
    );
  }

  if (!body) {
    throw new Error(
      "Phản hồi từ hệ thống không hợp lệ.",
    );
  }

  if (body.success === false) {
    throw new Error(
      getApiErrorMessage(body.status, body),
    );
  }

  return body.data;
}

export async function fetchEnvelope<T>(path: string, init?: RequestInit): Promise<T> {
  const isCatalog =
    /^\/(products|categories|brands)(?:\/|\?|$)/.test(path) &&
    !path.startsWith("/products/search");
  const isGet = (init?.method ?? "GET").toUpperCase() === "GET";

  if (isCatalog && isGet && !init?.signal) {
    const isNoStore = init?.cache === "no-store";
    const ttl = isNoStore ? 3000 : 45000;
    return cachedRequest("catalog:" + path, ttl, () =>
      fetchEnvelopeUncached<T>(path, init)
    );
  }

  return fetchEnvelopeUncached<T>(path, init);
}

export async function fetchEnvelopeAuthed<T>(
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

export function normalizeList<T>(
  data: T[] | ApiPaginated<T> | null | undefined
): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray((data as ApiPaginated<T>).items)) {
    return (data as ApiPaginated<T>).items;
  }
  return [];
}

export function mapCategory(raw: ApiCategoryRaw): Category {
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

const isScalar = (v: unknown): v is string | number | boolean =>
  typeof v === "string" || typeof v === "number" || typeof v === "boolean";

export function flattenSpecs(input: unknown): Record<string, string> {
  const out: Record<string, string> = {};

  const walk = (node: unknown): void => {
    if (node == null) return;

    if (Array.isArray(node)) {
      for (const el of node) {
        if (el && typeof el === "object" && !Array.isArray(el)) {
          const obj = el as Record<string, unknown>;
          const name = [obj.name, obj.label, obj.key].find(
            (n): n is string => typeof n === "string" && n.trim() !== ""
          );
          if (name && isScalar(obj.value)) {
            out[name] = String(obj.value);
            continue;
          }
        }
        walk(el);
      }
      return;
    }

    if (typeof node === "object") {
      for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
        if (isScalar(value)) {
          const text = String(value).trim();
          if (text) out[key] = text;
        } else if (Array.isArray(value) && value.every(isScalar)) {
          out[key] = value.map(String).join(", ");
        } else {
          walk(value);
        }
      }
    }
  };

  if (typeof input === "string") {
    const text = input.trim();
    if (!text) return out;
    try {
      walk(JSON.parse(text));
    } catch {
      out["Thông số"] = text;
    }
    return out;
  }

  walk(input);
  return out;
}

export function extractKeySpecs(
  name: string,
  specs: Record<string, string> = {},
  description?: string
): Record<string, string> {
  const result: Record<string, string> = { ...specs };
  const text = `${name} ${description ?? ""}`.trim();

  // CPU
  if (!result["CPU"] && !result["Loại CPU"]) {
    const cpuMatch = text.match(
      /\b(Intel\s+Core\s+(?:Ultra\s+)?[iI][3579][-\s]?\w*|\b[iI][3579][-\s]\d{4,5}\w*|Ryzen\s+[3579][-\s]?\w*|Apple\s+M[1234](?:\s+(?:Pro|Max|Ultra))?|M[1234](?:\s+(?:Pro|Max|Ultra))?\b|Snapdragon\s+[\w\s]+|Dimensity\s+\d+|A\d{2}\s+(?:Pro\s+Max|Pro|Bionic)?)\b/i
    );
    if (cpuMatch) {
      result["CPU"] = cpuMatch[1].trim();
    }
  }

  // RAM
  if (!result["RAM"] && !result["Dung lượng RAM"]) {
    const ramMatch = text.match(
      /\b(4|6|8|12|16|18|24|32|36|48|64)\s*GB\b(?!\s*SSD|\s*ROM|\s*bộ nhớ)/i
    );
    if (ramMatch) {
      result["RAM"] = `${ramMatch[1].toUpperCase()}GB`;
    }
  }

  // SSD / Ổ cứng / Bộ nhớ trong
  if (!result["Ổ cứng"] && !result["SSD"] && !result["Bộ nhớ trong"]) {
    const ssdMatch = text.match(
      /\b(128|256|512)\s*GB(?:\s*SSD|\s*ROM)?|\b(1|2)\s*TB(?:\s*SSD)?/i
    );
    if (ssdMatch) {
      result["Ổ cứng"] = ssdMatch[0].trim();
    }
  }

  // GPU
  if (!result["VGA"] && !result["Loại card đồ họa"] && !result["Card đồ họa"]) {
    const gpuMatch = text.match(
      /\b(RTX\s*\d{3,4}(?:\s*Ti)?|GTX\s*\d{3,4}(?:\s*Ti)?|Intel\s+Iris\s+Xe|Intel\s+Graphics|Radeon\s+Graphics|Apple\s+GPU)\b/i
    );
    if (gpuMatch) {
      result["VGA"] = gpuMatch[1].trim();
    }
  }

  // Màn hình
  if (!result["Màn hình"] && !result["Kích thước màn hình"]) {
    const screenMatch = text.match(
      /(\d{1,2}(?:\.\d+)?)\s*(?:inch|inches|["”]|(?=\s*(?:FHD|FullHD|OLED|Retina|IPS)))/i
    );
    if (screenMatch) {
      result["Màn hình"] = `${screenMatch[1]}"`;
    }
  }

  return result;
}

export function mapProduct(raw: ApiProductRaw): Product {
  const price = raw.originalPrice ?? raw.price;
  const discount = Math.max(0, price - raw.price);
  const finalPrice = raw.price;

  let status: "new" | "hot" | "sale" | undefined;
  if (raw.hot) status = "hot";
  else if (raw.onSale) status = "sale";
  else if (raw.featured) status = "new";

  let variant: ProductVariant | undefined;
  const cat = `${raw.category?.slug ?? ""} ${raw.category?.name ?? ""}`.toLowerCase();
  const name = (raw.name ?? "").toLowerCase();
  if (cat.includes("laptop") || name.includes("laptop") || name.includes("macbook") || name.includes("surface")) {
    variant = "laptop";
  } else if (cat.includes("dien-thoai") || cat.includes("phone") || name.includes("iphone") || name.includes("galaxy") || name.includes("xiaomi")) {
    variant = "phone";
  } else if (cat.includes("tai-nghe") || cat.includes("earphone") || cat.includes("headphone") || name.includes("airpods")) {
    variant = "earphone";
  } else {
    variant = "others";
  }

  // Resolve images (deduplicate and prefer high-res /x/ images over 200x thumbnails)
  const images: string[] = [];
  if (Array.isArray(raw.images) && raw.images.length > 0) {
    for (const img of raw.images) {
      if (img?.imageUrl) {
        const fullUrl = img.imageUrl.replace(/\/200x\//, "/x/");
        if (!images.includes(fullUrl)) {
          images.push(fullUrl);
        }
      }
    }
  }
  if (images.length === 0 && raw.thumbnailUrl) {
    images.push(raw.thumbnailUrl.replace(/\/200x\//, "/x/"));
  }

  const flattened = flattenSpecs(raw.specifications);
  const specifications = extractKeySpecs(raw.name, flattened, raw.description ?? raw.shortDescription);

  return {
    id: raw.id,
    slug: raw.slug,
    name: raw.name,
    sku: raw.sku,
    categoryId: raw.category?.id,
    price,
    originalPrice: raw.originalPrice ?? raw.price,
    discount,
    finalPrice,
    images: images.length > 0 ? images : (raw.thumbnailUrl ? [raw.thumbnailUrl] : []),
    thumbnailUrl: raw.thumbnailUrl || images[0] || "",
    categories: raw.category ? [raw.category.name] : [],
    brand: raw.brand,
    stock: raw.stockQuantity ?? 0,
    status,
    variant,
    isFeatured: !!raw.featured,
    active: raw.active ?? true,
    ratingAverage: raw.ratingAverage ?? 0,
    reviewCount: raw.reviewCount ?? 0,
    description: raw.description ?? raw.shortDescription,
    shortDescription: raw.shortDescription,
    specifications,
  };
}
