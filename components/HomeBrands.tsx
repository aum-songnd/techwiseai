import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Title } from "./ui/text";
import { brands } from "../app/data";

const HomeBrands = () => {
  return (
    <div className="bg-white border-2 border-shop-light-green my-10 md:my-20 p-5 lg:p-7 rounded-md">
      <Title className="border-b-2 border-gray-200 text-[25px]">
        Thương hiệu nổi bật
      </Title>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-5">
        {brands.map((brand) => (
          <div
            key={brand.id}
            className="group flex flex-col rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
          >
            <Link href={`/shop?brand=${brand.slug}`}>
              <div className="relative w-full aspect-square bg-gray-50 overflow-hidden">
                {brand.imageUrl ? (
                  <Image
                    src={brand.imageUrl}
                    alt={brand.title}
                    fill
                    className="object-contain p-6 group-hover:scale-110 transition-transform duration-300"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-gray-400">
                    Không có ảnh
                  </div>
                )}
              </div>
            </Link>

            <div className="p-3 flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-shop_dark_green line-clamp-1">
                {brand.title}
              </span>
              {brand.description && (
                <span className="text-xs text-gray-500 line-clamp-2">
                  {brand.description}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HomeBrands;