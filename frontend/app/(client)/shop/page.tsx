import React, { Suspense } from "react";
import Shop from "../../../components/Shop";
import {
  getAllProducts,
  getCategories,
  getAllBrands,
} from "@/constants/queriesShopPage";
import type { Product, Category, Brand } from "@/app/data/types";

const ShopPage = async () => {
  let products: Product[] = [];
  let categories: Category[] = [];
  let brands: Brand[] = [];
  let loadError: string | null = null;

  try {
    // Promise.allSettled thay vì Promise.all: một API lỗi (vd /brands chưa
    // có) sẽ không kéo sập luôn cả products/categories đang chạy tốt.
    const [productsResult, categoriesResult, brandsResult] =
      await Promise.allSettled([
        getAllProducts(),
        getCategories(),
        getAllBrands(),
      ]);

    if (productsResult.status === "fulfilled") {
      products = productsResult.value;
    } else {
      console.error("[ShopPage] Lỗi lấy products:", productsResult.reason);
      loadError = "Không tải được danh sách sản phẩm. Vui lòng thử lại sau.";
    }

    if (categoriesResult.status === "fulfilled") {
      categories = categoriesResult.value;
    } else {
      console.error("[ShopPage] Lỗi lấy categories:", categoriesResult.reason);
    }

    if (brandsResult.status === "fulfilled") {
      brands = brandsResult.value;
    } else {
      console.error("[ShopPage] Lỗi lấy brands:", brandsResult.reason);
    }
  } catch (error) {
    console.error("[ShopPage] Lỗi không xác định:", error);
    loadError = "Đã có lỗi xảy ra. Vui lòng thử lại sau.";
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
        <Shop products={products} categories={categories} brands={brands} />
      </Suspense>
    </div>
  );
};

export default ShopPage;