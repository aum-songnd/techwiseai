"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { Title } from "@/components/ui/text";

export type BannerSlide = {
  id: string;

  titleLines: string[];
  buttonLabel: string;
  href: string;
  image: StaticImageData;

  bgClass: string;
};

type BannerCarouselProps = {
  slides: BannerSlide[];
};

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

const BannerCarousel = ({ slides }: BannerCarouselProps) => {

  const autoplay = useRef(
    Autoplay({ delay: 4500, stopOnInteraction: false, stopOnMouseEnter: true })
  );

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [
    autoplay.current,
  ]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback(
    (index: number) => emblaApi?.scrollTo(index),
    [emblaApi]
  );

  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      emblaApi.plugins().autoplay?.stop();
    }

    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi]);

  return (
    <section
      className="relative font-sans"
      aria-roledescription="carousel"
      aria-label="Banner khuyến mãi"
    >
      <div className="overflow-hidden rounded-lg" ref={emblaRef}>
        <div className="flex">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className="min-w-0 flex-[0_0_100%]"
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} / ${slides.length}`}
            >
              <div
                className={`flex items-center justify-between px-10 py-16 md:py-0 lg:px-24 ${slide.bgClass}`}
              >
                <div className="space-y-5">
                  <Title className="font-sans text-2xl font-bold tracking-tight text-neutral-900 md:text-3xl lg:text-4xl">
                    {slide.titleLines.map((line, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && <br />}
                        {line}
                      </React.Fragment>
                    ))}
                  </Title>
                  <Link
                    href={slide.href}
                    className="inline-block rounded-md bg-shop_btn_dark_green px-6 py-2.5 font-sans text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-shop_dark_green"
                  >
                    {slide.buttonLabel}
                  </Link>
                </div>
                <div>
                  <Image
                    src={slide.image}
                    alt={slide.titleLines.join(" ")}
                    priority={index === 0}
                    className="hidden w-96 md:inline-flex"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={scrollPrev}
            aria-label="Banner trước"
            className="absolute left-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-neutral-700 transition-colors hover:bg-white md:flex"
          >
            <ChevronIcon direction="left" />
          </button>
          <button
            type="button"
            onClick={scrollNext}
            aria-label="Banner kế tiếp"
            className="absolute right-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-neutral-700 transition-colors hover:bg-white md:flex"
          >
            <ChevronIcon direction="right" />
          </button>

          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => scrollTo(index)}
                aria-label={`Đến banner ${index + 1}`}
                aria-current={index === selectedIndex}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === selectedIndex
                    ? "w-6 bg-neutral-900"
                    : "w-2 bg-neutral-900/25 hover:bg-neutral-900/50"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
};

export default BannerCarousel;