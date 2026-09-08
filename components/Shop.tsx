"use client";

import React, { useMemo, useState, useEffect } from "react";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Product, Category, Brand } from "../app/data/types";
import { productImages } from "../images";
import { getProductsPaginated } from "../lib/api";

type ShopProps = {
  products: Product[];
  categories: Category[];
  brands: Brand[];
};

const PAGE_SIZE = 20;

const formatVND = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);

const resolveProductImage = (
  fileName?: string
): StaticImageData | string | null => {
  if (!fileName) return null;

  const localImage = (
    productImages as Record<string, StaticImageData | undefined>
  )[fileName];

  // Nếu không có trong map ảnh local (vd fileName là URL đầy đủ
  // như "https://placehold.co/..."), dùng luôn chuỗi đó làm src.
  return localImage ?? fileName;
};

const Shop = ({
  products: productsProp,
  categories: categoriesProp,
  brands: brandsProp,
}: ShopProps) => {
  // Phòng hộ: nếu API trả về sai kiểu (không phải mảng) hoặc undefined,
  // luôn fallback về mảng rỗng thay vì để .filter/.find/.map ném lỗi
  // "products.filter is not a function" và làm trắng trang.
  const initialProducts = Array.isArray(productsProp) ? productsProp : [];
  const categories = Array.isArray(categoriesProp) ? categoriesProp : [];
  const brands = Array.isArray(brandsProp) ? brandsProp : [];

  const searchParams = useSearchParams();
  const categorySlugParam = searchParams.get("category");
  const brandSlugParam = searchParams.get("brand");

  // Lưu trực tiếp SLUG (không phải id) vì API /products lọc theo
  // query param `category`/`brand` dùng slug.
  const [activeCategory, setActiveCategory] = useState<string | null>(
    categorySlugParam
  );
  const [activeBrand, setActiveBrand] = useState<string | null>(
    brandSlugParam
  );
  const [sortBy, setSortBy] = useState<
    "default" | "price-asc" | "price-desc"
  >("default");

  // ---------- Phân trang + lọc: Shop tự gọi API mỗi khi trang/bộ lọc đổi ----------
  // Việc lọc theo danh mục/thương hiệu được thực hiện ở SERVER qua query
  // param `category`/`brand` (dùng slug), nên `products` dưới đây đã là
  // đúng tập kết quả đã lọc của trang hiện tại, và `totalPages`/
  // `totalElements` cũng phản ánh đúng số lượng sau khi lọc.
  const [page, setPage] = useState(0);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalElements, setTotalElements] = useState<number>(
    initialProducts.length
  );
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadPage() {
      setLoadingProducts(true);
      setProductsError(null);
      try {
        const result = await getProductsPaginated({
          page,
          size: PAGE_SIZE,
          category: activeCategory ?? undefined,
          brand: activeBrand ?? undefined,
        });
        if (ignore) return;
        setProducts(result.items);
        setTotalPages(Math.max(1, result.totalPages));
        setTotalElements(result.totalElements);
      } catch (err) {
        if (!ignore) {
          setProductsError(
            err instanceof Error ? err.message : "Lỗi không xác định"
          );
        }
      } finally {
        if (!ignore) setLoadingProducts(false);
      }
    }

    loadPage();
    return () => {
      ignore = true;
    };
  }, [page, activeCategory, activeBrand]);

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 0 || nextPage >= totalPages || nextPage === page) return;
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelectCategory = (slug: string | null) => {
    setActiveCategory(slug);
    setPage(0);
  };

  const handleSelectBrand = (slug: string | null) => {
    setActiveBrand(slug);
    setPage(0);
  };

  // Đồng bộ lại state khi query param "category" trên URL thay đổi
  useEffect(() => {
    setActiveCategory(categorySlugParam ?? null);
    setPage(0);
  }, [categorySlugParam]);

  // Đồng bộ lại state khi query param "brand" trên URL thay đổi
  useEffect(() => {
    setActiveBrand(brandSlugParam ?? null);
    setPage(0);
  }, [brandSlugParam]);

  // Sắp xếp giá vẫn xử lý ở client trên tập sản phẩm của trang hiện tại,
  // vì backend hiện chưa xác nhận có hỗ trợ query param sắp xếp hay không.
  const sortedProducts = useMemo(() => {
    if (sortBy === "default") return products;

    const result = [...products];

    if (sortBy === "price-asc") {
      result.sort(
        (a, b) =>
          a.price - (a.discount ?? 0) - (b.price - (b.discount ?? 0))
      );
    }

    if (sortBy === "price-desc") {
      result.sort(
        (a, b) =>
          b.price - (b.discount ?? 0) - (a.price - (a.discount ?? 0))
      );
    }

    return result;
  }, [products, sortBy]);

  const handleResetFilters = () => {
    setActiveCategory(null);
    setActiveBrand(null);
    setSortBy("default");
    setPage(0);
  };

  // Danh sách số trang hiển thị (tối đa 5 nút quanh trang hiện tại)
  const pageNumbers = useMemo(() => {
    const maxButtons = 5;
    let start = Math.max(0, page - Math.floor(maxButtons / 2));
    const end = Math.min(totalPages, start + maxButtons);
    start = Math.max(0, end - maxButtons);
    return Array.from({ length: end - start }, (_, i) => start + i);
  }, [page, totalPages]);

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-4 gap-8">
      <aside className="md:col-span-1 space-y-8 md:sticky md:top-24 md:self-start">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-darkColor">Danh mục</h3>
          </div>

          <ul className="space-y-2">
            <li>
              <button
                type="button"
                onClick={() => handleSelectCategory(null)}
                className={`text-sm hoverEffect ${
                  activeCategory === null
                    ? "text-shop_light_green font-medium"
                    : "text-lightColor"
                }`}
              >
                Tất cả
              </button>
            </li>

            {categories.map((category) => (
              <li key={category.id}>
                <button
                  type="button"
                  onClick={() => handleSelectCategory(category.slug)}
                  className={`text-sm hoverEffect ${
                    activeCategory === category.slug
                      ? "text-shop_light_green font-medium"
                      : "text-lightColor"
                  }`}
                >
                  {category.title}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-semibold mb-3 text-darkColor">Thương hiệu</h3>

          <ul className="space-y-2">
            <li>
              <button
                type="button"
                onClick={() => handleSelectBrand(null)}
                className={`text-sm hoverEffect ${
                  activeBrand === null
                    ? "text-shop_light_green font-medium"
                    : "text-lightColor"
                }`}
              >
                Tất cả
              </button>
            </li>

            {brands.map((brand) => (
              <li key={brand.id}>
                <button
                  type="button"
                  onClick={() => handleSelectBrand(brand.slug)}
                  className={`text-sm hoverEffect ${
                    activeBrand === brand.slug
                      ? "text-shop_light_green font-medium"
                      : "text-lightColor"
                  }`}
                >
                  {brand.title}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {(activeCategory || activeBrand || sortBy !== "default") && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-xs text-shop_light_green underline hoverEffect"
          >
            Xoá bộ lọc
          </button>
        )}
      </aside>

      <div className="md:col-span-3">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6 py-3">
          <h1 className="font-semibold text-darkColor text-xl">
            Tất cả sản phẩm ({totalElements})
          </h1>

          <select
            value={sortBy}
            onChange={(event) =>
              setSortBy(
                event.target.value as "default" | "price-asc" | "price-desc"
              )
            }
            className="border rounded-md outline-none hoverEffect focus:border-shop_light_green text-sm px-3 py-1.5"
          >
            <option value="default">Mặc định</option>
            <option value="price-asc">Giá: Thấp đến cao</option>
            <option value="price-desc">Giá: Cao đến thấp</option>
          </select>
        </div>

        {loadingProducts ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <div
                key={i}
                className="border rounded-lg p-3 animate-pulse space-y-3"
              >
                <div className="aspect-square w-full bg-gray-200 rounded-md" />
                <div className="h-3 w-1/2 bg-gray-200 rounded" />
                <div className="h-4 w-3/4 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : productsError ? (
          <p className="text-red-600 text-sm">
            Không tải được sản phẩm: {productsError}
          </p>
        ) : sortedProducts.length === 0 ? (
          <p className="text-lightColor text-sm">
            Không có sản phẩm nào phù hợp.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
            {sortedProducts.map((product) => {
              const finalPrice = product.price - (product.discount ?? 0);

              // API hiện chưa gắn brand cho sản phẩm, nên brandId luôn
              // undefined -> không tìm được brand nào. Hiển thị tên danh
              // mục (categories) thay cho tên thương hiệu cho tới khi API
              // bổ sung brand.
              const categoryLabel = (product as any).categories?.[0] as
                | string
                | undefined;

              const imageSrc = resolveProductImage(product.images?.[0]);

              return (
                <Link
                  key={product.id}
                  href={`/product/${product.id}`}
                  className="border rounded-lg p-3 hoverEffect hover:shadow-md group block"
                >
                  <div className="relative w-full aspect-square mb-3 overflow-hidden rounded-md bg-shop_light_bg flex items-center justify-center">
                    {imageSrc && (
                      <div className="relative w-[85%] h-[85%]">
                        <Image
                          src={imageSrc}
                          alt={product.name}
                          fill
                          sizes="(max-width: 768px) 50vw, 25vw"
                          className="object-contain group-hover:scale-105 hoverEffect"
                        />
                      </div>
                    )}

                    {product.status && (
                      <span className="absolute top-2 left-2 bg-shop_light_green text-white text-[10px] px-2 py-0.5 rounded-full uppercase z-10">
                        {product.status}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-lightColor">{categoryLabel}</p>

                  <h2 className="font-medium text-sm text-darkColor line-clamp-1">
                    {product.name}
                  </h2>

                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-semibold text-shop_dark_green">
                      {formatVND(finalPrice)}
                    </span>

                    {!!product.discount && (
                      <span className="text-xs line-through text-lightColor">
                        {formatVND(product.price)}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-lightColor mt-1">
                    {product.stock > 0
                      ? `Còn ${product.stock} sản phẩm`
                      : "Hết hàng"}
                  </p>
                </Link>
              );
            })}
          </div>
        )}

        {!loadingProducts &&
          !productsError &&
          sortedProducts.length > 0 &&
          totalPages > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-8">
            <button
              type="button"
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 0}
              className="px-3 py-1.5 text-sm rounded-md border hoverEffect disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Trước
            </button>

            {pageNumbers[0] > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => handlePageChange(0)}
                  className="px-3 py-1.5 text-sm rounded-md border hoverEffect"
                >
                  1
                </button>
                <span className="px-1 text-sm text-lightColor">…</span>
              </>
            )}

            {pageNumbers.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handlePageChange(p)}
                className={`px-3 py-1.5 text-sm rounded-md border hoverEffect ${
                  p === page
                    ? "bg-shop_light_green text-white border-shop_light_green"
                    : ""
                }`}
              >
                {p + 1}
              </button>
            ))}

            {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
              <>
                <span className="px-1 text-sm text-lightColor">…</span>
                <button
                  type="button"
                  onClick={() => handlePageChange(totalPages - 1)}
                  className="px-3 py-1.5 text-sm rounded-md border hoverEffect"
                >
                  {totalPages}
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 text-sm rounded-md border hoverEffect disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Sau
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Shop;