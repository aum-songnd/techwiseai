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
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square w-full bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
        {activeImage ? (
          <div className="relative w-[80%] h-[80%]">
            <Image
              src={resolveImage(activeImage)}
              alt={productName}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 90vw, 40vw"
              priority
            />
          </div>
        ) : (
          <span className="text-xs text-gray-400">Không có ảnh</span>
        )}
      </div>

      {images && images.length > 1 && (
        <div className="flex gap-2">
          {images.map((img, index) => (
            <button
              key={`${img}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Xem ảnh ${index + 1}`}
              className={`relative w-16 h-16 rounded-md overflow-hidden border transition-colors ${
                index === activeIndex
                  ? "border-shop_dark_green"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <Image
                src={resolveImage(img)}
                alt={`${productName} ${index + 1}`}
                fill
                className="object-cover"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductGallery;