// constants/queriesDealsPage.ts
import { getAllProductsByCategory } from "../lib/api";
import type { Product } from "../app/data/types";

export const getHotProducts = async (): Promise<Product[]> => {
  try {
    const products = await getAllProductsByCategory();
    return products.filter((product) => product.status === "hot");
  } catch {
    return [];
  }
};