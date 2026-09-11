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
    <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-white via-emerald-50/40 to-emerald-100/70 my-10 md:my-10 p-5 lg:p-7">
      {/* Quầng sáng trang trí duy nhất, đặt lệch góc trái để đồng bộ với
          HomeCategories mà không lặp lại y hệt vị trí. */}
      <div className="pointer-events-none absolute -top-16 -left-16 h-48 w-48 rounded-full bg-shop-light-green/25 blur-3xl" />

      <div className="relative border-b border-emerald-200 pb-3">
        <Title className="text-[25px]">Thương hiệu nổi bật</Title>
        <p className="mt-1 text-sm text-gray-400">
          Những thương hiệu được khách hàng tin dùng
        </p>
      </div>

      <div className="relative grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 mt-5 pb-10">
        {brands.map((brand, index) => {
          const imageSrc = resolveImage(brand.imageUrl);

          return (
            <Link
              key={brand.key}
              href={`/shop?brand=${encodeURIComponent(brand.label)}`}
              className="group flex flex-col overflow-hidden rounded-xl border-2 border-emerald-200 bg-white opacity-0 animate-[brand-in_0.5s_ease-out_forwards] transition-all duration-300 hover:-translate-y-1 hover:border-shop-light-green hover:shadow-lg"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="relative w-full aspect-square overflow-hidden bg-gradient-to-br from-emerald-50 to-emerald-100">
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
              <p className="text-center text-xs font-semibold text-shop_dark_green py-2 truncate px-1 border-t-2 border-emerald-100">
                {brand.label}
              </p>
            </Link>
          );
        })}
      </div>

      <div className="relative grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 mb-2 rounded-xl border border-emerald-100/70 bg-white p-4">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.title}
              className="group flex items-center gap-3 rounded-lg p-2 transition-colors duration-300 hover:bg-emerald-50/60"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-50 transition-colors duration-300 group-hover:bg-shop-light-green/15">
                <Icon
                  size={26}
                  strokeWidth={1.75}
                  className="text-shop_dark_green transition-colors duration-300 group-hover:text-shop-light-green"
                />
              </div>
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

      <style>{`
        @keyframes brand-in {
          from {
            opacity: 0;
            transform: translateY(6px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-\\[brand-in_0\\.5s_ease-out_forwards\\] {
            animation: none;
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default HomeBrands;