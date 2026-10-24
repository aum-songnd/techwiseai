"use client";

import React, { useState } from "react";
import Image from "next/image";
import { ArrowLeftRight, Trash2, X, ChevronDown, ChevronUp } from "lucide-react";
import { useCompare } from "@/context/CompareContext";
import CompareModal from "./CompareModal";

const formatPrice = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);

const CompareDrawer = () => {
  const {
    compareProducts,
    removeFromCompare,
    clearCompare,
    isCompareModalOpen,
    setCompareModalOpen,
  } = useCompare();

  const [isMinimized, setIsMinimized] = useState(false);

  if (compareProducts.length === 0) {
    return isCompareModalOpen ? <CompareModal /> : null;
  }

  return (
    <>
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 transition-transform duration-300 ease-in-out ${isMinimized ? "translate-y-[calc(100%-36px)]" : "translate-y-0"
          }`}
      >
        <div className="max-w-6xl mx-auto px-4">
          <div className="bg-white border-t border-x border-neutral-300 rounded-t-2xl shadow-2xl overflow-hidden backdrop-blur-md bg-white/95">
            {/* Header bar / tab */}
            <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-shop_dark_green to-emerald-900 text-white text-xs font-semibold">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-emerald-300" />
                <span>
                  So sánh sản phẩm ({compareProducts.length}/4)
                </span>
                {compareProducts.length < 2 && (
                  <span className="hidden sm:inline text-[11px] text-emerald-200 font-normal">
                    (Chọn thêm ít nhất 1 sản phẩm nữa để so sánh)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={clearCompare}
                  className="flex items-center gap-1 text-[11px] text-emerald-200 hover:text-white transition-colors cursor-pointer"
                  title="Xoá tất cả sản phẩm so sánh"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Xoá tất cả</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1 hover:bg-white/10 rounded transition-colors text-white cursor-pointer"
                  aria-label={isMinimized ? "Mở rộng thanh so sánh" : "Thu gọn thanh so sánh"}
                >
                  {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Products Row */}
            <div className="p-3 sm:p-4 flex items-center justify-between gap-3 overflow-x-auto">
              <div className="flex items-center gap-3 flex-1">
                {compareProducts.map((p) => (
                  <div
                    key={p.id}
                    className="relative flex items-center gap-2.5 p-2 rounded-xl border border-neutral-200 bg-neutral-50/70 hover:bg-neutral-100/80 transition-colors min-w-[200px] max-w-[240px] shrink-0"
                  >
                    <div className="relative w-12 h-12 bg-white rounded-lg border border-neutral-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {p.images?.[0] ? (
                        <Image
                          src={p.images[0]}
                          alt={p.name}
                          fill
                          unoptimized
                          sizes="48px"
                          className="object-cover"
                        />
                      ) : (
                        <span className="text-[9px] text-neutral-400">Không ảnh</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 pr-4">
                      <p className="text-xs font-semibold text-neutral-800 line-clamp-1">
                        {p.name}
                      </p>
                      <p className="text-xs font-bold text-shop_dark_green mt-0.5">
                        {formatPrice(p.finalPrice || p.price)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFromCompare(p.id)}
                      aria-label={`Xoá ${p.name} khỏi so sánh`}
                      className="absolute top-1 right-1 p-1 text-neutral-400 hover:text-red-500 rounded-full hover:bg-white transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {/* Empty slots placeholders */}
                {Array.from({ length: 4 - compareProducts.length }).map((_, idx) => (
                  <div
                    key={`slot-${idx}`}
                    className="hidden md:flex items-center justify-center border-2 border-dashed border-neutral-200 rounded-xl min-w-[140px] h-[58px] text-[11px] text-neutral-400 font-medium select-none"
                  >
                    + Thêm sản phẩm
                  </div>
                ))}
              </div>

              {/* Action Button */}
              <div className="shrink-0 pl-2">
                <button
                  type="button"
                  onClick={() => setCompareModalOpen(true)}
                  disabled={compareProducts.length < 2}
                  className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer ${compareProducts.length >= 2
                    ? "bg-shop_dark_green text-white hover:bg-emerald-800 hover:shadow-md"
                    : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                    }`}
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span>So sánh ({compareProducts.length})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isCompareModalOpen && <CompareModal />}
    </>
  );
};

export default CompareDrawer;
