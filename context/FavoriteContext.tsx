"use client";

/**
 * FavoriteContext — quản lý danh sách sản phẩm yêu thích (wishlist)
 * Lưu hoàn toàn trên trình duyệt bằng localStorage, KHÔNG cần API/backend,
 * KHÔNG cần đăng nhập.
 *
 * Cách dùng: bọc app bằng <FavoriteProvider> trong app/layout.tsx,
 * rồi gọi useFavorite() ở bất kỳ component client nào.
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

// Product gốc (types.ts) chỉ khai báo categoryIds/brandId, nhưng API thật
// (lib/api.ts -> mapProduct) trả thêm categories (tên danh mục dạng string[]),
// brand (string thô) và description, gán qua "as unknown as Product" nên
// TypeScript không thấy các field này. Khai báo mở rộng ở đây, giống hệt
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
  addToFavorite: (product: FavoriteProduct) => void;
  removeFromFavorite: (productId: string) => void;
  toggleFavorite: (product: FavoriteProduct) => void;
  resetFavorite: () => void;
}

const FavoriteContext = createContext<FavoriteContextType | undefined>(
  undefined
);

const STORAGE_KEY = "shopcart_favorites"; // === ĐỔI Ở ĐÂY === nếu muốn đổi tên key

export const FavoriteProvider = ({ children }: { children: React.ReactNode }) => {
  const [favoriteProducts, setFavoriteProducts] = useState<FavoriteProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Đọc dữ liệu từ localStorage khi app khởi động (chỉ chạy ở client)
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setFavoriteProducts(JSON.parse(raw));
      }
    } catch (err) {
      console.error("Không đọc được wishlist từ localStorage:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Mỗi khi danh sách thay đổi -> lưu lại vào localStorage
  useEffect(() => {
    if (isLoading) return; // tránh ghi đè trống lên dữ liệu cũ trước khi đọc xong
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favoriteProducts));
    } catch (err) {
      console.error("Không lưu được wishlist vào localStorage:", err);
    }
  }, [favoriteProducts, isLoading]);

  const isFavorite = useCallback(
    (productId: string) => favoriteProducts.some((p) => p.id === productId),
    [favoriteProducts]
  );

  const addToFavorite = useCallback((product: FavoriteProduct) => {
    setFavoriteProducts((prev) =>
      prev.some((p) => p.id === product.id) ? prev : [...prev, product]
    );
  }, []);

  const removeFromFavorite = useCallback((productId: string) => {
    setFavoriteProducts((prev) => prev.filter((p) => p.id !== productId));
  }, []);

  const toggleFavorite = useCallback(
    (product: FavoriteProduct) => {
      if (isFavorite(product.id)) {
        removeFromFavorite(product.id);
      } else {
        addToFavorite(product);
      }
    },
    [isFavorite, addToFavorite, removeFromFavorite]
  );

  const resetFavorite = useCallback(() => {
    setFavoriteProducts([]);
  }, []);

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