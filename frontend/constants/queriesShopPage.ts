

import {
  getProducts,
  getAllProductsByCategory as getAllProductsByCategoryFromApi,
  getCategories as getCategoriesFromApi,
  getBrands,
} from "@/lib/api";
import type { Product, Brand } from "../app/data/types";

export const getAllProducts = getProducts;

export const getAllProductsByCategory = getAllProductsByCategoryFromApi;

export const getCategories = getCategoriesFromApi;

export const getAllBrands = async (): Promise<Brand[]> => {
  try {
    return await getBrands();
  } catch {

    return [];
  }
};

export const getFeaturedProducts = async (): Promise<Product[]> => {
  const products = await getAllProducts();
  return products.filter((p) => p.isFeatured);
};

export const getProductsByCategory = async (
  categorySlug: string
): Promise<Product[]> => {
  const [products, categories] = await Promise.all([
    getAllProducts(),
    getCategories(),
  ]);
  const category = categories.find((c) => c.slug === categorySlug);
  if (!category) return [];

  return products.filter((p) => p.categories?.includes(category.title));
};

export const getProductsByBrand = async (
  brandSlug: string
): Promise<Product[]> => {
  const [products, brands] = await Promise.all([
    getAllProducts(),
    getAllBrands(),
  ]);
  const brand = brands.find((b) => b.slug === brandSlug);
  if (!brand) return [];

  return products.filter((p) => p.brand === brand.title);
};

export { getProductBySlug } from "@/lib/api";