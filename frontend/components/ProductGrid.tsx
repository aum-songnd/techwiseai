"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { Title } from "./ui/text";
import ProductCard from "./ProductCard";
import NoProductAvailable from "./NoProductAvailable";
import { useHomeProductFeed } from "./HomeProductFeed";
import type { Product } from "@/app/data/types";
import { getProducts } from "@/lib/api";

const ChevronIcon = ({ direction }: { direction: "left" | "right" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-4 w-4"
    aria-hidden="true"
  >
    <path d={direction === "left" ? "m15 6-6 6 6 6" : "m9 6 6 6-6 6"} />
  </svg>
);

interface LaptopCarouselSectionProps {
  title: string;
  products: Product[];
  viewAllHref: string;
  autoplayDelay?: number;
}

const LaptopCarouselSection = ({
  title,
  products,
  viewAllHref,
  autoplayDelay = 4500,
}: LaptopCarouselSectionProps) => {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      align: "start",
      loop: true,
      slidesToScroll: 1,
      dragFree: false,
    },
    [Autoplay({ delay: autoplayDelay, stopOnInteraction: false, stopOnMouseEnter: true })]
  );

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [snapCount, setSnapCount] = useState(0);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const onInit = () => {
      setSnapCount(emblaApi.scrollSnapList().length);
      onSelect();
    };
    onInit();
    emblaApi.on("reInit", onInit);
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("reInit", onInit);
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  if (!products.length) return null;

  return (
    <section className="my-8 md:my-10 font-sans text-neutral-900">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <Title className="font-sans text-xl font-bold uppercase tracking-tight text-shop_dark_green">
          {title}
        </Title>
        <Link
          href={viewAllHref}
          className="inline-flex shrink-0 items-center gap-1 font-sans text-xs font-semibold uppercase tracking-wider text-neutral-500 transition-colors hover:text-shop_dark_green"
        >
          Xem tất cả
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Carousel Track with Next/Prev Buttons like HomeBanner */}
      <div className="relative group/carousel">
        <div
          className="cursor-grab overflow-hidden px-1 py-1 active:cursor-grabbing"
          ref={emblaRef}
        >
          <div className="-ml-3 flex">
            {products.map((product) => (
              <div
                key={product.id}
                className="flex min-w-0 shrink-0 grow-0 basis-1/2 pl-3 sm:basis-1/3 md:basis-1/4 lg:basis-1/5"
              >
                <div className="w-full h-full">
                  <ProductCard product={product} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Prev Button (BannerCarousel style) */}
        <button
          type="button"
          onClick={scrollPrev}
          aria-label={`${title} trước`}
          className="absolute -left-2 sm:-left-3 top-1/2 z-10 flex h-8 w-8 sm:h-9 sm:w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-neutral-700 shadow-md border border-neutral-200 transition-all hover:bg-white hover:text-shop_dark_green hover:scale-105 active:scale-95"
        >
          <ChevronIcon direction="left" />
        </button>

        {/* Next Button (BannerCarousel style) */}
        <button
          type="button"
          onClick={scrollNext}
          aria-label={`${title} kế tiếp`}
          className="absolute -right-2 sm:-right-3 top-1/2 z-10 flex h-8 w-8 sm:h-9 sm:w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-neutral-700 shadow-md border border-neutral-200 transition-all hover:bg-white hover:text-shop_dark_green hover:scale-105 active:scale-95"
        >
          <ChevronIcon direction="right" />
        </button>
      </div>
    </section>
  );
};

interface ProductGridProps {
  initialLaptops?: Product[];
}

