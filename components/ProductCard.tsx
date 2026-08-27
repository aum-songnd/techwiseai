import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Product } from "../app/data/types";
import { productImages } from "../images";

interface ProductCardProps {
  product: Product & { categories?: string[] };
}

const statusLabel: Record<string, string> = {
  new: "Mới",
  hot: "Bán chạy",
  sale: "Giảm giá",
};

const formatPrice = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    value
  );

const ProductCard = ({ product }: ProductCardProps) => {
  const finalPrice = product.price - (product.discount || 0);
  const hasDiscount = product.discount > 0;
  const productImage = product.images?.[0]
    ? productImages[product.images[0]]
    : undefined;

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group flex flex-col rounded-lg border border-gray-200 bg-white overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="relative aspect-square w-full bg-gray-50 overflow-hidden">
        {productImage ? (
          <Image
            src={productImage}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-xs text-gray-400">
            Không có ảnh
          </div>
        )}

        {product.status && (
          <span className="absolute top-2 left-2 text-[11px] font-medium px-2 py-0.5 rounded-full bg-black/80 text-white">
            {statusLabel[product.status] ?? product.status}
          </span>
        )}

        {product.stock === 0 && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center text-sm font-medium text-gray-600">
            Hết hàng
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1 p-3">
        {product.categories?.[0] && (
          <span className="text-[11px] uppercase tracking-wide text-gray-400">
            {product.categories[0]}
          </span>
        )}

        <h3 className="text-sm font-medium text-shop_dark_green line-clamp-2">
          {product.name}
        </h3>

        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm font-semibold text-gray-900">
            {formatPrice(finalPrice)}
          </span>
          {hasDiscount && (
            <span className="text-xs text-gray-400 line-through">
              {formatPrice(product.price)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;