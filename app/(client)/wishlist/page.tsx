"use client";

/**
 * Trang: Sản phẩm yêu thích (Wishlist)
 * Route gợi ý: app/(client)/wishlist/page.tsx  ->  /wishlist
 *
 * File này được viết dựa theo phong cách code có sẵn của bạn
 * (Header.tsx, HeaderMenu.tsx, AddToCart.tsx) và đúng bố cục trong ảnh chụp
 * màn hình bạn gửi: bảng có cột Image / Category / Type / Status / Price / Action
 * + nút "Reset Favorite" bên dưới.
 *
 * ⚠️ GIẢ ĐỊNH CẦN KIỂM TRA LẠI:
 * Dự án của bạn đã có <FavoriteButton /> trong Header nên chắc chắn đã có
 * một Context quản lý danh sách yêu thích (giống CartContext). Mình giả định
 * nó tên là `FavoriteContext` với hook `useFavorite()` trả về:
 *   - favoriteProducts: Product[]           -> danh sách sản phẩm yêu thích
 *   - removeFromFavorite(productId: string) -> bỏ 1 sản phẩm khỏi wishlist
 *   - resetFavorite()                       -> xoá toàn bộ wishlist
 *   - isLoading?: boolean
 *
 * Nếu hook/context thật của bạn có tên hàm khác, chỉ cần đổi lại phần
 * import + destructure bên dưới (đã đánh dấu === ĐỔI Ở ĐÂY ===), phần UI
 * không cần đụng vào.
 *
 * Đã cập nhật theo type Product thật (lib/api.ts):
 *   - ảnh nằm ở `images: string[]` (không phải `image` số ít)
 *   - không có field `type` -> đổi cột "Type" thành "Brand" (`brand?: string`)
 *   - `categories: string[]` đã là tên category sẵn, không cần optional nữa
 */

import React, { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import Container from "@/components/Container";
import AddToCart from "@/components/AddToCart";
import { useFavorite, FavoriteProduct } from "@/context/FavoriteContext"; // === ĐỔI Ở ĐÂY === nếu path/tên khác
import { useAuth } from "@/context/AuthContext";

const formatPrice = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);

