"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
  ExternalLink,
  RefreshCw,
  Tag,
  User,
  Calendar,
  Star,
  Eye,
  EyeOff,
  RotateCcw,
} from "lucide-react";
import Loading from "@/app/(client)/loading";
import {
  adminGetAllBlogs,
  adminGetBlogCategories,
  adminGetAuthors,
  adminCreateBlog,
  adminUpdateBlog,
  adminDeleteBlog,
  generateSlug,
  saveHiddenBlog,
  removeHiddenBlog,
  syncHiddenBlogs,
  getMissingSeedBlogs,
  type BlogPayload,
} from "@/lib/api/admin";
import type { Blog, BlogCategory, Author } from "@/app/data/types";
import { subscribeTabSync } from "@/lib/auth/tab-sync";

const PAGE_SIZE = 10;

const emptyForm: BlogPayload = {
  title: "",
  slug: "",
  authorId: "",
  mainImageUrl: "",
  blogCategoryIds: [],
  publishedAt: new Date().toISOString().slice(0, 16),
  isLatest: false,
  body: "",
};

const AdminBlogsPage = () => {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BlogPayload>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastUndoAction, setToastUndoAction] = useState<(() => void) | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "hidden">("all");
  const [showForm, setShowForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [restoring, setRestoring] = useState(false);

  const showToast = useCallback((msg: string, undo?: () => void) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    setToastUndoAction(undo ? () => undo : null);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
      setToastUndoAction(null);
    }, 4500);
  }, []);
  const [autoSlug, setAutoSlug] = useState(true);
  const formRef = useRef<HTMLFormElement | null>(null);
  const listTopRef = useRef<HTMLDivElement | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      await syncHiddenBlogs();
      const [b, c, a] = await Promise.all([
        adminGetAllBlogs(),
        adminGetBlogCategories(),
        adminGetAuthors(),
      ]);
      setBlogs(b);
      setCategories(c);
      setAuthors(a);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const unsubscribe = subscribeTabSync((event) => {
      if (event.type === "BLOGS_STATUS_CHANGED") {
        if (event.payload?.blogId !== undefined) {
          const { blogId, active } = event.payload;
          setBlogs((prev) =>
            prev.map((b) =>
              b.id === blogId ? { ...b, active: active !== false } : b
            )
          );
        } else {
          loadData();
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const missingSeedBlogs = useMemo(() => getMissingSeedBlogs(blogs), [blogs]);
  const activeBlogsCount = useMemo(() => blogs.filter((b) => b.active !== false).length, [blogs]);
  const hiddenBlogsCount = useMemo(() => blogs.filter((b) => b.active === false).length, [blogs]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return blogs.filter((b) => {
      if (statusFilter === "active" && b.active === false) return false;
      if (statusFilter === "hidden" && b.active !== false) return false;
      if (q && !b.title.toLowerCase().includes(q) && !b.slug.includes(q)) return false;
      if (categoryFilter && !b.blogCategoryIds.includes(categoryFilter)) return false;
      return true;
    });
  }, [blogs, search, categoryFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter, statusFilter]);

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c.title])),
    [categories]
  );
  const authorMap = useMemo(
    () => Object.fromEntries(authors.map((a) => [a.id, a.name])),
    [authors]
  );

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setAutoSlug(true);
    setError(null);
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  };

  const openEdit = (blog: Blog) => {
    setEditingId(blog.id);
    setForm({
      title: blog.title,
      slug: blog.slug,
      authorId: blog.authorId,
      mainImageUrl: blog.mainImageUrl ?? "",
      blogCategoryIds: blog.blogCategoryIds,
      publishedAt: blog.publishedAt.slice(0, 16),
      isLatest: blog.isLatest,
      body: blog.body,
    });
    setAutoSlug(false);
    setError(null);
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setError(null);
  };

  const handleTitleChange = (val: string) => {
    setForm((f) => ({
      ...f,
      title: val,
      slug: autoSlug ? generateSlug(val) : f.slug,
    }));
  };

  const handleCategoryToggle = (id: string) => {
    setForm((f) => ({
      ...f,
      blogCategoryIds: f.blogCategoryIds.includes(id)
        ? f.blogCategoryIds.filter((c) => c !== id)
        : [...f.blogCategoryIds, id],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: BlogPayload = {
        ...form,
        publishedAt: new Date(form.publishedAt).toISOString(),
      };
      if (editingId) {
        await adminUpdateBlog(editingId, payload);
      } else {
        await adminCreateBlog(payload);
      }
      await loadData();
      closeForm();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = (id: string, active: boolean) => {
    setError(null);
    const targetBlog = blogs.find((b) => b.id === id);
    if (!targetBlog) return;

    if (active) {
      removeHiddenBlog(id);
    } else {
      saveHiddenBlog(id);
    }

    // 1. Cập nhật UI tức thì (Optimistic update)
    setBlogs((prev) =>
      prev.map((b) => (b.id === id ? { ...b, active } : b))
    );

    showToast(
      active
        ? `Đã mở hiển thị lại bài viết "${targetBlog.title}".`
        : `Đã tạm ẩn bài viết "${targetBlog.title}".`,
      () => handleToggleStatus(id, !active)
    );
  };

  const handleDelete = (id: string, title: string) => {
    setError(null);
    const targetBlog = blogs.find((b) => b.id === id);
    if (!targetBlog) return;

    // Nếu bài viết đang hiển thị, chuyển thành Tạm ẩn (Soft delete an toàn)
    if (targetBlog.active !== false) {
      handleToggleStatus(id, false);
      showToast(
        `Đã chuyển bài viết "${title}" sang danh sách tạm ẩn.`,
        () => handleToggleStatus(id, true)
      );
      return;
    }

    // Nếu đã ở trạng thái Tạm ẩn, hỏi xác nhận nếu muốn xóa vĩnh viễn khỏi Database
    const confirmHardDelete = window.confirm(
      `Bài viết "${title}" đang ở trạng thái Tạm ẩn.\n\nBạn có CHẮC CHẮN muốn xóa vĩnh viễn khỏi cơ sở dữ liệu không? Thao tác này sẽ xóa vĩnh viễn dữ liệu khỏi server!`
    );
    if (!confirmHardDelete) return;

    setDeleting(id);
    setBlogs((prev) => prev.filter((b) => b.id !== id));
    removeHiddenBlog(id);

    showToast(`Đã xóa vĩnh viễn bài viết "${title}".`);

    adminDeleteBlog(id)
      .catch((e) => {
        setBlogs((prev) => [targetBlog, ...prev]);
        setError((e as Error).message);
        showToast("Xóa bài viết thất bại. Đã khôi phục.");
      })
      .finally(() => {
        setDeleting(null);
      });
  };

  const handleRestoreMissingBlogs = async () => {
    if (missingSeedBlogs.length === 0) return;
    setRestoring(true);
    setError(null);
    let count = 0;
    try {
      for (const seed of missingSeedBlogs) {
        await adminCreateBlog({
          title: seed.title,
          slug: seed.slug,
          authorId: seed.authorId,
          mainImageUrl: seed.mainImageUrl,
          blogCategoryIds: seed.blogCategoryIds,
          publishedAt: seed.publishedAt,
          isLatest: seed.isLatest,
          body: seed.body,
        });
        count++;
      }
      await loadData();
      showToast(`Đã khôi phục thành công ${count} bài viết mẫu đã xóa!`);
    } catch (e) {
      setError((e as Error).message);
      showToast(`Khôi phục gặp lỗi: ${(e as Error).message}`);
      await loadData();
    } finally {
      setRestoring(false);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-neutral-200 pb-5">
        <div className="flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-shop_dark_green shrink-0" />
          <div>
            <h1 className="text-lg font-bold uppercase tracking-tight text-neutral-900">
              Quản lý Blog
            </h1>
            <p className="text-xs text-neutral-500 font-mono mt-0.5">
              [{filtered.length} / {blogs.length} bài viết]
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {missingSeedBlogs.length > 0 && (
            <button
              onClick={handleRestoreMissingBlogs}
              disabled={restoring || loading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm disabled:opacity-50"
              title="Khôi phục lại các bài viết mẫu bị thiếu hoặc đã xóa"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${restoring ? "animate-spin" : ""}`} />
              <span>Khôi phục bài mẫu ({missingSeedBlogs.length})</span>
            </button>
          )}
          <button
            onClick={() => loadData()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold uppercase tracking-wider border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors disabled:opacity-50"
            title="Tải lại"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-shop_dark_green text-white text-xs font-semibold uppercase tracking-wider hover:bg-shop_dark_green/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm bài viết</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && !showForm && (
        <div className="flex items-start gap-2.5 border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
          <X className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Blog Form */}
      {showForm && (
        <div className="border border-neutral-200 bg-white">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-200 bg-neutral-50">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
              {editingId ? "Chỉnh sửa bài viết" : "Thêm bài viết mới"}
            </h2>
            <button
              onClick={closeForm}
              className="p-1 text-neutral-400 hover:text-neutral-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form ref={formRef} onSubmit={handleSubmit} className="p-5 space-y-5">
            {error && (
              <div className="flex items-start gap-2 border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
                <X className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Title */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-600">
                Tiêu đề <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={form.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="w-full border border-neutral-200 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-shop_dark_green transition-colors"
                placeholder="Tiêu đề bài viết..."
              />
            </div>

            {/* Slug */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-600">
                  Slug <span className="text-red-500">*</span>
                </label>
                <label className="flex items-center gap-1.5 text-[11px] text-neutral-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSlug}
                    onChange={(e) => setAutoSlug(e.target.checked)}
                    className="w-3 h-3"
                  />
                  Tự động
                </label>
              </div>
              <div className="flex gap-2">
                <input
                  required
                  value={form.slug}
                  onChange={(e) => {
                    setAutoSlug(false);
                    setForm((f) => ({ ...f, slug: e.target.value }));
                  }}
                  className="flex-1 border border-neutral-200 px-3 py-2 text-xs font-mono text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-shop_dark_green transition-colors"
                  placeholder="duong-dan-bai-viet"
                />
                {!editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setAutoSlug(true);
                      setForm((f) => ({ ...f, slug: generateSlug(f.title) }));
                    }}
                    className="px-3 py-2 text-xs border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors"
                    title="Tạo slug từ tiêu đề"
                  >
                    Tạo
                  </button>
                )}
              </div>
              {form.slug && (
                <p className="text-[10px] font-mono text-neutral-400">/blog/{form.slug}</p>
              )}
            </div>

            {/* Author + Published Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-600">
                  Tác giả
                </label>
                <select
                  value={form.authorId}
                  onChange={(e) => setForm((f) => ({ ...f, authorId: e.target.value }))}
                  className="w-full border border-neutral-200 px-3 py-2 text-sm text-neutral-900 bg-white focus:outline-none focus:border-shop_dark_green transition-colors"
                >
                  <option value="">-- Chọn tác giả --</option>
                  {authors.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-600">
                  Ngày đăng
                </label>
                <input
                  type="datetime-local"
                  value={form.publishedAt}
                  onChange={(e) => setForm((f) => ({ ...f, publishedAt: e.target.value }))}
                  className="w-full border border-neutral-200 px-3 py-2 text-sm text-neutral-900 bg-white focus:outline-none focus:border-shop_dark_green transition-colors"
                />
              </div>
            </div>

            {/* Image URL */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-600">
                URL ảnh đại diện
              </label>
              <input
                value={form.mainImageUrl}
                onChange={(e) => setForm((f) => ({ ...f, mainImageUrl: e.target.value }))}
                className="w-full border border-neutral-200 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-shop_dark_green transition-colors"
                placeholder="https://..."
              />
              {form.mainImageUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={form.mainImageUrl}
                  alt="preview"
                  className="mt-2 h-24 w-auto object-cover border border-neutral-200 bg-neutral-50"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              )}
            </div>

            {/* Categories */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-600">
                Danh mục
              </label>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => {
                  const active = form.blogCategoryIds.includes(c.id);
                  return (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => handleCategoryToggle(c.id)}
                      className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider border transition-colors ${active
                        ? "bg-shop_dark_green text-white border-shop_dark_green"
                        : "bg-white text-neutral-600 border-neutral-200 hover:border-shop_dark_green hover:text-shop_dark_green"
                        }`}
                    >
                      {c.title}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* isLatest */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isLatest"
                checked={form.isLatest}
                onChange={(e) => setForm((f) => ({ ...f, isLatest: e.target.checked }))}
                className="w-4 h-4 accent-shop_dark_green"
              />
              <label htmlFor="isLatest" className="text-xs font-semibold text-neutral-700 cursor-pointer">
                Nổi bật
              </label>
            </div>

            {/* Body */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-600">
                Nội dung <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={12}
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                className="w-full border border-neutral-200 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-shop_dark_green transition-colors resize-y leading-relaxed"
                placeholder="Viết nội dung bài viết... Mỗi đoạn văn cách nhau bằng dấu xuống dòng."
              />
              <p className="text-[10px] text-neutral-400">
                Tip: Mỗi dòng mới sẽ tạo thành một đoạn văn riêng biệt khi hiển thị.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-neutral-100">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-shop_dark_green px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-shop_dark_green/90 transition-colors disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <span>{editingId ? "Cập nhật bài viết" : "Thêm bài viết"}</span>
                )}
              </button>
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors"
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="space-y-3">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 pb-3">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
              statusFilter === "all"
                ? "bg-shop_dark_green text-white"
                : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50"
            }`}
          >
            Tất cả ({blogs.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("active")}
            className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
              statusFilter === "active"
                ? "bg-shop_dark_green text-white"
                : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50"
            }`}
          >
            Đang hiển thị ({activeBlogsCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("hidden")}
            className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
              statusFilter === "hidden"
                ? "bg-amber-600 text-white"
                : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50"
            }`}
          >
            Đã ẩn ({hiddenBlogsCount})
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tiêu đề hoặc slug..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-200 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-shop_dark_green transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border border-neutral-200 px-3 py-2 text-xs text-neutral-700 bg-white focus:outline-none focus:border-shop_dark_green transition-colors"
          >
            <option value="">Tất cả danh mục</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Blog List */}
      <div ref={listTopRef}>
        {loading ? (
          <div className="border border-neutral-200 bg-white">
            <Loading message="Đang tải dữ liệu..." className="py-16 min-h-0" />
          </div>
        ) : paginated.length === 0 ? (
          <div className="border border-neutral-200 bg-white px-6 py-16 text-center">
            <BookOpen className="mx-auto mb-3 w-8 h-8 text-neutral-200" />
            <p className="text-xs text-neutral-400 font-mono uppercase tracking-wider">
              {search || categoryFilter || statusFilter !== "all"
                ? "Không tìm thấy bài viết phù hợp"
                : "Chưa có bài viết nào"}
            </p>
            {!search && !categoryFilter && statusFilter === "all" && (
              <button onClick={openCreate} className="mt-4 text-xs font-semibold text-shop_dark_green hover:underline">
                + Thêm bài viết đầu tiên
              </button>
            )}
          </div>
        ) : (
          <div className="border border-neutral-200 bg-white divide-y divide-neutral-100">
            {paginated.map((blog) => (
              <div
                key={blog.id}
                className={`flex items-start gap-4 p-4 hover:bg-neutral-50/80 transition-colors group ${
                  blog.active === false ? "bg-neutral-50/40" : ""
                }`}
              >
                {/* Thumbnail */}
                {blog.mainImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={blog.mainImageUrl}
                    alt={blog.title}
                    className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 object-cover border border-neutral-200 bg-neutral-50"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 bg-neutral-100 border border-neutral-200 flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-neutral-300" />
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-start gap-2 flex-wrap">
                    <p className={`text-sm font-semibold leading-snug line-clamp-2 flex-1 min-w-0 ${
                      blog.active === false ? "text-neutral-500 line-through" : "text-neutral-900"
                    }`}>
                      {blog.title}
                    </p>
                    {blog.isLatest && (
                      <span className="flex items-center gap-1 shrink-0 text-[10px] font-mono font-semibold px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-300">
                        <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                        Nổi bật
                      </span>
                    )}
                    {blog.active === false && (
                      <span className="flex items-center gap-1 shrink-0 text-[10px] font-mono px-1.5 py-0.5 bg-neutral-100 text-neutral-600 border border-neutral-300">
                        <EyeOff className="w-2.5 h-2.5" />
                        Đã ẩn
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-neutral-500">
                    <span className="flex items-center gap-1 font-mono">
                      <Calendar className="w-3 h-3 text-shop_dark_green" />
                      {formatDate(blog.publishedAt)}
                    </span>
                    {authorMap[blog.authorId] && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-shop_dark_green" />
                        {authorMap[blog.authorId]}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {blog.blogCategoryIds.map((cid) =>
                      categoryMap[cid] ? (
                        <span
                          key={cid}
                          className="flex items-center gap-1 text-[10px] font-bold uppercase px-1.5 py-0.5 bg-shop_dark_green/10 text-shop_dark_green"
                        >
                          <Tag className="w-2.5 h-2.5" />
                          {categoryMap[cid]}
                        </span>
                      ) : null
                    )}
                  </div>

                  <p className="text-[11px] font-mono text-neutral-400 truncate">
                    /blog/{blog.slug}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link
                    href={`/blog/${blog.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-neutral-400 hover:text-shop_dark_green transition-colors"
                    title="Xem bài viết trên web"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    onClick={() => openEdit(blog)}
                    className="p-1.5 text-neutral-400 hover:text-shop_dark_green transition-colors"
                    title="Chỉnh sửa bài viết"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  {blog.active === false ? (
                    <button
                      onClick={() => handleToggleStatus(blog.id, true)}
                      className="p-1.5 text-neutral-400 hover:text-emerald-600 transition-colors"
                      title="Mở hiển thị lại bài viết trên website"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleToggleStatus(blog.id, false)}
                      className="p-1.5 text-neutral-400 hover:text-amber-600 transition-colors"
                      title="Tạm ẩn bài viết (không hiển thị trên website)"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(blog.id, blog.title)}
                    disabled={deleting === blog.id}
                    className={`p-1.5 transition-colors disabled:opacity-50 ${
                      blog.active === false
                        ? "text-red-500 hover:text-red-700"
                        : "text-neutral-400 hover:text-red-500"
                    }`}
                    title={
                      blog.active === false
                        ? "Xóa vĩnh viễn khỏi Database"
                        : "Tạm ẩn bài viết"
                    }
                  >
                    {deleting === blog.id ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs font-mono text-neutral-500">
          <span>
            Trang {page}/{totalPages} — {filtered.length} bài viết
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setCurrentPage((p) => Math.max(1, p - 1));
                listTopRef.current?.scrollIntoView({ behavior: "smooth" });
              }}
              disabled={page === 1}
              className="p-1.5 border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => {
                  setCurrentPage(p);
                  listTopRef.current?.scrollIntoView({ behavior: "smooth" });
                }}
                className={`min-w-[28px] h-7 px-1 border text-xs font-mono transition-colors ${p === page
                  ? "bg-shop_dark_green text-white border-shop_dark_green"
                  : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                  }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => {
                setCurrentPage((p) => Math.min(totalPages, p + 1));
                listTopRef.current?.scrollIntoView({ behavior: "smooth" });
              }}
              disabled={page === totalPages}
              className="p-1.5 border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 border border-neutral-800 bg-neutral-900 px-4 py-3 text-xs font-medium text-white shadow-2xl"
        >
          <Check className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          {toastUndoAction && (
            <button
              type="button"
              onClick={() => {
                toastUndoAction();
                setToastMessage(null);
                setToastUndoAction(null);
              }}
              className="ml-2 font-bold text-emerald-400 hover:text-emerald-300 underline transition-colors"
            >
              Hoàn tác
            </button>
          )}
        </aside>
      )}
    </div>
  );
};

export default AdminBlogsPage;
