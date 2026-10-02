import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Title } from "./ui/text";
import { getCategories } from "@/lib/api";

type CategoryWithImage = Awaited<ReturnType<typeof getCategories>>[number] & {
  imageUrl?: string;
  displayOrder?: number;
};

const CATEGORY_IMAGE_BY_TITLE: Record<string, string> = {
  laptop: "/laptop.webp",
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
  return (
    CATEGORY_IMAGE_BY_TITLE[normalizeTitle(category.title)] ?? category.imageUrl
  );
};

type TileLayout = {
  span: string;
  text: string;
  image: string;
  objectPosition: string;
};

const TILE_LAYOUTS: TileLayout[] = [
  {
    span: "col-span-2 md:col-span-2",
    text: "bottom-5 left-5 md:bottom-6 md:left-6",
    image: "bottom-0 right-0 h-[88%] w-[58%]",
    objectPosition: "right bottom",
  },
  {
    span: "col-span-1",
    text: "bottom-5 left-5 md:bottom-6 md:left-6",
    image: "top-0 left-0 h-[68%] w-full",
    objectPosition: "center top",
  },
  {
    span: "col-span-1",
    text: "top-5 left-5 md:top-6 md:left-6",
    image: "bottom-0 right-0 h-[78%] w-[78%]",
    objectPosition: "right bottom",
  },
  {
    span: "col-span-1",
    text: "bottom-5 left-5 md:bottom-6 md:left-6",
    image: "top-0 left-0 h-[68%] w-full",
    objectPosition: "left top",
  },
  {
    span: "col-span-2 md:col-span-2",
    text: "top-5 left-[52%] md:top-6",
    image: "bottom-0 left-0 h-[78%] w-[56%]",
    objectPosition: "left center",
  },
  {
    span: "col-span-1",
    text: "bottom-5 left-5 md:bottom-6 md:left-6",
    image: "top-0 right-0 h-[68%] w-[90%]",
    objectPosition: "right top",
  },
];

const CategoryTile = ({
  category,
  layout,
}: {
  category: CategoryWithImage;
  layout: TileLayout;
}) => {
  const imageSrc = resolveCategoryImage(category);

  return (
    <Link
      href={`/shop?category=${category.slug}`}
      className={`group relative block h-44 overflow-hidden rounded-2xl bg-[#f1f1f8] md:h-64 ${layout.span}`}
    >
      {imageSrc && (
        <div className={`absolute ${layout.image}`}>
          <Image
            src={imageSrc}
            alt={category.title}
            fill

            className="object-contain mix-blend-multiply transition-transform duration-500 ease-out group-hover:scale-105"
            style={{ objectPosition: layout.objectPosition }}
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        </div>
      )}

      <div className={`absolute z-10 max-w-[45%] ${layout.text}`}>
        <h3 className="text-base font-bold leading-tight text-gray-900 md:text-xl">
          {category.title}
        </h3>
        <span className="mt-2 inline-block border-b border-gray-800 pb-0.5 text-[11px] uppercase tracking-wide text-gray-600 md:text-xs">
          Xem thêm
        </span>
      </div>
    </Link>
  );
};

const HomeCategories = async () => {
  let categories: CategoryWithImage[] = [];

  try {
    categories = (await getCategories()) as CategoryWithImage[];

    categories = [...categories].sort((a, b) => {
      const orderA = a.displayOrder ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.displayOrder ?? Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    });
  } catch {

  }

  if (categories.length === 0) {
    return null;
  }

  const tiles = categories.slice(0, TILE_LAYOUTS.length);

  return (
    <section className="my-8">
      <Title className="mb-6 text-[22px]">Danh mục phổ biến</Title>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {tiles.map((category, index) => (
          <CategoryTile
            key={category.id}
            category={category}
            layout={TILE_LAYOUTS[index]}
          />
        ))}
      </div>
    </section>
  );
};

export default HomeCategories;