import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Title } from "./ui/text";
import { getCategories } from "@/lib/api";

// API trả về thêm field imageUrl/displayOrder mà Category type gốc (mock)
// chưa khai báo. Mở rộng type tại đây để tránh dùng `any`.
type CategoryWithImage = Awaited<ReturnType<typeof getCategories>>[number] & {
  imageUrl?: string;
  displayOrder?: number;
};

// API chỉ trả imageUrl dạng placeholder chung chung (placehold.co/...),
// nên dùng ảnh thật đã có sẵn trong /public, map theo tên danh mục.
// Ưu tiên ảnh local; nếu category nào không khớp tên nào ở đây thì mới
// fallback về imageUrl từ API.
const CATEGORY_IMAGE_BY_TITLE: Record<string, string> = {
  "laptop": "/laptop.webp",
  "điện thoại": "/mobile.webp",
  "tai nghe": "/earphone.webp",
  "máy ảnh": "/camera.webp",
  "linh kiện": "/ssd.webp",
  "phụ kiện": "/accessory.webp",
};

// Mỗi danh mục có một tông màu riêng: nền thẻ, 2 lớp viền xếp phía sau,
// bóng màu khi hover. Viết đủ tên class để Tailwind không
// purge; lặp vòng theo index nên danh mục mới vẫn hoạt động.
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

// Số lần lặp danh sách trong MỖI nhóm marquee, để nhóm luôn dài hơn
// khung hiển thị dù backend chỉ có vài danh mục.
const REPEAT_PER_GROUP = 2;

// Thời gian chạy cho mỗi thẻ (giây). Càng lớn càng chậm.
const SECONDS_PER_ITEM = 5;

const normalizeTitle = (title: string) => title.trim().toLowerCase();

const resolveCategoryImage = (
  category: CategoryWithImage
): string | undefined => {
  return CATEGORY_IMAGE_BY_TITLE[normalizeTitle(category.title)] ?? category.imageUrl;
};

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

type CategoryItemProps = {
  category: CategoryWithImage;
  index: number;
  // Bản sao dùng để nối vòng lặp: ẩn khỏi screen reader và tab.
  isClone?: boolean;
};

const CategoryItem = ({ category, index, isClone = false }: CategoryItemProps) => {
  const imageSrc = resolveCategoryImage(category);
  const accent = ACCENTS[index % ACCENTS.length];

  return (
    <Link
      href={`/shop?category=${category.slug}`}
      tabIndex={isClone ? -1 : undefined}
      className="group flex w-48 md:w-56 shrink-0 flex-col outline-none"
    >
      <div className="relative h-36 md:h-44 w-full transition-transform duration-500 ease-out group-hover:-translate-y-1.5 group-focus-visible:-translate-y-1.5">
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
          className={`relative h-full w-full overflow-hidden rounded-2xl bg-gradient-to-br ring-1 ring-black/5 shadow-md shadow-black/5 transition-shadow duration-500 group-hover:shadow-xl group-focus-visible:shadow-xl ${accent.bg} ${accent.shadow}`}
        >
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt={isClone ? "" : category.title}
              fill
              className="object-contain p-5 drop-shadow-md transition-transform duration-700 ease-out group-hover:scale-110"
              sizes="(max-width: 768px) 192px, 224px"
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
          {category.title}
        </span>
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400 transition-all duration-300 group-hover:bg-shop-light-green group-hover:text-white">
          <ArrowIcon className="h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-12" />
        </span>
      </div>
    </Link>
  );
};

const HomeCategories = async () => {
  let categories: CategoryWithImage[] = [];

  try {
    categories = (await getCategories()) as CategoryWithImage[];
    // Sắp xếp theo displayOrder mà backend cấu hình (số nhỏ hiện trước).
    // Category không có displayOrder (undefined) bị đẩy xuống cuối.
    categories = [...categories].sort((a, b) => {
      const orderA = a.displayOrder ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.displayOrder ?? Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    });
  } catch (err) {
    console.error("Lỗi getCategories:", err);
  }

  if (categories.length === 0) {
    return null;
  }

  // Một nhóm = danh sách gốc lặp REPEAT_PER_GROUP lần.
  const groupItems = Array.from({ length: REPEAT_PER_GROUP }).flatMap(
    (_, copy) =>
      categories.map((category, index) => ({
        category,
        index,
        key: `${category.id}-${copy}`,
      }))
  );

  const duration = `${Math.round(groupItems.length * SECONDS_PER_ITEM)}s`;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-gray-100 bg-gradient-to-b from-white to-emerald-50/40 my-10 md:my-10 p-5 lg:p-7 shadow-sm">
      {/* Quầng sáng trang trí, đặt lệch góc để tạo chiều sâu */}
      <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-shop-light-green/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-48 w-48 rounded-full bg-emerald-200/30 blur-3xl" />

      <div className="relative flex items-end justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <Title className="text-[25px]">Danh mục phổ biến</Title>
          <p className="mt-1 text-sm text-gray-400">
            Chọn nhanh đúng thứ bạn đang tìm
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

      {/* Marquee tràn sát 2 mép khung (âm margin bù padding), mép mờ nhẹ. */}
      <div className="category-marquee relative mt-8 -mx-5 lg:-mx-7 pt-3 pb-2">
        <div className="category-marquee-track" style={{ animationDuration: duration }}>
          <div className="category-marquee-group">
            {groupItems.map(({ category, index, key }) => (
              <CategoryItem key={key} category={category} index={index} />
            ))}
          </div>
          <div className="category-marquee-group" aria-hidden="true">
            {groupItems.map(({ category, index, key }) => (
              <CategoryItem
                key={`clone-${key}`}
                category={category}
                index={index}
                isClone
              />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .category-marquee {
          overflow: hidden;
          -webkit-mask-image: linear-gradient(to right, transparent, #000 4%, #000 96%, transparent);
          mask-image: linear-gradient(to right, transparent, #000 4%, #000 96%, transparent);
        }
        .category-marquee-track {
          display: flex;
          width: max-content;
          animation: category-marquee linear infinite;
          will-change: transform;
        }
        .category-marquee-group {
          display: flex;
          flex-shrink: 0;
          gap: 2.5rem;
          /* padding-right = gap để -50% khớp chính xác, không giật khi lặp */
          padding-right: 2.5rem;
        }
        /* Dừng khi hover hoặc khi đang focus bằng bàn phím */
        .category-marquee:hover .category-marquee-track,
        .category-marquee:focus-within .category-marquee-track {
          animation-play-state: paused;
        }
        @keyframes category-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .category-marquee {
            overflow-x: auto;
            -webkit-mask-image: none;
            mask-image: none;
          }
          .category-marquee-track {
            animation: none;
          }
          /* Bỏ bản sao, cho người dùng tự cuộn ngang */
          .category-marquee-group[aria-hidden="true"] {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default HomeCategories;