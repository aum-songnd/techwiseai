"use client";

import React, { useState } from "react";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import { Product } from "../app/data/types";
import { productImages } from "../images";
import AddToCart from "./AddToCart";

// Ảnh có thể là tên file local (map trong productImages) hoặc URL đầy đủ
// từ API thật (vd "https://placehold.co/..."). Nếu không có trong map local
// thì dùng thẳng chuỗi đó làm src, giống cách Shop.tsx đang xử lý.
const resolveProductImage = (
  fileName?: string
): StaticImageData | string | null => {
  if (!fileName) return null;

  const localImage = (
    productImages as Record<string, StaticImageData | undefined>
  )[fileName];

  return localImage ?? fileName;
};

interface ProductCardProps {
  product: Product & { categories?: string[] };
}

const statusLabel: Record<string, string> = {
  new: "NEW",
  hot: "HOT",
  sale: "SALE",
};

const formatPrice = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    value
  );

const ProductCard = ({ product }: ProductCardProps) => {
  const [isFavorite, setIsFavorite] = useState(false);

  const finalPrice = product.price - (product.discount || 0);
  const hasDiscount = product.discount > 0;
  const productImage = resolveProductImage(product.images?.[0]);

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault(); // tránh trigger Link khi bấm heart
    e.stopPropagation();
    setIsFavorite((prev) => !prev);
  };

  return (
    <div className="group flex flex-col rounded-lg border border-gray-200 bg-white overflow-hidden hover:shadow-md transition-shadow">
      <Link href={`/product/${product.id}`} className="flex flex-col">
        <div className="relative aspect-square w-full bg-gray-100 overflow-hidden flex items-center justify-center">
          {productImage ? (
            <div className="relative w-[80%] h-[80%]">
              <Image
                src={productImage}
                alt={product.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-gray-400">
              Không có ảnh
            </div>
          )}

          {product.status && (
            <span className="absolute top-2 left-2 text-[11px] font-medium px-2 py-0.5 rounded-full bg-shop_orange/80 text-white">
              {statusLabel[product.status] ?? product.status}
            </span>
          )}

          <button
            onClick={handleToggleFavorite}
            aria-label={isFavorite ? "Bỏ yêu thích" : "Thêm vào yêu thích"}
            className={`absolute top-2 right-2 z-10 flex items-center justify-center w-7 h-7 rounded-full  transition-colors ${
              isFavorite
                ? "bg-shop_dark_green border-shop_dark_green"
                : "bg-gray-100 hover:border-gray-300"
            }`}
          >
            <Heart
              size={14}
              className={isFavorite ? "text-white" : "text-gray-500"}
              fill="none"
            />
          </button>

          {product.stock === 0 && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center text-sm font-medium text-gray-600">
              Hết hàng
            </div>
          )}
        </div>
      </Link>

      <div className="flex flex-col gap-1 p-3">
        {product.categories?.[0] && (
          <span className="text-[12px] uppercase tracking-wide text-gray-400">
            {product.categories[0]}
          </span>
        )}

        <h3 className="text-[17px] font-bold text-shop_dark_green line-clamp-2">
          {product.name}
        </h3>

        <div className="flex items-center gap-2.5">
          <p className="text-sm font-medium">In Stock</p>
          <p
            className={`${product?.stock === 0 ? "text-red-600" : "text-shop_dark_green/80 font-semibold"}`}
          >
            {(product?.stock as number) > 0 ? product?.stock : "unavailable"}
          </p>
        </div>

        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm font-semibold text-shop_dark_green/80">
            {formatPrice(finalPrice)}
          </span>
          {hasDiscount && (
            <span className="text-sm text-gray-400 line-through">
              {formatPrice(product.price)}
            </span>
          )}
        </div>
        <AddToCart />
      </div>
    </div>
  );
};

export default ProductCard;