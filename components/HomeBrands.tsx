import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Truck, RotateCcw, Headphones, ShieldCheck } from "lucide-react";
import { Title } from "./ui/text";
import MarqueeRow from "./MarqueeRow";
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
// Brand có logo thật trong /public thì hiện logo; brand chưa có logo thì
// hiện tên brand dạng chữ trong thẻ.
const MAX_BRANDS = 8;

// === ĐỔI Ở ĐÂY === key phải là tên brand viết thường (khớp với `brand` mà
// API trả về, sau khi .toLowerCase()). Value là đường dẫn public tới file
// logo. Các file logo đang nằm thẳng trong thư mục `public/` (vd
// public/acer.png) nên đường dẫn chỉ cần "/acer.png". Thêm brand mới có
// logo thì chỉ cần bổ sung một dòng vào đây, không cần sửa gì khác.
const BRAND_LOGOS: Record<string, string> = {
  acer: "/acer.png",
  apple: "/apple.png",
  asus: "/asus.png",
  dell: "/dell.png",
  gigabyte: "/gigabyte.png",
  hp: "/hp.png",
  lenovo: "/lenovo.png",
  microsoft: "/microsoft.png",
};

// Mỗi thẻ có một tông màu pastel riêng: nền thẻ gần như trắng (chỉ ám nhẹ
// ở góc để logo vẫn nổi), cùng 2 lớp viền dày cùng tông xếp sát phía sau.
// Lặp vòng theo index nên brand mới vẫn hoạt động. Viết đủ tên class để
// Tailwind không purge. outer = lớp xa thẻ nhất, inner = lớp sát thẻ.
// Thứ tự màu lệch so với HomeCategories để 2 hàng không trùng màu cùng vị trí.
const LAYER_PALETTES = [
  {
    card: "border-violet-100 bg-gradient-to-br from-white via-white to-violet-50",
    inner: "border-violet-200 bg-violet-50",
    outer: "border-violet-100 bg-violet-50/60",
  },
  {
    card: "border-cyan-100 bg-gradient-to-br from-white via-white to-cyan-50",
    inner: "border-cyan-200 bg-cyan-50",
    outer: "border-cyan-100 bg-cyan-50/60",
  },
  {
    card: "border-emerald-100 bg-gradient-to-br from-white via-white to-emerald-50",
    inner: "border-emerald-200 bg-emerald-50",
    outer: "border-emerald-100 bg-emerald-50/60",
  },
  {
    card: "border-amber-100 bg-gradient-to-br from-white via-white to-amber-50",
    inner: "border-amber-200 bg-amber-50",
    outer: "border-amber-100 bg-amber-50/60",
  },
  {
    card: "border-sky-100 bg-gradient-to-br from-white via-white to-sky-50",
    inner: "border-sky-200 bg-sky-50",
    outer: "border-sky-100 bg-sky-50/60",
  },
  {
    card: "border-rose-100 bg-gradient-to-br from-white via-white to-rose-50",
    inner: "border-rose-200 bg-rose-50",
    outer: "border-rose-100 bg-rose-50/60",
  },
];

type BrandCard = {
  key: string;
  label: string;
  // Đường dẫn logo (từ BRAND_LOGOS). undefined -> hiện tên brand dạng chữ.
  logoUrl?: string;
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
        seen.set(key, { key, label, logoUrl: BRAND_LOGOS[key] });
      }
    }

    return Array.from(seen.values())
      .sort((a, b) => {
        // Ưu tiên brand có logo thật lên trước, tránh trường hợp brand có
        // logo (vd "Dell") bị các brand không có logo xếp trước bảng chữ
        // cái đẩy ra ngoài top MAX_BRANDS.
        const hasLogoA = !!a.logoUrl;
        const hasLogoB = !!b.logoUrl;
        if (hasLogoA !== hasLogoB) return hasLogoA ? -1 : 1;
        return a.label.localeCompare(b.label);
      })
      .slice(0, MAX_BRANDS);
  } catch {
    // Lỗi gọi API -> ẩn section thay vì làm crash trang chủ.
    return [];
  }
}

const ChevronIcon = ({ className = "" }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="m9 6 6 6-6 6" />
  </svg>
);

const BrandItem = ({ brand, index }: { brand: BrandCard; index: number }) => {
  const palette = LAYER_PALETTES[index % LAYER_PALETTES.length];

  return (
    // mr-8 là khoảng cách giữa các thẻ (marquee không dùng gap), đủ rộng
    // để các lớp viền nhô sang phải không đè lên thẻ kế bên.
    <Link
      href={`/shop?brand=${encodeURIComponent(brand.label)}`}
      className="group mr-8 flex w-44 shrink-0 flex-col md:w-52"
    >
      <div className="relative h-24 w-full transition-transform duration-300 group-hover:-translate-y-1 md:h-28">
        {/* 2 lớp viền dày, màu khác nhau, xếp sát phía sau thẻ chính */}
        <div
          aria-hidden="true"
          className={`absolute inset-0 -translate-y-2 translate-x-3 rounded-xl border-2 ${palette.outer}`}
        />
        <div
          aria-hidden="true"
          className={`absolute inset-0 -translate-y-1 translate-x-1.5 rounded-xl border-2 ${palette.inner}`}
        />

        <div
          className={`relative flex h-full w-full items-center justify-center overflow-hidden rounded-xl border shadow-sm shadow-black/5 ${palette.card}`}
        >
          {brand.logoUrl ? (
            <Image
              src={brand.logoUrl}
              alt={brand.label}
              fill
              className="object-contain p-5 mix-blend-multiply"
              sizes="(max-width: 768px) 176px, 208px"
            />
          ) : (
            <span className="truncate px-3 text-base font-semibold text-gray-700">
              {brand.label}
            </span>
          )}
        </div>
      </div>

      <span className="mt-3 line-clamp-1 text-left text-sm font-medium text-gray-700 transition-colors group-hover:text-shop-light-green">
        {brand.label}
      </span>
    </Link>
  );
};

const HomeBrands = async () => {
  const brands = await getFeaturedBrands();

  if (brands.length === 0) return null;

  // Không có khung viền/nền bao quanh cả section.
  return (
    <section className="my-8">
      <div className="mb-4 flex items-center justify-between gap-4">
        <Title className="text-[22px]">Thương hiệu nổi bật</Title>
        <Link
          href="/shop"
          className="inline-flex shrink-0 items-center text-sm text-gray-500 transition-colors hover:text-shop-light-green"
        >
          Xem tất cả
          <ChevronIcon className="h-4 w-4" />
        </Link>
      </div>

      {/* Chạy sang phải, ngược chiều với marquee danh mục. */}
      <MarqueeRow direction="right" speed={35}>
        {brands.map((brand, index) => (
          <BrandItem key={brand.key} brand={brand} index={index} />
        ))}
      </MarqueeRow>

      <div className="mt-6 grid grid-cols-1 gap-4 border-t border-gray-200 pt-6 sm:grid-cols-2 md:grid-cols-4 md:gap-0 md:divide-x md:divide-gray-200">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.title}
              className="flex items-center gap-3 md:px-5 md:first:pl-0 md:last:pr-0"
            >
              <Icon
                size={30}
                strokeWidth={1.5}
                className="shrink-0 text-shop_dark_green"
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
    </section>
  );
};

export default HomeBrands;