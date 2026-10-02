"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Product } from "@/app/data/types";
import { useAuth } from "@/context/AuthContext";
import {
  getFavorites,
  addFavorite as addFavoriteApi,
  removeFavorite as removeFavoriteApi,
  removeAllFavorites as removeAllFavoritesApi,
} from "@/lib/api";

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
      .catch(() => {
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

  const addToFavorite = useCallback(
    async (product: FavoriteProduct) => {

      if (!isSignedIn) return;

      setFavoriteProducts((prev) =>
        prev.some((p) => p.id === product.id) ? prev : [...prev, product]
      );

      try {
        await addFavoriteApi(product.id);
      } catch (err) {
        setFavoriteProducts((prev) => prev.filter((p) => p.id !== product.id));

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
        setFavoriteProducts(prevProducts);

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
      setFavoriteProducts(prevProducts);

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