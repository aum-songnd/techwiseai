"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, Star, ShoppingCart, ArrowRight, ShieldCheck, Truck, RefreshCw, Heart } from "lucide-react";
import { useQuickView } from "@/context/QuickViewContext";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useFavorite } from "@/context/FavoriteContext";

const formatPrice = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);

const QuickViewModal = () => {
  const { quickViewProduct, closeQuickView } = useQuickView();
  const { addToCart, requiresLogin } = useCart();
  const { isSignedIn } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorite();
  const router = useRouter();

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedConfig, setSelectedConfig] = useState<string>("");
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setSelectedImageIndex(0);
    setQuantity(1);
    setSelectedColor("");
    setSelectedConfig("");
    setFailedImages({});
  }, [quickViewProduct]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeQuickView();
    };
    if (quickViewProduct) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [quickViewProduct, closeQuickView]);

  if (!quickViewProduct) return null;

  const product = quickViewProduct;
  const isProductFavorite = isFavorite(product.id);
  const images = product.images?.length > 0 ? product.images : [];
  const inStock = product.stock > 0;

  // Determine potential variants from specifications or title
  const specs = product.specifications || {};
  const ramSpec = specs["RAM"] || specs["Dung lượng RAM"];
  const storageSpec = specs["Ổ cứng"] || specs["SSD"] || specs["Bộ nhớ trong"];

  const configOptions: string[] = [];
  if (ramSpec && storageSpec) {
    configOptions.push(`${ramSpec} - ${storageSpec}`);
  }
  const colorOptions = ["Xám không gian", "Bạc ánh kim", "Đen tuyền"];

  const activeColor = selectedColor || colorOptions[0];
  const activeConfig = selectedConfig || (configOptions.length > 0 ? configOptions[0] : null);

  const handleAddToCart = () => {
    if (requiresLogin && !isSignedIn) {
      const redirectTo =
        typeof window !== "undefined"
          ? window.location.pathname + window.location.search
          : `/product/${product.id}`;
      router.push(`/sign-in?redirect=${encodeURIComponent(redirectTo)}`);
      return;
    }
    addToCart(product.id, quantity, {
      id: `temp-${product.id}`,
      productId: product.id,
      name: product.name,
      unitPrice: product.finalPrice || product.price,
      originalPrice: product.price,
      quantity,
      subtotal: (product.finalPrice || product.price) * quantity,
      stockQuantity: product.stock ?? 999,
      available: (product.stock ?? 1) > 0,
      thumbnailUrl: product.images?.[0],
    });
    closeQuickView();
  };

  const hasDiscount = product.discount > 0;
  const discountPercent =
    hasDiscount && product.price > 0
      ? Math.round(((product.price - product.finalPrice) / product.price) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col md:flex-row bg-white rounded-2xl shadow-2xl overflow-hidden border border-neutral-200 animate-in zoom-in-95 duration-200">
        {/* Top Right Action Buttons */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => toggleFavorite(product)}
            className={`p-2 rounded-full transition-colors cursor-pointer ${
              isProductFavorite
                ? "bg-red-50 text-red-500"
                : "bg-white/80 hover:bg-neutral-100 text-neutral-400 hover:text-red-500"
            }`}
            aria-label="Yêu thích"
          >
            <Heart className="w-4 h-4" fill={isProductFavorite ? "currentColor" : "none"} />
          </button>
          <button
            type="button"
            onClick={closeQuickView}
            className="p-2 text-neutral-400 hover:text-neutral-700 bg-white/80 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
            aria-label="Đóng xem nhanh"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Left: Gallery */}
        <div className="w-full md:w-1/2 p-6 flex flex-col items-center justify-center bg-neutral-50/70 border-b md:border-b-0 md:border-r border-neutral-200">
          <div className="relative w-full aspect-square max-w-[340px] bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-xs flex items-center justify-center mb-4">
            {images[selectedImageIndex] ? (
              <Image
                src={failedImages[selectedImageIndex] ? (product.thumbnailUrl || "/laptop.webp") : images[selectedImageIndex]}
                alt={product.name}
                fill
                unoptimized
                sizes="(max-width: 768px) 100vw, 380px"
                className="object-contain p-4 transition-all duration-300"
                onError={() => setFailedImages((prev) => ({ ...prev, [selectedImageIndex]: true }))}
              />
            ) : (
              <span className="text-xs text-neutral-400">Không có ảnh</span>
            )}

            {discountPercent > 0 && (
              <span className="absolute top-3 left-3 bg-red-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-xs">
                -{discountPercent}%
              </span>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1">
              {images.map((img, idx) => {
                const thumbSrc = failedImages[idx] ? (product.thumbnailUrl || "/laptop.webp") : img;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`relative w-14 h-14 rounded-lg border-2 overflow-hidden bg-white shrink-0 transition-all cursor-pointer ${
                      idx === selectedImageIndex
                        ? "border-shop_dark_green ring-2 ring-emerald-100"
                        : "border-neutral-200 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <Image
                      src={thumbSrc}
                      alt={`Ảnh thu nhỏ ${idx + 1}`}
                      fill
                      unoptimized
                      sizes="56px"
                      className="object-cover"
                      onError={() => setFailedImages((prev) => ({ ...prev, [idx]: true }))}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Info & Actions */}
        <div className="w-full md:w-1/2 p-6 flex flex-col justify-between overflow-y-auto max-h-[60vh] md:max-h-[85vh]">
          <div>
            {/* Category & Brand */}
            <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1.5 uppercase font-medium tracking-wider">
              {product.categories?.[0] && (
                <span>{product.categories[0]}</span>
              )}
              {product.brand && (
                <>
                  <span>•</span>
                  <span className="text-neutral-700 font-semibold">{product.brand}</span>
                </>
              )}
            </div>

            {/* Title */}
            <h2 className="text-lg sm:text-xl font-bold text-neutral-900 leading-snug">
              {product.name}
            </h2>

            {/* Rating & Stock */}
            <div className="mt-2 flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1 text-amber-500 font-bold">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{product.ratingAverage ? Number(product.ratingAverage).toFixed(1) : "5.0"}</span>
                <span className="text-neutral-400 font-normal">
                  ({product.reviewCount ?? 0} đánh giá)
                </span>
              </div>

              <span className="text-neutral-300">|</span>

              <span className={`font-medium ${inStock ? "text-emerald-600" : "text-red-500"}`}>
                {inStock ? `Còn hàng (${product.stock})` : "Tạm hết hàng"}
              </span>
            </div>

            {/* Price */}
            <div className="mt-4 flex items-baseline gap-2.5">
              <span className="text-2xl font-bold text-shop_dark_green">
                {formatPrice(product.finalPrice || product.price)}
              </span>
              {hasDiscount && (
                <span className="text-sm text-neutral-400 line-through">
                  {formatPrice(product.price)}
                </span>
              )}
            </div>

            {/* Key Specifications Highlights */}
            {specs && Object.keys(specs).length > 0 && (
              <div className="mt-4 p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-2">
                  Thông số nổi bật
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {specs["CPU"] && (
                    <div className="flex flex-col">
                      <span className="text-neutral-400 text-[10px]">CPU</span>
                      <span className="font-semibold text-neutral-800 line-clamp-1">{specs["CPU"]}</span>
                    </div>
                  )}
                  {specs["RAM"] && (
                    <div className="flex flex-col">
                      <span className="text-neutral-400 text-[10px]">RAM</span>
                      <span className="font-semibold text-neutral-800">{specs["RAM"]}</span>
                    </div>
                  )}
                  {specs["Ổ cứng"] && (
                    <div className="flex flex-col">
                      <span className="text-neutral-400 text-[10px]">Ổ cứng</span>
                      <span className="font-semibold text-neutral-800">{specs["Ổ cứng"]}</span>
                    </div>
                  )}
                  {specs["VGA"] && (
                    <div className="flex flex-col">
                      <span className="text-neutral-400 text-[10px]">Card đồ họa</span>
                      <span className="font-semibold text-neutral-800 line-clamp-1">{specs["VGA"]}</span>
                    </div>
                  )}
                  {specs["Màn hình"] && (
                    <div className="flex flex-col">
                      <span className="text-neutral-400 text-[10px]">Màn hình</span>
                      <span className="font-semibold text-neutral-800">{specs["Màn hình"]}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Color Selector */}
            <div className="mt-4">
              <label className="text-xs font-semibold text-neutral-700 block mb-1.5">
                Màu sắc: <span className="font-normal text-neutral-500">{activeColor}</span>
              </label>
              <div className="flex items-center gap-2">
                {colorOptions.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedColor(c)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                      activeColor === c
                        ? "border-shop_dark_green bg-emerald-50 text-shop_dark_green font-semibold"
                        : "border-neutral-200 text-neutral-700 hover:border-neutral-300"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Config Variant Selector */}
            {configOptions.length > 0 && (
              <div className="mt-3">
                <label className="text-xs font-semibold text-neutral-700 block mb-1.5">
                  Phiên bản cấu hình:
                </label>
                <div className="flex flex-wrap gap-2">
                  {configOptions.map((cfg) => (
                    <button
                      key={cfg}
                      type="button"
                      onClick={() => setSelectedConfig(cfg)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                        activeConfig === cfg
                          ? "border-shop_dark_green bg-emerald-50 text-shop_dark_green font-semibold"
                          : "border-neutral-200 text-neutral-700 hover:border-neutral-300"
                      }`}
                    >
                      {cfg}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Trust Badges */}
            <div className="mt-4 grid grid-cols-3 gap-2 pt-3 border-t border-neutral-100 text-[11px] text-neutral-500">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-shop_dark_green shrink-0" />
                <span>Chính hãng 100%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-shop_dark_green shrink-0" />
                <span>Giao nhanh 2h</span>
              </div>
              <div className="flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-shop_dark_green shrink-0" />
                <span>Đổi mới 30 ngày</span>
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="mt-6 pt-4 border-t border-neutral-200">
            <div className="flex items-center gap-3">
              {/* Quantity Selector */}
              <div className="flex items-center border border-neutral-300 rounded-lg overflow-hidden bg-white">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-2 text-neutral-600 hover:bg-neutral-100 transition-colors"
                >
                  -
                </button>
                <span className="w-8 text-center text-xs font-semibold tabular-nums text-neutral-800">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(Math.min(product.stock || 99, quantity + 1))}
                  className="px-3 py-2 text-neutral-600 hover:bg-neutral-100 transition-colors"
                >
                  +
                </button>
              </div>

              {/* Add to Cart */}
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!inStock}
                className={`flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                  inStock
                    ? "bg-shop_dark_green text-white hover:bg-emerald-800 shadow-md hover:shadow-lg"
                    : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Thêm vào giỏ hàng</span>
              </button>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs">
              <Link
                href={`/product/${product.id}`}
                onClick={closeQuickView}
                className="inline-flex items-center gap-1 text-shop_dark_green font-semibold hover:underline"
              >
                <span>Xem thông số chi tiết đầy đủ</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickViewModal;
