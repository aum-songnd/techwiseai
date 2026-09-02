"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Container from "@/components/Container";
import { Blog as BlogType, BlogCategory, Author } from "../app/data/types";

interface Props {
  blogs: BlogType[];
  blogCategories: BlogCategory[];
  authors: Author[];
}

const Blog = ({ blogs, blogCategories, authors }: Props) => {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const getAuthor = (authorId: string) =>
    authors.find((a) => a.id === authorId);

  const filteredBlogs =
    activeCategory === "all"
      ? blogs
      : blogs.filter((blog) => blog.blogCategoryIds.includes(activeCategory));

  return (
    <Container className="py-10">
      {/* Bộ lọc theo category */}
      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => setActiveCategory("all")}
          className={`px-4 py-1.5 rounded-full text-sm border hoverEffect ${
            activeCategory === "all"
              ? "bg-shop_dark_green text-white border-shop_dark_green"
              : "border-lightColor text-lightColor hover:border-shop_dark_green hover:text-shop_dark_green"
          }`}
        >
          Tất cả
        </button>
        {blogCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-1.5 rounded-full text-sm border hoverEffect ${
              activeCategory === cat.id
                ? "bg-shop_dark_green text-white border-shop_dark_green"
                : "border-lightColor text-lightColor hover:border-shop_dark_green hover:text-shop_dark_green"
            }`}
          >
            {cat.title}
          </button>
        ))}
      </div>

      {/* Grid blog */}
      {filteredBlogs.length === 0 ? (
        <p className="text-lightColor text-center py-20">
          Không có bài viết nào trong danh mục này.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBlogs.map((blog) => {
            const author = getAuthor(blog.authorId);
            const excerpt =
              blog.body.length > 120
                ? blog.body.slice(0, 120).trim() + "..."
                : blog.body;

            return (
              <Link
                key={blog.id}
                href={`/blog/${blog.slug}`}
                className="group border border-shop_light_bg rounded-lg overflow-hidden hoverEffect hover:shadow-md bg-white"
              >
                <div className="relative w-full h-52 overflow-hidden bg-shop_light_bg">
                  {blog.mainImageUrl && (
                    <Image
                      src={blog.mainImageUrl}
                      alt={blog.title}
                      fill
                      className="object-cover group-hover:scale-105 hoverEffect"
                    />
                  )}
                  {blog.isLatest && (
                    <span className="absolute top-3 left-3 bg-shop_orange text-white text-xs px-2 py-1 rounded">
                      Mới nhất
                    </span>
                  )}
                </div>

                <div className="p-4 flex flex-col gap-2">
                  <div className="flex flex-wrap gap-1">
                    {blog.blogCategoryIds.map((catId) => {
                      const cat = blogCategories.find((c) => c.id === catId);
                      return cat ? (
                        <span
                          key={catId}
                          className="text-xs text-shop_dark_green bg-shop_light_pink px-2 py-0.5 rounded"
                        >
                          {cat.title}
                        </span>
                      ) : null;
                    })}
                  </div>

                  <h3 className="font-medium text-darkColor line-clamp-2 group-hover:text-shop_dark_green hoverEffect">
                    {blog.title}
                  </h3>

                  <p className="text-sm text-lightColor line-clamp-2">
                    {excerpt}
                  </p>

                  <div className="flex items-center justify-between text-xs text-lightColor pt-2 border-t border-shop_light_bg mt-1">
                    <span>{author?.name ?? "Ẩn danh"}</span>
                    <span>
                      {new Date(blog.publishedAt).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </Container>
  );
};

export default Blog;
