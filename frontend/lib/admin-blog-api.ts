import type { Blog, BlogCategory, Author } from "@/app/data/types";
import { getToken } from "./auth";

import { blogs as defaultSeedBlogs } from "@/app/data/blogs";

export interface BlogPayload {
  title: string;
  slug: string;
  authorId: string;
  mainImageUrl?: string;
  blogCategoryIds: string[];
  publishedAt: string;
  isLatest: boolean;
  body: string;
  active?: boolean;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "https://techwiseai-prod.up.railway.app/api/v1";

const LOCAL_BASE = "/api/blogs";

const HIDDEN_BLOGS_KEY = "admin_hidden_blogs_map";

import { broadcastTabEvent } from "./tab-sync";

export function getHiddenBlogsMap(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(HIDDEN_BLOGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export async function syncHiddenBlogs(): Promise<Record<string, boolean>> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(HIDDEN_BLOGS_KEY);
    if (raw !== null) {
      // Local state exists (even if empty {} when all blogs are active)
      // Sync it to server to ensure server cache matches admin selection
      const localMap = JSON.parse(raw);
      await fetch("/api/blogs/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hiddenMap: localMap }),
      }).catch(() => {});
      return localMap;
    }

    // First time visitor (no local key yet): pull from server
    const res = await fetch("/api/blogs/status", { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      if (json && json.data) {
        localStorage.setItem(HIDDEN_BLOGS_KEY, JSON.stringify(json.data));
        return json.data;
      }
    }
  } catch {}
  return getHiddenBlogsMap();
}

export function saveHiddenBlog(id: string) {
  if (typeof window === "undefined" || !id) return;
  try {
    const map = getHiddenBlogsMap();
    map[id] = true;
    localStorage.setItem(HIDDEN_BLOGS_KEY, JSON.stringify(map));
    localStorage.setItem("techwiseai_catalog_updated_at", String(Date.now()));
    broadcastTabEvent({
      type: "BLOGS_STATUS_CHANGED",
      payload: { blogId: id, active: false, timestamp: Date.now() },
    });
    fetch("/api/blogs/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hiddenMap: map, id, active: false }),
    }).catch(() => {});
  } catch {}
}

export function removeHiddenBlog(id: string) {
  if (typeof window === "undefined" || !id) return;
  try {
    const map = getHiddenBlogsMap();
    delete map[id];
    localStorage.setItem(HIDDEN_BLOGS_KEY, JSON.stringify(map));
    localStorage.setItem("techwiseai_catalog_updated_at", String(Date.now()));
    broadcastTabEvent({
      type: "BLOGS_STATUS_CHANGED",
      payload: { blogId: id, active: true, timestamp: Date.now() },
    });
    fetch("/api/blogs/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hiddenMap: map, id, active: true }),
    }).catch(() => {});
  } catch {}
}

export function isHiddenBlog(id: string): boolean {
  const map = getHiddenBlogsMap();
  return Boolean(map[id]);
}

export function getMissingSeedBlogs(currentBlogs: Blog[]): Blog[] {
  const currentSlugs = new Set(currentBlogs.map((b) => b.slug));
  const currentIds = new Set(currentBlogs.map((b) => b.id));
  return defaultSeedBlogs.filter(
    (seed) => !currentSlugs.has(seed.slug) && !currentIds.has(seed.id)
  );
}

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
  let list: Blog[] = [];
  try {
    const res = await fetch(`${API_BASE_URL}/blogs`, { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      if (json && json.data) list = json.data;
    }
  } catch {
    // Backend unreachable, fallback to local
  }

  if (!list || list.length === 0) {
    const res = await fetch(LOCAL_BASE, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message ?? "Lỗi tải danh sách bài viết");
    list = json.data;
  }

  const hiddenMap = getHiddenBlogsMap();
  return list.map((b) => ({
    ...b,
    active: hiddenMap[b.id] ? false : b.active !== false,
  }));
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
