"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
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
  adminUpdateCategory,
  CategoryPayload,
} from "@/lib/admin-api";
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
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 shadow-sm outline-none transition focus:border-shop_dark_green focus:ring-4 focus:ring-shop_light_green/15";

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
  const formRef = useRef<HTMLFormElement | null>(null);

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
      resetForm();
      await loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lưu danh mục thất bại");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category: Category) => {
    if (!window.confirm(`Bạn có chắc muốn xóa danh mục "${category.title}" không?`)) {
      return;
    }

    setDeletingId(category.id);
    setError(null);
    try {
      await adminDeleteCategory(category.id);
      if (editingId === category.id) resetForm();
      await loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xóa danh mục thất bại");
    } finally {
      setDeletingId(null);
    }
  };

  const stats = categories.slice(0, 4).map((category, index) => ({
    category,
    title: category.title,
    amount: categoryProductCounts[category.id] ?? 0,
    active: index === 0,
  }));

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex items-center gap-2 text-sm text-gray-500">
          <Link href="/admin" className="transition-colors hover:text-shop_dark_green">
            Menu chính
          </Link>
          <span>›</span>
          <Link
            href="/admin/categories"
            aria-current="page"
            className="font-medium  text-gray-700 transition-colors hover:text-shop_dark_green"
          >
            Danh mục
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-[22px] font-semibold tracking-tight text-gray-800">
            Quản lý danh mục
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Sắp xếp sản phẩm bằng cách tạo danh mục
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.9fr_1fr]">
          <div className="grid gap-4 sm:grid-cols-2">
            {stats.map(({ category, title, amount, active }, index) => (
              <div
                key={`${title}-${index}`}
                className={`rounded-2xl border bg-white p-4 shadow-[0_10px_25px_rgba(15,23,42,0.04)] transition ${
                  active ? "border-shop_light_green/50 bg-shop_light_green/5" : "border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="h-14 w-14 overflow-hidden rounded-xl bg-gray-100">
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
                      className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 [&::-webkit-details-marker]:hidden"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </summary>
                    <div className="absolute right-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-lg">
                      <button
                        type="button"
                        onClick={(event) => {
                          startEdit(category);
                          event.currentTarget.closest("details")?.removeAttribute("open");
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-gray-700 hover:bg-gray-50"
                      >
                        <PencilLine className="h-4 w-4" />
                        Chỉnh sửa danh mục
                      </button>
                      <Link
                        href={`/admin/products?category=${encodeURIComponent(category.slug)}`}
                        className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50"
                      >
                        <ShoppingBag className="h-4 w-4" />
                        Xem sản phẩm
                      </Link>
                    </div>
                  </details>
                </div>

                <div className="mt-5">
                  <p className="text-lg font-semibold text-gray-800">{title}</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">
                    {amount}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">Sản phẩm</p>
                </div>

                <Link
                  href={`/admin/products?category=${encodeURIComponent(category.slug)}`}
                  className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-shop_dark_green"
                >
                  Xem sản phẩm
                </Link>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0e88b7] via-[#0b6fa5] to-[#0c5d8d] p-5 text-white shadow-[0_20px_35px_rgba(12,93,141,0.3)]">
            <div className="mb-8 h-10 w-10 rounded-full border border-white/25 bg-white/10" />
            <div className="space-y-3">
              <p className="text-xl font-semibold">Truy cập nhanh</p>
              <h2 className="max-w-xs text-3xl font-semibold leading-tight">
                Tăng doanh số với bộ sưu tập luôn được cập nhật!
              </h2>
            </div>

            <p className="mt-5 max-w-xs text-sm text-cyan-50/90">
              Thêm sản phẩm mới vào kho và làm danh mục của bạn hấp dẫn hơn.
            </p>

            <Link
              href="/admin/products"
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/40 bg-white/10 px-4 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15"
            >
              <Plus className="h-4 w-4" />
              Thêm sản phẩm
            </Link>
          </div>
        </div>

        {showForm && (
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-800">
                {editingId ? "Chỉnh sửa danh mục" : "Thêm danh mục"}
              </h2>
              <button
                type="button"
                onClick={resetForm}
                className="text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                Đóng
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Tên danh mục
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Đường dẫn (slug)
                </label>
                <input
                  required
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Mô tả
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className={inputClass}
                  rows={3}
                />
              </div>

              {!editingId && (
                <>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Đường dẫn hình ảnh
                    </label>
                    <input
                      value={form.imageUrl}
                      onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
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
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-shop_dark_green px-5 py-2.5 text-sm font-medium text-white transition hover:bg-shop_dark_green/90 disabled:opacity-60"
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

        <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_8px_28px_rgba(15,23,42,0.03)]">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-shop_dark_green hover:text-shop_dark_green"
            >
              <Plus className="h-4 w-4" />
              Thêm danh mục
            </button>
          </div>

          {loading ? (
            <p className="py-16 text-center text-sm text-gray-400">Đang tải...</p>
          ) : categories.length === 0 ? (
            <p className="py-16 text-center text-sm text-gray-500">
              Chưa có danh mục nào. Hãy thêm danh mục đầu tiên để bắt đầu.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-gray-50 text-xs font-medium uppercase tracking-[0.08em] text-gray-500">
                  <tr>
                    <th className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" className="h-4 w-4 rounded border-gray-300" />
                      </div>
                    </th>
                    <th className="px-5 py-3">Tên danh mục</th>
                    <th className="px-5 py-3">Mô tả</th>
                    <th className="px-5 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {categories.map((category) => (
                    <tr key={category.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4">
                        <input type="checkbox" className="h-4 w-4 rounded border-gray-300" />
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-medium  text-gray-800">{category.title}</span>
                      </td>
                      <td className="px-5 py-4 text-gray-500">
                        {category.description?.trim() || "Bộ sưu tập sản phẩm thuộc danh mục này."}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(category)}
                            className="rounded-lg border border-gray-200 p-2 text-gray-600 transition hover:border-shop_dark_green hover:text-shop_dark_green"
                            aria-label={`Chỉnh sửa ${category.title}`}
                          >
                            <PencilLine className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(category)}
                            disabled={deletingId === category.id}
                            className="rounded-lg border border-gray-200 p-2 text-red-600 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label={`Xóa ${category.title}`}
                            title={deletingId === category.id ? "Đang xóa..." : "Xóa danh mục"}
                          >
                            <Trash2 className="h-4 w-4" />
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
      </div>
  );
};

export default AdminCategoriesPage;