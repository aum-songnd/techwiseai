"use client";

// app/admin/categories/page.tsx
import { useEffect, useState } from "react";
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
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Quản lý danh mục</h1>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg border p-4 mb-8 grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <h2 className="md:col-span-2 font-medium">
          {editingId ? "Sửa danh mục" : "Thêm danh mục mới"}
        </h2>

        <div>
          <label className="block text-sm mb-1">Tên danh mục</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Slug</label>
          <input
            required
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm mb-1">Mô tả</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full border rounded px-3 py-2"
            rows={2}
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Ảnh (URL)</label>
          <input
            value={form.imageUrl}
            onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Thứ tự hiển thị</label>
          <input
            type="number"
            value={form.displayOrder}
            onChange={(e) =>
              setForm({ ...form, displayOrder: Number(e.target.value) })
            }
            className="w-full border rounded px-3 py-2"
          />
        </div>

        {error && <p className="md:col-span-2 text-sm text-red-600">{error}</p>}

        <div className="md:col-span-2 flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-shop_dark_green text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {saving ? "Đang lưu..." : editingId ? "Cập nhật" : "Tạo mới"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 rounded border"
            >
              Hủy
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <p>Đang tải...</p>
      ) : categories.length === 0 ? (
        <p className="text-lightColor">Chưa có danh mục nào.</p>
      ) : (
        <table className="w-full bg-white border rounded-lg overflow-hidden">
          <thead className="bg-shop_light_bg text-left text-sm">
            <tr>
              <th className="p-3">Tên</th>
              <th className="p-3">Slug</th>
              <th className="p-3">Thứ tự</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} className="border-t text-sm">
                <td className="p-3">{c.title}</td>
                <td className="p-3 text-lightColor">{c.slug}</td>
                <td className="p-3">{c.displayOrder ?? "-"}</td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => startEdit(c)}
                    className="text-shop_dark_green hover:underline"
                  >
                    Sửa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminCategoriesPage;