// constants/queries.blog.ts
// Các hàm query cho blog, dùng mock data có sẵn — cùng pattern với getAllProducts/getCategories/getAllBrands
import { blogs, blogCategories, authors } from "../app/data/index";
import type { Blog, BlogCategory, Author } from "../app/data/types";

export const getAllBlogs = async (): Promise<Blog[]> => {
  return blogs;
};

export const getBlogCategories = async (): Promise<BlogCategory[]> => {
  return blogCategories;
};

export const getAuthors = async (): Promise<Author[]> => {
  return authors;
};

export const getBlogBySlug = async (slug: string): Promise<Blog | undefined> => {
  return blogs.find((blog) => blog.slug === slug);
};
