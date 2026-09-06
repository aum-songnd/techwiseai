import React, { Suspense } from "react";
import Shop from "../../../components/Shop";
import { getAllProducts, getCategories, getAllBrands } from "@/constants/queriesShopPage";

const ShopPage = async () => {
  const [products, categories, brands] = await Promise.all([
    getAllProducts(),
    getCategories(),
    getAllBrands(),
  ]);

  return (
    <div className="bg-white">
      <Suspense fallback={null}>
        <Shop products={products} categories={categories} brands={brands} />
      </Suspense>
    </div>
  );
};

export default ShopPage;