"use client";
import React, { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import ProductCard from "./ProductCard";
import NoProductAvailable from "./NoProductAvailable";
import Container from "./Container";
import HomeTabBar from "./HomeTabBar";
import { getProducts } from "../lib/api";
import { Product } from "../app/data/types";

type TabKey = "best-seller" | "new";

const TABS: { key: TabKey; title: string }[] = [
  { key: "best-seller", title: "Sản phẩm bán chạy" },
  { key: "new", title: "Mới ra mắt" },
];

// Lấy một lượng sản phẩm đủ lớn 1 lần rồi chia 2 tab ở client,
// nên chuyển tab là tức thì, không gọi lại API.
const FETCH_SIZE = 60;
const PRODUCTS_LIMIT = 15;
const SKELETON_COUNT = 10;
const SLOW_NETWORK_HINT_MS = 4000;
const MAX_IMAGE_WAIT_MS = 8000;

// Các field phục vụ phân loại tab mà Product type gốc chưa khai báo.
// Field nào API không trả thì được bỏ qua (xem getSold/getCreatedAt).
type ProductExtras = {
  soldCount?: number;
  sold?: number;
  createdAt?: string;
};

const extras = (p: Product) => p as unknown as ProductExtras;
const getSold = (p: Product) => extras(p).soldCount ?? extras(p).sold ?? 0;
const getCreatedAt = (p: Product) => {
  const t = Date.parse(extras(p).createdAt ?? "");
  return Number.isNaN(t) ? 0 : t;
};

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

const ProductGrid = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedTabKey, setSelectedTabKey] = useState<TabKey>("best-seller");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSlowNetwork, setIsSlowNetwork] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await getProducts({ size: FETCH_SIZE });
        if (ignore) return;

        // Preload ảnh của các sản phẩm sắp hiện trước khi ẩn skeleton.
        const srcs = result
          .slice(0, PRODUCTS_LIMIT)
          .map(getPrimaryImage)
          .filter((s): s is string => Boolean(s));
        await waitForImages(srcs);
        if (ignore) return;

        setProducts(result);
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Lỗi không xác định");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!loading) {
      setIsSlowNetwork(false);
      return;
    }
    const timer = setTimeout(() => setIsSlowNetwork(true), SLOW_NETWORK_HINT_MS);
    return () => clearTimeout(timer);
  }, [loading]);

  const listsByTab = useMemo(() => {
    // Bán chạy: nhiều lượt bán nhất; cùng số lượt thì ưu tiên status "hot".
    const best = [...products]
      .sort(
        (a, b) =>
          getSold(b) - getSold(a) ||
          Number(b.status === "hot") - Number(a.status === "hot")
      )
      .slice(0, PRODUCTS_LIMIT);

    // Mới ra mắt: status "new" lên trước, rồi theo ngày tạo mới nhất.
    const fresh = [...products]
      .sort(
        (a, b) =>
          Number(b.status === "new") - Number(a.status === "new") ||
          getCreatedAt(b) - getCreatedAt(a)
      )
      .slice(0, PRODUCTS_LIMIT);

    return { "best-seller": best, new: fresh };
  }, [products]);

  const selectedTab = TABS.find((t) => t.key === selectedTabKey) ?? TABS[0];
  const visible = listsByTab[selectedTab.key];

  return (
    <Container className="flex flex-col lg:px-0 my-10">
      <HomeTabBar
        tabs={TABS.map((t) => t.title)}
        selectedTab={selectedTab.title}
        onTabSelect={(title: string) => {
          const matched = TABS.find((t) => t.title === title);
          if (matched) setSelectedTabKey(matched.key);
        }}
      />

      {loading ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 mt-6">
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white"
              >
                <div className="product-skeleton-shimmer aspect-square w-full" />
                <div className="flex flex-col gap-2 p-3">
                  <div className="product-skeleton-shimmer h-3 w-1/3 rounded" />
                  <div className="product-skeleton-shimmer h-4 w-3/4 rounded" />
                  <div className="product-skeleton-shimmer h-4 w-1/2 rounded" />
                  <div className="product-skeleton-shimmer mt-2 h-9 w-full rounded-lg" />
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
              background: linear-gradient(90deg, rgb(243 244 246) 25%, rgb(229 231 235) 37%, rgb(243 244 246) 63%);
              background-size: 400% 100%;
              animation: product-skeleton-shimmer 1.4s ease infinite;
            }
            @keyframes product-skeleton-shimmer {
              0% { background-position: 100% 50%; }
              100% { background-position: 0 50%; }
            }
            @media (prefers-reduced-motion: reduce) {
              .product-skeleton-shimmer { animation: none; background: rgb(243 244 246); }
            }
          `}</style>
        </>
      ) : error ? (
        <div className="p-6 text-center text-red-600 mt-10">
          Không tải được sản phẩm: {error}
        </div>
      ) : visible.length ? (
        <motion.div
          key={selectedTab.key}
          initial={{ opacity: 0.2 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 mt-6"
        >
          {visible.map((product) => (
            <div key={product.id} className="h-full">
              <ProductCard product={product} />
            </div>
          ))}
        </motion.div>
      ) : (
        <NoProductAvailable selectedTab={selectedTab.title} />
      )}
    </Container>
  );
};

export default ProductGrid;