"use client";

import React from "react";
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
  const { items, updateQuantity, removeFromCart, totalPrice, isLoaded } =
    useCart();

  if (isLoaded && items.length === 0) {
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
          href="/shop"
          className="mt-2 bg-shop_dark_green/90 rounded-2xl px-6 py-3 text-white text-sm hover:bg-shop_dark_green transition-colors duration-300"
        >
          Tiếp tục mua sắm
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-shop_dark_green mb-6">
        Giỏ hàng
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Danh sách sản phẩm */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {items.map((item) => {
            const image = resolveProductImage(item.images?.[0]);
            const finalPrice = item.price - (item.discount || 0);

            return (
              <div
                key={item.id}
                className="flex items-center gap-4 border border-gray-200 rounded-lg p-3"
              >
                <Link
                  href={`/product/${item.id}`}
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
                    href={`/product/${item.id}`}
                    className="font-semibold text-shop_dark_green line-clamp-1 hover:underline"
                  >
                    {item.name}
                  </Link>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-medium text-shop_dark_green/80">
                      {formatPrice(finalPrice)}
                    </span>
                    {item.discount > 0 && (
                      <span className="text-xs text-gray-400 line-through">
                        {formatPrice(item.price)}
                      </span>
                    )}
                  </div>
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
                    disabled={item.quantity >= (item.stock ?? Infinity)}
                    aria-label="Tăng số lượng"
                    className="p-1.5 text-gray-500 hover:text-shop_dark_green disabled:opacity-40"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <p className="w-24 text-right text-sm font-semibold text-shop_dark_green shrink-0">
                  {formatPrice(finalPrice * item.quantity)}
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
              <span className="font-medium">{formatPrice(totalPrice)}</span>
            </div>
            <div className="flex items-center justify-between text-sm mb-4">
              <span className="text-gray-500">Phí vận chuyển</span>
              <span className="font-medium">Tính khi thanh toán</span>
            </div>
            <div className="border-t border-gray-200 pt-4 flex items-center justify-between mb-4">
              <span className="font-bold text-shop_dark_green">Tổng cộng</span>
              <span className="font-bold text-lg text-shop_dark_green">
                {formatPrice(totalPrice)}
              </span>
            </div>
            <button className="w-full bg-shop_dark_green/90 rounded-2xl px-6 py-3 text-white text-sm hover:bg-shop_dark_green transition-colors duration-300">
              Tiến hành thanh toán
            </button>
            <Link
              href="/shop"
              className="block text-center text-sm text-gray-500 hover:text-shop_dark_green mt-3"
            >
              Tiếp tục mua sắm
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;