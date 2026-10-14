import React, { Suspense } from "react";
import Shop from "../../../components/Shop";
import {
  getAllProductsByCategory,
  getCategories,
} from "@/constants/queriesShopPage";
import type { Product, Category } from "@/app/data/types";

type ShopPageProps = {
  searchParams: Promise<{ category?: string }>;
};

const ShopPage = async ({ searchParams }: ShopPageProps) => {
  const { category } = await searchParams;
  let products: Product[] = [];
  let categories: Category[] = [];
  let loadError: string | null = null;

  const [productsResult, categoriesResult] = await Promise.allSettled([
    getAllProductsByCategory(category),
    getCategories(),
  ]);

  if (productsResult.status === "fulfilled") {
    products = productsResult.value;
  } else {
    loadError = "Không tải được danh sách sản phẩm. Vui lòng thử lại sau.";
  }

  if (categoriesResult.status === "fulfilled") {
    categories = categoriesResult.value;
  }

  if (loadError) {
    return (
      <div className="bg-white min-h-[50vh] flex items-center justify-center px-4">
        <p className="text-sm text-red-600 text-center">{loadError}</p>
      </div>
    );
  }

  return (
    <div className="bg-white">
      <Suspense fallback={null}>
        <Shop
          products={products}
          categories={categories}
        />
      </Suspense>
    </div>
  );
};

export default ShopPage;