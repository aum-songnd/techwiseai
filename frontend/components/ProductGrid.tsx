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
import type { Category, Product } from "@/app/data/types";
import { getCategories, getProducts } from "@/lib/api";
import { subscribeTabSync } from "@/lib/tab-sync";

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

interface ProductCarouselSectionProps {
  title: string;
  products: Product[];
  viewAllHref: string;
  autoplayDelay?: number;
}

const ProductCarouselSection = ({
  title,
  products,
  viewAllHref,
  autoplayDelay = 4500,
}: ProductCarouselSectionProps) => {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      align: "start",
      loop: true,
      slidesToScroll: 1,
      dragFree: false,
    },
    [
      Autoplay({
        delay: autoplayDelay,
        stopOnInteraction: false,
        stopOnMouseEnter: true,
      }),
    ]
  );

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

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

export const LaptopCarouselSection = ProductCarouselSection;

export interface CategorySectionData {
  category: Category;
  products: Product[];
}

export interface ProductGridProps {
  initialLaptops?: Product[];
  initialCategorySections?: CategorySectionData[];
}

const ProductGrid = ({
  initialLaptops,
  initialCategorySections,
}: ProductGridProps = {}) => {
  const sharedProducts = useHomeProductFeed();
  const [laptopsData, setLaptopsData] = useState<Product[]>(
    initialLaptops ?? []
  );
  const [categorySections, setCategorySections] = useState<CategorySectionData[]>(
    initialCategorySections ?? []
  );

  useEffect(() => {
    if (initialLaptops && initialLaptops.length > 0) {
      setLaptopsData(initialLaptops);
      return;
    }

    getProducts({ category: "laptop", size: 60, noStore: true })
      .then((res) => {
        if (res && res.length > 0) {
          setLaptopsData(res);
        }
      })
      .catch(() => {});
  }, [initialLaptops]);

  useEffect(() => {
    if (initialCategorySections && initialCategorySections.length > 0) {
      setCategorySections(initialCategorySections);
      return;
    }

    // Client-side fallback: fetch other categories and their products
    getCategories({ noStore: true })
      .then(async (cats) => {
        const others = cats
          .filter((c) => {
            const s = (c.slug || "").toLowerCase();
            const t = (c.title || "").toLowerCase();
            return !s.includes("laptop") && !t.includes("laptop");
          })
          .sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999));

        const sections = await Promise.all(
          others.map(async (cat) => {
            try {
              const items = await getProducts({
                category: cat.slug,
                size: 15,
                noStore: true,
              });
              return { category: cat, products: items };
            } catch {
              return { category: cat, products: [] };
            }
          })
        );

        setCategorySections(sections.filter((s) => s.products.length > 0));
      })
      .catch(() => {});
  }, [initialCategorySections]);

  // Lắng nghe sự kiện CATALOG_UPDATED để tự động cập nhật dữ liệu mới nhất mà không cần F5
  useEffect(() => {
    const unsubscribe = subscribeTabSync((event) => {
      if (event.type === "CATALOG_UPDATED") {
        getProducts({ category: "laptop", size: 60, noStore: true })
          .then((res) => {
            if (res && res.length > 0) setLaptopsData(res);
          })
          .catch(() => {});

        getCategories({ noStore: true })
          .then(async (cats) => {
            const others = cats
              .filter((c) => {
                const s = (c.slug || "").toLowerCase();
                const t = (c.title || "").toLowerCase();
                return !s.includes("laptop") && !t.includes("laptop");
              })
              .sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999));

            const sections = await Promise.all(
              others.map(async (cat) => {
                try {
                  const items = await getProducts({
                    category: cat.slug,
                    size: 15,
                    noStore: true,
                  });
                  return { category: cat, products: items };
                } catch {
                  return { category: cat, products: [] };
                }
              })
            );
            setCategorySections(sections.filter((s) => s.products.length > 0));
          })
          .catch(() => {});
      }
    });

    return () => unsubscribe();
  }, []);

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

  if (!allLaptops.length && !categorySections.length) {
    return <NoProductAvailable selectedTab="Sản phẩm" />;
  }

  return (
    <div className="space-y-4">
      {/* 3 Mục của Laptop */}
      {allLaptops.length > 0 ? (
        <>
          {/* Mục 1: Laptop nổi bật */}
          <ProductCarouselSection
            title="Laptop nổi bật"
            products={featuredLaptops}
            viewAllHref="/shop?category=laptop"
            autoplayDelay={4000}
          />

          {/* Mục 2: Laptop cấu hình cao */}
          <ProductCarouselSection
            title="Laptop cấu hình cao"
            products={highEndLaptops}
            viewAllHref="/shop?category=laptop"
            autoplayDelay={4800}
          />

          {/* Mục 3: Laptop giảm giá */}
          <ProductCarouselSection
            title="Laptop giảm giá"
            products={saleLaptops}
            viewAllHref="/shop?category=laptop"
            autoplayDelay={5400}
          />
        </>
      ) : (
        <NoProductAvailable selectedTab="Laptop" />
      )}

      {/* Mỗi loại sản phẩm khác 1 mục dưới 3 mục laptop */}
      {categorySections.map((section, idx) => (
        <ProductCarouselSection
          key={section.category.id || section.category.slug}
          title={section.category.title}
          products={section.products}
          viewAllHref={`/shop?category=${section.category.slug}`}
          autoplayDelay={4200 + ((idx * 400) % 2000)}
        />
      ))}
    </div>
  );
};

export default ProductGrid;