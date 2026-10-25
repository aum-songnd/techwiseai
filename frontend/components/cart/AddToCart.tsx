"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Minus, Plus } from "lucide-react";
import { Product } from "@/app/data/types";
import { useCart, clearPendingBundleItems } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { recordInteraction } from "@/lib/api/recommendation/personalized";

interface AddToCartProps {
  product: Product;
  selectedColor?: string;
  selectedConfig?: string;
}

const formatPrice = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    value
  );

const AddToCart = ({ product, selectedColor, selectedConfig }: AddToCartProps) => {
  const { getItemByProductId, addToCart, updateQuantity, requiresLogin } =
    useCart();
  const { isSignedIn } = useAuth();
  const router = useRouter();

  const isOutOfStock = product?.stock === 0;
  const itemInCart = getItemByProductId(product.id);
  const quantityInCart = itemInCart?.quantity ?? 0;

  // Auto-add product to cart if returning from sign-in
  useEffect(() => {
    if (isSignedIn && !requiresLogin && typeof window !== "undefined") {
      const pendingId = sessionStorage.getItem("pending_cart_product_id");
      if (pendingId && pendingId === product?.id && !isOutOfStock) {
        const savedColor = sessionStorage.getItem("pending_cart_color") || selectedColor;
        const savedConfig = sessionStorage.getItem("pending_cart_config") || selectedConfig;
        sessionStorage.removeItem("pending_cart_product_id");
        sessionStorage.removeItem("pending_cart_color");
        sessionStorage.removeItem("pending_cart_config");

        const variantSuffix = [savedColor, savedConfig].filter(Boolean).join(" • ");
        const itemName = variantSuffix ? `${product.name} (${variantSuffix})` : product.name;

        addToCart(product.id, 1, {
          id: `temp-${product.id}`,
          productId: product.id,
          name: itemName,
          unitPrice: product.finalPrice || product.price,
          originalPrice: product.price,
          quantity: 1,
          subtotal: product.finalPrice || product.price,
          stockQuantity: product.stock ?? 999,
          available: (product.stock ?? 1) > 0,
          thumbnailUrl: product.images?.[0] || product.thumbnailUrl,
        });
      }
    }
  }, [isSignedIn, requiresLogin, product, isOutOfStock, addToCart, selectedColor, selectedConfig]);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;

    const variantSuffix = [selectedColor, selectedConfig].filter(Boolean).join(" • ");
    const itemName = variantSuffix ? `${product.name} (${variantSuffix})` : product.name;

    if (!isSignedIn || requiresLogin) {
      if (typeof window !== "undefined") {
        clearPendingBundleItems();
        sessionStorage.setItem("pending_cart_product_id", product.id);
        if (selectedColor) sessionStorage.setItem("pending_cart_color", selectedColor);
        if (selectedConfig) sessionStorage.setItem("pending_cart_config", selectedConfig);
      }
      const redirectTo =
        typeof window !== "undefined"
          ? window.location.pathname + window.location.search
          : "/shop";
      router.push(`/sign-in?redirect=${encodeURIComponent(redirectTo)}`);
      return;
    }

    addToCart(product.id, 1, {
      id: `temp-${product.id}`,
      productId: product.id,
      name: itemName,
      unitPrice: product.finalPrice || product.price,
      originalPrice: product.price,
      quantity: 1,
      subtotal: product.finalPrice || product.price,
      stockQuantity: product.stock ?? 999,
      available: (product.stock ?? 1) > 0,
      thumbnailUrl: product.images?.[0] || product.thumbnailUrl,
    });

    recordInteraction({
      productId: product.id,
      eventType: "ADD_TO_CART",
    });
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

  if (itemInCart && quantityInCart > 0) {
    const stockLimit = itemInCart.stockQuantity ?? product.stock ?? Infinity;

    return (
      <div className="font-sans flex flex-col justify-center gap-2 w-full h-[72px]">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-neutral-500">Số lượng</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={decreaseQuantity}
              aria-label="Giảm số lượng"
              className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-shop_dark_green transition-colors"
            >
              <Minus size={11} />
            </button>
            <span className="w-5 text-center text-xs font-semibold tabular-nums text-neutral-900">
              {quantityInCart}
            </span>
            <button
              type="button"
              onClick={increaseQuantity}
              disabled={quantityInCart >= stockLimit}
              aria-label="Tăng số lượng"
              className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-shop_dark_green transition-colors disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Plus size={11} />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-neutral-200 pt-1.5">
          <p className="text-xs font-semibold text-neutral-900">Tạm tính</p>
          <p className="text-xs font-bold text-shop_dark_green tabular-nums">
            {formatPrice(itemInCart.subtotal)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[72px] flex items-center justify-center font-sans">
      <Button
        type="button"
        onClick={handleAddToCart}
        disabled={isOutOfStock}
        className="w-full bg-shop_dark_green/90 rounded-lg px-4 py-2.5 text-white text-xs font-semibold uppercase tracking-wider hover:bg-shop_dark_green hover:text-white transition-colors duration-300 disabled:opacity-70 gap-2"
      >
        <ShoppingBag size={14} />
        {isOutOfStock ? "Hết hàng" : "Thêm vào giỏ"}
      </Button>
    </div>
  );
};

export default AddToCart;