// constants/queriesDealsPage.ts
import { products } from "../app/data/index";
import type { Product } from "../app/data/types";

export const getHotProducts = async (): Promise<Product[]> => {
  return products.filter((product) => product.status === "hot");
};

