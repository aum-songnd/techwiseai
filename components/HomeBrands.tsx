import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Truck, RotateCcw, Headphones, ShieldCheck } from "lucide-react";
import { Title } from "./ui/text";
import { brands } from "../app/data";

const features = [
  {
    icon: Truck,
    title: "Giao hàng miễn phí",
    description: "Miễn phí ship cho đơn từ 100$",
  },
  {
    icon: RotateCcw,
    title: "Đổi trả miễn phí",
    description: "Miễn phí ship cho đơn từ 100$",
  },
  {
    icon: Headphones,
    title: "Hỗ trợ khách hàng",
    description: "Hỗ trợ thân thiện 24/7",
  },
  {
    icon: ShieldCheck,
    title: "Đảm bảo hoàn tiền",
    description: "Được kiểm tra chất lượng bởi đội ngũ của chúng tôi",
  },
];

const HomeBrands = () => {
  return (
    <div className="bg-gray-100 border-2 border-shop-light-green my-10 md:my-10 p-5 lg:p-7 rounded-md">
      

      <Title className=" border-gray-200 text-[25px]">
        Thương hiệu nổi bật
      </Title>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-5 pb-10">
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
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-6 rounded-lg border-gray-200  px-4 py-4 bg-white" >
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <div key={feature.title} className="group flex items-center gap-3 ">
              <Icon
                size={50}
                strokeWidth={1.5}
                className="shrink-0 text-gray-700 group-hover:text-orange-500 transition-colors duration-300"
              />
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-darkColor">
                  {feature.title}
                </span>
                <span className="text-xs text-gray-500">
                  {feature.description}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HomeBrands;