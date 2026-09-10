import React from "react";
import Link from "next/link";
import Image, { type StaticImageData } from "next/image";
import { Truck, RotateCcw, Headphones, ShieldCheck } from "lucide-react";
import { Title } from "./ui/text";
import { productImages } from "../images";
import { getAllProductsByCategory } from "../lib/api";

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

// API không có bảng brand riêng kèm logo (chỉ có field `brand` dạng
// string thô trên mỗi product, giống lib/api.ts và Shop.tsx đang xử lý).
// Vì vậy không có ảnh logo thương hiệu thật -> dùng tạm ảnh sản phẩm đầu
// tiên tìm thấy của mỗi brand làm ảnh đại diện, kèm tên brand hiển thị rõ.
const MAX_BRANDS = 8;

type BrandCard = {
  key: string;
  label: string;
  imageUrl?: string;
};

const resolveImage = (
  fileName?: string
): StaticImageData | string | null => {
  if (!fileName) return null;
  const localImage = (
    productImages as Record<string, StaticImageData | undefined>
  )[fileName];
  return localImage ?? fileName;
};

async function getFeaturedBrands(): Promise<BrandCard[]> {
  try {
    // Không truyền category -> lấy toàn bộ sản phẩm để gom brand.
    const products = await getAllProductsByCategory();

    const seen = new Map<string, BrandCard>();
    for (const product of products) {
      const raw = (product as unknown as { brand?: string }).brand;
      const label = raw?.trim();
      if (!label) continue;

      const key = label.toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, {
          key,
          label,
          imageUrl: product.images?.[0],
        });
      }
    }

    return Array.from(seen.values())
      .sort((a, b) => a.label.localeCompare(b.label))
      .slice(0, MAX_BRANDS);
  } catch {
    // Lỗi gọi API -> ẩn section thay vì làm crash trang chủ.
    return [];
  }
}

const HomeBrands = async () => {
  const brands = await getFeaturedBrands();

  if (brands.length === 0) return null;

  return (
    <div className="bg-gray-100  border-shop-light-green my-10 md:my-10 p-5 lg:p-7 rounded-md">
      <Title className=" border-gray-200 text-[25px]">
        Thương hiệu nổi bật
      </Title>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 mt-5 pb-10">
        {brands.map((brand) => {
          const imageSrc = resolveImage(brand.imageUrl);

          return (
            <div
              key={brand.key}
              className="group flex flex-col rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              <Link href={`/shop?brand=${encodeURIComponent(brand.label)}`}>
                <div className="relative w-full aspect-square bg-gray-50 overflow-hidden">
                  {imageSrc ? (
                    <Image
                      src={imageSrc}
                      alt={brand.label}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-300"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-xs text-gray-400">
                      Không có ảnh
                    </div>
                  )}
                </div>
                <p className="text-center text-xs font-medium text-darkColor py-1.5 truncate px-1">
                  {brand.label}
                </p>
              </Link>
            </div>
          );
        })}
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