// app/(client)/blog/page.tsx
import React from "react";
import Blog from "../../../components/Blog";
import {
  getAllBlogs,
  getBlogCategories,
  getAuthors,
} from "../../../constants/queriesBlogPage";

const BlogPage = async () => {
  const [blogs, blogCategories, authors] = await Promise.all([
    getAllBlogs(),
    getBlogCategories(),
    getAuthors(),
  ]);

  return (
    <div className="bg-white">
      <Blog blogs={blogs} blogCategories={blogCategories} authors={authors} />
    </div>
  );
};

export default BlogPage;
