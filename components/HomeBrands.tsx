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
// Với những brand đã có logo thật đặt sẵn trong /public (vd public/brands/
// acer.png), ưu tiên dùng logo đó. Brand nào chưa có logo thì fallback về
// ảnh sản phẩm đầu tiên tìm thấy, kèm tên brand hiển thị rõ.
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

// Mỗi brand có một tông màu riêng: nền thẻ fallback, 2 lớp viền xếp phía
// sau và bóng màu khi hover. Viết đủ tên class để Tailwind không purge;
// lặp vòng theo index nên brand mới vẫn hoạt động.
const ACCENTS = [
  {
    bg: "from-emerald-50 via-white to-emerald-100",
    back: "border-emerald-100 bg-emerald-50/40",
    front: "border-emerald-200 bg-emerald-50/70",
    shadow: "group-hover:shadow-emerald-200/80",
  },
  {
    bg: "from-amber-50 via-white to-amber-100",
    back: "border-amber-100 bg-amber-50/40",
    front: "border-amber-200 bg-amber-50/70",
    shadow: "group-hover:shadow-amber-200/80",
  },
  {
    bg: "from-sky-50 via-white to-sky-100",
    back: "border-sky-100 bg-sky-50/40",
    front: "border-sky-200 bg-sky-50/70",
    shadow: "group-hover:shadow-sky-200/80",
  },
  {
    bg: "from-rose-50 via-white to-rose-100",
    back: "border-rose-100 bg-rose-50/40",
    front: "border-rose-200 bg-rose-50/70",
    shadow: "group-hover:shadow-rose-200/80",
  },
  {
    bg: "from-violet-50 via-white to-violet-100",
    back: "border-violet-100 bg-violet-50/40",
    front: "border-violet-200 bg-violet-50/70",
    shadow: "group-hover:shadow-violet-200/80",
  },
  {
    bg: "from-cyan-50 via-white to-cyan-100",
    back: "border-cyan-100 bg-cyan-50/40",
    front: "border-cyan-200 bg-cyan-50/70",
    shadow: "group-hover:shadow-cyan-200/80",
  },
];

// Số thẻ tối thiểu trong MỖI nhóm marquee, để nhóm luôn dài hơn khung
// hiển thị dù chỉ có vài brand.
const MIN_ITEMS_PER_GROUP = 10;

// Thời gian chạy cho mỗi thẻ (giây). Càng lớn càng chậm.
const SECONDS_PER_ITEM = 4;

type BrandCard = {
  key: string;
  label: string;
  imageUrl?: string;
  // true khi imageUrl là logo thật (từ BRAND_LOGOS) thay vì ảnh sản phẩm
  // fallback -> dùng để hiển thị khác nhau (object-contain vs object-cover).
  isLogo?: boolean;
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
        const logoPath = BRAND_LOGOS[key];
        seen.set(key, {
          key,
          label,
          imageUrl: logoPath ?? product.images?.[0],
          isLogo: !!logoPath,
        });
      }
    }

    return Array.from(seen.values())
      .sort((a, b) => {
        // Ưu tiên brand có logo thật lên trước, tránh trường hợp brand có
        // logo (vd "Dell") bị các brand không có logo xếp trước bảng chữ
        // cái đẩy ra ngoài top MAX_BRANDS.
        if (a.isLogo !== b.isLogo) return a.isLogo ? -1 : 1;
        return a.label.localeCompare(b.label);
      })
      .slice(0, MAX_BRANDS);
  } catch {
    // Lỗi gọi API -> ẩn section thay vì làm crash trang chủ.
    return [];
  }
}

const ArrowIcon = ({ className = "" }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M7 17 17 7M8 7h9v9" />
  </svg>
);

type BrandItemProps = {
  brand: BrandCard;
  index: number;
  // Bản sao dùng để nối vòng lặp: ẩn khỏi screen reader và tab.
  isClone?: boolean;
};

const BrandItem = ({ brand, index, isClone = false }: BrandItemProps) => {
  const imageSrc = resolveImage(brand.imageUrl);
  const accent = ACCENTS[index % ACCENTS.length];

  return (
    <Link
      href={`/shop?brand=${encodeURIComponent(brand.label)}`}
      tabIndex={isClone ? -1 : undefined}
      className="group flex w-40 md:w-48 shrink-0 flex-col outline-none"
    >
      <div className="relative h-28 md:h-32 w-full transition-transform duration-500 ease-out group-hover:-translate-y-1.5 group-focus-visible:-translate-y-1.5">
        {/* 2 lớp viền mờ xếp lệch phía sau; hover thì xòe ra thêm */}
        <div
          aria-hidden="true"
          className={`absolute inset-0 translate-x-4 -translate-y-1.5 rounded-2xl border transition-transform duration-500 group-hover:translate-x-5 group-hover:-translate-y-2 ${accent.back}`}
        />
        <div
          aria-hidden="true"
          className={`absolute inset-0 translate-x-2 -translate-y-0.5 rounded-2xl border transition-transform duration-500 group-hover:translate-x-2.5 group-hover:-translate-y-1 ${accent.front}`}
        />

        <div
          className={`relative h-full w-full overflow-hidden rounded-2xl ring-1 ring-black/5 shadow-md shadow-black/5 transition-shadow duration-500 group-hover:shadow-xl group-focus-visible:shadow-xl ${accent.shadow} ${
            brand.isLogo ? "bg-white" : `bg-gradient-to-br ${accent.bg}`
          }`}
        >
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt={isClone ? "" : brand.label}
              fill
              className={
                brand.isLogo
                  ? "object-contain p-6 transition-transform duration-700 ease-out group-hover:scale-110"
                  : "object-cover transition-transform duration-700 ease-out group-hover:scale-110"
              }
              sizes="(max-width: 768px) 160px, 192px"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[11px] text-gray-400">
              Không có ảnh
            </div>
          )}

          {/* Vệt sáng quét ngang khi hover */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -translate-x-full -skew-x-12 bg-gradient-to-r from-transparent via-white/60 to-transparent transition-transform duration-1000 ease-out group-hover:translate-x-[400%]"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 pr-4">
        <span className="line-clamp-1 text-left text-sm font-semibold text-gray-700 transition-colors group-hover:text-shop-light-green">
          {brand.label}
        </span>
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400 transition-all duration-300 group-hover:bg-shop-light-green group-hover:text-white">
          <ArrowIcon className="h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-12" />
        </span>
      </div>
    </Link>
  );
};

const HomeBrands = async () => {
  const brands = await getFeaturedBrands();

  if (brands.length === 0) return null;

  // Lặp danh sách đủ MIN_ITEMS_PER_GROUP thẻ trong mỗi nhóm.
  const repeat = Math.max(1, Math.ceil(MIN_ITEMS_PER_GROUP / brands.length));
  const groupItems = Array.from({ length: repeat }).flatMap((_, copy) =>
    brands.map((brand, index) => ({
      brand,
      index,
      key: `${brand.key}-${copy}`,
    }))
  );

  const duration = `${Math.round(groupItems.length * SECONDS_PER_ITEM)}s`;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-gray-100 bg-gradient-to-b from-white to-emerald-50/40 my-10 md:my-10 p-5 lg:p-7 shadow-sm">
      {/* Quầng sáng trang trí, đặt lệch góc trái/phải ngược với
          HomeCategories để 2 section không lặp y hệt nhau. */}
      <div className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-shop-light-green/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-48 w-48 rounded-full bg-emerald-200/30 blur-3xl" />

      <div className="relative flex items-end justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <Title className="text-[25px]">Thương hiệu nổi bật</Title>
          <p className="mt-1 text-sm text-gray-400">
            Những thương hiệu được khách hàng tin dùng
          </p>
        </div>
        <Link
          href="/shop"
          className="group/all inline-flex shrink-0 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:border-shop-light-green hover:text-shop-light-green"
        >
          Xem tất cả
          <ArrowIcon className="h-3.5 w-3.5 transition-transform group-hover/all:translate-x-0.5 group-hover/all:-translate-y-0.5" />
        </Link>
      </div>

      {/* Marquee tràn sát 2 mép khung (âm margin bù padding), mép mờ nhẹ.
          Chạy ngược chiều với marquee danh mục cho đỡ đơn điệu. */}
      <div className="brand-marquee relative mt-8 -mx-5 lg:-mx-7 pt-3 pb-2">
        <div className="brand-marquee-track" style={{ animationDuration: duration }}>
          <div className="brand-marquee-group">
            {groupItems.map(({ brand, index, key }) => (
              <BrandItem key={key} brand={brand} index={index} />
            ))}
          </div>
          <div className="brand-marquee-group" aria-hidden="true">
            {groupItems.map(({ brand, index, key }) => (
              <BrandItem
                key={`clone-${key}`}
                brand={brand}
                index={index}
                isClone
              />
            ))}
          </div>
        </div>
      </div>

      <div className="relative mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 mb-2 rounded-xl border border-emerald-100/70 bg-white p-4">
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
        .brand-marquee {
          overflow: hidden;
          -webkit-mask-image: linear-gradient(to right, transparent, #000 4%, #000 96%, transparent);
          mask-image: linear-gradient(to right, transparent, #000 4%, #000 96%, transparent);
        }
        .brand-marquee-track {
          display: flex;
          width: max-content;
          animation: brand-marquee linear infinite reverse;
          will-change: transform;
        }
        .brand-marquee-group {
          display: flex;
          flex-shrink: 0;
          gap: 2.5rem;
          /* padding-right = gap để -50% khớp chính xác, không giật khi lặp */
          padding-right: 2.5rem;
        }
        /* Dừng khi hover hoặc khi đang focus bằng bàn phím */
        .brand-marquee:hover .brand-marquee-track,
        .brand-marquee:focus-within .brand-marquee-track {
          animation-play-state: paused;
        }
        @keyframes brand-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .brand-marquee {
            overflow-x: auto;
            -webkit-mask-image: none;
            mask-image: none;
          }
          .brand-marquee-track {
            animation: none;
          }
          /* Bỏ bản sao, cho người dùng tự cuộn ngang */
          .brand-marquee-group[aria-hidden="true"] {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default HomeBrands;