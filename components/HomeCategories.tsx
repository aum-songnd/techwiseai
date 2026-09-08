import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Title } from "./ui/text";
import { getCategories } from "@/lib/api";

// API trả về thêm field imageUrl mà Category type gốc (mock) chưa khai báo.
// Mở rộng type tại đây để tránh dùng `any`.
type CategoryWithImage = Awaited<ReturnType<typeof getCategories>>[number] & {
  imageUrl?: string;
};

const HomeCategories = async () => {
  let categories: CategoryWithImage[] = [];

  try {
    categories = (await getCategories()) as CategoryWithImage[];
  } catch (err) {
    console.error("Lỗi getCategories:", err);
  }

  if (categories.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border-2 border-shop-light-green my-10 md:my-10 p-5 lg:p-7 rounded-md">
      <Title className="border-b-2 border-gray-200 text-[25px]">
        Danh mục phổ biến
      </Title>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-5">
        {categories.map((category) => (
          <div
            key={category.id}
            className="group flex flex-col rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
          >
            <Link href={`/shop?category=${category.slug}`}>
              <div className="relative w-full aspect-square bg-gray-50 overflow-hidden">
                {category.imageUrl ? (
                  <Image
                    src={category.imageUrl}
                    alt={category.title}
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
            </Link>

            <div className="p-3 flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-shop_dark_green line-clamp-1">
                {category.title}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HomeCategories;