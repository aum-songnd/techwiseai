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
    className="mr-4 flex h-20 w-40 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 font-sans transition-all duration-200 hover:border-neutral-300 hover:bg-white md:h-24 md:w-48"
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
      <span className="truncate px-3 font-sans text-xs font-semibold text-neutral-800">
        {brand.label}
      </span>
    )}
  </Link>
);

const HomeBrands = ({
  products,
  showFeatures = false,
}: {
  products: Product[];
  showFeatures?: boolean;
}) => {
  const brands = getFeaturedBrands(products);

  if (brands.length === 0) return null;

  return (
    <section className="my-8 font-sans">
      <div className="mb-4 flex items-center justify-between gap-4">
        <Title className="font-sans text-xl font-bold uppercase tracking-tight text-shop_dark_green">
          Thương hiệu phổ biến
        </Title>
        <Link
          href="/shop"
          className="inline-flex shrink-0 items-center gap-1 font-sans text-xs font-semibold uppercase tracking-wider text-neutral-500 transition-colors hover:text-shop_dark_green"
        >
          Xem tất cả
          <ChevronIcon className="h-3.5 w-3.5" />
        </Link>
      </div>

      <MarqueeRow direction="right" speed={35}>
        {brands.map((brand) => (
          <BrandItem key={brand.key} brand={brand} />
        ))}
      </MarqueeRow>

      {showFeatures && (
        <ServiceFeatures
          className="mt-6"
          items={["shipping", "returns", "support", "refund"]}
        />
      )}
    </section>
  );
};

export default HomeBrands;