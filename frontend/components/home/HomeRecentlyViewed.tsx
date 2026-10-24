"use client";

import React from "react";
import { Clock, Trash2 } from "lucide-react";
import { useRecentlyViewed } from "@/context/RecentlyViewedContext";
import ProductCard from "@/components/product/ProductCard";

interface HomeRecentlyViewedProps {
  title?: string;
}

const HomeRecentlyViewed = ({ title = "Sản phẩm bạn đã xem gần đây" }: HomeRecentlyViewedProps) => {
  const { recentlyViewed, clearRecentlyViewed } = useRecentlyViewed();

  if (recentlyViewed.length === 0) return null;

  return (
    <section className="my-10 font-sans">
      <div className="flex items-center justify-between gap-3 mb-6 pb-2 border-b border-neutral-200/80">
        <div className="flex items-center gap-2">
          <div>
            <h2 className="font-sans text-xl font-bold uppercase tracking-tight text-shop_dark_green">
              {title}
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={clearRecentlyViewed}
          className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-red-500 transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Xoá đã xem</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {recentlyViewed.slice(0, 4).map((product) => (
          <ProductCard key={`recent-${product.id}`} product={product} />
        ))}
      </div>
    </section>
  );
};

export default HomeRecentlyViewed;
