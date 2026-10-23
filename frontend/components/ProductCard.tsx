"use client";

import React from "react";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, Star, Eye, ArrowLeftRight, Check, Zap } from "lucide-react";
import { Product } from "../app/data/types";
import { productImages } from "../images";
import AddToCart from "./AddToCart";
import { useFavorite } from "@/context/FavoriteContext";
import { useAuth } from "@/context/AuthContext";
import { useCompare } from "@/context/CompareContext";
import { useQuickView } from "@/context/QuickViewContext";

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
  compact?: boolean;
}

const statusLabel: Record<string, string> = {
  new: "MỚI",
  hot: "HOT",
  sale: "GIẢM SỐC",
};

const formatPrice = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);

const ProductCard = ({
  product,
  hideFavorite = false,
  compact = false,
}: ProductCardProps) => {
  const { isFavorite, toggleFavorite } = useFavorite();
  const { isComparing, toggleCompare } = useCompare();
  const { openQuickView } = useQuickView();
  const { isSignedIn } = useAuth();
  const router = useRouter();

  const isProductFavorite = isFavorite(product.id);
  const isProductComparing = isComparing(product.id);
  const [imgError, setImgError] = React.useState(false);

  const finalPrice = product.finalPrice;
  const hasDiscount = product.discount > 0;
  const discountPercent =
    hasDiscount && product.price > 0
      ? Math.round(((product.price - finalPrice) / product.price) * 100)
      : 0;

  const rawProductImage = resolveProductImage(product.images?.[0]);
  const productImage = imgError
    ? (product.thumbnailUrl ? resolveProductImage(product.thumbnailUrl) : "/laptop.webp")
    : rawProductImage;
  const specs = product.specifications || {};

  // Extract compact chips for display
  const specChips: string[] = [];
  if (specs["CPU"] || specs["Loại CPU"]) {
    specChips.push(specs["CPU"] || specs["Loại CPU"]);
  }
  if (specs["RAM"] || specs["Dung lượng RAM"]) {
    specChips.push(specs["RAM"] || specs["Dung lượng RAM"]);
  }
  if (specs["Ổ cứng"] || specs["SSD"] || specs["Bộ nhớ trong"]) {
    specChips.push(specs["Ổ cứng"] || specs["SSD"] || specs["Bộ nhớ trong"]);
  }
  if (specs["VGA"] || specs["Loại card đồ họa"]) {
    specChips.push(specs["VGA"] || specs["Loại card đồ họa"]);
  }
  if (specs["Màn hình"] || specs["Kích thước màn hình"]) {
    specChips.push(specs["Màn hình"] || specs["Kích thước màn hình"]);
  }

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

  const handleToggleCompare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleCompare(product);
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openQuickView(product);
  };

  return (
    <div className="group font-sans relative flex h-full flex-col rounded-2xl border border-neutral-200/90 bg-white overflow-hidden shadow-2xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      {/* Top Image area */}
      <div className="relative aspect-square w-full bg-neutral-100/70 overflow-hidden">
        <Link href={`/product/${product.id}`} className="block relative w-full h-full">
          {productImage ? (
            <Image
              src={productImage}
              alt={product.name}
              fill
              unoptimized
              className="object-cover group-hover:scale-108 transition-transform duration-500 ease-out"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-neutral-400">
              Không có ảnh
            </div>
          )}
        </Link>

        {/* Top-Left Badges */}
        <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1 items-start">
          {discountPercent > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-600 text-white shadow-xs">
              -{discountPercent}%
            </span>
          )}
          {product.isFeatured ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500 text-white shadow-xs flex items-center gap-0.5">
              <Zap className="w-2.5 h-2.5 fill-current" /> Nổi bật
            </span>
          ) : product.status ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-shop_orange text-white shadow-xs">
              {statusLabel[product.status] ?? product.status}
            </span>
          ) : null}
        </div>

        {/* Floating Quick Action Buttons (Top-Right) */}
        <div className="absolute top-2.5 right-2.5 z-10 flex flex-col gap-1.5 transition-opacity duration-200">
          {!hideFavorite && (
            <button
              type="button"
              onClick={handleToggleFavorite}
              aria-label={isProductFavorite ? "Bỏ yêu thích" : "Thêm vào yêu thích"}
              className={`flex items-center justify-center w-7 h-7 rounded-full shadow-xs transition-all cursor-pointer ${
                isProductFavorite
                  ? "bg-red-500 text-white"
                  : "bg-white/90 text-neutral-500 hover:text-red-500 hover:bg-white"
              }`}
              title={isProductFavorite ? "Đã thích" : "Yêu thích"}
            >
              <Heart
                size={13}
                fill={isProductFavorite ? "currentColor" : "none"}
              />
            </button>
          )}

          {/* Quick View Button */}
          <button
            type="button"
            onClick={handleQuickView}
            aria-label="Xem nhanh"
            className="flex items-center justify-center w-7 h-7 rounded-full bg-white/90 text-neutral-500 hover:text-shop_dark_green hover:bg-white shadow-xs transition-all cursor-pointer opacity-90 sm:opacity-0 sm:group-hover:opacity-100"
            title="Xem nhanh thông tin"
          >
            <Eye size={13} />
          </button>

          {/* Compare Button */}
          <button
            type="button"
            onClick={handleToggleCompare}
            aria-label={isProductComparing ? "Bỏ so sánh" : "So sánh"}
            className={`flex items-center justify-center w-7 h-7 rounded-full shadow-xs transition-all cursor-pointer opacity-90 sm:opacity-0 sm:group-hover:opacity-100 ${
              isProductComparing
                ? "bg-shop_dark_green text-white"
                : "bg-white/90 text-neutral-500 hover:text-shop_dark_green hover:bg-white"
            }`}
            title={isProductComparing ? "Đang so sánh" : "Thêm vào so sánh"}
          >
            <ArrowLeftRight size={13} />
          </button>
        </div>

        {/* Out of stock overlay */}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] flex items-center justify-center text-xs font-bold text-neutral-500 uppercase tracking-wider">
            Tạm hết hàng
          </div>
        )}
      </div>

      {/* Product Content Details */}
      <div className={`flex flex-1 flex-col ${compact ? "p-2.5 pt-2" : "p-3.5 pt-2.5"}`}>
        {/* Brand & Category row */}
        <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1">
          <span className="uppercase tracking-wider font-semibold text-neutral-600 truncate max-w-[110px]">
            {product.brand || product.categories?.[0] || "Chính hãng"}
          </span>
          {product.categories?.[0] && product.brand && (
            <span className="text-[10px] text-neutral-400 truncate max-w-[80px]">
              {product.categories[0]}
            </span>
          )}
        </div>

        {/* Title */}
        <Link href={`/product/${product.id}`} className="block">
          <h3
            className={`text-xs sm:text-sm font-semibold text-neutral-800 leading-snug group-hover:text-shop_dark_green transition-colors ${
              compact ? "line-clamp-1 min-h-[1.3em]" : "line-clamp-2 min-h-[2.5em]"
            }`}
          >
            {product.name}
          </h3>
        </Link>

        {/* Specification Chips (CPU, RAM, SSD, GPU, Screen) */}
        {specChips.length > 0 && (
          <div className="flex flex-wrap gap-1 my-1.5">
            {specChips.slice(0, compact ? 1 : 3).map((chip, idx) => (
              <span
                key={idx}
                className="px-1.5 py-0.5 rounded bg-neutral-100 text-[10px] font-medium text-neutral-600 line-clamp-1 max-w-[120px]"
              >
                {chip}
              </span>
            ))}
          </div>
        )}

        {/* Rating & Stock row */}
        <div className="flex items-center justify-between gap-2 mt-auto pt-1 text-xs">
          <div className="flex items-center gap-1 text-[11px] text-neutral-500">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
            <span className="font-bold text-neutral-800">
              {product.ratingAverage ? Number(product.ratingAverage).toFixed(1) : "5.0"}
            </span>
            <span className="text-[10px] text-neutral-400">
              ({product.reviewCount ?? 0})
            </span>
          </div>

          <div className="text-[11px] font-medium">
            {product.stock > 0 ? (
              <span className="text-emerald-600 flex items-center gap-0.5">
                <Check className="w-3 h-3" /> Còn hàng
              </span>
            ) : (
              <span className="text-red-500">Hết hàng</span>
            )}
          </div>
        </div>

        {/* Price Row */}
        <div className="flex items-baseline gap-2 mt-2 mb-3">
          <span className="text-sm sm:text-base font-bold text-shop_dark_green">
            {formatPrice(finalPrice)}
          </span>
          {hasDiscount && (
            <span className="text-[11px] text-neutral-400 line-through">
              {formatPrice(product.price)}
            </span>
          )}
        </div>

        {/* Add to Cart button */}
        <div className="mt-auto">
          <AddToCart product={product} />
        </div>
      </div>
    </div>
  );
};

export default ProductCard;