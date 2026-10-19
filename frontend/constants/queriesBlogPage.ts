import type { Blog, BlogCategory, Author } from "../app/data/types";
import {
  blogs as defaultBlogs,
  blogCategories as defaultCategories,
  authors as defaultAuthors,
} from "../app/data/index";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "https://techwiseai-prod.up.railway.app/api/v1";

const LOCAL_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

async function apiFetch<T>(backendPath: string, localPath: string, fallback: T): Promise<T> {
  // 1. Try backend API first (Railway/production/local Spring Boot)
  try {
    const res = await fetch(`${API_BASE_URL}${backendPath}`, { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      if (json && json.data) return json.data as T;
    }
  } catch {
    // Backend unreachable, continue to fallback
  }

  // 2. Try local Next.js API route if running
  try {
    const res = await fetch(`${LOCAL_URL}${localPath}`, { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      if (json && json.data) return json.data as T;
    }
  } catch {
    // Local API unreachable, continue to fallback
  }

  // 3. Graceful fallback so build (generateStaticParams) and offline dev NEVER fail
  return fallback;
}

export const getAllBlogs = async (): Promise<Blog[]> => {
  return apiFetch<Blog[]>("/blogs", "/api/blogs", defaultBlogs);
};

export const getBlogCategories = async (): Promise<BlogCategory[]> => {
  return apiFetch<BlogCategory[]>("/blog-categories", "/api/blog-categories", defaultCategories);
};

export const getAuthors = async (): Promise<Author[]> => {
  return apiFetch<Author[]>("/blog-authors", "/api/blog-authors", defaultAuthors);
};

export const getBlogBySlug = async (slug: string): Promise<Blog | undefined> => {
  const fallback = defaultBlogs.find((b) => b.slug === slug);
  try {
    const blog = await apiFetch<Blog>(`/blogs/${slug}`, `/api/blogs/${slug}`, fallback as Blog);
    return blog ?? fallback;
  } catch {
    return fallback;
  }
};

export const getAllBlogSlugs = async (): Promise<string[]> => {
  try {
    const blogs = await getAllBlogs();
    return Array.from(new Set(blogs.map((blog) => blog.slug)));
  } catch {
    return Array.from(new Set(defaultBlogs.map((b) => b.slug)));
  }
};