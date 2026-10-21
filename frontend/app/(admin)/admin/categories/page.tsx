"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Loading from "@/app/(client)/loading";
import {
  Check,
  MoreVertical,
  PencilLine,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { getCategories } from "@/lib/api";
import {
  countProductsByCategory,
  fetchAllAdminProducts,
} from "@/lib/admin-products";
import {
  adminCreateCategory,
  adminDeleteCategory,
  adminToggleCategoryStatus,
  adminUpdateCategory,
  CategoryPayload,
} from "@/lib/admin-api";
import { clearRequestCache } from "@/lib/request-cache";
import { notifyCatalogUpdated } from "@/lib/tab-sync";
import type { Category } from "@/app/data/types";

const emptyForm: CategoryPayload = {
  name: "",
  slug: "",
  description: "",
  imageUrl: "",
  displayOrder: 0,
  active: true,
};

const inputClass =
  "w-full border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-shop_dark_green focus:outline-none focus:ring-1 focus:ring-shop_dark_green transition-colors";

const getCategoryImage = (category: Category) => {
  const value = `${category.slug} ${category.title}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (value.includes("laptop")) return "/laptop.webp";
  if (value.includes("dien-thoai") || value.includes("phone") || value.includes("mobile")) {
    return "/mobile.webp";
  }
  if (value.includes("tai-nghe") || value.includes("headphone") || value.includes("earphone")) {
    return "/earphone.webp";
  }
  if (value.includes("may-anh") || value.includes("camera")) return "/camera.webp";
  return "/accessory.webp";
};

const AdminCategoriesPage = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryProductCounts, setCategoryProductCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CategoryPayload>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastUndoAction, setToastUndoAction] = useState<(() => void) | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  const showToast = useCallback((msg: string, undo?: () => void) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    setToastUndoAction(undo ? () => undo : null);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
      setToastUndoAction(null);
    }, 4500);
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCategories({ noStore: true });
      setCategories(
        [...data].sort(
          (a, b) => {
            const getPriority = (category: Category) => {
              const title = category.title.trim().toLocaleLowerCase("vi");
              const slug = category.slug.trim().toLowerCase();
              if (title === "laptop" || slug === "laptop") return -2;
              if (
                title === "điện thoại" ||
                title === "phone" ||
                slug === "dien-thoai" ||
                slug === "phone"
              ) {
                return -1;
              }
              return 0;
            };

            const priorityDifference = getPriority(a) - getPriority(b);
            if (priorityDifference !== 0) return priorityDifference;
            return (
              (a.displayOrder ?? Number.MAX_SAFE_INTEGER) -
              (b.displayOrder ?? Number.MAX_SAFE_INTEGER)
            );
          }
        )
      );
      const products = await fetchAllAdminProducts();
      setCategoryProductCounts(countProductsByCategory(products, data));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được danh mục");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (showForm) {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showForm, editingId]);

  const startEdit = (category: Category) => {
    const rowOrder = categories.findIndex((item) => item.id === category.id) + 1;
    setEditingId(category.id);
    setForm({
      name: category.title,
      slug: category.slug,
      description: category.description ?? "",
      imageUrl: category.imageUrl ?? "",
      displayOrder:
        category.displayOrder && category.displayOrder > 0
          ? category.displayOrder
          : rowOrder,
      active: true,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(false);
  };

  const openCreateForm = () => {
    setEditingId(null);
    setForm({ ...emptyForm, displayOrder: categories.length + 1 });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await adminUpdateCategory(editingId, form);
      } else {
        await adminCreateCategory(form);
      }
      clearRequestCache("catalog:");
      notifyCatalogUpdated("categories");
      resetForm();
      await loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lưu danh mục thất bại");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (category: Category) => {
    setError(null);
    if (editingId === category.id) resetForm();

    // 1. Cập nhật UI ngay lập tức (Optimistic Update)
    setCategories((prev) => prev.filter((c) => c.id !== category.id));
    clearRequestCache("catalog:");
    notifyCatalogUpdated("categories");
    showToast(`Đã xóa danh mục "${category.title}".`, () => {
      setCategories((prev) => [...prev, category].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)));
      clearRequestCache("catalog:");
      notifyCatalogUpdated("categories");
      adminToggleCategoryStatus(category.id, true).catch(() => {
        adminUpdateCategory(category.id, {
          name: category.title,
          slug: category.slug,
          description: category.description,
          imageUrl: category.imageUrl,
          displayOrder: category.displayOrder,
          active: true,
        }).catch(() => {
          adminCreateCategory({
            name: category.title,
            slug: category.slug,
            description: category.description,
            imageUrl: category.imageUrl,
            displayOrder: category.displayOrder,
            active: true,
          }).catch(() => {});
        });
      });
    });

    // 2. Chạy ngầm BE không reload lại danh mục
    adminDeleteCategory(category.id).catch((err) => {
      setCategories((prev) => [...prev, category].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)));
      setError(err instanceof Error ? err.message : "Xóa danh mục thất bại");
      showToast("Xóa danh mục thất bại. Đã khôi phục.");
    });
  };

  const stats = categories.slice(0, 4).map((category, index) => ({
    category,
    title: category.title,
    amount: categoryProductCounts[category.id] ?? 0,
    active: index === 0,
  }));

  return (
    <div className="font-sans min-h-[calc(100vh-4rem)] bg-neutral-50 p-4 sm:p-6 lg:p-8 text-neutral-900">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-neutral-500">
          <Link href="/admin" className="hover:text-shop_dark_green transition-colors">
            Admin
          </Link>
          <span>/</span>
          <span className="text-neutral-900 font-medium">Quản lý danh mục</span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col gap-1 border-b border-neutral-200 pb-5">
          <div className="flex items-end gap-3">
            <h1 className="text-xl font-bold uppercase tracking-tight text-neutral-900">
              Quản lý danh mục
            </h1>
            <span className="pb-0.5 text-xs text-neutral-500 font-mono">
              [ {categories.length} danh mục ]
            </span>
          </div>
          <p className="text-xs text-neutral-500">
            Sắp xếp, phân loại sản phẩm và tối ưu danh mục hàng hóa trên hệ thống
          </p>
        </div>

        {/* Top Cards Grid */}
        <div className="grid gap-5 xl:grid-cols-[1.9fr_1fr]">
          <div className="grid gap-4 sm:grid-cols-2">
            {stats.map(({ category, title, amount, active }, index) => (
              <div
                key={`${title}-${index}`}
                className={`border bg-white p-4 transition-colors ${
                  active ? "border-shop_dark_green ring-1 ring-shop_dark_green/30" : "border-neutral-200 hover:border-neutral-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="h-14 w-14 shrink-0 overflow-hidden border border-neutral-200 bg-neutral-50">
                    <img
                      src={getCategoryImage(category)}
                      alt={title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <details className="relative">
                    <summary
                      aria-label={`Tùy chọn ${title}`}
                      title={`Tùy chọn ${title}`}
                      className="flex h-8 w-8 cursor-pointer list-none items-center justify-center border border-neutral-200 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors [&::-webkit-details-marker]:hidden"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </summary>
                    <div className="absolute right-0 top-full z-20 mt-1 w-48 border border-neutral-200 bg-white py-1 text-xs shadow-md">
                      <button
                        type="button"
                        onClick={(event) => {
                          startEdit(category);
                          event.currentTarget.closest("details")?.removeAttribute("open");
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-neutral-700 hover:bg-neutral-50 font-medium"
                      >
                        <PencilLine className="h-3.5 w-3.5 text-neutral-500" />
                        Chỉnh sửa danh mục
                      </button>
                      <Link
                        href={`/admin/products?category=${encodeURIComponent(category.slug)}`}
                        className="flex items-center gap-2 px-3 py-2 text-neutral-700 hover:bg-neutral-50 font-medium"
                      >
                        <ShoppingBag className="h-3.5 w-3.5 text-neutral-500" />
                        Xem sản phẩm
                      </Link>
                    </div>
                  </details>
                </div>

                <div className="mt-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-neutral-900 truncate">{title}</p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-neutral-900 tabular-nums">
                    {amount}
                  </p>
                  <p className="text-[11px] font-mono text-neutral-400 uppercase">Sản phẩm hiện có</p>
                </div>

                <Link
                  href={`/admin/products?category=${encodeURIComponent(category.slug)}`}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-shop_dark_green hover:underline"
                >
                  Xem sản phẩm &rarr;
                </Link>
              </div>
            ))}
          </div>

          {/* Quick Action Promo Card */}
          <div className="border border-neutral-200 bg-shop_dark_green p-6 text-white flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-emerald-300">
                Truy cập nhanh
              </span>
              <h2 className="mt-2 text-xl font-bold uppercase tracking-tight text-white leading-snug">
                Tăng doanh số với bộ sưu tập luôn được cập nhật!
              </h2>
              <p className="mt-2 text-xs text-neutral-200 leading-relaxed">
                Thêm sản phẩm mới vào kho và làm danh mục của bạn trở nên hấp dẫn hơn với khách hàng.
              </p>
            </div>

            <Link
              href="/admin/products"
              className="mt-6 inline-flex items-center justify-center gap-2 bg-white px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-shop_dark_green hover:bg-neutral-100 transition-colors shadow-sm"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              Thêm sản phẩm mới
            </Link>
          </div>
        </div>

        {/* Create / Edit Form */}
        {showForm && (
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="border border-neutral-200 bg-white p-5 sm:p-6"
          >
            <div className="mb-4 flex items-center justify-between border-b border-neutral-200 pb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                {editingId ? "Chỉnh sửa danh mục" : "Tạo danh mục mới"}
              </h2>
              <button
                type="button"
                onClick={resetForm}
                className="text-xs font-semibold uppercase tracking-wider text-neutral-500 hover:text-neutral-900 transition-colors"
              >
                Đóng
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-neutral-700">
                  Tên danh mục <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ví dụ: Laptop Gaming"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-neutral-700">
                  Đường dẫn (slug) <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="Ví dụ: laptop-gaming"
                  className={inputClass}
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-neutral-700">
                  Mô tả danh mục
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Nhập mô tả ngắn gọn về danh mục..."
                  className={inputClass}
                  rows={3}
                />
              </div>

              {!editingId && (
                <>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-neutral-700">
                      Đường dẫn hình ảnh (URL)
                    </label>
                    <input
                      value={form.imageUrl}
                      onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                      placeholder="https://..."
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-neutral-700">
                      Thứ tự hiển thị
                    </label>
                    <input
                      type="number"
                      value={form.displayOrder}
                      onChange={(e) =>
                        setForm({ ...form, displayOrder: Number(e.target.value) })
                      }
                      className={inputClass}
                    />
                  </div>
                </>
              )}
            </div>

            {error && (
              <p className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                {error}
              </p>
            )}

            <div className="mt-5 flex items-center justify-end gap-3 border-t border-neutral-200 pt-4">
              <button
                type="button"
                onClick={resetForm}
                className="border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wider text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-shop_dark_green px-5 py-2 text-xs font-semibold uppercase tracking-wider text-white hover:bg-shop_dark_green/90 transition-colors shadow-sm disabled:opacity-60"
              >
                {saving
                  ? "Đang lưu..."
                  : editingId
                  ? "Cập nhật danh mục"
                  : "Tạo danh mục"}
              </button>
            </div>
          </form>
        )}

        {/* Categories Table View */}
        <div className="border border-neutral-200 bg-white">
          <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3.5">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-900">
              Danh sách danh mục ({categories.length})
            </span>
            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex items-center gap-1.5 bg-shop_dark_green px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white hover:bg-shop_dark_green/90 transition-colors shadow-sm"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              Thêm danh mục
            </button>
          </div>

          {loading ? (
            <div className="py-8">
              <Loading message="Đang tải danh mục..." className="min-h-[220px]" />
            </div>
          ) : categories.length === 0 ? (
            <p className="py-16 text-center text-xs text-neutral-500">
              Chưa có danh mục nào. Hãy thêm danh mục đầu tiên để bắt đầu.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50/60 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    <th className="px-5 py-3 w-10">#</th>
                    <th className="px-5 py-3">Tên danh mục</th>
                    <th className="px-5 py-3">Đường dẫn (slug)</th>
                    <th className="px-5 py-3">Mô tả</th>
                    <th className="px-5 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-xs">
                  {categories.map((category, idx) => (
                    <tr key={category.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="px-5 py-4 font-mono text-neutral-400">
                        {String(idx + 1).padStart(2, "0")}
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-semibold text-neutral-900 hover:text-shop_dark_green transition-colors">
                          {category.title}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-mono text-neutral-500">
                        {category.slug}
                      </td>
                      <td className="px-5 py-4 text-neutral-500 max-w-xs truncate">
                        {category.description?.trim() || "Bộ sưu tập sản phẩm thuộc danh mục này."}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => startEdit(category)}
                            className="border border-neutral-200 p-1.5 text-neutral-500 hover:border-shop_dark_green hover:text-shop_dark_green transition-colors"
                            aria-label={`Chỉnh sửa ${category.title}`}
                            title="Chỉnh sửa"
                          >
                            <PencilLine className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(category)}
                            disabled={deletingId === category.id}
                            className="border border-neutral-200 p-1.5 text-neutral-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label={`Xóa ${category.title}`}
                            title={deletingId === category.id ? "Đang xóa..." : "Xóa danh mục"}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
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

export default AdminCategoriesPage;