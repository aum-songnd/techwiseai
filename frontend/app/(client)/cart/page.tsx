"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image, { type StaticImageData } from "next/image";
import {
  Check,
  Minus,
  Plus,
  Trash2,
  X,
  Package,
  ShieldCheck,
  RotateCcw,
  Truck,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { productImages } from "@/images";
import { FREE_SHIP_THRESHOLD } from "@/components/ServiceFeatures";

const formatPrice = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    value
  );

const resolveProductImage = (
  fileName?: string
): StaticImageData | string | null => {
  if (!fileName) return null;
  const localImage = (
    productImages as Record<string, StaticImageData | undefined>
  )[fileName];
  return localImage ?? fileName;
};

// Safe Product Thumbnail Component to prevent Next.js Image domain exceptions
const ProductThumb = ({
  src,
  alt,
}: {
  src?: StaticImageData | string | null;
  alt: string;
}) => {
  const [hasError, setHasError] = useState(false);
  if (!src || hasError) {
    return (
      <div className="flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center border border-neutral-200 bg-neutral-50 text-neutral-400">
        <Package className="h-6 w-6 stroke-[1.5]" />
      </div>
    );
  }
  const imgSrc = typeof src === "string" ? src : src.src;
  return (
    <img
      src={imgSrc}
      alt={alt}
      onError={() => setHasError(true)}
      className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 border border-neutral-200 bg-white object-cover"
      loading="lazy"
    />
  );
};

