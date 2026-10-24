"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Product } from "@/app/data/types";
import type { RecommendedProduct } from "@/lib/api";
import AiRecommendedCard from "./AiRecommendedCard";
import ProductCard from "./ProductCard";

type Props = {
  aiRecommendations: RecommendedProduct[];
  relatedProducts: Product[];
};

/** Giữ sản phẩm phù hợp nhất ở ô đầu, trượt từng sản phẩm ở các ô còn lại. */
export default function RecommendationCarousel({ aiRecommendations, relatedProducts }: Props) {
  const usingAi = aiRecommendations.length > 0;
  const items = useMemo<(RecommendedProduct | Product)[]>(() => {
    if (!usingAi) return relatedProducts;
    return aiRecommendations;
  }, [aiRecommendations, relatedProducts, usingAi]);

  const first = items[0];
  const remaining = items.slice(1);
  const [viewportRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    slidesToScroll: 1,
    loop: false,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [snapCount, setSnapCount] = useState(0);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const update = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setSnapCount(emblaApi.scrollSnapList().length);
    setCanPrev(emblaApi.canScrollPrev());
    setCanNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    update();
    emblaApi.on("select", update);
    emblaApi.on("reInit", update);
    return () => {
      emblaApi.off("select", update);
      emblaApi.off("reInit", update);
    };
  }, [emblaApi, update]);

  const renderCard = (item: RecommendedProduct | Product) =>
    usingAi ? (
      <AiRecommendedCard item={item as RecommendedProduct} />
    ) : (
      <ProductCard product={item as Product} hideFavorite />
    );

  if (!first) return null;
  const firstId = usingAi ? (first as RecommendedProduct).product.id : (first as Product).id;

  return (
    <div className="relative" aria-label="Danh sách sản phẩm đề xuất" aria-roledescription="carousel">
      <div className="flex items-stretch gap-4">
        {/* Ô đầu tiên luôn đứng yên khi bấm Next/Previous. */}
        <div className="min-w-0 basis-1/2 shrink-0 sm:basis-[calc((100%-2rem)/3)] lg:basis-[calc((100%-3rem)/4)] flex flex-col" key={firstId}>
          <div className="h-full flex-1 min-w-0">{renderCard(first)}</div>
        </div>
        {/* Embla chỉ điều khiển các sản phẩm thứ 2 trở đi. */}
        {remaining.length > 0 && (
          <div ref={viewportRef} className="min-w-0 flex-1 overflow-hidden">
            <div className="-ml-4 flex h-full items-stretch touch-pan-y">
              {remaining.map((item) => {
                const product = usingAi ? (item as RecommendedProduct).product : (item as Product);
                return (
                  <div key={product.id}
                    className="min-w-0 shrink-0 basis-full pl-4 sm:basis-1/2 lg:basis-1/3 flex flex-col"
                    role="group" aria-roledescription="slide">
                    <div className="min-w-0 h-full flex-1">{renderCard(item)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      {snapCount > 1 && (
        <div className="mt-5 flex items-center justify-center gap-4">
          <button type="button" onClick={() => emblaApi?.scrollPrev()} disabled={!canPrev}
            aria-label="Xem sản phẩm trước"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30">
            <ChevronLeft size={18} />
          </button>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {Array.from({ length: snapCount }, (_, i) => (
              <button key={i} type="button" onClick={() => emblaApi?.scrollTo(i)}
                aria-label={`Đến vị trí sản phẩm ${i + 2}`}
                aria-current={i === selectedIndex ? "true" : undefined}
                className={`h-2 rounded-full transition-all ${i === selectedIndex ? "w-6 bg-gray-800" : "w-2 bg-gray-300 hover:bg-gray-400"}`} />
            ))}
          </div>
          <button type="button" onClick={() => emblaApi?.scrollNext()} disabled={!canNext}
            aria-label="Xem sản phẩm tiếp theo"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30">
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
