"use client";

import React, { useMemo, useState } from "react";
import Image, { type StaticImageData } from "next/image";
import type { Product, Category, Brand } from "../app/data/types";
import { productImages } from "../images";

type ShopProps = {
  products: Product[];
  categories: Category[];
  brands: Brand[];
};

const formatVND = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);

const resolveProductImage = (
  fileName?: string
): StaticImageData | null => {
  if (!fileName) return null;

  const localImage = (
    productImages as Record<string, StaticImageData | undefined>
  )[fileName];

  return localImage ?? null;
};

const Shop = ({ products, categories, brands }: ShopProps) => {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeBrand, setActiveBrand] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<
    "default" | "price-asc" | "price-desc"
  >("default");

  const filteredProducts = useMemo(() => {
    let result = products.filter((product) => {
      const matchCategory = activeCategory
        ? product.categoryIds.includes(activeCategory)
        : true;

      const matchBrand = activeBrand
        ? product.brandId === activeBrand
        : true;

      return matchCategory && matchBrand;
    });

    if (sortBy === "price-asc") {
      result = [...result].sort(
        (a, b) =>
          a.price -
          (a.discount ?? 0) -
          (b.price - (b.discount ?? 0))
      );
    }

    if (sortBy === "price-desc") {
      result = [...result].sort(
        (a, b) =>
          b.price -
          (b.discount ?? 0) -
          (a.price - (a.discount ?? 0))
      );
    }

    return result;
  }, [products, activeCategory, activeBrand, sortBy]);

  const handleResetFilters = () => {
    setActiveCategory(null);
    setActiveBrand(null);
    setSortBy("default");
  };

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-4 gap-8">
      <aside className="md:col-span-1 space-y-8">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-darkColor">
              Danh mục
            </h3>
          </div>

          <ul className="space-y-2">
            <li>
              <button
                type="button"
                onClick={() => setActiveCategory(null)}
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
                  onClick={() => setActiveCategory(category.id)}
                  className={`text-sm hoverEffect ${
                    activeCategory === category.id
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
          <h3 className="font-semibold mb-3 text-darkColor">
            Thương hiệu
          </h3>

          <ul className="space-y-2">
            <li>
              <button
                type="button"
                onClick={() => setActiveBrand(null)}
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
                  onClick={() => setActiveBrand(brand.id)}
                  className={`text-sm hoverEffect ${
                    activeBrand === brand.id
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

        {(activeCategory ||
          activeBrand ||
          sortBy !== "default") && (
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
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="text-xl font-semibold text-darkColor">
            Tất cả sản phẩm ({filteredProducts.length})
          </h1>

          <select
            value={sortBy}
            onChange={(event) =>
              setSortBy(
                event.target.value as
                  | "default"
                  | "price-asc"
                  | "price-desc"
              )
            }
            className="text-sm border rounded-md px-3 py-1.5 outline-none hoverEffect focus:border-shop_light_green"
          >
            <option value="default">Mặc định</option>
            <option value="price-asc">
              Giá: Thấp đến cao
            </option>
            <option value="price-desc">
              Giá: Cao đến thấp
            </option>
          </select>
        </div>

        {filteredProducts.length === 0 ? (
          <p className="text-lightColor text-sm">
            Không có sản phẩm nào phù hợp.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
            {filteredProducts.map((product) => {
              const finalPrice =
                product.price - (product.discount ?? 0);

              const brand = brands.find(
                (item) => item.id === product.brandId
              );

              const imageSrc = resolveProductImage(
                product.images?.[0]
              );

              return (
                <div
                  key={product.id}
                  className="border rounded-lg p-3 hoverEffect hover:shadow-md group"
                >
                  <div className="relative w-full h-40 mb-3 overflow-hidden rounded-md bg-shop_light_bg">
                    {imageSrc && (
                      <Image
                        src={imageSrc}
                        alt={product.name}
                        fill
                        sizes="(max-width: 768px) 50vw, 25vw"
                        className="object-cover group-hover:scale-105 hoverEffect"
                      />
                    )}

                    {product.status && (
                      <span className="absolute top-2 left-2 bg-shop_light_green text-white text-[10px] px-2 py-0.5 rounded-full uppercase z-10">
                        {product.status}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-lightColor">
                    {brand?.title}
                  </p>

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
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Shop;