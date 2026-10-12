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

const CategoryItem = ({ category }: { category: CategoryWithImage }) => {
  const imageSrc = resolveCategoryImage(category);

  return (
    // mr-4 là khoảng cách giữa các thẻ (marquee không dùng gap).
    <Link
      href={`/shop?category=${category.slug}`}
      className="group mr-4 flex w-44 shrink-0 flex-col md:w-52"
    >
      <div className="relative h-28 w-full overflow-hidden rounded-xl bg-gray-50 transition-colors duration-200 group-hover:bg-gray-100 md:h-36">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={category.title}
            fill
            // mix-blend-multiply để nền trắng của ảnh hòa vào nền thẻ.
            className="object-contain p-4 mix-blend-multiply"
            sizes="(max-width: 768px) 176px, 208px"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[11px] text-gray-400">
            Không có ảnh
          </div>
        )}
      </div>

      <span className="mt-2 line-clamp-1 text-sm text-gray-700 transition-colors group-hover:text-black">
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

  return (
    <section className="my-8">
      <div className="mb-4 flex items-center justify-between gap-4">
        <Title className="text-[22px]">Danh mục phổ biến</Title>
        <Link
          href="/shop"
          className="inline-flex shrink-0 items-center text-sm text-gray-500 transition-colors hover:text-black"
        >
          Xem tất cả
          <ChevronIcon className="h-4 w-4" />
        </Link>
      </div>

      <MarqueeRow direction="left" speed={35}>
        {categories.map((category) => (
          <CategoryItem key={category.id} category={category} />
        ))}
      </MarqueeRow>
    </section>
  );
};

export default HomeCategories;