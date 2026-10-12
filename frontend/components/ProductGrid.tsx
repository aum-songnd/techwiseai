"use client";
import React, { useEffect, useState } from "react";
import ProductCard from "./ProductCard";
import { motion, AnimatePresence } from "motion/react";
import NoProductAvailable from "./NoProductAvailable";
import Container from "./Container";
import HomeTabBar from "./HomeTabBar";
import { getProducts, getCategories } from "../lib/api";
import { Product } from "../app/data/types";


type Tab = { key: string; title: string; slugs: string[] };

const PRODUCTS_LIMIT = 20;

const SKELETON_COUNT = 10;

const SLOW_NETWORK_HINT_MS = 4000;

const MAX_IMAGE_WAIT_MS = 8000;

const getPrimaryImage = (product: Product): string | undefined => {
  const p = product as unknown as { images?: string[]; image?: string };
  return p.images?.[0] ?? p.image;
};

const preloadImage = (src: string) =>
  new Promise<void>((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  });

const waitForImages = (srcs: string[]) => {
  if (srcs.length === 0) return Promise.resolve();
  const loadAll = Promise.all(srcs.map(preloadImage));
  const timeout = new Promise<void>((resolve) =>
    setTimeout(resolve, MAX_IMAGE_WAIT_MS)
  );
  return Promise.race([loadAll, timeout]);
};

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

  const [isSlowNetwork, setIsSlowNetwork] = useState(false);

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

        // Preload hết ảnh của các sản phẩm sắp hiện ra TRƯỚC khi ẩn
        // skeleton — tránh tình trạng data JSON về nhanh nhưng ảnh còn
        // đang tải, khiến người dùng thấy khoảng trống/giật hình.
        const imageSrcs = sorted
          .map(getPrimaryImage)
          .filter((src): src is string => Boolean(src));
        await waitForImages(imageSrcs);
        if (ignore) return;

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

  const loading = loadingCategories || loadingProducts;

  // Chỉ đếm giờ khi đang thực sự loading; báo "mạng đang chậm" nếu quá
  // SLOW_NETWORK_HINT_MS mà vẫn chưa xong, thay vì để người dùng nhìn
  // skeleton vô thời hạn không biết chuyện gì đang xảy ra.
  useEffect(() => {
    if (!loading) {
      setIsSlowNetwork(false);
      return;
    }

    const timer = setTimeout(() => setIsSlowNetwork(true), SLOW_NETWORK_HINT_MS);
    return () => clearTimeout(timer);
  }, [loading]);

  const selectedTabTitle =
    tabs.find((t) => t.key === selectedTabKey)?.title ?? "";

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
        <>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 mt-10">
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col rounded-lg border border-emerald-100 bg-white overflow-hidden"
              >
                <div className="product-skeleton-shimmer aspect-square w-full" />
                <div className="flex flex-col gap-2 p-3">
                  <div className="product-skeleton-shimmer h-3 w-1/3 rounded" />
                  <div className="product-skeleton-shimmer h-4 w-3/4 rounded" />
                  <div className="product-skeleton-shimmer h-4 w-1/2 rounded" />
                </div>
              </div>
            ))}
          </div>

          {isSlowNetwork && (
            <p className="mt-4 text-center text-xs text-gray-400">
              Mạng đang hơi chậm, sản phẩm sắp hiện ra ngay đây...
            </p>
          )}

          <style>{`
            .product-skeleton-shimmer {
              background: linear-gradient(
                90deg,
                rgb(236 253 245) 25%,
                rgb(209 250 229) 37%,
                rgb(236 253 245) 63%
              );
              background-size: 400% 100%;
              animation: product-skeleton-shimmer 1.4s ease infinite;
            }
            @keyframes product-skeleton-shimmer {
              0% {
                background-position: 100% 50%;
              }
              100% {
                background-position: 0 50%;
              }
            }
            @media (prefers-reduced-motion: reduce) {
              .product-skeleton-shimmer {
                animation: none;
                background: rgb(236 253 245);
              }
            }
          `}</style>
        </>
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