"use client";
import React, { useEffect, useState } from "react";
import ProductCard from "./ProductCard";
import { motion, AnimatePresence } from "motion/react";
import NoProductAvailable from "./NoProductAvailable";
import Container from "./Container";
import HomeTabBar from "./HomeTabBar";
import { getProducts, getCategories } from "../lib/api";
import { Product } from "../app/data/types";

type ProductWithCategories = Product & {
  categories?: string[];
  categoryIds?: string[];
};

type Tab = { id: string; title: string };

const ProductGrid = () => {
  const [allProducts, setAllProducts] = useState<ProductWithCategories[]>([]);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [selectedTabId, setSelectedTabId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      setLoading(true);
      setErrorMessage(null);
      try {
        const [products, categories] = await Promise.all([
          getProducts(),
          getCategories(),
        ]);

        if (ignore) return;

        setAllProducts(products as ProductWithCategories[]);

        const dynamicTabs: Tab[] = categories.map((c) => ({
          id: c.id,
          title: c.title,
        }));
        setTabs(dynamicTabs);

        // Mặc định chọn category đầu tiên thay vì "Tất cả"
        if (dynamicTabs.length > 0) {
          setSelectedTabId(dynamicTabs[0].id);
        }
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

    loadData();
    return () => {
      ignore = true;
    };
  }, []);

  const products = React.useMemo(() => {
    if (!selectedTabId) return [];

    return allProducts
      .filter((p) => p.categoryIds?.includes(selectedTabId))
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allProducts, selectedTabId]);

  const selectedTabTitle =
    tabs.find((t) => t.id === selectedTabId)?.title ?? "";

  return (
    <Container className="flex flex-col lg:px-0 my-10">
      <HomeTabBar
        tabs={tabs.map((t) => t.title)}
        selectedTab={selectedTabTitle}
        onTabSelect={(title: string) => {
          const matched = tabs.find((t) => t.title === title);
          if (matched) setSelectedTabId(matched.id);
        }}
      />

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
        <NoProductAvailable selectedTab={selectedTabTitle} />
      )}
    </Container>
  );
};

export default ProductGrid;