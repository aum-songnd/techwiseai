"use client";

import { useState, useEffect } from "react";
import Image, { type StaticImageData } from "next/image";
import { productImages } from "@/images";

interface ProductGalleryProps {
  images: string[];
  productName: string;
}

const resolveImage = (key: string): StaticImageData | string => {
  const localImage = (
    productImages as Record<string, StaticImageData | undefined>
  )[key];
  return localImage ?? key;
};

const ProductGallery = ({ images, productName }: ProductGalleryProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({});
  const [mainImgError, setMainImgError] = useState(false);

  useEffect(() => {
    const handleColorChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ index: number }>;
      const idx = customEvent.detail?.index;
      if (typeof idx === "number" && images && images.length > idx) {
        setActiveIndex(idx);
        setMainImgError(false);
      }
    };
    window.addEventListener("product-color-change", handleColorChange);
    return () => {
      window.removeEventListener("product-color-change", handleColorChange);
    };
  }, [images]);

  const activeImage = images?.[activeIndex];
  const primaryFallback = images?.[0] ? resolveImage(images[0]) : "/laptop.webp";

  const currentMainSrc = mainImgError
    ? primaryFallback
    : activeImage
      ? resolveImage(activeImage)
      : primaryFallback;

  return (
    <div className="flex flex-col gap-4">
      {/* Main Image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
        {activeImage ? (
          <Image
            key={`${activeImage}-${activeIndex}-${mainImgError}`}
            src={currentMainSrc}
            alt={productName}
            fill
            unoptimized
            className="object-contain"
            sizes="(max-width: 1024px) 90vw, 40vw"
            priority
            onError={() => setMainImgError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
            Không có ảnh
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {images && images.length > 1 && (
        <div className="flex flex-wrap gap-2.5">
          {images.map((img, index) => {
            const isFailed = failedImages[index];
            const thumbSrc = isFailed ? primaryFallback : resolveImage(img);

            return (
              <button
                key={`${img}-${index}`}
                type="button"
                onClick={() => {
                  setActiveIndex(index);
                  setMainImgError(false);
                }}
                aria-label={`Xem ảnh ${index + 1}`}
                aria-current={index === activeIndex}
                className={`relative h-[72px] w-[72px] overflow-hidden rounded-xl border-2 bg-white transition-all cursor-pointer ${index === activeIndex
                    ? "border-shop_dark_green shadow-xs"
                    : "border-gray-200 hover:border-gray-400 opacity-80 hover:opacity-100"
                  }`}
              >
                <Image
                  src={thumbSrc}
                  alt={`${productName} ${index + 1}`}
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="72px"
                  onError={() => {
                    setFailedImages((prev) => ({ ...prev, [index]: true }));
                  }}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProductGallery;