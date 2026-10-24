"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowRight, Coins, DollarSign, Gem, Tag } from "lucide-react";
import type { Product } from "@/app/data/types";
import ProductCard from "./ProductCard";

interface PriceRangeOption {
  id: string;
  label: string;
  sublabel: string;
  minPrice?: number;
  maxPrice?: number;
  shopHref: string;
}

const PRICE_OPTIONS: PriceRangeOption[] = [
  {
    id: "under-10m",
    label: "Dưới 10 Triệu",
    sublabel: "Phù hợp học sinh, văn phòng cơ bản",
    maxPrice: 10000000,
    shopHref: "/shop?maxPrice=10000000",
  },
  {
    id: "10m-20m",
    label: "10 - 20 Triệu",
    sublabel: "Phân khúc phổ thông bán chạy nhất",
    minPrice: 10000000,
    maxPrice: 20000000,
    shopHref: "/shop?minPrice=10000000&maxPrice=20000000",
  },
  {
    id: "20m-30m",
    label: "20 - 30 Triệu",
    sublabel: "Gaming tầm trung & đồ họa mượt",
    minPrice: 20000000,
    maxPrice: 30000000,
    shopHref: "/shop?minPrice=20000000&maxPrice=30000000",
  },
  {
    id: "over-30m",
    label: "Trên 30 Triệu",
    sublabel: "Flagship cao cấp, workstation đỉnh",
    minPrice: 30000000,
    shopHref: "/shop?minPrice=30000000",
  },
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

// Diversify products across categories using round-robin interleaving
const diversifyByPrice = (products: Product[], count = 10): Product[] => {
  const buckets: Record<string, Product[]> = {};

  for (const p of products) {
    const k = getCategoryKey(p);
    if (!buckets[k]) buckets[k] = [];
    buckets[k].push(p);
  }

  // Sort within each bucket: prioritize discounts, ratings, reviews
  for (const k of Object.keys(buckets)) {
    buckets[k].sort((a, b) => {
      const scoreB = (b.discount ?? 0) * 2 + (b.ratingAverage ?? 0) * 5 + (b.reviewCount ?? 0);
      const scoreA = (a.discount ?? 0) * 2 + (a.ratingAverage ?? 0) * 5 + (a.reviewCount ?? 0);
      return scoreB - scoreA;
    });
  }

  const result: Product[] = [];
  const added = new Set<string>();
  const order = ["laptop", "dien-thoai", "tai-nghe", "may-anh", "linh-kien", "phu-kien", "other"];

  let round = 0;
  while (result.length < count && round < 10) {
    let addedThisRound = false;
    for (const cat of order) {
      const candidate = buckets[cat]?.[round];
      if (candidate && !added.has(candidate.id)) {
        result.push(candidate);
        added.add(candidate.id);
        addedThisRound = true;
        if (result.length >= count) break;
      }
    }
    if (!addedThisRound) break;
    round++;
  }

  // Fallback to fill up to count if needed
  if (result.length < count) {
    for (const p of products) {
      if (!added.has(p.id)) {
        result.push(p);
        added.add(p.id);
        if (result.length >= count) break;
      }
    }
  }

  return result.slice(0, count);
};

interface HomePriceDealsProps {
  products: Product[];
}

const HomePriceDeals = ({ products }: HomePriceDealsProps) => {
  const [selectedRangeId, setSelectedRangeId] = useState<string>(PRICE_OPTIONS[1].id);

  const activeRange = useMemo(
    () => PRICE_OPTIONS.find((o) => o.id === selectedRangeId) || PRICE_OPTIONS[1],
    [selectedRangeId]
  );

  const filteredProducts = useMemo(() => {
    const matched = products.filter((p) => {
      const price = p.finalPrice || p.price;
      if (activeRange.minPrice && price < activeRange.minPrice) return false;
      if (activeRange.maxPrice && price > activeRange.maxPrice) return false;
      return true;
    });

    return diversifyByPrice(matched, 10);
  }, [products, activeRange]);

  return (
    <section className="my-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
        <div>
          <h2 className="font-sans text-xl font-bold uppercase tracking-tight text-shop_dark_green">
            Chọn sản phẩm theo mức giá
          </h2>
        </div>

        <Link
          href={activeRange.shopHref}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-shop_dark_green hover:underline shrink-0"
        >
          <span>Xem tất cả deal {activeRange.label}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* 4 Interactive Price Selectors */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {PRICE_OPTIONS.map((opt) => {
          const isSelected = opt.id === selectedRangeId;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSelectedRangeId(opt.id)}
              className={`p-2.5 sm:p-2 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${isSelected
                ? " border-shop_dark_green shadow-xs "
                : "bg-white border-neutral-200 hover:bg-neutral-50"
                }`}
            >

              <h4 className="text-xs sm:text-sm font-bold text-neutral-900">
                {opt.label}
              </h4>
              <p className="text-[11px] text-neutral-500 mt-0.5 line-clamp-1">
                {opt.sublabel}
              </p>
            </button>
          );
        })}
      </div>

      {/* Filtered Products Grid (5 Columns per Row) */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} compact />
          ))}
        </div>
      ) : (
        <div className="py-12 text-center text-xs text-neutral-500 bg-neutral-50 rounded-2xl border border-neutral-200">
          Chưa có sản phẩm trong mức giá này.
        </div>
      )}
    </section>
  );
};

export default HomePriceDeals;
