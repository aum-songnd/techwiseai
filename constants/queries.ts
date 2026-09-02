// src/constants/queries.ts
import { products, categories, brands } from "../app/data/index";
import type { Product, Category, Brand } from "../app/data/types";

// giả lập độ trễ mạng như gọi API thật
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const getAllProducts = async (): Promise<Product[]> => {
  await delay(150);
  return products;
};

export const getCategories = async (): Promise<Category[]> => {
  await delay(150);
  return categories;
};

export const getAllBrands = async (): Promise<Brand[]> => {
  await delay(150);
  return brands;
};

export const getFeaturedProducts = async (): Promise<Product[]> => {
  await delay(150);
  return products.filter((p) => p.isFeatured);
};

export const getProductBySlug = async (slug: string): Promise<Product | null> => {
  await delay(150);
  return products.find((p) => p.slug === slug) ?? null;
};

export const getProductsByCategory = async (categorySlug: string): Promise<Product[]> => {
  await delay(150);
  const category = categories.find((c) => c.slug === categorySlug);
  if (!category) return [];
  return products.filter((p) => p.categoryIds.includes(category.id));
};

export const getProductsByBrand = async (brandSlug: string): Promise<Product[]> => {
  await delay(150);
  const brand = brands.find((b) => b.slug === brandSlug);
  if (!brand) return [];
  return products.filter((p) => p.brandId === brand.id);
};