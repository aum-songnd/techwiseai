import React from "react";
import Link from "next/link";
import Image from "next/image";
import ServiceFeatures from "./ServiceFeatures";
import { Title } from "./ui/text";
import MarqueeRow from "./MarqueeRow";
import type { Product } from "@/app/data/types";

const MAX_BRANDS = 8;

const BRAND_LOGOS: Record<string, string> = {
  acer: "/acer.png",
  apple: "/apple.png",
  asus: "/asus.png",
  dell: "/dell.png",
  gigabyte: "/gigabyte.png",
  hp: "/hp.png",
  lenovo: "/lenovo.png",
  microsoft: "/microsoft.png",
};

type BrandCard = {
  key: string;
  label: string;

  logoUrl?: string;
};

function getFeaturedBrands(products: Product[]): BrandCard[] {
    const seen = new Map<string, BrandCard>();
    for (const product of products) {
      const label = product.brand?.trim();
      if (!label) continue;

      const key = label.toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, { key, label, logoUrl: BRAND_LOGOS[key] });
      }
    }

    return Array.from(seen.values())
      .sort((a, b) => {

        const hasLogoA = !!a.logoUrl;
        const hasLogoB = !!b.logoUrl;
        if (hasLogoA !== hasLogoB) return hasLogoA ? -1 : 1;
        return a.label.localeCompare(b.label);
      })
      .slice(0, MAX_BRANDS);
}

const ChevronIcon = ({ className = "" }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="m9 6 6 6-6 6" />
  </svg>
);

const BrandItem = ({ brand }: { brand: BrandCard }) => (

  <Link
    href={`/shop?brand=${encodeURIComponent(brand.label)}`}
    title={brand.label}
    className="mr-4 flex h-20 w-40 shrink-0 items-center justify-center rounded-xl bg-gray-50 transition-colors duration-200 hover:bg-gray-100 md:h-24 md:w-48"
  >
    {brand.logoUrl ? (
      <div className="relative h-full w-full">
        <Image
          src={brand.logoUrl}
          alt={brand.label}
          fill

          className="object-contain p-5 mix-blend-multiply"
          sizes="(max-width: 768px) 160px, 192px"
        />
      </div>
    ) : (
      <span className="truncate px-3 text-sm font-medium text-gray-700">
        {brand.label}
      </span>
    )}
  </Link>
);

const HomeBrands = ({ products }: { products: Product[] }) => {
  const brands = getFeaturedBrands(products);

  if (brands.length === 0) return null;

  return (
    <section className="my-8">
      <div className="mb-4 flex items-center justify-between gap-4">
        <Title className="text-[22px]">Thương hiệu nổi bật</Title>
        <Link
          href="/shop"
          className="inline-flex shrink-0 items-center text-sm text-gray-500 transition-colors hover:text-black"
        >
          Xem tất cả
          <ChevronIcon className="h-4 w-4" />
        </Link>
      </div>

      <MarqueeRow direction="right" speed={35}>
        {brands.map((brand) => (
          <BrandItem key={brand.key} brand={brand} />
        ))}
      </MarqueeRow>

      <ServiceFeatures className="mt-6" items={["shipping", "returns", "support", "refund"]}
      />
    </section>
  );
};

export default HomeBrands;