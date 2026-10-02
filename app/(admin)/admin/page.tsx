"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ImageOff,
  MoreVertical,
  Package,
  PackageSearch,
  Plus,
  Search,
  Tag,
  Wallet,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { getAllProductsByCategory, getCategories } from "@/lib/api";
import type { Category, Product } from "@/app/data/types";

const PAGE_SIZE = 12;

const LOW_STOCK_THRESHOLD = 5;

const formatPrice = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    value
  );

type StockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
type CategoryFilter = "ALL" | string;
type SortKey = "DEFAULT" | "PRICE_ASC" | "PRICE_DESC" | "STOCK_ASC";

type InventoryStats = {
  totalProducts: number;
  inventoryValue: number;
  lowStock: number;
  outOfStock: number;
};

type StatCardProps = {
  label: string;
  labelClass?: string;
  value: string;
  icon: LucideIcon;
  iconClass?: string;
  iconBgClass?: string;
};

type ProductCardProps = {
  product: Product;
};

type CategoryStock = {
  name: string;
  units: number;
};

type StatusIconProps = { className?: string; strokeWidth?: number };

const ExclamationIcon = ({ className, strokeWidth = 3 }: StatusIconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    className={className}
  >
    <path d="M12 6v7" />
    <path d="M12 18h.01" />
  </svg>
);

const STATUS_CONFIG: Record<
  StockStatus,
  {
    label: string;
    icon: React.ComponentType<StatusIconProps>;
    className: string;
    dotClass: string;
  }
> = {
  IN_STOCK: {
    label: "Còn hàng",
    icon: Check,
    className: "text-shop_dark_green",
    dotClass: "bg-shop_light_green",
  },
  LOW_STOCK: {
    label: "Sắp hết",
    icon: ExclamationIcon,
    className: "text-amber-600",
    dotClass: "bg-amber-500",
  },
  OUT_OF_STOCK: {
    label: "Hết hàng",
    icon: X,
    className: "text-red-600",
    dotClass: "bg-red-500",
  },
};

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "DEFAULT", label: "Mặc định" },
  { value: "PRICE_ASC", label: "Giá tăng dần" },
  { value: "PRICE_DESC", label: "Giá giảm dần" },
  { value: "STOCK_ASC", label: "Tồn kho ít nhất" },
];

const BADGE_CONFIG: Record<string, { label: string; className: string }> = {
  new: { label: "Mới", className: "text-shop_dark_green" },
  hot: { label: "Hot", className: "text-red-600" },
  sale: { label: "Giảm giá", className: "text-amber-600" },
};

const getStatus = (stock: number): StockStatus => {
  if (stock <= 0) return "OUT_OF_STOCK";
  if (stock < LOW_STOCK_THRESHOLD) return "LOW_STOCK";
  return "IN_STOCK";
};

const StatCard = ({
  label,
  labelClass = "text-black",
  value,
  icon: Icon,
  iconClass = "text-black",
  iconBgClass = "bg-[#e9eee8]",
}: StatCardProps) => (
  <div className="bg-white rounded-md border border-gray-200/40 px-4 py-4 sm:px-5 flex items-center gap-3.5 min-w-0">
    <div
      className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconBgClass} ${iconClass}`}
    >
      <Icon className="w-5 h-5" strokeWidth={1.75} />
    </div>
    <div className="min-w-0">
      <p className={`text-xs ${labelClass}`}>{label}</p>
      <p
        className="text-xl sm:text-2xl font-bold tracking-tight text-black leading-tight truncate"
        title={value}
      >
        {value}
      </p>
    </div>
  </div>
);

const ProductCard = ({ product }: ProductCardProps) => {
  const status = getStatus(product.stock);
  const cfg = STATUS_CONFIG[status];
  const StatusIcon = cfg.icon;
  const image = product.images?.[0];
  const badge = product.status ? BADGE_CONFIG[product.status] : undefined;

  return (
    <article className="group bg-white rounded-2xl border border-gray-200/80 overflow-hidden transition-all duration-200 hover:border-gray-300 hover:shadow-md">
      <div className="relative aspect-[4/3] bg-[#e9eee8] flex items-center justify-center overflow-hidden">
        {image ? (

          <img
            src={image}
            alt={product.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <ImageOff className="w-12 h-12 text-gray-300" />
        )}

        {status === "OUT_OF_STOCK" ? (
          <span className="absolute top-2.5 left-2.5 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-white/95 text-red-600 shadow-sm">
            Hết hàng
          </span>
        ) : (
          badge && (
            <span
              className={`absolute top-2.5 left-2.5 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-white/95 shadow-sm ${badge.className}`}
            >
              {badge.label}
            </span>
          )
        )}

        <button
          type="button"
          aria-label={`Tuỳ chọn cho ${product.name}`}
          className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center bg-white/90 text-gray-600 shadow-sm hover:bg-white hover:text-gray-900 transition-colors"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      <div className="px-3.5 pt-3 pb-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3
              className="text-sm font-semibold text-gray-900 truncate"
              title={product.name}
            >
              {product.name}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {product.categories?.[0] ?? "Chưa phân loại"}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-gray-900">
              {formatPrice(product.finalPrice)}
            </p>
            {product.discount > 0 && (
              <p className="text-[11px] text-gray-400 line-through">
                {formatPrice(product.price)}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 mt-3 text-xs">
          <span className="inline-flex items-center gap-1.5 font-medium text-gray-700">
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${cfg.dotClass}`}
            >
              <StatusIcon className="w-2.5 h-2.5 text-white" strokeWidth={3} />
            </span>
            {status === "OUT_OF_STOCK"
              ? cfg.label
              : `${cfg.label}: ${product.stock}`}
          </span>

          {product.brand && (
            <span className="inline-flex items-center gap-1 text-gray-500 min-w-0">
              <Tag className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{product.brand}</span>
            </span>
          )}
        </div>
      </div>
    </article>
  );
};

