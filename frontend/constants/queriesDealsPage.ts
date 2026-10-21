
import { getAllProductsByCategory } from "../lib/api";
import type { Product } from "../app/data/types";

export const getHotProducts = async (): Promise<Product[]> => {
  try {
    const products = await getAllProductsByCategory(undefined, true);
    return products.filter((product) => Boolean(product.isFeatured));
  } catch {
    return [];
  }
};