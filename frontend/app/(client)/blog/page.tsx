import React from "react";
import Blog from "@/components/common/Blog";
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
      <Blog blogs={blogs} blogCategories={blogCategories} authors={authors} />
    </div>
  );
};

export default BlogPage;
