"use client";

import React, { useState, useMemo } from "react";
import { ShieldCheck, RotateCcw, Truck } from "lucide-react";
import Container from "@/components/Container";
import ProductCard from "@/components/ProductCard";
import type { Product } from "../app/data/types";

interface DealsProps {
  products: Product[];
  children?: React.ReactNode;
}

const variantLabels: Record<string, string> = {
  phone: "Điện thoại",
  laptop: "Laptop",
  earphone: "Tai nghe",
  others: "Khác",
};

const Deals = ({ products, children }: DealsProps) => {
  const [activeTab, setActiveTab] = useState<string>("all");

  const availableVariants = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.variant) set.add(p.variant);
    });
    return Array.from(set);
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (activeTab === "all") return products;
    return products.filter((p) => p.variant === activeTab);
  }, [products, activeTab]);

  return (
    <Container className="py-8 sm:py-10">
      {children}

      {/* Variant / Category Filter Tabs (if multiple variants exist) */}
      {availableVariants.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-8 border-b border-neutral-200 pb-4">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
              activeTab === "all"
                ? "bg-shop_dark_green text-white shadow-sm"
                : "bg-white text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 border border-neutral-200"
            }`}
          >
            Tất cả ({products.length})
          </button>
          {availableVariants.map((variant) => {
            const count = products.filter((p) => p.variant === variant).length;
            return (
              <button
                type="button"
                key={variant}
                onClick={() => setActiveTab(variant)}
                className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  activeTab === variant
                    ? "bg-shop_dark_green text-white shadow-sm"
                    : "bg-white text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 border border-neutral-200"
                }`}
              >
                {variantLabels[variant] ?? variant} ({count})
              </button>
            );
          })}
        </div>
      )}

      {filteredProducts.length === 0 ? (
        <div className="py-20 text-center border border-neutral-200 bg-neutral-50/50 p-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Hiện chưa có ưu đãi nào trong danh mục này.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 sm:gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {/* Trust & Guarantee Banner matching Cart & Blog */}
      <div className="mt-12 border border-neutral-200 p-5 bg-neutral-50/50 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-shop_dark_green shrink-0" />
          <div>
            <h4 className="text-xs font-bold uppercase tracking-tight text-neutral-900">
              100% Chính hãng
            </h4>
            <p className="text-[11px] text-neutral-500">Bảo hành chính hãng toàn quốc</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <RotateCcw className="h-5 w-5 text-shop_dark_green shrink-0" />
          <div>
            <h4 className="text-xs font-bold uppercase tracking-tight text-neutral-900">
              Đổi trả 7 ngày
            </h4>
            <p className="text-[11px] text-neutral-500">Miễn phí đổi mới nếu lỗi kỹ thuật</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Truck className="h-5 w-5 text-shop_dark_green shrink-0" />
          <div>
            <h4 className="text-xs font-bold uppercase tracking-tight text-neutral-900">
              Giao hàng nhanh
            </h4>
            <p className="text-[11px] text-neutral-500">Miễn phí ship cho đơn từ 1.000.000đ</p>
          </div>
        </div>
      </div>
    </Container>
  );
};

export default Deals;