const AdminInventory = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("ALL");
  const [sort, setSort] = useState<SortKey>("DEFAULT");
  const [page, setPage] = useState(0);

  const [titleSlot, setTitleSlot] = useState<HTMLElement | null>(null);
  const [actionsSlot, setActionsSlot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setTitleSlot(document.getElementById("admin-header-title"));
    setActionsSlot(document.getElementById("admin-header-actions"));
  }, []);

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const [productList, categoryList] = await Promise.all([
          getAllProductsByCategory(),

          getCategories().catch(() => [] as Category[]),
        ]);
        if (ignore) return;
        setProducts(productList ?? []);
        setCategories(categoryList ?? []);
      } catch (err) {
        if (!ignore) {
          setErrorMessage(
            err instanceof Error
              ? err.message
              : "Không tải được dữ liệu kho hàng."
          );
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    load();
    return () => {
      ignore = true;
    };
  }, []);

  const categoryTabs = useMemo(() => {
    const titles = categories.length
      ? [...categories]
          .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
          .map((c) => c.title)
      : Array.from(new Set(products.flatMap((p) => p.categories ?? [])));
    return [
      { value: "ALL" as CategoryFilter, label: "Tất cả" },
      ...titles.map((title) => ({
        value: title as CategoryFilter,
        label: title,
      })),
    ];
  }, [categories, products]);

  const stats: InventoryStats = useMemo(
    () => ({
      totalProducts: products.length,
      inventoryValue: products.reduce(
        (sum, p) => sum + p.finalPrice * Math.max(0, p.stock),
        0
      ),
      lowStock: products.filter((p) => getStatus(p.stock) === "LOW_STOCK")
        .length,
      outOfStock: products.filter((p) => getStatus(p.stock) === "OUT_OF_STOCK")
        .length,
    }),
    [products]
  );

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const list = products.filter((p) => {
      const matchCategory =
        category === "ALL" || (p.categories ?? []).includes(category);
      const matchSearch =
        !keyword ||
        p.name.toLowerCase().includes(keyword) ||
        (p.brand ?? "").toLowerCase().includes(keyword);
      return matchCategory && matchSearch;
    });

    switch (sort) {
      case "PRICE_ASC":
        return [...list].sort((a, b) => a.finalPrice - b.finalPrice);
      case "PRICE_DESC":
        return [...list].sort((a, b) => b.finalPrice - a.finalPrice);
      case "STOCK_ASC":
        return [...list].sort((a, b) => a.stock - b.stock);
      default:
        return list;
    }
  }, [products, search, category, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const paged = filtered.slice(
    currentPage * PAGE_SIZE,
    (currentPage + 1) * PAGE_SIZE
  );

  const needAttention = useMemo(
    () =>
      products
        .filter((p) => getStatus(p.stock) !== "IN_STOCK")
        .sort((a, b) => a.stock - b.stock)
        .slice(0, 5),
    [products]
  );

  const distribution = useMemo(() => {
    const total = products.length;
    const out = stats.outOfStock;
    const low = stats.lowStock;
    const inStock = Math.max(0, total - out - low);
    const percent = (n: number) => (total === 0 ? 0 : (n / total) * 100);
    return {
      total,
      healthyPercent: Math.round(percent(inStock)),
      rows: [
        { key: "IN_STOCK" as StockStatus, count: inStock, pct: percent(inStock) },
        { key: "LOW_STOCK" as StockStatus, count: low, pct: percent(low) },
        { key: "OUT_OF_STOCK" as StockStatus, count: out, pct: percent(out) },
      ],
    };
  }, [products.length, stats.lowStock, stats.outOfStock]);

  const stockByCategory: CategoryStock[] = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((p) => {
      const name = p.categories?.[0] ?? "Chưa phân loại";
      map.set(name, (map.get(name) ?? 0) + Math.max(0, p.stock));
    });
    return Array.from(map, ([name, units]) => ({ name, units }))
      .sort((a, b) => b.units - a.units)
      .slice(0, 5);
  }, [products]);

  const maxCategoryUnits = Math.max(1, ...stockByCategory.map((c) => c.units));

  const changeSearch = (value: string) => {
    setSearch(value);
    setPage(0);
  };
  const changeCategory = (value: CategoryFilter) => {
    setCategory(value);
    setPage(0);
  };
  const changeSort = (value: SortKey) => {
    setSort(value);
    setPage(0);
  };

  const dash = (value: string) => (loading || errorMessage ? "—" : value);

  return (
    <div className="w-full min-h-[calc(100vh-3.5rem)] bg-white p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6">

      {titleSlot &&
        createPortal(
          <div className="leading-tight">
            <h1 className="text-lg font-bold text-[20px] tracking-tight text-gray-900 truncate">
              Tổng quan kho hàng
            </h1>
          </div>,
          titleSlot
        )}

      {actionsSlot &&
        createPortal(
          <div className="relative w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => changeSearch(e.target.value)}
              placeholder="Tìm theo tên hoặc thương hiệu..."
              aria-label="Tìm sản phẩm"
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 rounded-xl border-0 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-shop_light_green/30 transition"
            />
          </div>,
          actionsSlot
        )}

      <div className="relative md:hidden">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => changeSearch(e.target.value)}
          placeholder="Tìm theo tên hoặc thương hiệu..."
          aria-label="Tìm sản phẩm"
          className="w-full pl-9 pr-3 py-2.5 text-sm bg-gray-100 rounded-xl border-0 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-shop_light_green/30 transition"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Tổng sản phẩm"
          labelClass="text-black"
          value={dash(stats.totalProducts.toLocaleString("vi-VN"))}
          icon={Package}
        />
        <StatCard
          label="Giá trị tồn kho"
          value={dash(formatPrice(stats.inventoryValue))}
          icon={Wallet}
        />
        <StatCard
          label="Sắp hết hàng"
          value={dash(stats.lowStock.toLocaleString("vi-VN"))}
          icon={AlertTriangle}
        />
        <StatCard
          label="Hết hàng"
          value={dash(stats.outOfStock.toLocaleString("vi-VN"))}
          icon={XCircle}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-x-6 gap-y-4 items-start">

        <div className="min-w-0 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 xl:col-start-1 xl:row-start-1">

          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              {categoryTabs.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => changeCategory(tab.value)}
                  className={`whitespace-nowrap px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    category === tab.value
                      ? "bg-shop_dark_green text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between lg:justify-start gap-2">
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                  Sắp xếp:
                </span>
                <select
                  value={sort}
                  onChange={(e) => changeSort(e.target.value as SortKey)}
                  aria-label="Sắp xếp sản phẩm"
                  className="appearance-none pl-[4.25rem] pr-8 py-1.5 text-xs bg-white rounded-lg border border-gray-200/80 text-gray-700 focus:outline-none focus:border-shop_light_green cursor-pointer"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              </div>
              <Link
                href="/admin/products"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-shop_dark_green text-white shadow-sm hover:opacity-90 transition-opacity"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm sản phẩm
              </Link>
            </div>
        </div>

        <section className="min-w-0 xl:col-start-1 xl:row-start-2">
          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-200/80">
              <p className="py-24 text-center text-sm text-gray-400">
                Đang tải...
              </p>
            </div>
          ) : errorMessage ? (
            <div className="bg-white rounded-2xl border border-gray-200/80 flex flex-col items-center text-center gap-3 py-24">
              <PackageSearch className="w-12 h-12 text-gray-300" />
              <p className="text-sm text-gray-500">{errorMessage}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200/80 flex flex-col items-center text-center gap-3 py-24">
              <PackageSearch className="w-12 h-12 text-gray-300" />
              <p className="text-sm text-gray-500">
                {products.length === 0
                  ? "Chưa có sản phẩm nào."
                  : "Không tìm thấy sản phẩm nào."}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
                {paged.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              <div className="flex items-center justify-between gap-4 mt-6 text-sm">
                <p className="text-gray-500">{filtered.length} sản phẩm</p>
                {totalPages > 1 && (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setPage(Math.max(0, currentPage - 1))}
                      disabled={currentPage === 0}
                      className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-shop_dark_green/40 disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="Trang trước"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-gray-500">
                      Trang {currentPage + 1} / {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setPage(Math.min(totalPages - 1, currentPage + 1))
                      }
                      disabled={currentPage >= totalPages - 1}
                      className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-shop_dark_green/40 disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="Trang sau"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </section>

        <h2 className="text-base font-semibold text-gray-900 xl:col-start-2 xl:row-start-1 xl:self-center">
          Tổng quan tồn kho
        </h2>

        <aside className="flex flex-col gap-4 xl:col-start-2 xl:row-start-2 xl:sticky xl:top-20">
          <section className="bg-white rounded-2xl border border-gray-200/40 p-5">
            <p className="text-xs text-gray-500">Tỷ lệ còn hàng</p>
            <div className="flex items-baseline gap-2 mt-1 mb-4">
              <p className="text-2xl font-bold tracking-tight text-gray-900">
                {loading || errorMessage || distribution.total === 0
                  ? "—"
                  : `${distribution.healthyPercent}%`}
              </p>
              {!loading && !errorMessage && distribution.total > 0 && (
                <span
                  className={`text-xs font-medium ${
                    distribution.healthyPercent >= 70
                      ? "text-shop_light_green"
                      : "text-amber-600"
                  }`}
                >
                  {distribution.healthyPercent >= 70 ? "Ổn định" : "Cần chú ý"}
                </span>
              )}
            </div>

            <div className="flex h-2 w-full rounded-full overflow-hidden bg-gray-100">
              {distribution.rows.map((row) => (
                <div
                  key={row.key}
                  className={STATUS_CONFIG[row.key].dotClass}
                  style={{ width: `${row.pct}%` }}
                />
              ))}
            </div>

            <ul className="mt-4 flex flex-col gap-2.5">
              {distribution.rows.map((row) => (
                <li
                  key={row.key}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="inline-flex items-center gap-2 text-gray-500">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        STATUS_CONFIG[row.key].dotClass
                      }`}
                    />
                    {STATUS_CONFIG[row.key].label}
                  </span>
                  <span className="font-semibold text-gray-800">
                    {loading || errorMessage
                      ? "—"
                      : row.count.toLocaleString("vi-VN")}
                  </span>
                </li>
              ))}
            </ul>

            {stockByCategory.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-3">
                  Tồn kho theo danh mục
                </p>
                <ul className="flex flex-col gap-2.5">
                  {stockByCategory.map((c) => (
                    <li key={c.name}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-600 truncate pr-2">
                          {c.name}
                        </span>
                        <span className="font-semibold text-gray-800 shrink-0">
                          {c.units.toLocaleString("vi-VN")}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-shop_light_green"
                          style={{
                            width: `${(c.units / maxCategoryUnits) * 100}%`,
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="bg-white rounded-2xl border border-gray-200/40 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2 px-1">
              Cần chú ý
            </h3>
            <div className="flex flex-col">
              {loading ? (
                <p className="py-6 text-center text-sm text-gray-400">
                  Đang tải...
                </p>
              ) : needAttention.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500">
                  Tồn kho ổn định.
                </p>
              ) : (
                needAttention.map((p) => {
                  const cfg = STATUS_CONFIG[getStatus(p.stock)];
                  const image = p.images?.[0];
                  return (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-[#e9eee8] overflow-hidden flex items-center justify-center shrink-0">
                        {image ? (

                          <img
                            src={image}
                            alt={p.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageOff className="w-5 h-5 text-gray-300" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-xs font-semibold text-gray-900 truncate"
                          title={p.name}
                        >
                          {p.name}
                        </p>
                        <p
                          className={`text-[11px] font-medium mt-0.5 ${cfg.className}`}
                        >
                          {cfg.label}
                        </p>
                      </div>
                      <p className="text-[11px] text-gray-500 shrink-0">
                        {p.stock} sp
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <Link
            href="/admin/products"
            className="w-full inline-flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl bg-shop_dark_green text-white shadow-sm hover:opacity-90 transition-opacity"
          >
            Xem tồn kho
            <ArrowRight className="w-4 h-4" />
          </Link>
        </aside>
      </div>
    </div>
  );
};

export default AdminInventory;