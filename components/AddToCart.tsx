"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { ShoppingBag, Minus, Plus } from "lucide-react";
import { Product } from "../app/data/types";
import { useCart } from "../context/CartContext";

interface AddToCartProps {
  product: Product & { categories?: string[] };
}

const formatPrice = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    value
  );

const AddToCart = ({ product }: AddToCartProps) => {
  const { getItemByProductId, addToCart, updateQuantity, requiresLogin, isAddingToCart } =
    useCart();
  const router = useRouter();

  const isOutOfStock = product?.stock === 0;
  const itemInCart = getItemByProductId(product.id);
  const quantityInCart = itemInCart?.quantity ?? 0;
  const isAdding = isAddingToCart(product.id);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock || isAdding) return;

    // Chưa đăng nhập -> API /cart sẽ luôn thất bại, điều hướng sang
    // trang đăng nhập ngay thay vì gọi API rồi báo lỗi.
    if (requiresLogin) {
      const redirectTo =
        typeof window !== "undefined"
          ? window.location.pathname + window.location.search
          : "/";
      router.push(`/sign-in?redirect=${encodeURIComponent(redirectTo)}`);
      return;
    }

    await addToCart(product.id, 1);
  };

  const decreaseQuantity = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!itemInCart) return;
    updateQuantity(itemInCart.id, quantityInCart - 1);
  };

  const increaseQuantity = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!itemInCart) return;
    updateQuantity(itemInCart.id, quantityInCart + 1);
  };

  // Đã có trong giỏ -> hiện dòng "Số lượng" (bộ đếm +/-) và dòng "Tạm tính"
  if (itemInCart && quantityInCart > 0) {
    const stockLimit = itemInCart.stockQuantity ?? product.stock ?? Infinity;

    return (
      <div className="flex flex-col justify-center gap-2 w-full h-[72px]">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Số lượng</p>
          <div className="flex items-center gap-3">
            <button
              onClick={decreaseQuantity}
              aria-label="Giảm số lượng"
              className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
            >
              <Minus size={12} />
            </button>
            <span className="text-sm font-medium w-4 text-center">
              {quantityInCart}
            </span>
            <button
              onClick={increaseQuantity}
              disabled={quantityInCart >= stockLimit}
              aria-label="Tăng số lượng"
              className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 disabled:opacity-40 transition-colors"
            >
              <Plus size={12} />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 pt-2">
          <p className="text-sm font-bold text-gray-800">Tạm tính</p>
          <p className="text-sm font-bold text-shop_dark_green">
            {formatPrice(itemInCart.subtotal)}
          </p>
        </div>
      </div>
    );
  }

  // Chưa có trong giỏ -> chỉ hiện nút thêm vào giỏ (giữ nguyên kích thước gốc của nút,
  // khung bọc ngoài mới là phần giữ cho card không đổi kích thước)
  return (
    <div className="w-full h-[72px] flex items-center justify-center">
      <Button
        onClick={handleAddToCart}
        disabled={isOutOfStock || isAdding}
        className="w-full bg-shop_dark_green/90 rounded-2xl px-6 py-4 text-white text-sm hover:bg-shop_dark_green hover:text-white transition-colors duration-300 disabled:opacity-70"
      >
        <ShoppingBag />
        {isOutOfStock ? "Hết hàng" : isAdding ? "Đang thêm..." : "Thêm vào giỏ"}
      </Button>
    </div>
  );
};

export default AddToCart;