"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image, { type StaticImageData } from "next/image";
import { useRouter } from "next/navigation";
import {
  Check,
  Minus,
  Package,
  Plus,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import { useFavorite, FavoriteProduct } from "@/context/FavoriteContext";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { productImages } from "@/images";
import Loading from "@/app/(client)/loading";

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

const WishlistPage = () => {
  const router = useRouter();
  const { isSignedIn, isLoading: isAuthLoading } = useAuth();
  const { addToCart, getItemByProductId, updateQuantity } = useCart();

  const {
    favoriteProducts,
    removeFromFavorite,
    resetFavorite,
    isLoading,
  } = useFavorite() as {
    favoriteProducts: FavoriteProduct[];
    removeFromFavorite: (productId: string) => Promise<void>;
    resetFavorite: () => Promise<void>;
    isLoading?: boolean;
  };

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isAddingAll, setIsAddingAll] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  }, []);

  useEffect(() => {
    if (!isAuthLoading && !isSignedIn) {
      router.push(`/sign-in?redirect=${encodeURIComponent("/wishlist")}`);
    }
  }, [isAuthLoading, isSignedIn, router]);

  const hasItems = favoriteProducts && favoriteProducts.length > 0;

  // Add single item to cart
  const handleAddToCartSingle = async (product: FavoriteProduct) => {
    if (product.stock === 0) return;
    setAddingId(product.id);
    try {
      await addToCart(product.id, 1);
      showToast(`Đã thêm "${product.name}" vào giỏ hàng.`);
    } catch {
      showToast("Có lỗi khi thêm sản phẩm vào giỏ hàng.");
    } finally {
      setAddingId(null);
    }
  };

  // Add all in-stock favorite products to cart
  const handleAddAllToCart = async () => {
    const inStock = favoriteProducts.filter((p) => p.stock !== 0);
    if (inStock.length === 0) {
      showToast("Tất cả sản phẩm trong danh sách yêu thích đều đã hết hàng.");
      return;
    }
    setIsAddingAll(true);
    try {
      for (const p of inStock) {
        await addToCart(p.id, 1);
      }
      showToast(`Đã thêm ${inStock.length} sản phẩm vào giỏ hàng.`);
      router.push("/cart");
    } catch {
      showToast("Có lỗi khi thêm sản phẩm vào giỏ hàng.");
    } finally {
      setIsAddingAll(false);
    }
  };

  // Confirm clear wishlist
  const handleConfirmReset = async () => {
    setIsResetting(true);
    try {
      await resetFavorite();
      setIsConfirmOpen(false);
      showToast("Đã xóa toàn bộ sản phẩm yêu thích.");
    } catch {
      showToast("Có lỗi xảy ra khi xóa danh sách yêu thích.");
    } finally {
      setIsResetting(false);
    }
  };

  // Handle remove item
  const handleRemoveItem = async (productId: string, productName: string) => {
    try {
      await removeFromFavorite(productId);
      showToast(`Đã xóa "${productName}" khỏi danh sách yêu thích.`);
    } catch {
      showToast("Có lỗi khi xóa sản phẩm.");
    }
  };

  // Loading state
  if (isAuthLoading || (isSignedIn && isLoading)) {
    return <Loading message="Đang tải danh sách yêu thích..." />;
  }

  // Authentication check state
  if (!isSignedIn) {
    return (
      <div className="font-sans min-h-screen bg-white text-neutral-900">
        <div className="mx-auto w-[90%] py-8 sm:py-10">
          <nav className="flex items-center gap-2 text-xs text-neutral-500 mb-6">
            <Link href="/" className="hover:text-shop_dark_green transition-colors">
              Trang chủ
            </Link>
            <span>/</span>
            <span className="text-neutral-900 font-medium">Sản phẩm yêu thích</span>
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
              Vui lòng đăng nhập
            </h1>
            <p className="text-xs text-neutral-500">
              Đăng nhập để xem và quản lý danh sách sản phẩm yêu thích của bạn trên mọi thiết bị.
            </p>
            <Link
              href={`/sign-in?redirect=${encodeURIComponent("/wishlist")}`}
              className="mt-2 bg-shop_dark_green px-8 py-3 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-shop_dark_green/90"
            >
              Đăng nhập ngay
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (!hasItems) {
    return (
      <div className="font-sans min-h-screen bg-white text-neutral-900">
        <div className="mx-auto w-[90%] py-8 sm:py-10">
          <nav className="flex items-center gap-2 text-xs text-neutral-500 mb-6">
            <Link href="/" className="hover:text-shop_dark_green transition-colors">
              Trang chủ
            </Link>
            <span>/</span>
            <span className="text-neutral-900 font-medium">Sản phẩm yêu thích</span>
          </nav>

          <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
            <Image
              src="/empty-cart.png"
              alt="Danh sách yêu thích trống"
              width={437}
              height={366}
              className="h-auto w-56 select-none sm:w-72"
              priority
            />
            <h1 className="text-xl font-bold uppercase tracking-tight text-neutral-900">
              Danh sách yêu thích đang trống
            </h1>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Bạn chưa lưu sản phẩm nào vào danh sách yêu thích. Hãy bấm vào biểu tượng trái tim trên các sản phẩm bạn quan tâm để lưu lại nhé!
            </p>
            <Link
              href="/shop"
              className="mt-2 bg-shop_dark_green px-8 py-3 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-shop_dark_green/90"
            >
              Khám phá sản phẩm ngay
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="font-sans min-h-screen bg-white text-neutral-900">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 border border-neutral-900 bg-neutral-900 px-4 py-2.5 text-xs font-medium text-white shadow">
          <Check className="h-3.5 w-3.5 text-white" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="mx-auto w-[90%] py-8 sm:py-10">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-neutral-500 mb-6">
          <Link href="/" className="hover:text-shop_dark_green transition-colors">
            Trang chủ
          </Link>
          <span>/</span>
          <span className="text-neutral-900 font-medium">Sản phẩm yêu thích</span>
        </nav>

        {/* Header Section */}
        <div className="flex flex-col gap-4 border-b border-neutral-200 pb-5 sm:flex-row sm:items-end sm:justify-between mb-6">
          <div className="flex items-end gap-3">
            <h1 className="text-xl font-bold uppercase tracking-tight text-neutral-900">
              Sản phẩm yêu thích
            </h1>
            <span className="pb-0.5 text-xs text-neutral-500 font-mono">
              [ {favoriteProducts.length} sản phẩm ]
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleAddAllToCart}
              disabled={isAddingAll}
              className="bg-shop_dark_green text-white hover:bg-shop_dark_green/90 px-4 py-2 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <ShoppingCart size={13} />
              <span>{isAddingAll ? "Đang thêm..." : "Thêm tất cả vào giỏ"}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsConfirmOpen(true)}
              className="border border-neutral-300 text-neutral-700 hover:text-red-600 hover:border-red-300 px-3.5 py-2 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
            >
              <Trash2 size={13} />
              <span>Xóa tất cả</span>
            </button>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto border-b border-neutral-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                <th className="py-3 pr-4">Sản phẩm</th>
                <th className="py-3 pr-4">Danh mục & Thương hiệu</th>
                <th className="py-3 pr-4 text-center">Tình trạng</th>
                <th className="py-3 pr-4 text-right">Đơn giá</th>
                <th className="py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-xs">
              {favoriteProducts.map((product) => {
                const isOutOfStock = product?.stock === 0;
                const itemInCart = getItemByProductId(product.id);
                const quantityInCart = itemInCart?.quantity ?? 0;
                const image = resolveProductImage(product.images?.[0]);
                const href = `/product/${product.slug ?? product.id}`;
                const hasDiscount =
                  product.discount > 0 ||
                  (product.finalPrice && product.finalPrice < product.price);

                return (
                  <tr
                    key={product.id}
                    className="hover:bg-neutral-50/50 transition-colors"
                  >
                    {/* 1. Sản phẩm */}
                    <td className="py-4 pr-4">
                      <div className="flex items-start gap-3">
                        <Link href={href} className="shrink-0">
                          <ProductThumb src={image} alt={product.name} />
                        </Link>
                        <div className="min-w-0">
                          <Link
                            href={href}
                            className="font-semibold text-neutral-900 hover:text-shop_dark_green transition-colors line-clamp-2"
                          >
                            {product.name}
                          </Link>
                          {product.brand && (
                            <span className="mt-1 inline-block text-[11px] text-neutral-500">
                              Hãng: <strong className="text-neutral-700">{product.brand}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 2. Danh mục & Thương hiệu */}
                    <td className="py-4 pr-4 text-xs text-neutral-600 align-middle">
                      <span>{product.categories?.join(", ") || "—"}</span>
                    </td>

                    {/* 3. Tình trạng */}
                    <td className="py-4 pr-4 text-center align-middle whitespace-nowrap text-xs">
                      {isOutOfStock ? (
                        <span className="font-semibold text-red-600">Hết hàng</span>
                      ) : (
                        <span className="font-semibold text-shop_dark_green">Còn hàng</span>
                      )}
                    </td>

                    {/* 4. Đơn giá */}
                    <td className="py-4 pr-4 text-right align-middle whitespace-nowrap">
                      {hasDiscount && (
                        <p className="text-[11px] text-neutral-400 line-through">
                          {formatPrice(product.price)}
                        </p>
                      )}
                      <p className="font-bold text-sm text-neutral-900">
                        {formatPrice(product.finalPrice || product.price)}
                      </p>
                    </td>

                    {/* 5. Thao tác */}
                    <td className="py-4 text-right align-middle whitespace-nowrap">
                      <div className="flex items-center justify-end gap-3">
                        {itemInCart && quantityInCart > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center border border-neutral-300 bg-white">
                              <button
                                type="button"
                                onClick={() =>
                                  updateQuantity(itemInCart.id, quantityInCart - 1)
                                }
                                aria-label="Giảm số lượng"
                                className="flex h-7 w-7 items-center justify-center text-neutral-600 hover:bg-neutral-100 hover:text-shop_dark_green transition-colors"
                              >
                                <Minus size={13} />
                              </button>
                              <span className="w-8 text-center text-xs font-semibold tabular-nums text-neutral-900">
                                {quantityInCart}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  updateQuantity(itemInCart.id, quantityInCart + 1)
                                }
                                disabled={
                                  quantityInCart >=
                                  (itemInCart.stockQuantity ?? product.stock ?? Infinity)
                                }
                                aria-label="Tăng số lượng"
                                className="flex h-7 w-7 items-center justify-center text-neutral-600 hover:bg-neutral-100 hover:text-shop_dark_green transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                <Plus size={13} />
                              </button>
                            </div>
                            <Link
                              href="/cart"
                              className="inline-flex items-center gap-1 bg-shop_dark_green text-white px-3 py-1.5 text-xs font-semibold hover:bg-shop_dark_green/90 transition-colors"
                              title="Xem giỏ hàng"
                            >
                              <ShoppingCart size={13} />
                              <span>Giỏ hàng</span>
                            </Link>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAddToCartSingle(product)}
                            disabled={isOutOfStock || addingId === product.id}
                            className="inline-flex items-center gap-1.5 bg-shop_dark_green text-white px-3.5 py-1.5 text-xs font-semibold hover:bg-shop_dark_green/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <ShoppingCart size={13} />
                            <span>
                              {isOutOfStock
                                ? "Hết hàng"
                                : addingId === product.id
                                ? "Đang thêm..."
                                : "Thêm vào giỏ"}
                            </span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(product.id, product.name)}
                          aria-label="Bỏ khỏi yêu thích"
                          className="text-neutral-400 hover:text-red-600 transition-colors p-1"
                          title="Xóa khỏi yêu thích"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile List View */}
        <div className="md:hidden divide-y divide-neutral-200 border-t border-neutral-200">
          {favoriteProducts.map((product) => {
            const isOutOfStock = product?.stock === 0;
            const itemInCart = getItemByProductId(product.id);
            const quantityInCart = itemInCart?.quantity ?? 0;
            const image = resolveProductImage(product.images?.[0]);
            const href = `/product/${product.slug ?? product.id}`;
            const hasDiscount =
              product.discount > 0 ||
              (product.finalPrice && product.finalPrice < product.price);

            return (
              <div key={product.id} className="py-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Link href={href} className="shrink-0">
                    <ProductThumb src={image} alt={product.name} />
                  </Link>

                  <div className="flex-1 min-w-0">
                    <Link
                      href={href}
                      className="text-xs font-semibold text-neutral-900 hover:text-shop_dark_green transition-colors line-clamp-2"
                    >
                      {product.name}
                    </Link>

                    <div className="mt-1 flex items-center gap-2">
                      {isOutOfStock ? (
                        <span className="text-[11px] font-semibold text-red-600">
                          Hết hàng
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-shop_dark_green">
                          Còn hàng
                        </span>
                      )}
                      {product.brand && (
                        <span className="text-[11px] text-neutral-500">
                          — {product.brand}
                        </span>
                      )}
                    </div>

                    <div className="mt-1.5 flex items-baseline gap-2">
                      <span className="text-sm font-bold text-neutral-900">
                        {formatPrice(product.finalPrice || product.price)}
                      </span>
                      {hasDiscount && (
                        <span className="text-xs text-neutral-400 line-through">
                          {formatPrice(product.price)}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(product.id, product.name)}
                    className="text-neutral-400 hover:text-red-600 p-1"
                    title="Xóa"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Mobile Actions */}
                <div className="pt-2 border-t border-neutral-100 flex items-center justify-end">
                  {itemInCart && quantityInCart > 0 ? (
                    <div className="flex items-center gap-2 w-full justify-between">
                      <div className="flex items-center border border-neutral-300 bg-white">
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(itemInCart.id, quantityInCart - 1)
                          }
                          aria-label="Giảm"
                          className="flex h-7 w-7 items-center justify-center text-neutral-600 hover:bg-neutral-100"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="w-8 text-center text-xs font-semibold tabular-nums text-neutral-900">
                          {quantityInCart}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(itemInCart.id, quantityInCart + 1)
                          }
                          disabled={
                            quantityInCart >=
                            (itemInCart.stockQuantity ?? product.stock ?? Infinity)
                          }
                          aria-label="Tăng"
                          className="flex h-7 w-7 items-center justify-center text-neutral-600 hover:bg-neutral-100 disabled:opacity-30"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                      <Link
                        href="/cart"
                        className="inline-flex items-center gap-1.5 bg-shop_dark_green text-white px-3 py-1.5 text-xs font-semibold hover:bg-shop_dark_green/90 transition-colors"
                      >
                        <ShoppingCart size={13} />
                        <span>Xem giỏ hàng</span>
                      </Link>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleAddToCartSingle(product)}
                      disabled={isOutOfStock || addingId === product.id}
                      className="w-full inline-flex items-center justify-center gap-1.5 bg-shop_dark_green text-white py-2 text-xs font-semibold hover:bg-shop_dark_green/90 transition-colors disabled:opacity-40"
                    >
                      <ShoppingCart size={13} />
                      <span>
                        {isOutOfStock
                          ? "Sản phẩm hết hàng"
                          : addingId === product.id
                          ? "Đang thêm..."
                          : "Thêm vào giỏ hàng"}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Actions */}
        <div className="mt-8 flex items-center justify-between">
          <Link
            href="/shop"
            className="border border-shop_dark_green text-shop_dark_green hover:bg-shop_dark_green hover:text-white px-5 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors inline-block"
          >
            &larr; Tiếp tục mua sắm
          </Link>

          <Link
            href="/cart"
            className="bg-shop_dark_green text-white hover:bg-shop_dark_green/90 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors inline-flex items-center gap-2"
          >
            <ShoppingCart size={14} />
            <span>Đến giỏ hàng &rarr;</span>
          </Link>
        </div>
      </div>

      {/* Confirmation Dialog: Xóa tất cả */}
      {isConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => !isResetting && setIsConfirmOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md border border-neutral-300 bg-white p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3 mb-3">
              <h2 className="text-sm font-bold uppercase tracking-tight text-neutral-900">
                Xóa toàn bộ danh sách yêu thích?
              </h2>
              <button
                onClick={() => setIsConfirmOpen(false)}
                disabled={isResetting}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-neutral-600 mb-5">
              Tất cả {favoriteProducts.length} sản phẩm trong danh sách yêu thích sẽ bị xóa. Hành động này không thể hoàn tác.
            </p>
            <div className="flex items-center justify-end gap-2 border-t border-neutral-200 pt-3">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                disabled={isResetting}
                className="border border-neutral-300 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-50"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                disabled={isResetting}
                className="bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isResetting ? "Đang xóa..." : "Xác nhận xóa tất cả"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WishlistPage;