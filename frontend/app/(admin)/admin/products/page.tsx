"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
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

// Retain list data between Next.js client-side page navigations.
let productSnapshot: { products: Product[]; categories: Category[]; at: number } | null = null;
const PRODUCT_SNAPSHOT_MS = 5 * 60 * 1000;

const AdminProductsPage = () => {
  const [products, setProducts] = useState<Product[]>(() => productSnapshot?.products ?? []);
  const [categories, setCategories] = useState<Category[]>(() => productSnapshot?.categories ?? []);
  const [loading, setLoading] = useState(() => !productSnapshot);
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

  const loadData = async (force = false) => {
    if (!force && productSnapshot && Date.now() - productSnapshot.at < PRODUCT_SNAPSHOT_MS) return;
    setLoading(!productSnapshot);
    setError(null);
    try {
      const [allProducts, categoriesResult] = await Promise.all([
        fetchAllAdminProducts(),
        getCategories(),
      ]);
      setProducts(allProducts);
      setCategories(categoriesResult);
      productSnapshot = { products: allProducts, categories: categoriesResult, at: Date.now() };
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
      await loadData(true);
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
      await loadData(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xóa sản phẩm thất bại");
    }
  };

  const inputClass =
    "w-full border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-shop_dark_green focus:outline-none focus:ring-1 focus:ring-shop_dark_green transition-colors";

  return (
    <div className="font-sans min-h-[calc(100vh-4rem)] bg-neutral-50 p-4 sm:p-6 lg:p-8 text-neutral-900">
      <div className="mx-auto max-w-[1440px] space-y-6">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-neutral-500">
          <Link href="/admin" className="hover:text-shop_dark_green transition-colors">
            Admin
          </Link>
          <span>/</span>
          <span className="text-neutral-900 font-medium">Quản lý sản phẩm</span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col gap-4 border-b border-neutral-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-3">
            <h1 className="text-xl font-bold uppercase tracking-tight text-neutral-900">
              Quản lý sản phẩm
            </h1>
            <span className="pb-0.5 text-xs text-neutral-500 font-mono">
              [ {products.length} sản phẩm ]
            </span>
          </div>
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center gap-1.5 bg-shop_dark_green px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-shop_dark_green/90 transition-colors shadow-sm"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            Thêm sản phẩm mới
          </button>
        </div>

        {/* Product Create / Edit Form */}
        {showForm && (
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="border border-neutral-200 bg-white p-5 sm:p-6 shadow-sm"
          >
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3 mb-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                {editingId ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}
              </h2>
              <button
                type="button"
                onClick={resetForm}
                aria-label="Đóng biểu mẫu"
                className="text-neutral-500 hover:text-neutral-900 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Tên sản phẩm <span className="text-red-500">*</span></label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nhập tên sản phẩm..."
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Slug (Đường dẫn) <span className="text-red-500">*</span></label>
                <input
                  required
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="vi-du-ten-san-pham"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Mã SKU <span className="text-red-500">*</span></label>
                <input
                  required
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  placeholder="SKU-12345"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Danh mục <span className="text-red-500">*</span></label>
                <select
                  required
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className={inputClass}
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
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Thương hiệu</label>
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
                  className={inputClass}
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
                    className={`mt-2 ${inputClass}`}
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Ảnh sản phẩm (URL)</label>
                <input
                  value={form.thumbnailUrl}
                  onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })}
                  placeholder="https://..."
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Giá bán (VND) <span className="text-red-500">*</span></label>
                <input
                  required
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Giá gốc (nếu có giảm giá)</label>
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
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Số lượng tồn kho <span className="text-red-500">*</span></label>
                <input
                  required
                  type="number"
                  min={0}
                  value={form.stockQuantity}
                  onChange={(e) =>
                    setForm({ ...form, stockQuantity: Number(e.target.value) })
                  }
                  className={inputClass}
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Mô tả ngắn</label>
                <input
                  value={form.shortDescription}
                  onChange={(e) =>
                    setForm({ ...form, shortDescription: e.target.value })
                  }
                  placeholder="Mô tả tóm tắt nổi bật về thông số hoặc tính năng..."
                  className={inputClass}
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Mô tả chi tiết</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className={inputClass}
                  rows={3}
                  placeholder="Chi tiết về sản phẩm..."
                />
              </div>

              <div className="flex flex-wrap gap-6 text-xs font-semibold text-neutral-700 md:col-span-3 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                    className="accent-shop_dark_green"
                  />
                  Nổi bật
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.hot}
                    onChange={(e) => setForm({ ...form, hot: e.target.checked })}
                    className="accent-shop_dark_green"
                  />
                  Sản phẩm Hot
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.onSale}
                    onChange={(e) => setForm({ ...form, onSale: e.target.checked })}
                    className="accent-shop_dark_green"
                  />
                  Đang giảm giá
                </label>
              </div>

              {error && (
                <p className="border border-red-200 bg-red-50 p-3 text-xs text-red-600 font-medium md:col-span-3">
                  {error}
                </p>
              )}

              <div className="flex items-center gap-3 md:col-span-3 pt-3 border-t border-neutral-200">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-shop_dark_green px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-shop_dark_green/90 transition-colors shadow-sm disabled:opacity-50"
                >
                  {saving ? "Đang lưu..." : editingId ? "Cập nhật sản phẩm" : "Tạo sản phẩm mới"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="border border-neutral-300 bg-white px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-700 hover:bg-neutral-50 transition-colors"
                  >
                    Hủy
                  </button>
                )}
              </div>
            </div>
          </form>
        )}

        {/* Toolbar & Filters */}
        <div
          ref={listTopRef}
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-neutral-200 pb-4"
        >
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
            {categoryFilter
              ? `Danh mục ${categories.find((category) => category.slug === categoryFilter)?.title ?? ""}: ${filteredProducts.length} sản phẩm`
              : search.trim()
              ? `Tìm thấy ${filteredProducts.length} / tổng ${products.length} sản phẩm`
              : `Danh sách sản phẩm (${products.length})`}
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <label className="relative block sm:w-60">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Tìm sản phẩm..."
                className="w-full border border-neutral-300 bg-white py-1.5 pl-8 pr-3 text-xs text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-shop_dark_green focus:ring-1 focus:ring-shop_dark_green transition-colors"
              />
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-700 outline-none focus:border-shop_dark_green transition-colors"
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
              className="border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-700 outline-none focus:border-shop_dark_green transition-colors"
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
              className="border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-700 outline-none focus:border-shop_dark_green transition-colors"
              aria-label="Lọc sản phẩm nổi bật"
            >
              <option value="all">Tất cả sản phẩm</option>
              <option value="popular">Sản phẩm nổi bật</option>
            </select>
          </div>
        </div>

        {/* Products Grid Display */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index} className="h-[340px] animate-pulse border border-neutral-200 bg-white" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="border border-neutral-200 bg-white py-16 text-center text-xs text-neutral-500">
            Chưa có sản phẩm nào.
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="border border-neutral-200 bg-white py-16 text-center text-xs text-neutral-500">
            <PackageOpen className="mx-auto mb-3 h-8 w-8 text-neutral-300" />
            Không tìm thấy sản phẩm phù hợp với bộ lọc hiện tại.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {pagedProducts.map((product) => (
                <article
                  key={product.id}
                  className="group overflow-hidden border border-neutral-200 bg-white transition hover:border-neutral-400"
                >
                  <div className="relative aspect-[1.25/1] overflow-hidden bg-white p-3 border-b border-neutral-100">
                    <ProductImage
                      src={product.images[0]}
                      alt={product.name}
                      fit="contain"
                      fallbackIcon={PackageOpen}
                      className="h-full w-full transition duration-300 group-hover:scale-[1.03]"
                    />
                    <details className="absolute right-3 top-3">
                      <summary
                        aria-label={`Thao tác với ${product.name}`}
                        className="flex h-7 w-7 cursor-pointer list-none items-center justify-center border border-neutral-200 bg-white text-neutral-500 hover:text-neutral-900 [&::-webkit-details-marker]:hidden"
                      >
                        <EllipsisVertical className="h-3.5 w-3.5" />
                      </summary>
                      <div className="absolute right-0 top-full z-20 mt-1 w-36 border border-neutral-200 bg-white py-1 text-xs shadow-md">
                        <button
                          type="button"
                          onClick={() => startEdit(product)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-neutral-700 hover:bg-neutral-50 font-medium"
                        >
                          <Pencil className="h-3.5 w-3.5 text-neutral-500" /> Sửa sản phẩm
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(product.id)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-red-600 hover:bg-red-50 font-medium"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Xóa sản phẩm
                        </button>
                      </div>
                    </details>
                    {(product.isFeatured || product.status === "hot") && (
                      <span className="absolute bottom-3 left-3 border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-mono font-semibold text-amber-800">
                        Nổi bật
                      </span>
                    )}
                  </div>

                  <div className="p-3.5">
                    <div className="mb-1 flex items-baseline gap-2">
                      <p className="text-sm font-bold text-neutral-900 tabular-nums">
                        {product.finalPrice.toLocaleString("vi-VN")}₫
                      </p>
                      {product.discount > 0 && (
                        <p className="text-[11px] text-neutral-400 line-through tabular-nums">
                          {product.price.toLocaleString("vi-VN")}₫
                        </p>
                      )}
                    </div>
                    <h3 className="truncate text-xs font-semibold text-neutral-900 hover:text-shop_dark_green transition-colors" title={product.name}>
                      {product.name}
                    </h3>
                    <p className="mt-1.5 truncate text-[11px] text-neutral-500">
                      Danh mục: <span className="text-neutral-700">{product.categories?.join(", ") || "Chưa phân loại"}</span>
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-neutral-500">
                      Thương hiệu: <span className="text-neutral-700">{product.brand || "Chưa có"}</span>
                    </p>
                    <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-2 text-xs text-neutral-500">
                      <span className="font-mono text-[11px]">{product.stock} trong kho</span>
                      <button
                        type="button"
                        onClick={() => startEdit(product)}
                        className="text-xs font-semibold uppercase tracking-wider text-shop_dark_green hover:underline"
                        aria-label={`Sửa ${product.name}`}
                      >
                        Sửa
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* Pagination */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-500">
              <span className="font-mono">
                Hiển thị {startIndex + 1}–
                {Math.min(startIndex + PAGE_SIZE, filteredProducts.length)} trong
                tổng {filteredProducts.length} sản phẩm
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-1.5 font-mono">
                  <button
                    type="button"
                    onClick={() => goToPage(safePage - 1)}
                    disabled={safePage <= 1}
                    className="border border-neutral-300 bg-white p-1 text-neutral-600 hover:border-shop_dark_green disabled:opacity-40"
                    aria-label="Trang trước"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <span>
                    Trang {safePage}/{totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => goToPage(safePage + 1)}
                    disabled={safePage >= totalPages}
                    className="border border-neutral-300 bg-white p-1 text-neutral-600 hover:border-shop_dark_green disabled:opacity-40"
                    aria-label="Trang tiếp theo"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
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