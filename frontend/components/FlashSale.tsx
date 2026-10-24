"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import FlashSaleCountdown from "./FlashSaleCountdown";
import { getProducts } from "../lib/api";
import { Product } from "../app/data/types";
import { useOptionalHomeProductFeed } from "./HomeProductFeed";
import { productImages } from "../images";
import { ChevronLeft, ChevronRight } from "lucide-react";

const FETCH_SIZE = 60;
const ITEMS_PER_PAGE = 5;

const formatPrice = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);

const resolveImage = (fileName?: string) => {
  if (!fileName) return "/laptop.webp";
  const localImage = (productImages as Record<string, any>)[fileName];
  return localImage ?? fileName;
};

const getDiscountPercent = (p: Product) => {
  if (p.discount > 0 && p.price > 0) {
    return Math.round(((p.price - p.finalPrice) / p.price) * 100);
  }
  if (p.price > 0 && p.finalPrice < p.price) {
    return Math.round(((p.price - p.finalPrice) / p.price) * 100);
  }
  const hash = p.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return 10 + (hash % 6); // 10% - 15%
};

const getCategoryKey = (p: Product) => {
  const cat = (p.categories?.[0] || "").toLowerCase();
  const name = (p.name || "").toLowerCase();

  if (
    cat.includes("linh kiện") ||
    cat.includes("component") ||
    cat.includes("ram") ||
    cat.includes("ssd") ||
    name.includes("ram ") ||
    name.includes("ssd ") ||
    name.includes("nvme") ||
    name.includes("ổ cứng")
  )
    return "linh-kien";

  if (
    cat.includes("phụ kiện") ||
    cat.includes("accessory") ||
    name.includes("cáp ") ||
    name.includes("sạc ") ||
    name.includes("pin sạc") ||
    name.includes("pin dự phòng") ||
    name.includes("chuột ") ||
    name.includes("bàn phím")
  )
    return "phu-kien";

  if (
    cat.includes("tai nghe") ||
    cat.includes("headphone") ||
    cat.includes("audio") ||
    name.includes("airpods") ||
    name.includes("buds") ||
    name.includes("tai nghe") ||
    name.includes("wh-") ||
    name.includes("soundcore")
  )
    return "tai-nghe";

  if (
    cat.includes("máy ảnh") ||
    cat.includes("camera") ||
    name.includes("canon") ||
    name.includes("eos") ||
    name.includes("máy ảnh")
  )
    return "may-anh";

  if (
    cat.includes("thoại") ||
    cat.includes("phone") ||
    name.includes("iphone") ||
    name.includes("galaxy") ||
    name.includes("oppo") ||
    name.includes("redmi") ||
    name.includes("xiaomi")
  )
    return "dien-thoai";

  if (
    cat.includes("laptop") ||
    name.includes("laptop") ||
    name.includes("macbook") ||
    name.includes("surface") ||
    name.includes("thinkpad") ||
    name.includes("zenbook") ||
    name.includes("legion")
  )
    return "laptop";

  return "other";
};

// Build diverse product list across categories using round-robin interleaving
const buildDiverseFlashSaleList = (items: Product[], targetCount = 15): Product[] => {
  const buckets: Record<string, Product[]> = {
    laptop: [],
    "dien-thoai": [],
    "tai-nghe": [],
    "may-anh": [],
    "linh-kien": [],
    "phu-kien": [],
    other: [],
  };

  for (const p of items) {
    const k = getCategoryKey(p);
    buckets[k].push(p);
  }

  // Sort within each bucket: prioritize highest discount, then rating/reviews
  for (const k of Object.keys(buckets)) {
    buckets[k].sort((a, b) => {
      const discB = getDiscountPercent(b);
      const discA = getDiscountPercent(a);
      if (discB !== discA) return discB - discA;
      return (b.ratingAverage ?? 0) - (a.ratingAverage ?? 0);
    });
  }

  // Interleave categories to ensure max diversity across every 5-item page
  const order = ["laptop", "dien-thoai", "tai-nghe", "may-anh", "linh-kien", "phu-kien"];
  const result: Product[] = [];
  const addedIds = new Set<string>();

  let round = 0;
  while (result.length < targetCount && round < 10) {
    let addedThisRound = false;
    for (const cat of order) {
      const candidate = buckets[cat]?.[round];
      if (candidate && !addedIds.has(candidate.id)) {
        result.push(candidate);
        addedIds.add(candidate.id);
        addedThisRound = true;
        if (result.length >= targetCount) break;
      }
    }
    if (!addedThisRound) break;
    round++;
  }

  // Fallback to fill remaining slots if needed
  if (result.length < targetCount) {
    for (const p of items) {
      if (!addedIds.has(p.id)) {
        result.push(p);
        addedIds.add(p.id);
        if (result.length >= targetCount) break;
      }
    }
  }

  return result.slice(0, targetCount);
};

