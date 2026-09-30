"use client";

// app/admin/products/page.tsx
import { useEffect, useState } from "react";
import { getCategories, getProductsPaginated } from "@/lib/api";
import {
  adminCreateProduct,
  adminUpdateProduct,
  adminDeleteProduct,
  ProductPayload,
} from "@/lib/admin-api";
import type { Category, Product } from "@/app/data/types";

const emptyForm: ProductPayload = {
  name: "",
  slug: "",
  sku: "",
  categoryId: "",
  brand: "",
  shortDescription: "",
  description: "",
  thumbnailUrl: "",
  price: 0,
  originalPrice: undefined,
  stockQuantity: 0,
  featured: false,
  hot: false,
  onSale: false,
  active: true,
};

const AdminProductsPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductPayload>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [productsResult, categoriesResult] = await Promise.all([
        getProductsPaginated({ size: 100 }),
        getCategories(),
      ]);
      setProducts(productsResult.items);
      setCategories(categoriesResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  // LƯU Ý: Product (từ GET /products) không có categoryId, chỉ có
  // `categories: string[]` (tên) -> không thể tự chọn sẵn category trong
  // dropdown khi sửa, phải tự chọn lại. Tương tự `sku` cũng không có
  // trong response nên để trống, cần tự nhập lại nếu backend yêu cầu sku
  // không đổi khi update (nếu lỗi 400 vì sku trống, cần bổ sung sku vào
  // response /products hoặc gọi thêm getProductById để lấy đủ dữ liệu).
  const startEdit = (product: Product) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      slug: product.slug,
      sku: "",
      categoryId: "",
      brand: product.brand ?? "",
      shortDescription: "",
      description: product.description ?? "",
      thumbnailUrl: product.images?.[0] ?? "",
      price: product.finalPrice,
      originalPrice: product.price,
      stockQuantity: product.stock,
      featured: product.isFeatured,
      hot: product.status === "hot",
      onSale: product.status === "sale",
      active: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await adminUpdateProduct(editingId, form);
      } else {
        await adminCreateProduct(form);
      }
      resetForm();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lưu sản phẩm thất bại");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa (mềm) sản phẩm này?")) return;
    setError(null);
    try {
      await adminDeleteProduct(id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xóa sản phẩm thất bại");
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Quản lý sản phẩm</h1>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg border p-4 mb-8 grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <h2 className="md:col-span-3 font-medium">
          {editingId ? "Sửa sản phẩm" : "Thêm sản phẩm mới"}
        </h2>

        <div>
          <label className="block text-sm mb-1">Tên sản phẩm</label>
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

        <div>
          <label className="block text-sm mb-1">SKU</label>
          <input
            required
            value={form.sku}
            onChange={(e) => setForm({ ...form, sku: e.target.value })}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Danh mục</label>
          <select
            required
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            className="w-full border rounded px-3 py-2"
          >
            <option value="">-- Chọn danh mục --</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Thương hiệu</label>
          <input
            value={form.brand}
            onChange={(e) => setForm({ ...form, brand: e.target.value })}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Ảnh (URL)</label>
          <input
            value={form.thumbnailUrl}
            onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Giá bán</label>
          <input
            required
            type="number"
            min={0}
            value={form.price}
            onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Giá gốc (nếu giảm giá)</label>
          <input
            type="number"
            min={0}
            value={form.originalPrice ?? ""}
            onChange={(e) =>
              setForm({
                ...form,
                originalPrice: e.target.value
                  ? Number(e.target.value)
                  : undefined,
              })
            }
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Tồn kho</label>
          <input
            required
            type="number"
            min={0}
            value={form.stockQuantity}
            onChange={(e) =>
              setForm({ ...form, stockQuantity: Number(e.target.value) })
            }
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div className="md:col-span-3">
          <label className="block text-sm mb-1">Mô tả ngắn</label>
          <input
            value={form.shortDescription}
            onChange={(e) =>
              setForm({ ...form, shortDescription: e.target.value })
            }
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div className="md:col-span-3">
          <label className="block text-sm mb-1">Mô tả đầy đủ</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full border rounded px-3 py-2"
            rows={3}
          />
        </div>

        <div className="md:col-span-3 flex gap-6 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => setForm({ ...form, featured: e.target.checked })}
            />
            Nổi bật
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.hot}
              onChange={(e) => setForm({ ...form, hot: e.target.checked })}
            />
            Hot
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.onSale}
              onChange={(e) => setForm({ ...form, onSale: e.target.checked })}
            />
            Đang giảm giá
          </label>
        </div>

        {error && <p className="md:col-span-3 text-sm text-red-600">{error}</p>}

        <div className="md:col-span-3 flex gap-3">
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
      ) : products.length === 0 ? (
        <p className="text-lightColor">Chưa có sản phẩm nào.</p>
      ) : (
        <table className="w-full bg-white border rounded-lg overflow-hidden">
          <thead className="bg-shop_light_bg text-left text-sm">
            <tr>
              <th className="p-3">Tên</th>
              <th className="p-3">Thương hiệu</th>
              <th className="p-3">Giá</th>
              <th className="p-3">Tồn kho</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t text-sm">
                <td className="p-3">{p.name}</td>
                <td className="p-3 text-lightColor">{p.brand ?? "-"}</td>
                <td className="p-3">
                  {p.finalPrice.toLocaleString("vi-VN")}₫
                </td>
                <td className="p-3">{p.stock}</td>
                <td className="p-3 text-right space-x-3">
                  <button
                    onClick={() => startEdit(p)}
                    className="text-shop_dark_green hover:underline"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="text-red-600 hover:underline"
                  >
                    Xóa
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

export default AdminProductsPage;