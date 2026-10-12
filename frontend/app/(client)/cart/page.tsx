"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image, { type StaticImageData } from "next/image";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { productImages } from "@/images";

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

  // Đang tải giỏ hàng từ server
  if (!isLoaded) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center text-gray-400 text-sm">
        Đang tải giỏ hàng...
      </div>
    );
  }

  // Chưa đăng nhập -> API /cart yêu cầu token (CartAuthRequiredError)
  if (requiresLogin) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 flex flex-col items-center text-center gap-4">
        <ShoppingBag className="w-14 h-14 text-gray-300" />
        <h1 className="text-xl font-bold text-shop_dark_green">
          Vui lòng đăng nhập để xem giỏ hàng
        </h1>
        <p className="text-gray-500 text-sm">
          Đăng nhập để đồng bộ giỏ hàng của bạn trên mọi thiết bị.
        </p>
        <Link
          href="/sign-in"
          className="mt-2 bg-shop_dark_green/90 rounded-2xl px-6 py-3 text-white text-sm hover:bg-shop_dark_green transition-colors duration-300"
        >
          Đăng nhập
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 flex flex-col items-center text-center gap-4">
        <ShoppingBag className="w-14 h-14 text-gray-300" />
        <h1 className="text-xl font-bold text-shop_dark_green">
          Giỏ hàng của bạn đang trống
        </h1>
        <p className="text-gray-500 text-sm">
          Hãy khám phá thêm sản phẩm và thêm vào giỏ hàng nhé.
        </p>
        <Link
          href="/"
          className="mt-2 bg-shop_dark_green/90 rounded-2xl px-6 py-3 text-white text-sm hover:bg-shop_dark_green transition-colors duration-300"
        >
          Tiếp tục mua sắm
        </Link>
      </div>
    );
  }

  const handleClearCart = () => {
    setIsConfirmOpen(true);
  };

  const confirmClearCart = () => {
    clearCart();
    setIsConfirmOpen(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-shop_dark_green">Giỏ hàng</h1>
        <button
          onClick={handleClearCart}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition-colors"
        >
          <Trash2 size={14} />
          Xóa tất cả
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Danh sách sản phẩm */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {items.map((item) => {
            const image = resolveProductImage(item.thumbnailUrl);
            const hasDiscount =
              !!item.originalPrice && item.originalPrice > item.unitPrice;

            return (
              <div
                key={item.id}
                className="flex items-center gap-4 border border-gray-200 rounded-lg p-3"
              >
                <Link
                  href={`/product/${item.slug ?? item.productId}`}
                  className="relative w-20 h-20 shrink-0 bg-gray-100 rounded-md overflow-hidden"
                >
                  {image ? (
                    <Image
                      src={image}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-[10px] text-gray-400">
                      Không có ảnh
                    </div>
                  )}
                </Link>

                <div className="flex-1 min-w-0">
                  <Link
                    href={`/product/${item.slug ?? item.productId}`}
                    className="font-semibold text-shop_dark_green line-clamp-1 hover:underline"
                  >
                    {item.name}
                  </Link>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-medium text-shop_dark_green/80">
                      {formatPrice(item.unitPrice)}
                    </span>
                    {hasDiscount && (
                      <span className="text-xs text-gray-400 line-through">
                        {formatPrice(item.originalPrice!)}
                      </span>
                    )}
                  </div>
                  {!item.available && (
                    <p className="text-xs text-red-500 mt-1">
                      Sản phẩm hiện không còn hàng
                    </p>
                  )}
                </div>

                <div className="flex items-center border border-gray-300 rounded-full">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    aria-label="Giảm số lượng"
                    className="p-1.5 text-gray-500 hover:text-shop_dark_green"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-6 text-center text-sm">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    disabled={item.quantity >= item.stockQuantity}
                    aria-label="Tăng số lượng"
                    className="p-1.5 text-gray-500 hover:text-shop_dark_green disabled:opacity-40"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <p className="w-24 text-right text-sm font-semibold text-shop_dark_green shrink-0">
                  {formatPrice(item.subtotal)}
                </p>

                <button
                  onClick={() => removeFromCart(item.id)}
                  aria-label="Xóa sản phẩm"
                  className="p-2 text-gray-400 hover:text-red-500 shrink-0"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Tóm tắt đơn hàng */}
        <div className="lg:col-span-1">
          <div className="border border-gray-200 rounded-lg p-5 sticky top-24">
            <h2 className="font-bold text-shop_dark_green mb-4">
              Tóm tắt đơn hàng
            </h2>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-500">Tạm tính</span>
              <span className="font-medium">{formatPrice(totalAmount)}</span>
            </div>
            <div className="flex items-center justify-between text-sm mb-4">
              <span className="text-gray-500">Phí vận chuyển</span>
              <span className="font-medium">Tính khi thanh toán</span>
            </div>
            <div className="border-t border-gray-200 pt-4 flex items-center justify-between mb-4">
              <span className="font-bold text-shop_dark_green">Tổng cộng</span>
              <span className="font-bold text-lg text-shop_dark_green">
                {formatPrice(totalAmount)}
              </span>
            </div>
            <Link
              href="/checkout"
              className="block text-center w-full bg-shop_dark_green/90 rounded-2xl px-6 py-3 text-white text-sm hover:bg-shop_dark_green transition-colors duration-300"
            >
              Tiến hành thanh toán
            </Link>
            <Link
              href="/"
              className="block text-center text-sm text-gray-500 hover:text-shop_dark_green mt-3"
            >
              Tiếp tục mua sắm
            </Link>
          </div>
        </div>
      </div>

      {isConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setIsConfirmOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-shop_dark_green mb-2">
              Xóa toàn bộ giỏ hàng?
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Tất cả sản phẩm trong giỏ hàng sẽ bị xóa. Hành động này không
              thể hoàn tác.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setIsConfirmOpen(false)}
                className="px-4 py-2 text-sm rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={confirmClearCart}
                className="px-4 py-2 text-sm rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors"
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