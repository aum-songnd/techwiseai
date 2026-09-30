import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Title } from "./ui/text";
import MarqueeRow from "./MarqueeRow";
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

// Mỗi thẻ có 2 lớp viền dày xếp sát nhau phía sau, mỗi lớp một màu pastel.
// Lặp vòng theo index nên danh mục mới vẫn hoạt động. Viết đủ tên class
// để Tailwind không purge. outer = lớp xa thẻ nhất, inner = lớp sát thẻ.
const LAYER_PALETTES = [
  { outer: "border-violet-200 bg-violet-50", inner: "border-sky-200 bg-sky-50" },
  { outer: "border-fuchsia-200 bg-fuchsia-50", inner: "border-amber-200 bg-amber-50" },
  { outer: "border-emerald-200 bg-emerald-50", inner: "border-cyan-200 bg-cyan-50" },
  { outer: "border-amber-200 bg-amber-50", inner: "border-lime-200 bg-lime-50" },
];

const normalizeTitle = (title: string) => title.trim().toLowerCase();

const resolveCategoryImage = (
  category: CategoryWithImage
): string | undefined => {
  return CATEGORY_IMAGE_BY_TITLE[normalizeTitle(category.title)] ?? category.imageUrl;
};

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

const CategoryItem = ({
  category,
  index,
}: {
  category: CategoryWithImage;
  index: number;
}) => {
  const imageSrc = resolveCategoryImage(category);
  const palette = LAYER_PALETTES[index % LAYER_PALETTES.length];

  return (
    // mr-8 là khoảng cách giữa các thẻ (marquee không dùng gap), đủ rộng
    // để các lớp viền nhô sang phải không đè lên thẻ kế bên.
    <Link
      href={`/shop?category=${category.slug}`}
      className="group mr-8 flex w-48 shrink-0 flex-col md:w-56"
    >
      <div className="relative h-32 w-full transition-transform duration-300 group-hover:-translate-y-1 md:h-40">
        {/* 2 lớp viền dày, màu khác nhau, xếp sát phía sau thẻ chính */}
        <div
          aria-hidden="true"
          className={`absolute inset-0 -translate-y-2 translate-x-3 rounded-xl border-2 ${palette.outer}`}
        />
        <div
          aria-hidden="true"
          className={`absolute inset-0 -translate-y-1 translate-x-1.5 rounded-xl border-2 ${palette.inner}`}
        />

        <div className="relative h-full w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt={category.title}
              fill
              // mix-blend-multiply để nền trắng của ảnh hòa vào nền xám nhạt.
              className="object-contain p-4 mix-blend-multiply"
              sizes="(max-width: 768px) 192px, 224px"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[11px] text-gray-400">
              Không có ảnh
            </div>
          )}
        </div>
      </div>

      <span className="mt-3 line-clamp-1 text-left text-sm font-medium text-gray-700 transition-colors group-hover:text-shop-light-green">
        {category.title}
      </span>
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

  // Không có khung viền/nền bao quanh cả section.
  return (
    <section className="my-8">
      <div className="mb-4 flex items-center justify-between gap-4">
        <Title className="text-[22px]">Danh mục phổ biến</Title>
        <Link
          href="/shop"
          className="inline-flex shrink-0 items-center text-sm text-gray-500 transition-colors hover:text-shop-light-green"
        >
          Xem tất cả
          <ChevronIcon className="h-4 w-4" />
        </Link>
      </div>

      <MarqueeRow direction="left" speed={35}>
        {categories.map((category, index) => (
          <CategoryItem key={category.id} category={category} index={index} />
        ))}
      </MarqueeRow>
    </section>
  );
};

export default HomeCategories;