const ProductGrid = ({ initialLaptops }: ProductGridProps = {}) => {
  const sharedProducts = useHomeProductFeed();
  const [laptopsData, setLaptopsData] = useState<Product[]>(initialLaptops ?? []);

  useEffect(() => {
    if (initialLaptops && initialLaptops.length > 0) {
      setLaptopsData(initialLaptops);
      return;
    }

    getProducts({ category: "laptop", size: 60 })
      .then((res) => {
        if (res && res.length > 0) {
          setLaptopsData(res);
        }
      })
      .catch(() => {});
  }, [initialLaptops]);

  // Lọc sản phẩm thuộc nhóm Laptop (loại trừ các linh kiện, phụ kiện)
  const allLaptops = useMemo(() => {
    const base = laptopsData.length > 0 ? laptopsData : sharedProducts;

    const list = base.filter((p) => {
      // Loại bỏ nếu thuộc các danh mục khác như Linh kiện, Phụ kiện
      const isOtherCat = p.categories?.some((c) => {
        const cl = c.toLowerCase();
        return (
          cl.includes("linh kiện") ||
          cl.includes("phụ kiện") ||
          cl.includes("điện thoại") ||
          cl.includes("tai nghe") ||
          cl.includes("máy ảnh")
        );
      });
      if (isOtherCat) return false;

      const catMatch = p.categories?.some((c) =>
        c.toLowerCase().includes("laptop")
      );
      const nameMatch =
        p.name.toLowerCase().includes("laptop") ||
        p.name.toLowerCase().includes("macbook") ||
        p.name.toLowerCase().includes("surface");
      return catMatch || nameMatch || p.variant === "laptop";
    });

    return list;
  }, [laptopsData, sharedProducts]);

  // 1. Laptop nổi bật: 10 sản phẩm (ưu tiên sản phẩm được tích nổi bật)
  const featuredLaptops = useMemo(() => {
    const featured = allLaptops.filter((p) => Boolean(p.isFeatured));
    const others = allLaptops.filter((p) => !p.isFeatured);
    return [...featured, ...others].slice(0, 10);
  }, [allLaptops]);

  // 2. Laptop cấu hình cao: 10 sản phẩm giá từ cao nhất
  const highEndLaptops = useMemo(() => {
    return [...allLaptops]
      .sort((a, b) => (b.finalPrice || b.price) - (a.finalPrice || a.price))
      .slice(0, 10);
  }, [allLaptops]);

  // 3. Laptop giảm giá: 10 sản phẩm sale
  const saleLaptops = useMemo(() => {
    const discounted = allLaptops.filter(
      (p) =>
        (p.price > 0 && p.finalPrice < p.price) ||
        (p.discount && p.discount > 0) ||
        p.status === "sale"
    );

    // Sắp xếp theo % giảm giá cao nhất
    const sorted = [...discounted].sort((a, b) => {
      const discA = a.price > 0 ? (a.price - a.finalPrice) / a.price : 0;
      const discB = b.price > 0 ? (b.price - b.finalPrice) / b.price : 0;
      return discB - discA;
    });

    if (sorted.length >= 10) {
      return sorted.slice(0, 10);
    }

    // Nếu số lượng giảm giá ít hơn 10, bù thêm các laptop khác để đủ 10 sản phẩm
    const existingIds = new Set(sorted.map((p) => p.id));
    const remainder = allLaptops.filter((p) => !existingIds.has(p.id));
    return [...sorted, ...remainder].slice(0, 10);
  }, [allLaptops]);

  if (!allLaptops.length) {
    return <NoProductAvailable selectedTab="Laptop" />;
  }

  return (
    <div className="space-y-4">
      {/* Mục 1: Laptop nổi bật */}
      <LaptopCarouselSection
        title="Laptop nổi bật"
        products={featuredLaptops}
        viewAllHref="/shop?category=laptop"
        autoplayDelay={4000}
      />

      {/* Mục 2: Laptop cấu hình cao */}
      <LaptopCarouselSection
        title="Laptop cấu hình cao"
        products={highEndLaptops}
        viewAllHref="/shop?category=laptop"
        autoplayDelay={4800}
      />

      {/* Mục 3: Laptop giảm giá */}
      <LaptopCarouselSection
        title="Laptop giảm giá"
        products={saleLaptops}
        viewAllHref="/shop?category=laptop"
        autoplayDelay={5400}
      />
    </div>
  );
};

export default ProductGrid;