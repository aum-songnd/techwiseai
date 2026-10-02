"use client";

import { useState } from "react";
import Image, { type StaticImageData } from "next/image";
import { productImages } from "@/images";

interface ProductGalleryProps {
  images: string[];
  productName: string;
}

// productImages chỉ map các key ảnh local (vd "m1.png"). Với ảnh URL đầy đủ
// từ API thật thì fallback về chính chuỗi đó, giống cách ProductCard xử lý.
const resolveImage = (key: string): StaticImageData | string => {
  const localImage = (
    productImages as Record<string, StaticImageData | undefined>
  )[key];
  return localImage ?? key;
};

const ProductGallery = ({ images, productName }: ProductGalleryProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeImage = images?.[activeIndex];

  return (
    <div className="flex flex-col gap-4">
      {/* Khung ảnh chính: ảnh phủ kín toàn bộ card */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-gray-200 bg-gray-100">
        {activeImage ? (
          <Image
            key={activeImage}
            src={resolveImage(activeImage)}
            alt={productName}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 90vw, 40vw"
            priority
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
            Không có ảnh
          </div>
        )}
      </div>

      {/* Thumbnail */}
      {images && images.length > 1 && (
        <div className="flex flex-wrap gap-3">
          {images.map((img, index) => (
            <button
              key={`${img}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Xem ảnh ${index + 1}`}
              aria-current={index === activeIndex}
              className={`relative h-[72px] w-[72px] overflow-hidden rounded-lg border-2 bg-gray-100 transition-colors ${
                index === activeIndex
                  ? "border-shop_dark_green"
                  : "border-gray-200 hover:border-gray-400"
              }`}
            >
              <Image
                src={resolveImage(img)}
                alt={`${productName} ${index + 1}`}
                fill
                className="object-cover"
                sizes="72px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductGallery;