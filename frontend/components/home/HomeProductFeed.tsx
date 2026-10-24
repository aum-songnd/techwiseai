"use client";

import { createContext, useContext } from "react";
import type { Product } from "@/app/data/types";

const HomeProductFeedContext = createContext<Product[] | null>(null);

export function HomeProductFeed({
  products,
  children,
}: {
  products: Product[];
  children: React.ReactNode;
}) {
  return (
    <HomeProductFeedContext.Provider value={products}>
      {children}
    </HomeProductFeedContext.Provider>
  );
}

export function useOptionalHomeProductFeed() {
  return useContext(HomeProductFeedContext);
}

export function useHomeProductFeed() {
  const products = useOptionalHomeProductFeed();
  if (!products) {
    throw new Error("HomeProductFeed is required for this component");
  }
  return products;
}