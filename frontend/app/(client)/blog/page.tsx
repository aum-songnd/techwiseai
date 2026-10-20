import React from "react";
import Link from "next/link";
import Blog from "../../../components/Blog";
import {
  getAllBlogs,
  getBlogCategories,
  getAuthors,
} from "../../../constants/queriesBlogPage";

export const dynamic = "force-dynamic";

const BlogPage = async () => {
  const [blogs, blogCategories, authors] = await Promise.all([
    getAllBlogs(),
    getBlogCategories(),
    getAuthors(),
  ]);

  return (
    <div className="font-sans min-h-screen bg-white text-neutral-900">
      <Blog blogs={blogs} blogCategories={blogCategories} authors={authors}>
        {/* Breadcrumb Navigation - Styled exactly like Cart page */}
        <nav className="flex items-center gap-2 text-xs text-neutral-500 mb-6">
          <Link href="/" className="hover:text-shop_dark_green transition-colors">
            Trang chủ
          </Link>
          <span>/</span>
          <span className="text-neutral-900 font-medium">Blog & Tin tức</span>
        </nav>

        {/* Header Bar - Matching Cart page style */}
        <div className="flex flex-col gap-4 border-b border-neutral-200 pb-5 sm:flex-row sm:items-end sm:justify-between mb-8">
          <div className="flex items-end gap-3">
            <h1 className="text-xl font-bold uppercase tracking-tight text-neutral-900">
              Blog & Tin tức
            </h1>
            <span className="pb-0.5 text-xs text-neutral-500 font-mono">
              [ {blogs.length} bài viết ]
            </span>
          </div>
        </div>
      </Blog>
    </div>
  );
};

export default BlogPage;
