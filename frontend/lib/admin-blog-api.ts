import type { Blog, BlogCategory, Author } from "@/app/data/types";
import { getToken } from "./auth";

export interface BlogPayload {
  title: string;
  slug: string;
  authorId: string;
  mainImageUrl?: string;
  blogCategoryIds: string[];
  publishedAt: string;
  isLatest: boolean;
  body: string;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "https://techwiseai-prod.up.railway.app/api/v1";

const LOCAL_BASE = "/api/blogs";

function getAuthHeaders(): HeadersInit {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export async function adminGetAllBlogs(): Promise<Blog[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/blogs`, { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      if (json && json.data) return json.data;
    }
  } catch {
    // Backend unreachable, fallback to local
  }

  const res = await fetch(LOCAL_BASE, { cache: "no-store" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? "Lỗi tải danh sách bài viết");
  return json.data;
}

export async function adminCreateBlog(payload: BlogPayload): Promise<Blog> {
  // 1. Send to Spring Boot backend admin endpoint (saves to PostgreSQL)
  try {
    const res = await fetch(`${API_BASE_URL}/admin/blogs`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const json = await res.json();
      return json.data;
    }

    // If backend returned an explicit client error (e.g. 400 validation, 409 slug exists, 403 forbidden)
    if (res.status !== 404) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.message ?? `Lỗi tạo bài viết (${res.status})`);
    }
  } catch (err: unknown) {
    if (err instanceof Error && !err.message.includes("Failed to fetch") && !err.message.includes("404")) {
      throw err;
    }
  }

  // Fallback to local Next.js route if backend endpoint not yet deployed
  const res = await fetch(LOCAL_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? "Lỗi tạo bài viết");
  return json.data;
}

export async function adminUpdateBlog(
  id: string,
  payload: Partial<BlogPayload>
): Promise<Blog> {
  // 1. Send to Spring Boot backend admin endpoint (updates in PostgreSQL)
  try {
    const res = await fetch(`${API_BASE_URL}/admin/blogs/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const json = await res.json();
      return json.data;
    }

    if (res.status !== 404) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.message ?? `Lỗi cập nhật bài viết (${res.status})`);
    }
  } catch (err: unknown) {
    if (err instanceof Error && !err.message.includes("Failed to fetch") && !err.message.includes("404")) {
      throw err;
    }
  }

  // Fallback to local Next.js route if backend endpoint not yet deployed
  const res = await fetch(`${LOCAL_BASE}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? "Lỗi cập nhật bài viết");
  return json.data;
}

export async function adminDeleteBlog(id: string): Promise<void> {
  // 1. Send to Spring Boot backend admin endpoint (deletes from PostgreSQL)
  try {
    const res = await fetch(`${API_BASE_URL}/admin/blogs/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });

    if (res.ok) return;

    if (res.status !== 404) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.message ?? `Lỗi xóa bài viết (${res.status})`);
    }
  } catch (err: unknown) {
    if (err instanceof Error && !err.message.includes("Failed to fetch") && !err.message.includes("404")) {
      throw err;
    }
  }

  // Fallback to local Next.js route if backend endpoint not yet deployed
  const res = await fetch(`${LOCAL_BASE}/${id}`, { method: "DELETE" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? "Lỗi xóa bài viết");
}

export async function adminGetBlogCategories(): Promise<BlogCategory[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/blog-categories`, { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      if (json && json.data) return json.data;
    }
  } catch {
    // Backend unreachable
  }

  const res = await fetch("/api/blog-categories", { cache: "no-store" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? "Lỗi tải danh mục");
  return json.data;
}

export async function adminGetAuthors(): Promise<Author[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/blog-authors`, { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      if (json && json.data) return json.data;
    }
  } catch {
    // Backend unreachable
  }

  const res = await fetch("/api/blog-authors", { cache: "no-store" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? "Lỗi tải tác giả");
  return json.data;
}

/** Generate a URL-friendly slug from Vietnamese text */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