const WishlistPage = () => {
  const router = useRouter();
  const { isSignedIn, isLoading: isAuthLoading } = useAuth();

  // Chưa đăng nhập -> điều hướng sang trang đăng nhập, kèm redirect quay
  // lại /wishlist sau khi đăng nhập xong, giống cách AddToCart.tsx đang làm.
  useEffect(() => {
    if (!isAuthLoading && !isSignedIn) {
      router.push(`/sign-in?redirect=${encodeURIComponent("/wishlist")}`);
    }
  }, [isAuthLoading, isSignedIn, router]);

  // === ĐỔI Ở ĐÂY === nếu tên field trong context của bạn khác
  const {
    favoriteProducts,
    removeFromFavorite,
    resetFavorite,
    isLoading,
  } = useFavorite() as {
    favoriteProducts: FavoriteProduct[];
    removeFromFavorite: (productId: string) => void;
    resetFavorite: () => void;
    isLoading?: boolean;
  };

  const hasItems = favoriteProducts && favoriteProducts.length > 0;

  // Đang kiểm tra đăng nhập hoặc chưa đăng nhập (đang chờ redirect) -> không
  // render nội dung wishlist để tránh nháy nội dung trước khi chuyển trang.
  if (isAuthLoading || !isSignedIn) {
    return (
      <div className="bg-white">
        <Container className="py-20">
          <p className="text-sm text-gray-500 text-center">
            Đang kiểm tra đăng nhập...
          </p>
        </Container>
      </div>
    );
  }

  return (
    <div className="bg-white">
      <Container className="py-10">
        <h1 className="text-2xl font-bold text-darkColor mb-6">
          Sản phẩm yêu thích
        </h1>

        {isLoading ? (
          <p className="text-sm text-gray-500 py-10 text-center">
            Đang tải danh sách yêu thích...
          </p>
        ) : !hasItems ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <p className="text-gray-500">
              Bạn chưa thêm sản phẩm nào vào danh sách yêu thích.
            </p>
            <Link
              href="/"
              className="px-5 py-2.5 rounded-md bg-shop_dark_green text-white text-sm font-medium hover:bg-shop_light_green hoverEffect"
            >
              Tiếp tục mua sắm
            </Link>
          </div>
        ) : (
          <>
            {/* ===== Bảng desktop ===== */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-sm text-gray-600">
                    <th className="py-3 pr-4 font-semibold">Image</th>
                    <th className="py-3 pr-4 font-semibold">Category</th>
                    <th className="py-3 pr-4 font-semibold">Brand</th>
                    <th className="py-3 pr-4 font-semibold">Status</th>
                    <th className="py-3 pr-4 font-semibold">Price</th>
                    <th className="py-3 pr-4 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {favoriteProducts.map((product) => {
                    const isOutOfStock = product?.stock === 0;
                    return (
                      <tr
                        key={product.id}
                        className="border-b border-gray-100 align-middle"
                      >
                        <td className="py-4 pr-4">
                          <div className="flex items-center gap-4">
                            <button
                              onClick={() => removeFromFavorite(product.id)}
                              aria-label="Bỏ khỏi yêu thích"
                              className="text-gray-400 hover:text-red-500 hoverEffect"
                            >
                              <X size={16} />
                            </button>
                            {product.images?.[0] ? (
                              <Image
                                src={product.images[0]}
                                alt={product.name}
                                width={60}
                                height={60}
                                className="rounded-md border border-gray-100 object-cover w-[60px] h-[60px]"
                              />
                            ) : (
                              <div className="w-[60px] h-[60px] rounded-md bg-gray-100" />
                            )}
                            <Link
                              href={`/product/${product.slug ?? product.id}`}
                              className="text-sm font-medium text-darkColor hover:text-shop_light_green hoverEffect line-clamp-2 max-w-[260px]"
                            >
                              {product.name}
                            </Link>
                          </div>
                        </td>
                        <td className="py-4 pr-4 text-sm text-gray-600">
                          {product.categories?.join(", ") ?? "-"}
                        </td>
                        <td className="py-4 pr-4 text-sm text-gray-600">
                          {product.brand ?? "-"}
                        </td>
                        <td className="py-4 pr-4 text-sm font-medium">
                          <span
                            className={
                              isOutOfStock ? "text-red-500" : "text-shop_light_green"
                            }
                          >
                            {isOutOfStock ? "Hết hàng" : "In Stock"}
                          </span>
                        </td>
                        <td className="py-4 pr-4 text-sm font-semibold text-darkColor">
                          {formatPrice(product.price ?? 0)}
                        </td>
                        <td className="py-4 pr-4 w-[220px]">
                          <AddToCart product={product} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ===== Danh sách dạng thẻ cho mobile ===== */}
            <div className="md:hidden flex flex-col gap-4">
              {favoriteProducts.map((product) => {
                const isOutOfStock = product?.stock === 0;
                return (
                  <div
                    key={product.id}
                    className="border border-gray-100 rounded-lg p-4 flex flex-col gap-3"
                  >
                    <div className="flex items-start gap-3">
                      {product.images?.[0] ? (
                        <Image
                          src={product.images[0]}
                          alt={product.name}
                          width={64}
                          height={64}
                          className="rounded-md border border-gray-100 object-cover w-16 h-16"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-md bg-gray-100" />
                      )}
                      <div className="flex-1">
                        <Link
                          href={`/product/${product.slug ?? product.id}`}
                          className="text-sm font-medium text-darkColor hover:text-shop_light_green hoverEffect line-clamp-2"
                        >
                          {product.name}
                        </Link>
                        <p className="text-xs text-gray-500 mt-1">
                          {product.categories?.join(", ") ?? "-"}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <span
                            className={`text-xs font-medium ${
                              isOutOfStock
                                ? "text-red-500"
                                : "text-shop_light_green"
                            }`}
                          >
                            {isOutOfStock ? "Hết hàng" : "In Stock"}
                          </span>
                          <span className="text-sm font-semibold text-darkColor">
                            {formatPrice(product.price ?? 0)}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFromFavorite(product.id)}
                        aria-label="Bỏ khỏi yêu thích"
                        className="text-gray-400 hover:text-red-500 hoverEffect"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <AddToCart product={product} />
                  </div>
                );
              })}
            </div>

            {/* ===== Nút Reset Favorite ===== */}
            <div className="mt-8">
              <button
                onClick={resetFavorite}
                className="px-5 py-2.5 rounded-md border border-gray-300 text-sm font-medium text-darkColor hover:border-red-400 hover:text-red-500 hoverEffect"
              >
                Reset Favorite
              </button>
            </div>
          </>
        )}
      </Container>
    </div>
  );
};

export default WishlistPage;