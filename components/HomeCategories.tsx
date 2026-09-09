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

const normalizeTitle = (title: string) => title.trim().toLowerCase();

const resolveCategoryImage = (
  category: CategoryWithImage
): string | undefined => {
  return CATEGORY_IMAGE_BY_TITLE[normalizeTitle(category.title)] ?? category.imageUrl;
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
    <div className="bg-white shadow-sm ring-1 ring-gray-100 my-10 md:my-10 p-5 lg:p-7 rounded-xl">
      <Title className="border-b border-gray-100 text-[25px] pb-3">
        Danh mục phổ biến
      </Title>

      <div
        className="grid gap-4 mt-5"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))" }}
      >
        {categories.map((category) => {
          const imageSrc = resolveCategoryImage(category);

          return (
            <Link
              key={category.id}
              href={`/shop?category=${category.slug}`}
              className="group flex flex-col rounded-xl bg-gray-50/60 overflow-hidden ring-1 ring-gray-100 hover:ring-shop-light-green hover:shadow-md transition-all duration-200"
            >
              <div className="relative w-full aspect-square overflow-hidden">
                {imageSrc ? (
                  <Image
                    src={imageSrc}
                    alt={category.title}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-300"
                    sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 12vw"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-[10px] text-gray-400">
                    Không có ảnh
                  </div>
                )}
              </div>

              <div className="p-2.5 flex flex-col items-center">
                <span className="text-xs font-semibold text-shop_dark_green text-center line-clamp-1">
                  {category.title}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default HomeCategories;