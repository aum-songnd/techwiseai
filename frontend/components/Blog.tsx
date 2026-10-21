/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Calendar, User, Clock, ArrowRight } from "lucide-react";
import Container from "@/components/Container";
import { Blog as BlogType, BlogCategory, Author } from "../app/data/types";
import { getHiddenBlogsMap, syncHiddenBlogs } from "@/lib/admin-blog-api";
import { subscribeTabSync } from "@/lib/tab-sync";

interface Props {
  blogs: BlogType[];
  blogCategories: BlogCategory[];
  authors: Author[];
  children?: React.ReactNode;
}

const BlogCardImage = ({ src, alt }: { src?: string; alt: string }) => {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-neutral-100 text-neutral-400 font-mono text-xs">
        [ Techwise AI ]
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setHasError(true)}
      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      loading="lazy"
    />
  );
};

const Blog = ({ blogs, blogCategories, authors, children }: Props) => {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [hiddenMap, setHiddenMap] = useState<Record<string, boolean>>(() =>
    typeof window !== "undefined" ? getHiddenBlogsMap() : {}
  );

  useEffect(() => {
    syncHiddenBlogs().then((map) => {
      if (map) setHiddenMap(map);
    });
    const unsubscribe = subscribeTabSync((event) => {
      if (event.type === "BLOGS_STATUS_CHANGED") {
        setHiddenMap(getHiddenBlogsMap());
      }
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const visibleBlogs = blogs.filter(
    (b) => b.active !== false && !hiddenMap[b.id]
  );

  const getAuthor = (authorId: string) =>
    authors.find((a) => a.id === authorId);

  const filteredBlogs =
    activeCategory === "all"
      ? visibleBlogs
      : visibleBlogs.filter((blog) => blog.blogCategoryIds.includes(activeCategory));

  return (
    <Container className="py-8 sm:py-10">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-neutral-500 mb-6">
        <Link href="/" className="hover:text-shop_dark_green transition-colors">
          Trang chủ
        </Link>
        <span>/</span>
        <span className="text-neutral-900 font-medium">Blog & Tin tức</span>
      </nav>

      {/* Header Bar */}
      <div className="flex flex-col gap-4 border-b border-neutral-200 pb-5 sm:flex-row sm:items-end sm:justify-between mb-8">
        <div className="flex items-end gap-3">
          <h1 className="text-xl font-bold uppercase tracking-tight text-neutral-900">
            Blog & Tin tức
          </h1>
          <span className="pb-0.5 text-xs text-neutral-500 font-mono">
            [ {visibleBlogs.length} bài viết ]
          </span>
        </div>
      </div>

      {children}

      {/* Category Filter Pills - Styled like Cart page tags/buttons */}
      <div className="flex flex-wrap items-center gap-2 mb-8 border-b border-neutral-200 pb-4">
        <button
          type="button"
          onClick={() => setActiveCategory("all")}
          className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
            activeCategory === "all"
              ? "bg-shop_dark_green text-white shadow-sm"
              : "bg-white text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 border border-neutral-200"
          }`}
        >
          Tất cả ({visibleBlogs.length})
        </button>
        {blogCategories.map((cat) => {
          const count = visibleBlogs.filter((b) => b.blogCategoryIds.includes(cat.id)).length;
          return (
            <button
              type="button"
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
                activeCategory === cat.id
                  ? "bg-shop_dark_green text-white shadow-sm"
                  : "bg-white text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 border border-neutral-200"
              }`}
            >
              {cat.title} ({count})
            </button>
          );
        })}
      </div>

      {filteredBlogs.length === 0 ? (
        <div className="py-20 text-center border border-neutral-200 bg-neutral-50/50 p-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Không có bài viết nào trong danh mục này.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBlogs.map((blog) => {
            const author = getAuthor(blog.authorId);
            const excerpt =
              blog.body.length > 120
                ? blog.body.slice(0, 120).trim() + "..."
                : blog.body;
            const readingTime = Math.max(1, Math.ceil(blog.body.split(/\s+/).length / 200));

            return (
              <article
                key={blog.id}
                className="group flex flex-col border border-neutral-200 bg-white transition-all duration-200 hover:border-shop_dark_green/40 hover:shadow-md"
              >
                {/* Card Thumbnail Container */}
                <Link
                  href={`/blog/${blog.slug}`}
                  className="relative aspect-[16/10] w-full overflow-hidden bg-neutral-100 border-b border-neutral-200 block"
                >
                  <BlogCardImage src={blog.mainImageUrl} alt={blog.title} />

                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10 pointer-events-none">
                    {blog.blogCategoryIds.map((catId) => {
                      const cat = blogCategories.find((c) => c.id === catId);
                      return cat ? (
                        <span
                          key={catId}
                          className="bg-shop_dark_green text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 shadow-sm"
                        >
                          {cat.title}
                        </span>
                      ) : null;
                    })}
                  </div>
                </Link>

                {/* Card Body */}
                <div className="p-5 flex flex-1 flex-col justify-between gap-4">
                  <div className="space-y-2.5">
                    {/* Meta: Date & Read time */}
                    <div className="flex items-center gap-3 text-xs text-neutral-500 font-mono">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} className="text-shop_dark_green" />
                        {new Date(blog.publishedAt).toLocaleDateString("vi-VN")}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} className="text-shop_dark_green" />
                        ~{readingTime} phút đọc
                      </span>
                    </div>

                    {/* Title */}
                    <h2 className="text-sm sm:text-base font-bold text-neutral-900 group-hover:text-shop_dark_green transition-colors line-clamp-2 leading-snug uppercase tracking-tight">
                      <Link href={`/blog/${blog.slug}`}>
                        {blog.title}
                      </Link>
                    </h2>

                    {/* Excerpt */}
                    <p className="text-xs text-neutral-600 line-clamp-2 leading-relaxed font-sans">
                      {excerpt}
                    </p>
                  </div>

                  {/* Card Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-neutral-100 text-xs text-neutral-500 mt-2">
                    <span className="flex items-center gap-1.5 font-medium text-neutral-700">
                      <User size={13} className="text-shop_dark_green" />
                      {author?.name ?? "Techwise AI"}
                    </span>

                    <Link
                      href={`/blog/${blog.slug}`}
                      className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-shop_dark_green hover:underline"
                    >
                      <span>Xem tiếp</span>
                      <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </Container>
  );
};

export default Blog;
