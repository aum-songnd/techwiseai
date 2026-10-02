"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image, { type StaticImageData } from "next/image";
import { Check, Minus, Plus, Trash2, X } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { productImages } from "@/images";
import FlashSale from "@/components/FlashSale";
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
  // Chỉ là UI: chưa nối API mã giảm giá
  const [promoCode, setPromoCode] = useState("");

  // Đang tải giỏ hàng từ server
  if (!isLoaded) {
    return (
      <div
        className={`font-sans mx-auto max-w-6xl px-4 py-24 text-center text-sm text-neutral-400`}
      >
        Đang tải giỏ hàng...
      </div>
    );
  }

  // Chưa đăng nhập -> API /cart yêu cầu token (CartAuthRequiredError)
  if (requiresLogin) {
    return (
      <div
        className={`font-sans mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-24 text-center`}
      >
        <Image
          src="/empty-cart.png"
          alt="Vui lòng đăng nhập"
          width={437}
          height={366}
          className="h-auto w-64 select-none sm:w-80"
          priority
        />
        <h1
          className={`font-sans text-xl font-bold uppercase tracking-tight text-neutral-900`}
        >
          Vui lòng đăng nhập để xem giỏ hàng
        </h1>
        <p className="text-sm text-neutral-500">
          Đăng nhập để đồng bộ giỏ hàng của bạn trên mọi thiết bị.
        </p>
        <Link
          href="/sign-in"
          className="mt-2 bg-neutral-900 px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
        >
          Đăng nhập
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        className={`font-sans mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-24 text-center`}
      >
        <Image
          src="/empty-cart.png"
          alt="Giỏ hàng trống"
          width={437}
          height={366}
          className="h-auto w-64 select-none sm:w-80"
          priority
        />
        <h1
          className={`font-sans text-xl font-bold uppercase tracking-tight text-neutral-900`}
        >
          Giỏ hàng của bạn đang trống
        </h1>
        <p className="text-sm text-neutral-500">
          Hãy khám phá thêm sản phẩm và thêm vào giỏ hàng nhé.
        </p>
        <Link
          href="/shop"
          className="mt-2 bg-neutral-900 px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
        >
          Tiếp tục mua sắm
        </Link>
      </div>
    );
  }

  const confirmClearCart = () => {
    clearCart();
    setIsConfirmOpen(false);
  };

  // Tạm tính theo giá gốc, giảm giá = chênh lệch so với giá bán thực tế
  const originalTotal = items.reduce(
    (sum, item) => sum + (item.originalPrice ?? item.unitPrice) * item.quantity,
    0
  );
  const discountAmount = Math.max(0, originalTotal - totalAmount);
  const discountPercent =
    originalTotal > 0 ? Math.round((discountAmount / originalTotal) * 100) : 0;

  // Miễn phí vận chuyển khi đơn (sau giảm giá) đạt ngưỡng
  const isFreeShip = totalAmount >= FREE_SHIP_THRESHOLD;
  const remainingForFreeShip = FREE_SHIP_THRESHOLD - totalAmount;
  const shipProgress = Math.min(
    100,
    Math.max(0, (totalAmount / FREE_SHIP_THRESHOLD) * 100)
  );

  return (
    <div className={`font-sans bg-neutral-50 text-neutral-900`}>
      {/* Dải tiêu đề màu xám: tiêu đề + thanh miễn phí vận chuyển */}
      <div >
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:flex-row sm:items-end sm:justify-between sm:py-10">
          <div className="flex items-end gap-3">
            <h1
              className={`font-sans text-xl font-bold uppercase leading-none tracking-tight sm:text-xl`}
            >
              Giỏ hàng
            </h1>
            <span className="pb-1 text-xs text-neutral-500">
              [ {items.length} sản phẩm ]
            </span>
          </div>

          {/* Thanh tiến độ freeship */}
          <div className="w-full sm:max-w-xs">
            <p className="mb-2 flex items-center gap-2 text-xs text-neutral-700">
              {isFreeShip ? (
                <>
                  <Check size={14} className="shrink-0" />
                  Bạn đã được miễn phí vận chuyển
                </>
              ) : (
                <>
                  Mua thêm{" "}
                  <span className="font-semibold text-neutral-900">
                    {formatPrice(remainingForFreeShip)}
                  </span>{" "}
                  để được miễn phí vận chuyển
                </>
              )}
            </p>
            <div
              className="h-1 w-full bg-neutral-300"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(shipProgress)}
            >
              <div
                className="h-full bg-neutral-900 transition-all duration-500"
                style={{ width: `${shipProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3 lg:items-start lg:gap-14">
          {/* Cột trái: danh sách + flash sale */}
          <div className="flex flex-col gap-10 lg:col-span-2">
            <section>
              <div className="flex justify-end border-b border-neutral-200 pb-3">
                <button
                  type="button"
                  onClick={() => setIsConfirmOpen(true)}
                  className="inline-flex items-center gap-1 text-xs text-neutral-500 transition-colors hover:text-red-600"
                >
                  <X size={14} />
                  Xóa tất cả
                </button>
              </div>

              <ul>
                {items.map((item) => {
                  const image = resolveProductImage(item.thumbnailUrl);
                  const hasDiscount =
                    !!item.originalPrice && item.originalPrice > item.unitPrice;
                  const href = `/product/${item.productId}`;

                  return (
                    <li
                      key={item.id}
                      className="flex gap-4 border-b border-neutral-200 py-6 sm:gap-6"
                    >
                      {/* Ảnh */}
                      <Link
                        href={href}
                        className="relative h-28 w-24 shrink-0 overflow-hidden rounded-2xl bg-neutral-200 sm:h-32 sm:w-28"
                      >
                        {image ? (
                          <Image
                            src={image}
                            alt={item.name}
                            fill
                            className="object-cover"
                            sizes="112px"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[10px] text-neutral-400">
                            Không có ảnh
                          </div>
                        )}
                      </Link>

                      {/* Thông tin + hành động */}
                      <div className="flex min-w-0 flex-1 flex-col justify-between gap-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <Link
                              href={href}
                              className="line-clamp-2 text-sm font-semibold uppercase tracking-wide text-neutral-900 transition-colors hover:text-neutral-600"
                            >
                              {item.name}
                            </Link>
                            <p className="mt-1.5 text-xs text-neutral-500">
                              Đơn giá: {formatPrice(item.unitPrice)}
                            </p>
                            {!item.available && (
                              <p className="mt-1 text-xs text-red-600">
                                Sản phẩm hiện không còn hàng
                              </p>
                            )}
                          </div>

                          {/* Giá */}
                          <div className="shrink-0 text-right">
                            {hasDiscount && (
                              <p className="text-xs text-neutral-400 line-through">
                                {formatPrice(
                                  item.originalPrice! * item.quantity
                                )}
                              </p>
                            )}
                            <p className="text-sm font-semibold sm:text-base">
                              {formatPrice(item.subtotal)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          {/* Số lượng */}
                          <div className="flex items-center gap-4 text-sm">
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(item.id, item.quantity - 1)
                              }
                              aria-label="Giảm số lượng"
                              className="flex h-7 w-7 items-center justify-center text-neutral-600 transition-colors hover:bg-neutral-200 hover:text-neutral-900"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="min-w-4 text-center font-medium tabular-nums">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(item.id, item.quantity + 1)
                              }
                              disabled={item.quantity >= item.stockQuantity}
                              aria-label="Tăng số lượng"
                              className="flex h-7 w-7 items-center justify-center text-neutral-600 transition-colors hover:bg-neutral-200 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                            >
                              <Plus size={14} />
                            </button>
                          </div>

                          {/* Xóa */}
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.id)}
                            aria-label="Xóa sản phẩm"
                            className="flex h-8 w-8 items-center justify-center text-neutral-500 transition-colors hover:text-red-600"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            <FlashSale variant="banner" />
          </div>

          {/* Cột phải: tóm tắt đơn hàng */}
          <aside className="lg:col-span-1">
            <h2
              className={`font-sans text-2xl font-bold uppercase tracking-tight`}
            >
              Tóm tắt đơn hàng
            </h2>

            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-neutral-500">Tạm tính</dt>
                <dd>{formatPrice(originalTotal)}</dd>
              </div>
              {discountAmount > 0 && (
                <div className="flex items-center justify-between">
                  <dt className="text-neutral-500">
                    Giảm giá{discountPercent > 0 && ` - ${discountPercent}%`}
                  </dt>
                  <dd className="text-red-600">
                    -{formatPrice(discountAmount)}
                  </dd>
                </div>
              )}
              <div className="flex items-center justify-between">
                <dt className="text-neutral-500">Phí vận chuyển</dt>
                {isFreeShip ? (
                  <dd className="font-medium">Miễn phí</dd>
                ) : (
                  <dd className="text-neutral-500">Tính khi thanh toán</dd>
                )}
              </div>
              <div className="flex items-baseline justify-between border-t border-neutral-300 pt-4">
                <dt className="font-semibold">Tổng cộng</dt>
                <dd className="text-xl font-semibold">
                  {formatPrice(totalAmount)}
                </dd>
              </div>
            </dl>

            <p className="mt-3 text-xs text-neutral-400">
              Thuế và phí vận chuyển được tính khi thanh toán.
            </p>

            {/* Mã giảm giá (UI, chưa nối logic) */}
            <div className="mt-6">
              <label
                htmlFor="promo"
                className="mb-2 block text-xs font-semibold"
              >
                Mã giảm giá
              </label>
              <div className="flex">
                <input
                  id="promo"
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="Nhập mã giảm giá"
                  className="min-w-0 flex-1 border border-neutral-300 bg-white px-3 py-2.5 text-xs placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none"
                />
                <button
                  type="button"
                  disabled={!promoCode.trim()}
                  className="bg-neutral-900 px-5 text-xs font-medium text-white transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Áp dụng
                </button>
              </div>
            </div>

            <Link
              href="/checkout"
              className="mt-5 block w-full bg-neutral-900 px-6 py-3.5 text-center text-sm font-medium text-white transition-colors hover:bg-neutral-700"
            >
              Tiến hành thanh toán
            </Link>
            <Link
              href="/shop"
              className="mt-4 block text-center text-xs text-neutral-500 underline-offset-4 transition-colors hover:text-neutral-900 hover:underline"
            >
              Tiếp tục mua sắm
            </Link>
          </aside>
        </div>
      </div>

      {/* Modal xác nhận xóa tất cả */}
      {isConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={() => setIsConfirmOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              className={`font-sans mb-2 text-xl font-bold uppercase tracking-tight`}
            >
              Xóa toàn bộ giỏ hàng?
            </h2>
            <p className="mb-6 text-sm text-neutral-500">
              Tất cả sản phẩm trong giỏ hàng sẽ bị xóa. Hành động này không thể
              hoàn tác.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                className="px-4 py-2 text-sm text-neutral-600 transition-colors hover:bg-neutral-100"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={confirmClearCart}
                className="bg-red-600 px-4 py-2 text-sm text-white transition-colors hover:bg-red-700"
              >
                Xóa tất cả
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;