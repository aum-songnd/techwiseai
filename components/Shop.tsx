// src/components/Shop.tsx
"use client";

import React, { useMemo, useState } from "react";
import type { Product, Category, Brand } from "../app/data/types";

type ShopProps = {
  products: Product[];
  categories: Category[];
  brands: Brand[];
};

const formatVND = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);

const Shop = ({ products, categories, brands }: ShopProps) => {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeBrand, setActiveBrand] = useState<string | null>(null);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCategory = activeCategory
        ? p.categoryIds.includes(activeCategory)
        : true;
      const matchBrand = activeBrand ? p.brandId === activeBrand : true;
      return matchCategory && matchBrand;
    });
  }, [products, activeCategory, activeBrand]);

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-4 gap-8">
      {/* Sidebar lọc */}
      <aside className="md:col-span-1 space-y-8">
        <div>
          <h3 className="font-semibold mb-3 text-darkColor">Danh mục</h3>
          <ul className="space-y-2">
            <li>
              <button
                onClick={() => setActiveCategory(null)}
                className={`text-sm hoverEffect ${
                  activeCategory === null ? "text-shop_orange font-medium" : "text-lightColor"
                }`}
              >
                Tất cả
              </button>
            </li>
            {categories.map((cat) => (
              <li key={cat.id}>
                <button
                  onClick={() => setActiveCategory(cat.id)}
                  className={`text-sm hoverEffect ${
                    activeCategory === cat.id ? "text-shop_orange font-medium" : "text-lightColor"
                  }`}
                >
                  {cat.title}
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
                onClick={() => setActiveBrand(null)}
                className={`text-sm hoverEffect ${
                  activeBrand === null ? "text-shop_orange font-medium" : "text-lightColor"
                }`}
              >
                Tất cả
              </button>
            </li>
            {brands.map((brand) => (
              <li key={brand.id}>
                <button
                  onClick={() => setActiveBrand(brand.id)}
                  className={`text-sm hoverEffect ${
                    activeBrand === brand.id ? "text-shop_orange font-medium" : "text-lightColor"
                  }`}
                >
                  {brand.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Danh sách sản phẩm */}
      <div className="md:col-span-3">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-darkColor">
            Tất cả sản phẩm ({filteredProducts.length})
          </h1>
        </div>

        {filteredProducts.length === 0 ? (
          <p className="text-lightColor text-sm">Không có sản phẩm nào phù hợp.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
            {filteredProducts.map((product) => {
              const finalPrice = product.price - (product.discount ?? 0);
              const brand = brands.find((b) => b.id === product.brandId);

              return (
                <div
                  key={product.id}
                  className="border rounded-lg p-3 hoverEffect hover:shadow-md group"
                >
                  <div className="relative w-full h-40 mb-3 overflow-hidden rounded-md bg-shop_light_bg">
                    <img
                      src={product.images?.[0] || "https://placehold.co/400x400?text=No+Image"}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 hoverEffect"
                    />
                    {product.status && (
                      <span className="absolute top-2 left-2 bg-shop_orange text-white text-[10px] px-2 py-0.5 rounded-full uppercase">
                        {product.status}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-lightColor">{brand?.title}</p>
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
                    {product.stock > 0 ? `Còn ${product.stock} sản phẩm` : "Hết hàng"}
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