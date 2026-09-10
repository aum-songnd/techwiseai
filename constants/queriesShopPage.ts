// constants/queriesShopPage.ts
//
// Lớp "thích nghi" cho trang Shop: gọi lại các hàm fetch thật trong lib/api.ts,
// đổi tên cho khớp với những gì page.tsx đang import (getAllProducts, getAllBrands...)
// để không phải sửa page.tsx. Toàn bộ logic fetch thật (base URL, xử lý lỗi...)
// chỉ nằm ở lib/api.ts — sửa ở đó là áp dụng cho mọi nơi.

import {
  getProducts,
  getCategories as getCategoriesFromApi,
  getBrands,
} from "@/lib/api";
import type { Product, Category, Brand } from "../app/data/types";

// ---------- Re-export giữ nguyên tên hàm cũ ----------
export const getAllProducts = getProducts;

export const getCategories = getCategoriesFromApi;

export const getAllBrands = async (): Promise<Brand[]> => {
  try {
    return await getBrands();
  } catch (error) {
    // Backend chưa có endpoint /brands -> trả mảng rỗng để UI không crash
    console.warn("[queriesShopPage] /brands chưa sẵn sàng:", error);
    return [];
  }
};

// ---------- Các hàm dẫn xuất, lọc dựa trên dữ liệu đã fetch ----------
export const getFeaturedProducts = async (): Promise<Product[]> => {
  const products = await getAllProducts();
  return products.filter((p) => p.isFeatured);
};

export const getProductsByCategory = async (
  categorySlug: string
): Promise<Product[]> => {
  const [products, categories] = await Promise.all([
    getAllProducts(),
    getCategories(),
  ]);
  const category = categories.find((c) => c.slug === categorySlug);
  if (!category) return [];
  // Product không còn categoryIds — API chỉ trả TÊN category trên mỗi
  // sản phẩm, nên phải so khớp theo tên (title) thay vì id.
  return products.filter((p) => p.categories?.includes(category.title));
};

export const getProductsByBrand = async (
  brandSlug: string
): Promise<Product[]> => {
  const [products, brands] = await Promise.all([
    getAllProducts(),
    getAllBrands(),
  ]);
  const brand = brands.find((b) => b.slug === brandSlug);
  if (!brand) return [];
  // Product không còn brandId — API chỉ trả TÊN brand (string) trên mỗi
  // sản phẩm, nên phải so khớp theo tên (title) thay vì id.
  return products.filter((p) => p.brand === brand.title);
};

// getProductBySlug: lib/api.ts đã có sẵn hàm gọi route /products/:slug riêng,
// re-export thẳng luôn thay vì lọc lại từ getAllProducts (nhanh hơn, ít data hơn).
export { getProductBySlug } from "@/lib/api";