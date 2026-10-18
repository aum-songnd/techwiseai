"use client";

import React from "react";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { Product } from "../app/data/types";
import { productImages } from "../images";
import AddToCart from "./AddToCart";
import { useFavorite } from "@/context/FavoriteContext";
import { useAuth } from "@/context/AuthContext";

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
  product: Product;
  hideFavorite?: boolean;
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

const ProductCard = ({ product, hideFavorite = false }: ProductCardProps) => {
  const { isFavorite, toggleFavorite } = useFavorite();
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const isProductFavorite = isFavorite(product.id);

  const finalPrice = product.finalPrice;
  const hasDiscount = product.discount > 0;
  const productImage = resolveProductImage(product.images?.[0]);

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isSignedIn) {
      const redirectTo =
        typeof window !== "undefined"
          ? window.location.pathname + window.location.search
          : "/";
      router.push(`/sign-in?redirect=${encodeURIComponent(redirectTo)}`);
      return;
    }

    toggleFavorite(product);
  };

  return (
    <div className="group font-sans flex h-full flex-col rounded-lg border border-neutral-200 bg-white overflow-hidden hover:shadow-md transition-shadow">
      <Link href={`/product/${product.id}`} className="flex flex-col">
        <div className="relative aspect-[4/3] w-full bg-neutral-100 overflow-hidden flex items-center justify-center">
          {productImage ? (
            <Image
              src={productImage}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-neutral-400">
              Không có ảnh
            </div>
          )}

          {product.status && (
            <span className="absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-shop_orange/90 text-white">
              {statusLabel[product.status] ?? product.status}
            </span>
          )}

          {!hideFavorite && (
            <button
              onClick={handleToggleFavorite}
              aria-label={isProductFavorite ? "Bỏ yêu thích" : "Thêm vào yêu thích"}
              className={`absolute top-2 right-2 z-10 flex items-center justify-center w-7 h-7 rounded-full transition-colors ${
                isProductFavorite
                  ? "bg-shop_dark_green border-shop_dark_green"
                  : "bg-neutral-100/90 hover:bg-white"
              }`}
            >
              <Heart
                size={14}
                className={isProductFavorite ? "text-white" : "text-neutral-500"}
                fill={isProductFavorite ? "currentColor" : "none"}
              />
            </button>
          )}

          {product.stock === 0 && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center text-xs font-medium text-neutral-600">
              Hết hàng
            </div>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <span className="text-[12px] uppercase tracking-wide text-neutral-400 min-h-[14px]">
          {product.categories?.[0] ?? "\u00A0"}
        </span>

        <Link href={`/product/${product.id}`}>
          <h3 className="text-sm font-semibold text-neutral-900 line-clamp-2 min-h-[2.5em] leading-snug hover:text-shop_dark_green transition-colors">
            {product.name}
          </h3>
        </Link>

        <div className="flex items-center gap-2">
          <p className="text-xs font-medium text-neutral-600">In Stock</p>
          <p
            className={`text-xs font-semibold ${
              product?.stock === 0 ? "text-red-600" : "text-shop_dark_green"
            }`}
          >
            {(product?.stock as number) > 0 ? product?.stock : "unavailable"}
          </p>
        </div>

        <div className="flex items-center gap-2 mt-0.5 min-h-[20px]">
          <span className="text-sm font-semibold text-neutral-900">
            {formatPrice(finalPrice)}
          </span>
          {hasDiscount && (
            <span className="text-xs text-neutral-400 line-through">
              {formatPrice(product.price)}
            </span>
          )}
        </div>

        <div className="flex-1" />

        <AddToCart product={product} />
      </div>
    </div>
  );
};

export default ProductCard;