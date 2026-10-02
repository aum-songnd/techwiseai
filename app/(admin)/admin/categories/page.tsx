"use client";

import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";
import { getCategories } from "@/lib/api";
import {
  adminCreateCategory,
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
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-shop_dark_green focus:ring-2 focus:ring-shop_light_green/20";

const AdminCategoriesPage = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryPayload>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được danh mục");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setForm({
      name: category.title,
      slug: category.slug,
      description: category.description ?? "",
      imageUrl: category.imageUrl ?? "",
      displayOrder: category.displayOrder ?? 0,
      active: true,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
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

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Quản lý danh mục</h1>
        <p className="text-sm text-gray-500 mt-1">
          Tạo mới và chỉnh sửa danh mục sản phẩm.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-gray-200 p-5 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <h2 className="md:col-span-2 font-semibold text-gray-800">
          {editingId ? "Sửa danh mục" : "Thêm danh mục mới"}
        </h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
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
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Slug
          </label>
          <input
            required
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            className={inputClass}
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Mô tả
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={inputClass}
            rows={2}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Ảnh (URL)
          </label>
          <input
            value={form.imageUrl}
            onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
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

        {error && (
          <p className="md:col-span-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="md:col-span-2 flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-shop_dark_green text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-shop_dark_green/90 transition-colors disabled:opacity-50"
          >
            {saving ? "Đang lưu..." : editingId ? "Cập nhật" : "Tạo mới"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-sm font-medium px-5 py-2.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
          )}
        </div>
      </form>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Danh sách danh mục</h2>
          {!loading && (
            <p className="text-sm text-gray-500">{categories.length} danh mục</p>
          )}
        </div>

        {loading ? (
          <p className="py-16 text-center text-sm text-gray-400">Đang tải...</p>
        ) : categories.length === 0 ? (
          <p className="py-16 text-center text-sm text-gray-500">
            Chưa có danh mục nào. Thêm danh mục đầu tiên ở form phía trên.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500">
                <tr>
                  <th className="px-5 py-3">Danh mục</th>
                  <th className="px-5 py-3">Slug</th>
                  <th className="px-5 py-3">Thứ tự</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categories.map((c) => (
                  <tr
                    key={c.id}
                    className={`hover:bg-gray-50 transition-colors ${
                      editingId === c.id ? "bg-shop_light_green/5" : ""
                    }`}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center shrink-0">
                          {c.imageUrl ? (

                            <img
                              src={c.imageUrl}
                              alt={c.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageOff className="w-5 h-5 text-gray-300" />
                          )}
                        </div>
                        <span className="font-medium text-gray-800">
                          {c.title}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{c.slug}</td>
                    <td className="px-5 py-3 text-gray-600">
                      {c.displayOrder ?? "-"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => startEdit(c)}
                        className="text-sm font-medium text-shop_dark_green hover:underline"
                      >
                        Sửa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCategoriesPage;