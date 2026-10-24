"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Flame, Sparkles, ArrowRight, Laptop, Smartphone, Headphones, Camera, Cpu, Cable, LayoutGrid } from "lucide-react";
import type { Product } from "@/app/data/types";
import ProductCard from "@/components/product/ProductCard";

interface HomeBestSellersNewProps {
  products: Product[];
}

const CATEGORY_FILTERS = [
  { id: "all", label: "Tất cả", icon: LayoutGrid },
  { id: "laptop", label: "Laptop", icon: Laptop },
  { id: "dien-thoai", label: "Điện thoại", icon: Smartphone },
  { id: "tai-nghe", label: "Tai nghe", icon: Headphones },
  { id: "may-anh", label: "Máy ảnh", icon: Camera },
  { id: "linh-kien", label: "Linh kiện", icon: Cpu },
  { id: "phu-kien", label: "Phụ kiện", icon: Cable },
];

const getCategoryKey = (p: Product) => {
  const cat = (p.categories?.[0] || "").toLowerCase();
  if (cat.includes("laptop")) return "laptop";
  if (cat.includes("thoại") || cat.includes("phone")) return "dien-thoai";
  if (cat.includes("tai nghe") || cat.includes("headphone") || cat.includes("audio")) return "tai-nghe";
  if (cat.includes("máy ảnh") || cat.includes("camera")) return "may-anh";
  if (cat.includes("linh kiện") || cat.includes("component") || cat.includes("ram") || cat.includes("ssd")) return "linh-kien";
  if (cat.includes("phụ kiện") || cat.includes("accessory")) return "phu-kien";
  return "other";
};

// Build diverse product list across categories using round-robin interleaving
const buildDiverseList = (items: Product[], sortType: "best" | "new", targetCount = 10): Product[] => {
  const buckets: Record<string, Product[]> = {
    "laptop": [],
    "dien-thoai": [],
    "tai-nghe": [],
    "may-anh": [],
    "linh-kien": [],
    "phu-kien": [],
    "other": [],
  };

  for (const p of items) {
    const k = getCategoryKey(p);
    buckets[k].push(p);
  }

  // Sort within each bucket
  for (const k of Object.keys(buckets)) {
    buckets[k].sort((a, b) => {
      if (sortType === "best") {
        const scoreB = (b.reviewCount ?? 0) * 10 + (b.ratingAverage ?? 0) * 5 + (b.discount ?? 0);
        const scoreA = (a.reviewCount ?? 0) * 10 + (a.ratingAverage ?? 0) * 5 + (a.discount ?? 0);
        return scoreB - scoreA;
      }
      // new
      const aScore = (a.status === "new" ? 10 : 0) + (a.isFeatured ? 5 : 0) + (a.stock > 0 ? 3 : 0);
      const bScore = (b.status === "new" ? 10 : 0) + (b.isFeatured ? 5 : 0) + (b.stock > 0 ? 3 : 0);
      return bScore - aScore;
    });
  }

  // Interleave categories to ensure max diversity across the 5-column grid
  const order = ["laptop", "dien-thoai", "tai-nghe", "may-anh", "linh-kien", "phu-kien", "other"];
  const result: Product[] = [];
  const addedIds = new Set<string>();

  let round = 0;
  while (result.length < targetCount && round < 10) {
    let addedThisRound = false;
    for (const cat of order) {
      const candidate = buckets[cat]?.[round];
      if (candidate && !addedIds.has(candidate.id)) {
        result.push(candidate);
        addedIds.add(candidate.id);
        addedThisRound = true;
        if (result.length >= targetCount) break;
      }
    }
    if (!addedThisRound) break;
    round++;
  }

  // Fallback to fill remaining slots if needed
  if (result.length < targetCount) {
    for (const p of items) {
      if (!addedIds.has(p.id)) {
        result.push(p);
        addedIds.add(p.id);
        if (result.length >= targetCount) break;
      }
    }
  }

  return result.slice(0, targetCount);
};

const HomeBestSellersNew = ({ products }: HomeBestSellersNewProps) => {
  const [activeTab, setActiveTab] = useState<"best" | "new">("best");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const diverseBestSellers = useMemo(() => {
    return buildDiverseList(products, "best", 10);
  }, [products]);

  const diverseNewArrivals = useMemo(() => {
    return buildDiverseList(products, "new", 10);
  }, [products]);

  // Filtered by selected category if user selects a specific filter
  const displayedProducts = useMemo(() => {
    const baseList = activeTab === "best" ? diverseBestSellers : diverseNewArrivals;

    if (selectedCategory === "all") {
      return baseList;
    }

    const filtered = products
      .filter((p) => getCategoryKey(p) === selectedCategory)
      .sort((a, b) => {
        if (activeTab === "best") {
          return (
            (b.reviewCount ?? 0) * 10 +
            (b.ratingAverage ?? 0) * 5 -
            ((a.reviewCount ?? 0) * 10 + (a.ratingAverage ?? 0) * 5)
          );
        }
        return (b.stock ?? 0) - (a.stock ?? 0);
      })
      .slice(0, 10);

    return filtered.length > 0 ? filtered : baseList;
  }, [activeTab, selectedCategory, diverseBestSellers, diverseNewArrivals, products]);

  const categoryHref =
    selectedCategory !== "all"
      ? `/shop?category=${selectedCategory}`
      : activeTab === "best"
        ? "/shop?sort=discount-desc"
        : "/shop?sort=default";

  return (
    <section className="my-8 font-sans">
      {/* Header with Switcher Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-neutral-200/80">
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Tab 1: Best Sellers */}
          <button
            type="button"
            onClick={() => setActiveTab("best")}
            className={`flex items-center gap-2 py-1 text-sm sm:text-base transition-colors cursor-pointer relative ${activeTab === "best"
              ? "text-shop_dark_green font-black"
              : "text-neutral-500 hover:text-neutral-900 font-semibold"
              }`}
          >
            <span>Sản phẩm bán chạy nhất</span>
            {activeTab === "best" && (
              <span className="absolute -bottom-3 left-0 right-0 h-0.5 bg-shop_dark_green rounded-full" />
            )}
          </button>

          <span className="text-neutral-300 font-light select-none">|</span>

          {/* Tab 2: New Arrivals */}
          <button
            type="button"
            onClick={() => setActiveTab("new")}
            className={`flex items-center gap-2 py-1 text-sm sm:text-base transition-colors cursor-pointer relative ${activeTab === "new"
              ? "text-shop_dark_green font-black"
              : "text-neutral-500 hover:text-neutral-900 font-semibold"
              }`}
          >
            <span>Sản phẩm mới về</span>
            {activeTab === "new" && (
              <span className="absolute -bottom-3 left-0 right-0 h-0.5 bg-shop_dark_green rounded-full" />
            )}
          </button>
        </div>

        <Link
          href={categoryHref}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-shop_dark_green hover:underline"
        >
          <span>Xem tất cả</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Category Filter Pills (Diversify Categories Quick Filter) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-3 scrollbar-none">
        {CATEGORY_FILTERS.map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition-all cursor-pointer border ${isActive
                ? "bg-shop_dark_green text-white border-shop_dark_green shadow-2xs"
                : "bg-white text-neutral-600 border-neutral-200/90 hover:border-neutral-400 hover:text-neutral-900 hover:bg-neutral-50"
                }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Grid of 5 Product Cards Per Row */}
      {displayedProducts.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
          {displayedProducts.map((product) => (
            <ProductCard key={product.id} product={product} compact />
          ))}
        </div>
      ) : (
        <div className="py-12 text-center text-xs text-neutral-500 bg-neutral-50 rounded-2xl border border-neutral-200">
          Đang cập nhật danh sách sản phẩm...
        </div>
      )}
    </section>
  );
};

export default HomeBestSellersNew;
