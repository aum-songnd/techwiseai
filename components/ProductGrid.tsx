"use client";
import React, { useEffect, useState } from "react";
import ProductCard from "./ProductCard";
import { motion, AnimatePresence } from "motion/react";
import NoProductAvailable from "./NoProductAvailable";
import Container from "./Container";
import HomeTabBar from "./HomeTabBar";
import { productType } from "@/constants/data";
import { getProducts } from "../lib/api";
import { Product } from "../app/data/types";

type ProductWithCategories = Product & { categories?: string[] };

const ProductGrid = () => {
  const [allProducts, setAllProducts] = useState<ProductWithCategories[]>([]);
  const [selectedTab, setSelectedTab] = useState(productType[0]?.title || "");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Gọi API thật 1 lần khi mount
  useEffect(() => {
    let ignore = false;

    async function loadProducts() {
      setLoading(true);
      setErrorMessage(null);
      try {
        const data = await getProducts();
        if (!ignore) setAllProducts(data as ProductWithCategories[]);
      } catch (err) {
        if (!ignore) {
          setErrorMessage(
            err instanceof Error ? err.message : "Lỗi không xác định"
          );
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadProducts();
    return () => {
      ignore = true;
    };
  }, []);

  // Lọc theo tab: nếu tab khớp tên category thì lọc, không thì hiện tất cả
  const products = React.useMemo(() => {
    const tab = selectedTab?.toLowerCase();
    if (!tab) return allProducts;

    const filtered = allProducts.filter((p) =>
      p.categories?.some((c) => c.toLowerCase() === tab)
    );

    return (filtered.length > 0 ? filtered : allProducts)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allProducts, selectedTab]);

  return (
    <Container className="flex flex-col lg:px-0 my-10">
      <HomeTabBar selectedTab={selectedTab} onTabSelect={setSelectedTab} />

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 mt-10">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col rounded-lg border border-gray-200 bg-white overflow-hidden animate-pulse"
            >
              <div className="aspect-square w-full bg-gray-200" />
              <div className="flex flex-col gap-2 p-3">
                <div className="h-3 w-1/3 bg-gray-200 rounded" />
                <div className="h-4 w-3/4 bg-gray-200 rounded" />
                <div className="h-4 w-1/2 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : errorMessage ? (
        <div className="p-6 text-center text-red-600 mt-10">
          Không tải được sản phẩm: {errorMessage}
        </div>
      ) : products?.length ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 mt-10">
          <>
            {products?.slice(0, 20).map((product) => (
              <AnimatePresence key={product?.id}>
                <motion.div
                  layout
                  initial={{ opacity: 0.2 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <ProductCard key={product?.id} product={product} />
                </motion.div>
              </AnimatePresence>
            ))}
          </>
        </div>
      ) : (
        <NoProductAvailable selectedTab={selectedTab} />
      )}
    </Container>
  );
};

export default ProductGrid;