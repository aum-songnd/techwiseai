"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Calendar } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { blogs, blogCategories } from "../app/data";
import { Title } from "./ui/text";

const formatDate = (isoDate: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(isoDate));

const HomeLatestBlog = () => {
  // Dedupe theo id đề phòng nguồn data bị trùng bản ghi
  const uniqueBlogs = Array.from(
    new Map(blogs.map((blog) => [blog.id, blog])).values()
  );

  const latestBlogs = uniqueBlogs
    .filter((blog) => blog.isLatest)
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );

  
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      align: "start",
      loop: true,
      slidesToScroll: 1,
      dragFree: false,
    },
    [Autoplay({ delay: 4000, stopOnInteraction: false, stopOnMouseEnter: true })]
  );

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [snapCount, setSnapCount] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const onInit = () => {
      setSnapCount(emblaApi.scrollSnapList().length);
      onSelect();
    };
    onInit();
    emblaApi.on("reInit", onInit);
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("reInit", onInit);
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  if (latestBlogs.length === 0) return null;


  return (
    <div className="my-10 md:my-10">
      <div className="mb-4 flex items-center justify-between gap-4">
        <Title className="text-[22px]">Latest Blog</Title>
        </div>
      <div
        className="cursor-grab overflow-hidden px-1 py-1 active:cursor-grabbing"
        ref={emblaRef}
      >
        <div className="-ml-6 flex">
          {latestBlogs.map((blog) => {
            const categories = blogCategories.filter((c) =>
              blog.blogCategoryIds.includes(c.id)
            );

            return (
              <div
                key={blog.id}
                className="flex min-w-0 shrink-0 grow-0 basis-full pl-6 sm:basis-1/2 lg:basis-1/4"
              >
                <Link
                  href={`/blog/${blog.slug}`}
                  draggable={false}
                  className="group flex w-full flex-col overflow-hidden rounded-lg border border-gray-300 bg-white transition-shadow hover:shadow-md"
                >
                  <div className="relative aspect-[11/5] w-full shrink-0 overflow-hidden bg-gray-100">
                    {blog.mainImageUrl ? (
                      <Image
                        src={blog.mainImageUrl}
                        alt={blog.title}
                        fill
                        draggable={false}
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-gray-400">
                        No image
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col gap-3 p-4">
                    <div className="flex items-stretch justify-start gap-6">
                      <div className="flex flex-wrap content-center items-center gap-x-4 gap-y-1 border-b border-gray-300 pb-2">
                        {categories.map((category) => (
                          <span
                            key={category.id}
                            className="text-sm font-semibold text-shop_dark_green"
                          >
                            {category.title}
                          </span>
                        ))}
                      </div>

                      <span className="flex items-center gap-1.5 border-b border-gray-300 pb-2 text-sm text-gray-500">
                        <Calendar className="h-4 w-4 shrink-0" />
                        {formatDate(blog.publishedAt)}
                      </span>
                    </div>

                    <h3 className="line-clamp-2 text-[17px] font-bold leading-snug text-darkColor transition-colors duration-300 group-hover:text-shop_dark_green">
                      {blog.title}
                    </h3>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {/* pagination dots */}
      <div className="mt-5 flex justify-center gap-2">
        {Array.from({ length: snapCount }).map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => emblaApi?.scrollTo(i)}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === selectedIndex
                ? "w-6 bg-shop_dark_green"
                : "w-2 bg-gray-300 hover:bg-gray-400"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default HomeLatestBlog;