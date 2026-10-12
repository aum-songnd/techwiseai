"use client";

/**
 * FavoriteContext — quản lý danh sách sản phẩm yêu thích (wishlist).
 *
 * ĐÃ CHUYỂN từ localStorage sang gọi API backend (module Favorites, mục 7
 * trong đặc tả API). Wishlist giờ gắn theo user đã đăng nhập:
 *  - Đăng nhập xong -> tự tải wishlist từ server.
 *  - Đăng xuất -> danh sách được xoá khỏi state (không xoá dữ liệu trên server).
 *  - Thêm/xoá đều gọi API, có cập nhật lạc quan (optimistic update) để UI
 *    phản hồi ngay, và tự rollback nếu API lỗi.
 *
 * Cách dùng: bọc app bằng <FavoriteProvider> trong app/layout.tsx (đặt BÊN
 * TRONG <AuthProvider>, vì context này cần useAuth), rồi gọi useFavorite()
 * ở bất kỳ component client nào.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Product } from "@/app/data/types";
import { useAuth } from "@/context/AuthContext"; // === ĐỔI Ở ĐÂY === nếu path/tên khác
import {
  getFavorites,
  addFavorite as addFavoriteApi,
  removeFavorite as removeFavoriteApi,
  removeAllFavorites as removeAllFavoritesApi,
} from "@/lib/api"; // === ĐỔI Ở ĐÂY === nếu path api.ts khác

// Product gốc (types.ts) chỉ khai báo categoryIds/brandId, nhưng API thật
// (lib/api.ts -> mapProduct) trả thêm categories (tên danh mục dạng string[]),
// brand (string thô) và description. Khai báo mở rộng ở đây, giống hệt
// pattern `ApiProduct` trong trang chi tiết sản phẩm của bạn.
export type FavoriteProduct = Product & {
  categories?: string[];
  brand?: string;
  description?: string;
};

interface FavoriteContextType {
  favoriteProducts: FavoriteProduct[];
  favoriteCount: number;
  isLoading: boolean;
  isFavorite: (productId: string) => boolean;
  addToFavorite: (product: FavoriteProduct) => Promise<void>;
  removeFromFavorite: (productId: string) => Promise<void>;
  toggleFavorite: (product: FavoriteProduct) => Promise<void>;
  resetFavorite: () => Promise<void>;
}

const FavoriteContext = createContext<FavoriteContextType | undefined>(
  undefined
);

export const FavoriteProvider = ({ children }: { children: React.ReactNode }) => {
  const { isSignedIn, isLoading: isAuthLoading } = useAuth();
  const [favoriteProducts, setFavoriteProducts] = useState<FavoriteProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Đợi AuthContext xác định xong trạng thái đăng nhập rồi mới quyết định:
  // đã đăng nhập -> tải wishlist từ server; chưa đăng nhập -> để rỗng.
  useEffect(() => {
    if (isAuthLoading) return;

    if (!isSignedIn) {
      setFavoriteProducts([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    getFavorites()
      .then((products) => {
        if (!cancelled) setFavoriteProducts(products);
      })
      .catch((err) => {
        console.error("Không tải được danh sách yêu thích:", err);
        if (!cancelled) setFavoriteProducts([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isSignedIn, isAuthLoading]);

  const isFavorite = useCallback(
    (productId: string) => favoriteProducts.some((p) => p.id === productId),
    [favoriteProducts]
  );

  // Cập nhật lạc quan: thêm vào UI ngay, gọi API nền; nếu lỗi thì rollback
  // lại và ném lỗi ra để nơi gọi (vd nút tim trên ProductCard) có thể hiện
  // thông báo nếu muốn.
  const addToFavorite = useCallback(
    async (product: FavoriteProduct) => {
      // === ĐỔI Ở ĐÂY === nếu muốn tự điều hướng sang /sign-in ngay tại đây
      // khi user bấm tim lúc chưa đăng nhập, thay vì chỉ bỏ qua.
      if (!isSignedIn) return;

      setFavoriteProducts((prev) =>
        prev.some((p) => p.id === product.id) ? prev : [...prev, product]
      );

      try {
        await addFavoriteApi(product.id);
      } catch (err) {
        setFavoriteProducts((prev) => prev.filter((p) => p.id !== product.id));
        console.error("Không thêm được vào yêu thích:", err);
        throw err;
      }
    },
    [isSignedIn]
  );

  const removeFromFavorite = useCallback(
    async (productId: string) => {
      const prevProducts = favoriteProducts;
      setFavoriteProducts((prev) => prev.filter((p) => p.id !== productId));

      try {
        await removeFavoriteApi(productId);
      } catch (err) {
        setFavoriteProducts(prevProducts); // rollback
        console.error("Không xoá được khỏi yêu thích:", err);
        throw err;
      }
    },
    [favoriteProducts]
  );

  const toggleFavorite = useCallback(
    async (product: FavoriteProduct) => {
      if (isFavorite(product.id)) {
        await removeFromFavorite(product.id);
      } else {
        await addToFavorite(product);
      }
    },
    [isFavorite, addToFavorite, removeFromFavorite]
  );

  const resetFavorite = useCallback(async () => {
    const prevProducts = favoriteProducts;
    setFavoriteProducts([]);

    try {
      await removeAllFavoritesApi();
    } catch (err) {
      setFavoriteProducts(prevProducts); // rollback
      console.error("Không xoá được toàn bộ danh sách yêu thích:", err);
      throw err;
    }
  }, [favoriteProducts]);

  const value = useMemo(
    () => ({
      favoriteProducts,
      favoriteCount: favoriteProducts.length,
      isLoading,
      isFavorite,
      addToFavorite,
      removeFromFavorite,
      toggleFavorite,
      resetFavorite,
    }),
    [
      favoriteProducts,
      isLoading,
      isFavorite,
      addToFavorite,
      removeFromFavorite,
      toggleFavorite,
      resetFavorite,
    ]
  );

  return (
    <FavoriteContext.Provider value={value}>
      {children}
    </FavoriteContext.Provider>
  );
};

export const useFavorite = () => {
  const context = useContext(FavoriteContext);
  if (!context) {
    throw new Error("useFavorite phải được dùng bên trong <FavoriteProvider>");
  }
  return context;
};