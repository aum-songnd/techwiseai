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

// Mỗi danh mục có một viền gradient riêng (kiểu "coin border") để dễ phân
// biệt bằng mắt, thay vì viền xám mỏng giống nhau ở mọi thẻ. Lặp vòng theo
// index nên vẫn hoạt động tốt nếu backend thêm danh mục mới.
const ACCENT_RING = [
  { from: "from-emerald-500", to: "to-emerald-300" },
  { from: "from-amber-500", to: "to-amber-300" },
  { from: "from-sky-500", to: "to-sky-300" },
  { from: "from-rose-500", to: "to-rose-300" },
  { from: "from-violet-500", to: "to-violet-300" },
  { from: "from-cyan-500", to: "to-cyan-300" },
];

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
    <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-white via-emerald-50/40 to-emerald-100/70 my-10 md:my-10 p-5 lg:p-7">
      {/* Quầng sáng trang trí duy nhất, đặt lệch góc để tạo chiều sâu mà
          không phá vỡ nền trắng chủ đạo. */}
      <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-shop-light-green/25 blur-3xl" />

      <div className="relative border-b border-emerald-200 pb-3">
        <Title className="text-[25px]">Danh mục phổ biến</Title>
        <p className="mt-1 text-sm text-gray-400">
          Chọn nhanh đúng thứ bạn đang tìm
        </p>
      </div>

      <div
        className="relative grid gap-x-3 gap-y-6 mt-6"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))" }}
      >
        {categories.map((category, index) => {
          const imageSrc = resolveCategoryImage(category);
          const accent = ACCENT_RING[index % ACCENT_RING.length];

          return (
            <Link
              key={category.id}
              href={`/shop?category=${category.slug}`}
              className="group flex flex-col items-center gap-2.5 opacity-0 animate-[category-in_0.5s_ease-out_forwards]"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div
                className={`h-20 w-20 md:h-24 md:w-24 rounded-full bg-gradient-to-br ${accent.from} ${accent.to} p-[3px] transition-all duration-300 ease-out group-hover:scale-[1.08] group-hover:from-shop-light-green group-hover:to-shop-light-green/70 group-hover:shadow-lg`}
              >
                <div className="relative h-full w-full overflow-hidden rounded-full bg-white p-1.5">
                  <div className="relative h-full w-full overflow-hidden rounded-full bg-gray-50">
                    {imageSrc ? (
                      <Image
                        src={imageSrc}
                        alt={category.title}
                        fill
                        className="object-cover p-1.5"
                        sizes="(max-width: 640px) 25vw, (max-width: 1024px) 15vw, 8vw"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[9px] text-gray-400">
                        Không có ảnh
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <span className="text-xs font-semibold text-shop_dark_green text-center line-clamp-1 transition-colors group-hover:text-shop-light-green">
                {category.title}
              </span>
            </Link>
          );
        })}
      </div>

      <style>{`
        @keyframes category-in {
          from {
            opacity: 0;
            transform: translateY(6px) scale(0.94);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-\\[category-in_0\\.5s_ease-out_forwards\\] {
            animation: none;
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default HomeCategories;