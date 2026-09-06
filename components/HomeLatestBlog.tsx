import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Calendar } from "lucide-react";
import { blogs, blogCategories } from "../app/data";

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
    )
    .slice(0, 4);

  if (latestBlogs.length === 0) return null;

  return (
    <div className="my-10 md:my-20">
      <h2 className="text-[28px] md:text-[32px] font-bold text-darkColor mb-6">
        Latest Blog
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {latestBlogs.map((blog) => {
          const categories = blogCategories.filter((c) =>
            blog.blogCategoryIds.includes(c.id)
          );

          return (
            <Link
              key={blog.id}
              href={`/blog/${blog.slug}`}
              className="group flex flex-col rounded-lg border border-gray-300 overflow-hidden hover:shadow-md transition-shadow bg-white"
            >
              <div className="relative w-full aspect-[4/3] bg-gray-100 overflow-hidden">
                {blog.mainImageUrl ? (
                  <Image
                    src={blog.mainImageUrl}
                    alt={blog.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-gray-400">
                    No image
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pb-2 border-b border-gray-300 inline-flex w-fit">
                    {categories.map((category, idx) => (
                      <React.Fragment key={category.id}>
                        {idx > 0 && <span className="text-gray-300">|</span>}
                        <span className="text-shop_dark_green font-semibold text-sm">
                          {category.title}
                        </span>
                      </React.Fragment>
                    ))}
                  </div>

                  <span className="flex items-center gap-1.5 text-gray-500 text-sm whitespace-nowrap pb-2 border-b border-gray-300 w-fit">
                    <Calendar className="w-4 h-4" />
                    {formatDate(blog.publishedAt)}
                  </span>
                </div>

                <h3 className="text-[17px] font-bold text-darkColor leading-snug line-clamp-2 group-hover:text-shop_dark_green transition-colors duration-300">
                  {blog.title}
                </h3>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default HomeLatestBlog;