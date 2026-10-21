import React from "react";
import Link from "next/link";
import { Flame } from "lucide-react";
import Deals from "@/components/Deals";
import { getHotProducts } from "@/constants/queriesDealsPage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Ưu đãi Hot | TechWise AI",
  description: "Tổng hợp các sản phẩm công nghệ đang được ưu đãi và săn đón nhiều nhất tại TechWise AI.",
};

const DealsPage = async () => {
  const products = await getHotProducts();

  return (
    <div className="font-sans min-h-screen bg-white text-neutral-900">
      <Deals products={products}>
        {/* Breadcrumb Navigation - Styled exactly like Blog & Cart page */}
        <nav className="flex items-center gap-2 text-xs text-neutral-500 mb-6">
          <Link href="/" className="hover:text-shop_dark_green transition-colors">
            Trang chủ
          </Link>
          <span>/</span>
          <span className="text-neutral-900 font-medium">Ưu đãi Hot</span>
        </nav>

        {/* Header Bar - Matching Blog & Cart page style */}
        <div className="flex flex-col gap-4 border-b border-neutral-200 pb-5 sm:flex-row sm:items-end sm:justify-between mb-8">
          <div className="flex items-end gap-3">
            <h1 className="text-xl font-bold uppercase tracking-tight text-neutral-900">
              Ưu đãi Hot
            </h1>
            <span className="pb-0.5 text-xs text-neutral-500 font-mono">
              [ {products.length} sản phẩm ]
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-neutral-500">
            <Flame className="h-4 w-4 text-orange-500 fill-orange-500" />
            <span>Giảm giá độc quyền tại Techwise AI</span>
          </div>
        </div>
      </Deals>
    </div>
  );
};

export default DealsPage;