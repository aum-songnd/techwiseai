"use client";

import React from "react";
import { Button } from "./ui/button";
import { ShoppingBag, Minus, Plus } from "lucide-react";
import { Product } from "../app/data/types";
import { useCart } from "../context/CartContext";

interface AddToCartProps {
  product: Product & { categories?: string[] };
}

const AddToCart = ({ product }: AddToCartProps) => {
  const { items, addToCart, updateQuantity } = useCart();

  const isOutOfStock = product?.stock === 0;
  const itemInCart = items.find((item) => item.id === product.id);
  const quantityInCart = itemInCart?.quantity ?? 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    addToCart(product, 1);
  };

  const decreaseQuantity = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updateQuantity(product.id, quantityInCart - 1);
  };

  const increaseQuantity = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updateQuantity(product.id, quantityInCart + 1);
  };

  // Đã có trong giỏ -> chỉ hiện bộ đếm +/-, số lượng lấy trực tiếp từ CartContext
  if (quantityInCart > 0) {
    return (
      <div className="flex items-center border border-gray-300 rounded-full w-fit">
        <button
          onClick={decreaseQuantity}
          aria-label="Giảm số lượng"
          className="p-2 text-gray-500 hover:text-shop_dark_green"
        >
          <Minus size={14} />
        </button>
        <span className="w-6 text-center text-sm">{quantityInCart}</span>
        <button
          onClick={increaseQuantity}
          disabled={quantityInCart >= (product.stock ?? Infinity)}
          aria-label="Tăng số lượng"
          className="p-2 text-gray-500 hover:text-shop_dark_green disabled:opacity-40"
        >
          <Plus size={14} />
        </button>
      </div>
    );
  }

  // Chưa có trong giỏ -> chỉ hiện nút thêm vào giỏ
  return (
    <Button
      onClick={handleAddToCart}
      disabled={isOutOfStock}
      className="bg-shop_dark_green/90 rounded-2xl px-6 py-4 text-white text-sm hover:bg-shop_dark_green hover:text-white transition-colors duration-300"
    >
      <ShoppingBag />
      {isOutOfStock ? "Hết hàng" : "Thêm vào giỏ"}
    </Button>
  );
};

export default AddToCart;