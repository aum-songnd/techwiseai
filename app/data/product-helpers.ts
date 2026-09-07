import { products } from "./products";
import { categories } from "./categories";
import { brands } from "./brands";
import { Product } from "./types";

/**
 * Lưu ý: trong products.ts hiện có một vài sản phẩm khác nhau dùng CHUNG
 * một slug (vd nhiều sản phẩm cùng dùng "iphone-15-pro-max" hoặc
 * "macbook-air-m3"). Vì slug là khoá để tìm sản phẩm theo URL, hàm dưới
 * đây sẽ luôn trả về sản phẩm ĐẦU TIÊN khớp slug. Bạn nên sửa lại
 * products.ts để mỗi sản phẩm có slug riêng, tránh 2 sản phẩm khác nhau
 * cùng hiển thị ra một trang.
 */
export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getCategoryNames(product: Product): string[] {
  return product.categoryIds
    .map((id) => categories.find((c) => c.id === id)?.title)
    .filter((title): title is string => Boolean(title));
}

export function getBrandTitle(product: Product): string | undefined {
  return brands.find((b) => b.id === product.brandId)?.title;
}

export function getRelatedProducts(product: Product, limit = 4): Product[] {
  return products
    .filter(
      (p) =>
        p.id !== product.id &&
        p.categoryIds.some((id) => product.categoryIds.includes(id))
    )
    .slice(0, limit);
}

// Dùng cho generateStaticParams — dedupe vì một số slug bị trùng (xem ghi chú ở trên)
export function getAllProductSlugs(): string[] {
  return Array.from(new Set(products.map((p) => p.slug)));
}