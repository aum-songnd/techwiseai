"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  EllipsisVertical,
  PackageOpen,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { getCategories } from "@/lib/api";
import { fetchAllAdminProducts, normalizeAdminText } from "@/lib/admin-products";
import ProductImage from "@/components/admin/ProductImage";
import {
  adminCreateProduct,
  adminUpdateProduct,
  adminDeleteProduct,
  ProductPayload,
} from "@/lib/admin-api";
import type { Category, Product } from "@/app/data/types";

const PAGE_SIZE = 25;

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
  const [categoryFilter, setCategoryFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [popularFilter, setPopularFilter] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newBrandMode, setNewBrandMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const listTopRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  const brands = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.brand && p.brand.trim()) set.add(p.brand.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "vi"));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const selectedCategory = categories.find(
      (category) => category.slug === categoryFilter
    );
    const categoryProducts = categoryFilter
      ? products.filter((product) =>
          selectedCategory &&
          product.categories?.some(
            (category) => normalizeAdminText(category) === normalizeAdminText(selectedCategory.title)
          )
        )
      : products;
    const brandProducts = brandFilter
      ? categoryProducts.filter((product) => product.brand === brandFilter)
      : categoryProducts;
    const popularProducts = popularFilter
      ? brandProducts.filter((product) => product.isFeatured || product.status === "hot")
      : brandProducts;
    const tokens = normalizeAdminText(search).split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return popularProducts;
    return popularProducts.filter((p) => {
      const haystack = normalizeAdminText(
        `${p.name} ${p.brand ?? ""} ${p.slug} ${(p.categories ?? []).join(" ")}`
      );

      return tokens.every((t) => haystack.includes(t));
    });
  }, [brandFilter, categories, categoryFilter, popularFilter, products, search]);

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
        fetchAllAdminProducts(),
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

  useEffect(() => {
    const category = new URLSearchParams(window.location.search).get("category");
    if (category) setCategoryFilter(category);
  }, []);

  useEffect(() => {
    if (showForm) {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showForm, editingId]);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setNewBrandMode(false);
    setShowForm(false);
  };

  const openCreateForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setNewBrandMode(false);
    setShowForm(true);
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
    setShowForm(true);
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
    <div className="min-h-full bg-[#f2f8fa] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-[22px] font-semibold text-gray-900">Sản phẩm</h1>
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center gap-2 rounded-full bg-gray-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
          >
            <Plus className="h-4 w-4" />
            Thêm sản phẩm
          </button>
        </div>

        {showForm && (
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="mb-6 grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-3"
          >
            <div className="flex items-center justify-between md:col-span-3">
              <h2 className="font-semibold text-gray-900">
                {editingId ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}
              </h2>
              <button
                type="button"
                onClick={resetForm}
                aria-label="Đóng biểu mẫu"
                className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

        <div>
          <label className="block text-sm mb-1">Tên sản phẩm</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Slug</label>
          <input
            required
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">SKU</label>
          <input
            required
            value={form.sku}
            onChange={(e) => setForm({ ...form, sku: e.target.value })}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Danh mục</label>
          <select
            required
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
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
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
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
              className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          )}
        </div>

        <div>
          <label className="block text-sm mb-1">Ảnh (URL)</label>
          <input
            value={form.thumbnailUrl}
            onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
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
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
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
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
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
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>

        <div className="md:col-span-3">
          <label className="block text-sm mb-1">Mô tả ngắn</label>
          <input
            value={form.shortDescription}
            onChange={(e) =>
              setForm({ ...form, shortDescription: e.target.value })
            }
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
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

        <div className="flex flex-wrap gap-6 text-sm md:col-span-3">
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

        {error && <p className="text-sm text-red-600 md:col-span-3">{error}</p>}

        <div className="flex gap-3 md:col-span-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-gray-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Đang lưu..." : editingId ? "Cập nhật" : "Tạo mới"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm"
            >
              Hủy
            </button>
          )}
        </div>
          </form>
        )}

      <div
        ref={listTopRef}
        className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <h2 className="text-sm font-medium text-gray-700">
          {categoryFilter
            ? `Danh mục ${categories.find((category) => category.slug === categoryFilter)?.title ?? ""}: ${filteredProducts.length} sản phẩm`
            : search.trim()
            ? `Tìm thấy ${filteredProducts.length} / tổng ${products.length} sản phẩm`
            : `Danh sách sản phẩm (tổng ${products.length})`}
        </h2>
        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <label className="relative block sm:w-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Tìm sản phẩm..."
              className="w-full rounded-full border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-gray-400"
            />
          </label>
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-full border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 outline-none focus:border-gray-400"
            aria-label="Lọc theo danh mục"
          >
            <option value="">Tất cả danh mục</option>
            {categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.title}
              </option>
            ))}
          </select>
          <select
            value={brandFilter}
            onChange={(e) => {
              setBrandFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-full border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 outline-none focus:border-gray-400"
            aria-label="Lọc theo thương hiệu"
          >
            <option value="">Tất cả thương hiệu</option>
            {brands.map((brand) => (
              <option key={brand} value={brand}>{brand}</option>
            ))}
          </select>
          <select
            value={popularFilter ? "popular" : "all"}
            onChange={(e) => {
              setPopularFilter(e.target.value === "popular");
              setCurrentPage(1);
            }}
            className="rounded-full border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 outline-none focus:border-gray-400"
            aria-label="Lọc sản phẩm nổi bật"
          >
            <option value="all">Tất cả sản phẩm</option>
            <option value="popular">Sản phẩm nổi bật</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="h-[340px] animate-pulse rounded-xl border border-gray-100 bg-white" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center text-sm text-gray-500">
          Chưa có sản phẩm nào.
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center text-sm text-gray-500">
          <PackageOpen className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          Không tìm thấy sản phẩm phù hợp với bộ lọc hiện tại.
        </div>
      ) : (
        <>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {pagedProducts.map((product) => (
            <article key={product.id} className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="relative aspect-[1.25/1] overflow-hidden bg-white p-3">
                <ProductImage
                  src={product.images[0]}
                  alt={product.name}
                  fit="contain"
                  fallbackIcon={PackageOpen}
                  className="h-full w-full transition duration-300 group-hover:scale-[1.03]"
                />
                <details className="absolute right-3 top-3">
                  <summary aria-label={`Thao tác với ${product.name}`} className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-full bg-gray-50/90 text-gray-500 shadow-sm hover:bg-white [&::-webkit-details-marker]:hidden">
                    <EllipsisVertical className="h-4 w-4" />
                  </summary>
                  <div className="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-lg">
                    <button type="button" onClick={() => startEdit(product)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-gray-700 hover:bg-gray-50">
                      <Pencil className="h-4 w-4" /> Sửa sản phẩm
                    </button>
                    <button type="button" onClick={() => handleDelete(product.id)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-red-600 hover:bg-red-50">
                      <Trash2 className="h-4 w-4" /> Xóa sản phẩm
                    </button>
                  </div>
                </details>
                {(product.isFeatured || product.status === "hot") && (
                  <span className="absolute bottom-3 left-3 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-800">
                    Nổi bật
                  </span>
                )}
              </div>

              <div className="border-t border-gray-100 p-3.5">
                <div className="mb-1 flex items-baseline gap-2">
                  <p className="text-lg font-semibold leading-tight text-gray-900">
                    {product.finalPrice.toLocaleString("vi-VN")}₫
                  </p>
                  {product.discount > 0 && (
                    <p className="text-xs text-gray-400 line-through">
                      {product.price.toLocaleString("vi-VN")}₫
                    </p>
                  )}
                </div>
                <h3 className="truncate text-sm font-medium text-gray-900" title={product.name}>{product.name}</h3>
                <p className="mt-2 truncate text-xs text-gray-500">
                  Danh mục: <span className="text-gray-700">{product.categories?.join(", ") || "Chưa phân loại"}</span>
                </p>
                <p className="mt-1 truncate text-xs text-gray-500">
                  Thương hiệu: <span className="text-gray-700">{product.brand || "Chưa có"}</span>
                </p>
                <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2.5 text-xs text-gray-500">
                  <span>{product.stock} sản phẩm trong kho</span>
                  <button type="button" onClick={() => startEdit(product)} className="font-medium text-gray-700 hover:text-shop_dark_green" aria-label={`Sửa ${product.name}`}>
                    Sửa
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="text-gray-500">
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
                className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 disabled:opacity-40"
                aria-label="Trang trước"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span>
                Trang {safePage}/{totalPages}
              </span>
              <button
                type="button"
                onClick={() => goToPage(safePage + 1)}
                disabled={safePage >= totalPages}
                className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 disabled:opacity-40"
                aria-label="Trang tiếp theo"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
        </>
      )}
      </div>
    </div>
  );
};

export default AdminProductsPage;