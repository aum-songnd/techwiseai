"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Calendar } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { blogs, blogCategories } from "../app/data";
import { Title } from "./ui/text";
import { getHiddenBlogsMap } from "../lib/admin-blog-api";
import { subscribeTabSync } from "../lib/tab-sync";

const formatDate = (isoDate: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(isoDate));

const HomeLatestBlog = () => {
  const [hiddenMap, setHiddenMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setHiddenMap(getHiddenBlogsMap());
    const unsubscribe = subscribeTabSync((event) => {
      if (event.type === "BLOGS_STATUS_CHANGED") {
        setHiddenMap(getHiddenBlogsMap());
      }
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const uniqueBlogs = Array.from(
    new Map(blogs.map((blog) => [blog.id, blog])).values()
  );

  const latestBlogs = uniqueBlogs
    .filter((blog) => blog.isLatest && blog.active !== false && !hiddenMap[blog.id])
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
    <section className="my-10 md:my-10 font-sans text-neutral-900">
      <div className="mb-4 flex items-center justify-between gap-4">
        <Title className="font-sans text-xl font-bold uppercase tracking-tight text-shop_dark_green">
          Latest Blog
        </Title>
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
                  className="group flex w-full flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white font-sans transition-all duration-200 hover:border-neutral-300 hover:shadow-md"
                >
                  <div className="relative aspect-[11/5] w-full shrink-0 overflow-hidden bg-neutral-100">
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
                      <div className="flex h-full items-center justify-center font-sans text-xs text-neutral-400">
                        No image
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col gap-3 p-4">
                    <div className="flex items-stretch justify-start gap-4">
                      <div className="flex flex-wrap content-center items-center gap-x-3 gap-y-1 border-b border-neutral-200 pb-2">
                        {categories.map((category) => (
                          <span
                            key={category.id}
                            className="font-sans text-xs font-semibold uppercase tracking-wider text-shop_dark_green"
                          >
                            {category.title}
                          </span>
                        ))}
                      </div>

                      <span className="flex items-center gap-1.5 border-b border-neutral-200 pb-2 font-sans text-xs text-neutral-500">
                        <Calendar className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                        {formatDate(blog.publishedAt)}
                      </span>
                    </div>

                    <h3 className="line-clamp-2 font-sans text-sm sm:text-base font-semibold leading-snug text-neutral-900 transition-colors duration-200 group-hover:text-shop_dark_green">
                      {blog.title}
                    </h3>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>

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
                : "w-2 bg-neutral-200 hover:bg-neutral-300"
            }`}
          />
        ))}
      </div>
    </section>
  );
};

export default HomeLatestBlog;