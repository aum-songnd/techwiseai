"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getCategories, getProductsPaginated } from "@/lib/api";
import {
  adminCreateProduct,
  adminUpdateProduct,
  adminDeleteProduct,
  ProductPayload,
} from "@/lib/admin-api";
import type { Category, Product } from "@/app/data/types";

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();

const FETCH_SIZE = 100;
const PAGE_SIZE = 25;
const MAX_PAGES = 100;

const fetchAllProducts = async (): Promise<Product[]> => {
  const all: Product[] = [];
  const seen = new Set<string>();
  let page = 0;

  while (page < MAX_PAGES) {
    const result = await getProductsPaginated({ size: FETCH_SIZE, page });
    const items = result.items;

    let added = 0;
    for (const item of items) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        all.push(item);
        added++;
      }
    }

    if (items.length < FETCH_SIZE || added === 0) break;
    page++;
  }

  return all;
};

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
  const [search, setSearch] = useState("");
  const [newBrandMode, setNewBrandMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const listTopRef = useRef<HTMLDivElement | null>(null);

  const brands = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.brand && p.brand.trim()) set.add(p.brand.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "vi"));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const tokens = normalize(search).split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return products;
    return products.filter((p) => {
      const haystack = normalize(
        `${p.name} ${p.brand ?? ""} ${p.slug} ${(p.categories ?? []).join(" ")}`
      );

      return tokens.every((t) => haystack.includes(t));
    });
  }, [products, search]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const pagedProducts = filteredProducts.slice(startIndex, startIndex + PAGE_SIZE);

  const goToPage = (p: number) => {
    setCurrentPage(Math.min(Math.max(1, p), totalPages));
    listTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [allProducts, categoriesResult] = await Promise.all([
        fetchAllProducts(),
        getCategories(),
      ]);
      setProducts(allProducts);
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
    setNewBrandMode(false);
  };

  const startEdit = (product: Product) => {
    setEditingId(product.id);
    setNewBrandMode(false);
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
    window.scrollTo({ top: 0, behavior: "smooth" });
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
          <select
            value={newBrandMode ? "__new__" : form.brand}
            onChange={(e) => {
              if (e.target.value === "__new__") {
                setNewBrandMode(true);
                setForm({ ...form, brand: "" });
              } else {
                setNewBrandMode(false);
                setForm({ ...form, brand: e.target.value });
              }
            }}
            className="w-full border rounded px-3 py-2"
          >
            <option value="">-- Chọn thương hiệu --</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
            <option value="__new__">+ Thêm thương hiệu mới...</option>
          </select>
          {newBrandMode && (
            <input
              autoFocus
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
              placeholder="Nhập tên thương hiệu mới"
              className="w-full border rounded px-3 py-2 mt-2"
            />
          )}
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

      <div
        ref={listTopRef}
        className="flex flex-wrap items-center justify-between gap-3 mb-4"
      >
        <h2 className="font-medium">
          {search.trim()
            ? `Tìm thấy ${filteredProducts.length} / tổng ${products.length} sản phẩm`
            : `Danh sách sản phẩm (tổng ${products.length})`}
        </h2>
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Tìm theo tên, thương hiệu..."
            className="w-full border rounded px-3 py-2 pr-9 text-sm"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCurrentPage(1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
              aria-label="Xóa tìm kiếm"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p>Đang tải...</p>
      ) : products.length === 0 ? (
        <p className="text-lightColor">Chưa có sản phẩm nào.</p>
      ) : filteredProducts.length === 0 ? (
        <p className="text-lightColor">
          Không tìm thấy sản phẩm nào khớp với &quot;{search}&quot;.
        </p>
      ) : (
        <>
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
            {pagedProducts.map((p) => (
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

        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 text-sm">
          <span className="text-lightColor">
            Hiển thị {startIndex + 1}–
            {Math.min(startIndex + PAGE_SIZE, filteredProducts.length)} trong
            tổng {filteredProducts.length} sản phẩm
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => goToPage(safePage - 1)}
                disabled={safePage <= 1}
                className="px-3 py-1.5 rounded border disabled:opacity-40"
              >
                ← Trước
              </button>
              <span>
                Trang {safePage}/{totalPages}
              </span>
              <button
                type="button"
                onClick={() => goToPage(safePage + 1)}
                disabled={safePage >= totalPages}
                className="px-3 py-1.5 rounded border disabled:opacity-40"
              >
                Tiếp →
              </button>
            </div>
          )}
        </div>
        </>
      )}
    </div>
  );
};

export default AdminProductsPage;