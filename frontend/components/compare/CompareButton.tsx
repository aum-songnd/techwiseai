"use client";

import React from "react";
import { ArrowLeftRight } from "lucide-react";
import { useCompare } from "@/context/CompareContext";

const CompareButton = () => {
  const { compareProducts, setCompareModalOpen } = useCompare();
  const count = compareProducts.length;

  return (
    <button
      type="button"
      onClick={() => setCompareModalOpen(true)}
      aria-label={`So sánh sản phẩm (${count})`}
      className="relative flex items-center justify-center p-2 rounded-xl text-neutral-700 hover:text-shop_dark_green transition-colors cursor-pointer group"
      title="So sánh sản phẩm"
    >
      <ArrowLeftRight className="w-5 h-5 transition-transform group-hover:scale-110" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-shop_dark_green px-1 text-[10px] font-bold text-white shadow-xs animate-in zoom-in-75">
          {count}
        </span>
      )}
    </button>
  );
};

export default CompareButton;