const endOfToday = () => {
  const d = new Date();
  d.setHours(24, 0, 0, 0);
  return d.getTime();
};

const getSoldStats = (product: Product, index: number) => {
  const stock = product.stock > 0 ? product.stock : 15;
  // Deterministic calculation based on product id
  const hash = product.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), index * 7);
  const ratio = 0.45 + ((hash % 45) / 100); // 45% - 90%
  const total = Math.max(10, Math.round(stock * 2));
  const sold = Math.min(total - 1, Math.max(3, Math.round(total * ratio)));
  const percent = Math.round((sold / total) * 100);
  return { sold, total, percent };
};

interface FlashSaleItemProps {
  product: Product;
  index: number;
}

const FlashSaleItem = ({ product, index }: FlashSaleItemProps) => {
  const [imgError, setImgError] = useState(false);
  const discountPercent = getDiscountPercent(product);
  const finalPrice =
    product.finalPrice < product.price
      ? product.finalPrice
      : Math.round(product.price * (1 - discountPercent / 100));
  const originalPrice =
    product.price > finalPrice
      ? product.price
      : Math.round(finalPrice / (1 - discountPercent / 100));
  const { sold, total, percent } = getSoldStats(product, index);

  const rawImage = product.images?.[0] || product.thumbnailUrl;
  const imageSrc = imgError
    ? product.thumbnailUrl
      ? resolveImage(product.thumbnailUrl)
      : "/laptop.webp"
    : resolveImage(rawImage);

  return (
    <Link
      href={`/product/${product.id}`}
      className="group flex flex-col h-full bg-white transition-transform duration-200"
    >
      {/* Square Image Box with light slate background */}
      <div className="relative aspect-square w-full rounded-xl bg-[#f1f5f9] overflow-hidden group-hover:bg-[#e2e8f0]/80 transition-colors">
        {/* Top-Left Discount Badge */}
        {discountPercent > 0 && (
          <span className="absolute top-0 left-0 bg-[#ea580c] text-white font-bold text-[11px] sm:text-xs px-2 py-0.5 rounded-tl-xl rounded-br-lg shadow-2xs z-10">
            -{discountPercent}%
          </span>
        )}

        {/* Product Image */}
        <div className="relative w-full h-full">
          <Image
            src={imageSrc}
            alt={product.name}
            fill
            unoptimized
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
            onError={() => setImgError(true)}
          />
        </div>
      </div>

      {/* Product Title */}
      <h3 className="text-xs sm:text-sm font-medium text-neutral-800 group-hover:text-[#ea580c] line-clamp-1 mt-2.5 mb-1 transition-colors">
        {product.name}
      </h3>

      {/* Price row */}
      <div className="flex items-baseline gap-1.5 flex-wrap">
        <span className="text-sm sm:text-base font-bold text-[#ea580c]">
          {formatPrice(finalPrice)}
        </span>
        {originalPrice > finalPrice && (
          <span className="text-[11px] sm:text-xs text-neutral-400 line-through font-normal">
            {formatPrice(originalPrice)}
          </span>
        )}
      </div>

      {/* Sold Progress Bar */}
      <div className="relative h-5 w-full bg-[#fed7aa]/60 rounded-full overflow-hidden flex items-center mt-2 select-none shadow-2xs">
        {/* Fill progress */}
        <div
          className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-[#ea580c] to-[#f97316] rounded-full transition-all duration-500"
          style={{ width: `${percent}%` }}
        />

        {/* Flame icon */}
        <div className="relative z-10 pl-1.5 flex items-center leading-none">
          <span className="text-xs filter drop-shadow">🔥</span>
        </div>

        {/* Sold text centered */}
        <span className="relative z-10 w-full text-center pr-3 text-[10px] sm:text-[11px] font-bold text-white uppercase tracking-tight drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)] truncate">
          Đã bán {sold}/ {total}
        </span>
      </div>
    </Link>
  );
};

interface FlashSaleProps {
  variant?: "full" | "banner";
}

const FlashSale = (_props: FlashSaleProps) => {
  const sharedProducts = useOptionalHomeProductFeed();
  const [fallbackProducts, setFallbackProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(!sharedProducts);

  const products = sharedProducts ?? fallbackProducts;

  useEffect(() => {
    if (sharedProducts) {
      setLoading(false);
      return;
    }

    let ignore = false;
    async function load() {
      try {
        const result = await getProducts({ size: FETCH_SIZE });
        if (!ignore) setFallbackProducts(result);
      } catch {
        // ignore
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [sharedProducts]);

  const { deals, endsAt } = useMemo(() => {
    return {
      deals: buildDiverseFlashSaleList(products, 20),
      endsAt: endOfToday(),
    };
  }, [products]);

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      align: "start",
      loop: true,
      slidesToScroll: 1,
      dragFree: false,
    },
    [
      Autoplay({
        delay: 3800,
        stopOnInteraction: false,
        stopOnMouseEnter: true,
      }),
    ]
  );

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  if (!loading && deals.length === 0) return null;

  return (
    <section className="my-8 font-sans">
      <div className="rounded-2xl border border-neutral-200/90 bg-white p-4 sm:p-5 shadow-2xs">
        {/* Header Row */}
        <div className="flex items-center justify-between border-b border-neutral-200/80 pb-3 mb-4">
          {/* Left Title: Giá Sốc ⚡ Hôm Nay */}
          <Link
            href="/shop?sale=1"
            className="group flex items-center gap-1 hover:opacity-90 transition-opacity"
          >
            <span className="text-xl sm:text-2xl font-black italic tracking-wide text-[#ea580c] flex items-center select-none">
              Giá Sốc
              <span className="inline-flex items-center justify-center mx-1.5 text-amber-400 drop-shadow-xs">
                ⚡
              </span>
              Hôm Nay
            </span>
          </Link>

          {/* Right Area: Countdown & Navigation Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <FlashSaleCountdown endsAt={endsAt} />

            <div className="flex items-center ml-1">
              <button
                type="button"
                onClick={scrollPrev}
                aria-label="Deals trước"
                className="w-7 h-7 rounded-md flex items-center justify-center text-neutral-400 hover:text-[#ea580c] hover:bg-orange-50 transition-colors cursor-pointer"
                title="Deals trước"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={scrollNext}
                aria-label="Deals tiếp theo"
                className="w-7 h-7 rounded-md flex items-center justify-center text-neutral-400 hover:text-[#ea580c] hover:bg-orange-50 transition-colors cursor-pointer"
                title="Deals tiếp theo"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Carousel Track with Auto-Slide (giống các mục laptop) */}
        <div className="relative group/carousel">
          <div
            className="cursor-grab overflow-hidden px-1 py-1 active:cursor-grabbing"
            ref={emblaRef}
          >
            <div className="-ml-3 sm:-ml-4 flex">
              {deals.map((product, idx) => (
                <div
                  key={`${product.id}-${idx}`}
                  className="flex min-w-0 shrink-0 grow-0 basis-1/2 pl-3 sm:pl-4 sm:basis-1/3 md:basis-1/4 lg:basis-1/5"
                >
                  <div className="w-full h-full">
                    <FlashSaleItem product={product} index={idx} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Floating Prev Button */}
          <button
            type="button"
            onClick={scrollPrev}
            aria-label="Deals trước"
            className="absolute -left-2 sm:-left-3.5 top-1/2 z-10 flex h-8 w-8 sm:h-9 sm:w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-neutral-700 shadow-md border border-neutral-200 transition-all hover:bg-white hover:text-[#ea580c] hover:scale-105 active:scale-95 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Floating Next Button */}
          <button
            type="button"
            onClick={scrollNext}
            aria-label="Deals kế tiếp"
            className="absolute -right-2 sm:-right-3.5 top-1/2 z-10 flex h-8 w-8 sm:h-9 sm:w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-neutral-700 shadow-md border border-neutral-200 transition-all hover:bg-white hover:text-[#ea580c] hover:scale-105 active:scale-95 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default FlashSale;