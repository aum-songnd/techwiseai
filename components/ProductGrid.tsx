"use client";
import React, { useEffect, useState } from "react";
import ProductCard from "./ProductCard";
import { motion, AnimatePresence } from "motion/react";
import NoProductAvailable from "./NoProductAvailable";
import Container from "./Container";
import HomeTabBar from "./HomeTabBar";
import { getProducts, getCategories } from "../lib/api";
import { Product } from "../app/data/types";

// slugs: 1 tab có thể gộp nhiều category (vd tab "Khác" gộp Tai nghe,
// Máy ảnh, Linh kiện, Phụ kiện) nên dùng mảng thay vì 1 slug đơn.
type Tab = { key: string; title: string; slugs: string[] };

const PRODUCTS_LIMIT = 20;

// Các danh mục đã có mặt ở khối "Danh mục phổ biến" (HomeCategories) nên
// không cần tách tab riêng ở đây nữa — gộp chung vào 1 tab "Khác".
const OTHER_CATEGORY_TITLES = ["Tai nghe", "Máy ảnh", "Linh kiện", "Phụ kiện"];
const OTHER_TAB_KEY = "khac";
const OTHER_TAB_TITLE = "Khác";

const ProductGrid = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [selectedTabKey, setSelectedTabKey] = useState<string | null>(null);

  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);

  // Bước 1: tải danh sách category để dựng tab bar, chọn tab đầu tiên
  // làm mặc định (giống hành vi cũ). Các category thuộc
  // OTHER_CATEGORY_TITLES được gộp chung vào 1 tab "Khác" duy nhất.
  useEffect(() => {
    let ignore = false;

    async function loadCategories() {
      setLoadingCategories(true);
      setCategoriesError(null);
      try {
        const categories = await getCategories();
        if (ignore) return;

        const mainCategories = categories.filter(
          (c) => !OTHER_CATEGORY_TITLES.includes(c.title)
        );
        const otherCategories = categories.filter((c) =>
          OTHER_CATEGORY_TITLES.includes(c.title)
        );

        const dynamicTabs: Tab[] = mainCategories.map((c) => ({
          key: c.slug,
          title: c.title,
          slugs: [c.slug],
        }));

        if (otherCategories.length > 0) {
          dynamicTabs.push({
            key: OTHER_TAB_KEY,
            title: OTHER_TAB_TITLE,
            slugs: otherCategories.map((c) => c.slug),
          });
        }

        setTabs(dynamicTabs);

        if (dynamicTabs.length > 0) {
          setSelectedTabKey(dynamicTabs[0].key);
        }
      } catch (err) {
        if (!ignore) {
          setCategoriesError(
            err instanceof Error ? err.message : "Lỗi không xác định"
          );
        }
      } finally {
        if (!ignore) setLoadingCategories(false);
      }
    }

    loadCategories();
    return () => {
      ignore = true;
    };
  }, []);

  // Bước 2: mỗi khi tab đổi, gọi API /products lọc theo ?category=<slug>
  // ở SERVER cho từng slug thuộc tab đó (tab thường chỉ có 1 slug, riêng
  // tab "Khác" có nhiều slug), rồi gộp + sắp xếp lại kết quả.
  useEffect(() => {
    const selectedTab = tabs.find((t) => t.key === selectedTabKey);
    if (!selectedTab) return;

    let ignore = false;

    async function loadProducts() {
      setLoadingProducts(true);
      setProductsError(null);
      try {
        const resultsBySlug = await Promise.all(
          selectedTab!.slugs.map((slug) =>
            getProducts({ category: slug, size: PRODUCTS_LIMIT })
          )
        );
        if (ignore) return;

        const merged = resultsBySlug.flat();
        const sorted = merged
          .sort((a, b) => a.name.localeCompare(b.name))
          .slice(0, PRODUCTS_LIMIT);
        setProducts(sorted);
      } catch (err) {
        if (!ignore) {
          setProductsError(
            err instanceof Error ? err.message : "Lỗi không xác định"
          );
        }
      } finally {
        if (!ignore) setLoadingProducts(false);
      }
    }

    loadProducts();
    return () => {
      ignore = true;
    };
  }, [selectedTabKey, tabs]);

  const selectedTabTitle =
    tabs.find((t) => t.key === selectedTabKey)?.title ?? "";

  const loading = loadingCategories || loadingProducts;
  const errorMessage = categoriesError ?? productsError;

  return (
    <Container className="flex flex-col lg:px-0 my-10">
      <HomeTabBar
        tabs={tabs.map((t) => t.title)}
        selectedTab={selectedTabTitle}
        onTabSelect={(title: string) => {
          const matched = tabs.find((t) => t.title === title);
          if (matched) setSelectedTabKey(matched.key);
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
            {products.slice(0, PRODUCTS_LIMIT).map((product) => (
              <AnimatePresence key={product?.id}>
                <motion.div
                  layout
                  initial={{ opacity: 0.2 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full"
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