const CartPage = () => {
  const {
    items,
    updateQuantity,
    removeFromCart,
    clearCart,
    totalAmount,
    isLoaded,
    requiresLogin,
  } = useCart();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [promoCode, setPromoCode] = useState("");

  if (!isLoaded) {
    return (
      <div className="font-sans min-h-screen bg-white">
        <div className="mx-auto w-[90%] py-20 text-center text-xs text-neutral-400">
          Đang tải giỏ hàng...
        </div>
      </div>
    );
  }

  if (requiresLogin) {
    return (
      <div className="font-sans min-h-screen bg-white text-neutral-900">
        <div className="mx-auto w-[90%] py-8 sm:py-10">
          <nav className="flex items-center gap-2 text-xs text-neutral-500 mb-6">
            <Link href="/" className="hover:text-shop_dark_green transition-colors">
              Trang chủ
            </Link>
            <span>/</span>
            <span className="text-neutral-900 font-medium">Giỏ hàng của tôi</span>
          </nav>

          <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
            <Image
              src="/empty-cart.png"
              alt="Vui lòng đăng nhập"
              width={437}
              height={366}
              className="h-auto w-56 select-none sm:w-72"
              priority
            />
            <h1 className="text-xl font-bold uppercase tracking-tight text-neutral-900">
              Vui lòng đăng nhập để xem giỏ hàng
            </h1>
            <p className="text-xs text-neutral-500">
              Đăng nhập để đồng bộ giỏ hàng của bạn trên mọi thiết bị và thanh toán nhanh chóng.
            </p>
            <Link
              href="/sign-in"
              className="mt-2 bg-shop_dark_green px-8 py-3 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-shop_dark_green/90"
            >
              Đăng nhập ngay
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="font-sans min-h-screen bg-white text-neutral-900">
        <div className="mx-auto w-[90%] py-8 sm:py-10">
          <nav className="flex items-center gap-2 text-xs text-neutral-500 mb-6">
            <Link href="/" className="hover:text-shop_dark_green transition-colors">
              Trang chủ
            </Link>
            <span>/</span>
            <span className="text-neutral-900 font-medium">Giỏ hàng của tôi</span>
          </nav>

          <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
            <Image
              src="/empty-cart.png"
              alt="Giỏ hàng trống"
              width={437}
              height={366}
              className="h-auto w-56 select-none sm:w-72"
              priority
            />
            <h1 className="text-xl font-bold uppercase tracking-tight text-neutral-900">
              Giỏ hàng của bạn đang trống
            </h1>
            <p className="text-xs text-neutral-500">
              Bạn chưa có sản phẩm nào trong giỏ hàng. Hãy khám phá và mua sắm ngay!
            </p>
            <Link
              href="/shop"
              className="mt-2 bg-shop_dark_green px-8 py-3 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-shop_dark_green/90"
            >
              Tiếp tục mua sắm
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const confirmClearCart = () => {
    clearCart();
    setIsConfirmOpen(false);
  };

  const originalTotal = items.reduce(
    (sum, item) => sum + (item.originalPrice ?? item.unitPrice) * item.quantity,
    0
  );
  const discountAmount = Math.max(0, originalTotal - totalAmount);
  const discountPercent =
    originalTotal > 0 ? Math.round((discountAmount / originalTotal) * 100) : 0;

  const isFreeShip = totalAmount >= FREE_SHIP_THRESHOLD;
  const remainingForFreeShip = FREE_SHIP_THRESHOLD - totalAmount;
  const shipProgress = Math.min(
    100,
    Math.max(0, (totalAmount / FREE_SHIP_THRESHOLD) * 100)
  );

  return (
    <div className="font-sans min-h-screen bg-white text-neutral-900">
      <div className="mx-auto w-[90%] py-8 sm:py-10">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-neutral-500 mb-6">
          <Link href="/" className="hover:text-shop_dark_green transition-colors">
            Trang chủ
          </Link>
          <span>/</span>
          <span className="text-neutral-900 font-medium">Giỏ hàng của tôi</span>
        </nav>

        {/* Header & Free Shipping Bar */}
        <div className="flex flex-col gap-4 border-b border-neutral-200 pb-5 sm:flex-row sm:items-end sm:justify-between mb-8">
          <div className="flex items-end gap-3">
            <h1 className="text-xl font-bold uppercase tracking-tight text-neutral-900">
              Giỏ hàng của tôi
            </h1>
            <span className="pb-0.5 text-xs text-neutral-500 font-mono">
              [ {items.length} sản phẩm ]
            </span>
          </div>

          <div className="w-full sm:w-80">
            <p className="mb-2 flex items-center gap-1.5 text-xs text-neutral-700">
              {isFreeShip ? (
                <>
                  <Check
                    size={14}
                    className="shrink-0 text-shop_dark_green"
                    strokeWidth={3}
                  />
                  <span className="font-semibold text-shop_dark_green">
                    Bạn đã được miễn phí vận chuyển!
                  </span>
                </>
              ) : (
                <>
                  Mua thêm{" "}
                  <span className="font-semibold text-shop_dark_green">
                    {formatPrice(remainingForFreeShip)}
                  </span>{" "}
                  để được miễn phí vận chuyển
                </>
              )}
            </p>
            <div
              className="h-1.5 w-full bg-neutral-200 overflow-hidden"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(shipProgress)}
            >
              <div
                className="h-full bg-shop_dark_green transition-all duration-500"
                style={{ width: `${shipProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Main 2-Column Content */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:items-start">
          {/* Left Column: Product List */}
          <div className="flex flex-col gap-4 lg:col-span-2">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                Danh sách sản phẩm ({items.length})
              </span>
              <button
                type="button"
                onClick={() => setIsConfirmOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs text-neutral-500 transition-colors hover:text-red-600"
              >
                <Trash2 size={13} />
                <span>Xóa tất cả</span>
              </button>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    <th className="py-3 pr-4">Sản phẩm</th>
                    <th className="py-3 pr-4 text-right">Đơn giá</th>
                    <th className="py-3 pr-4 text-center">Số lượng</th>
                    <th className="py-3 pr-4 text-right">Thành tiền</th>
                    <th className="py-3 text-right w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-xs">
                  {items.map((item) => {
                    const image = resolveProductImage(item.thumbnailUrl);
                    const hasDiscount =
                      !!item.originalPrice && item.originalPrice > item.unitPrice;
                    const href = `/product/${item.productId}`;

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-neutral-50/50 transition-colors"
                      >
                        <td className="py-4 pr-4">
                          <div className="flex items-start gap-3">
                            <Link href={href} className="shrink-0">
                              <ProductThumb src={image} alt={item.name} />
                            </Link>
                            <div className="min-w-0">
                              <Link
                                href={href}
                                className="font-semibold text-neutral-900 hover:text-shop_dark_green transition-colors line-clamp-2"
                              >
                                {item.name}
                              </Link>
                              {item.sku && (
                                <span className="mt-0.5 inline-block font-mono text-[10px] text-neutral-400">
                                  [{item.sku}]
                                </span>
                              )}
                              {!item.available && (
                                <p className="mt-1 text-[11px] font-semibold text-red-600">
                                  Sản phẩm hiện đã hết hàng
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-4 pr-4 text-right align-middle whitespace-nowrap">
                          {hasDiscount && (
                            <p className="text-[11px] text-neutral-400 line-through">
                              {formatPrice(item.originalPrice!)}
                            </p>
                          )}
                          <p className="font-semibold text-neutral-900">
                            {formatPrice(item.unitPrice)}
                          </p>
                        </td>

                        <td className="py-4 pr-4 align-middle whitespace-nowrap">
                          <div className="flex items-center justify-center">
                            <div className="flex items-center border border-neutral-300 bg-white">
                              <button
                                type="button"
                                onClick={() =>
                                  updateQuantity(item.id, item.quantity - 1)
                                }
                                aria-label="Giảm số lượng"
                                className="flex h-7 w-7 items-center justify-center text-neutral-600 hover:bg-neutral-100 hover:text-shop_dark_green transition-colors"
                              >
                                <Minus size={13} />
                              </button>
                              <span className="w-9 text-center font-semibold text-xs tabular-nums text-neutral-900">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  updateQuantity(item.id, item.quantity + 1)
                                }
                                disabled={item.quantity >= item.stockQuantity}
                                aria-label="Tăng số lượng"
                                className="flex h-7 w-7 items-center justify-center text-neutral-600 hover:bg-neutral-100 hover:text-shop_dark_green transition-colors disabled:cursor-not-allowed disabled:opacity-30"
                              >
                                <Plus size={13} />
                              </button>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 pr-4 text-right align-middle whitespace-nowrap">
                          {hasDiscount && (
                            <p className="text-[11px] text-neutral-400 line-through">
                              {formatPrice(
                                item.originalPrice! * item.quantity
                              )}
                            </p>
                          )}
                          <p className="font-bold text-sm text-neutral-900">
                            {formatPrice(item.subtotal)}
                          </p>
                        </td>

                        <td className="py-4 text-right align-middle whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.id)}
                            aria-label="Xóa sản phẩm"
                            className="text-neutral-400 hover:text-red-600 transition-colors p-1"
                            title="Xóa sản phẩm"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile List View */}
            <div className="md:hidden divide-y divide-neutral-200 border-t border-neutral-200">
              {items.map((item) => {
                const image = resolveProductImage(item.thumbnailUrl);
                const hasDiscount =
                  !!item.originalPrice && item.originalPrice > item.unitPrice;
                const href = `/product/${item.productId}`;

                return (
                  <div key={item.id} className="py-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <Link href={href} className="shrink-0">
                        <ProductThumb src={image} alt={item.name} />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link
                          href={href}
                          className="text-xs font-semibold text-neutral-900 hover:text-shop_dark_green transition-colors line-clamp-2"
                        >
                          {item.name}
                        </Link>
                        {item.sku && (
                          <span className="mt-0.5 inline-block font-mono text-[10px] text-neutral-400">
                            [{item.sku}]
                          </span>
                        )}
                        <div className="mt-1 flex items-baseline gap-2">
                          <span className="text-xs font-semibold text-neutral-900">
                            {formatPrice(item.unitPrice)}
                          </span>
                          {hasDiscount && (
                            <span className="text-[11px] text-neutral-400 line-through">
                              {formatPrice(item.originalPrice!)}
                            </span>
                          )}
                        </div>
                        {!item.available && (
                          <p className="mt-1 text-[11px] font-semibold text-red-600">
                            Hết hàng
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                      <div className="flex items-center border border-neutral-300 bg-white">
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity - 1)
                          }
                          aria-label="Giảm số lượng"
                          className="flex h-7 w-7 items-center justify-center text-neutral-600 hover:bg-neutral-100"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="w-8 text-center text-xs font-semibold tabular-nums text-neutral-900">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity + 1)
                          }
                          disabled={item.quantity >= item.stockQuantity}
                          aria-label="Tăng số lượng"
                          className="flex h-7 w-7 items-center justify-center text-neutral-600 hover:bg-neutral-100 disabled:opacity-30"
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-neutral-900">
                          {formatPrice(item.subtotal)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          className="text-neutral-400 hover:text-red-600 p-1"
                          title="Xóa"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Order Summary Sidebar */}
          <aside className="lg:col-span-1">
            <div className="border border-neutral-200 p-5 space-y-5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-200 pb-3">
                Tóm tắt đơn hàng
              </h2>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Tạm tính hàng hóa:</span>
                  <span className="text-neutral-800 font-medium">
                    {formatPrice(originalTotal)}
                  </span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex items-center justify-between text-emerald-700">
                    <span>
                      Giảm giá{discountPercent > 0 && ` (${discountPercent}%)`}:
                    </span>
                    <span className="font-semibold">
                      - {formatPrice(discountAmount)}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Phí vận chuyển:</span>
                  <span
                    className={
                      isFreeShip
                        ? "text-shop_dark_green font-semibold"
                        : "text-neutral-700"
                    }
                  >
                    {isFreeShip ? "Miễn phí" : "Tính khi thanh toán"}
                  </span>
                </div>

                <div className="border-t border-neutral-200 pt-3 mt-3 flex items-baseline justify-between">
                  <span className="font-bold text-xs uppercase tracking-tight text-neutral-900">
                    Tổng thanh toán
                  </span>
                  <span className="font-bold text-lg text-neutral-900">
                    {formatPrice(totalAmount)}
                  </span>
                </div>
              </div>

              {/* Promo Code Input */}
              <div className="border-t border-neutral-200 pt-4">
                <label
                  htmlFor="promo"
                  className="mb-2 block text-xs font-semibold text-neutral-700"
                >
                  Mã giảm giá
                </label>
                <div className="flex">
                  <input
                    id="promo"
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="Nhập mã ưu đãi..."
                    className="min-w-0 flex-1 border border-neutral-300 px-3 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-shop_dark_green focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={!promoCode.trim()}
                    className="bg-shop_dark_green px-4 text-xs font-semibold text-white transition-colors hover:bg-shop_dark_green/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Áp dụng
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <Link
                  href="/checkout"
                  className="block w-full bg-shop_dark_green text-white text-center py-3 text-xs font-semibold uppercase tracking-wider hover:bg-shop_dark_green/90 transition-colors shadow-sm"
                >
                  Tiến hành đặt hàng &rarr;
                </Link>
                <Link
                  href="/shop"
                  className="block w-full border border-shop_dark_green text-shop_dark_green text-center py-2.5 text-xs font-semibold uppercase tracking-wider hover:bg-shop_dark_green hover:text-white transition-colors"
                >
                  &larr; Tiếp tục mua sắm
                </Link>
              </div>

              {/* Guarantees / Badges */}
              <div className="border-t border-neutral-200 pt-4 space-y-2.5 text-[11px] text-neutral-500">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-shop_dark_green shrink-0" />
                  <span>100% Sản phẩm chính hãng & bảo hành uy tín</span>
                </div>
                <div className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-shop_dark_green shrink-0" />
                  <span>Đổi trả dễ dàng trong vòng 7 ngày</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-shop_dark_green shrink-0" />
                  <span>Giao hàng toàn quốc — Kiểm tra trước khi nhận</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Confirmation Dialog: Xóa toàn bộ giỏ hàng */}
      {isConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setIsConfirmOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md border border-neutral-300 bg-white p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3 mb-3">
              <h2 className="text-sm font-bold uppercase tracking-tight text-neutral-900">
                Xóa toàn bộ giỏ hàng?
              </h2>
              <button
                onClick={() => setIsConfirmOpen(false)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-neutral-600 mb-5">
              Tất cả {items.length} sản phẩm trong giỏ hàng sẽ bị xóa. Hành
              động này không thể hoàn tác.
            </p>
            <div className="flex items-center justify-end gap-2 border-t border-neutral-200 pt-3">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                className="border border-neutral-300 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={confirmClearCart}
                className="bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition-colors"
              >
                Xác nhận xóa tất cả
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;