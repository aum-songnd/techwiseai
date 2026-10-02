import React, { Suspense } from "react";
import Shop from "../../../components/Shop";
import {
  getAllProducts,
  getCategories,
} from "@/constants/queriesShopPage";
import type { Product, Category } from "@/app/data/types";

const ShopPage = async () => {
  let products: Product[] = [];
  let categories: Category[] = [];
  let loadError: string | null = null;

  const [productsResult, categoriesResult] = await Promise.allSettled([
    getAllProducts(),
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
        <Shop products={products} categories={categories} />
      </Suspense>
    </div>
  );
};

export default ShopPage;