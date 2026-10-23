"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { Product } from "@/app/data/types";

interface CompareContextType {
  compareProducts: Product[];
  addToCompare: (product: Product) => boolean;
  removeFromCompare: (productId: string) => void;
  toggleCompare: (product: Product) => void;
  clearCompare: () => void;
  isComparing: (productId: string) => boolean;
  isCompareModalOpen: boolean;
  setCompareModalOpen: (open: boolean) => void;
}

const STORAGE_KEY = "techwise_compare_list";
const MAX_COMPARE = 4;

const CompareContext = createContext<CompareContextType | undefined>(undefined);

export const CompareProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [compareProducts, setCompareProducts] = useState<Product[]>([]);
  const [isCompareModalOpen, setCompareModalOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setCompareProducts(parsed);
        }
      }
    } catch {
      // ignore
    } finally {
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(compareProducts));
    } catch {
      // ignore
    }
  }, [compareProducts, isInitialized]);

  const isComparing = useCallback(
    (productId: string) => compareProducts.some((p) => p.id === productId),
    [compareProducts]
  );

  const addToCompare = useCallback((product: Product): boolean => {
    let success = false;
    setCompareProducts((prev) => {
      if (prev.some((p) => p.id === product.id)) return prev;
      if (prev.length >= MAX_COMPARE) {
        return prev;
      }
      success = true;
      return [...prev, product];
    });
    return success;
  }, []);

  const removeFromCompare = useCallback((productId: string) => {
    setCompareProducts((prev) => prev.filter((p) => p.id !== productId));
  }, []);

  const toggleCompare = useCallback(
    (product: Product) => {
      if (isComparing(product.id)) {
        removeFromCompare(product.id);
      } else {
        addToCompare(product);
      }
    },
    [isComparing, removeFromCompare, addToCompare]
  );

  const clearCompare = useCallback(() => {
    setCompareProducts([]);
  }, []);

  return (
    <CompareContext.Provider
      value={{
        compareProducts,
        addToCompare,
        removeFromCompare,
        toggleCompare,
        clearCompare,
        isComparing,
        isCompareModalOpen,
        setCompareModalOpen,
      }}
    >
      {children}
    </CompareContext.Provider>
  );
};

export const useCompare = () => {
  const context = useContext(CompareContext);
  if (!context) {
    throw new Error("useCompare must be used within a CompareProvider");
  }
  return context;
};
