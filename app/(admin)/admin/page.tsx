"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronRight,
  Package,
  Plus,
  Wallet,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { fetchAllAdminProducts } from "@/lib/admin-products";
import ProductImage from "@/components/admin/ProductImage";
import type { Product } from "@/app/data/types";

const LOW_STOCK_THRESHOLD = 5;

const formatPrice = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    value
  );

type StockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
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
  <div className="flex min-w-0 items-center gap-3.5 rounded-xl border border-gray-200/70 bg-white px-4 py-4 sm:px-5">
    <div
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBgClass} ${iconClass}`}
    >
      <Icon className="w-5 h-5" strokeWidth={1.75} />
    </div>
    <div className="min-w-0">
      <p className={`text-xs ${labelClass}`}>{label}</p>
      <p
        className="truncate text-xl font-semibold leading-tight text-gray-900 sm:text-2xl"
        title={value}
      >
        {value}
      </p>
    </div>
  </div>
);

const AdminInventory = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [titleSlot, setTitleSlot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setTitleSlot(document.getElementById("admin-header-title"));
  }, []);

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const productList = await fetchAllAdminProducts();
        if (ignore) return;
        setProducts(productList ?? []);
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

  const dash = (value: string) => (loading || errorMessage ? "—" : value);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#f4f8fb] p-4 sm:p-6 lg:p-8">
      {titleSlot &&
        createPortal(
          <div className="leading-tight">
            <h1 className="truncate text-lg font-bold tracking-tight text-gray-900">
              Tổng quan kho hàng
            </h1>
          </div>,
          titleSlot
        )}

      <div className="mx-auto max-w-[1440px] space-y-5">
        <section className="relative isolate min-h-[205px] overflow-hidden rounded-xl bg-[#328fe0] px-6 py-7 text-white sm:px-9 sm:py-8">
          <div className="relative z-10 max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-100">
              Bảng điều khiển kho hàng
            </p>
            <h2 className="mt-3 text-2xl font-semibold leading-tight sm:text-3xl">
              Chào mừng trở lại
            </h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-blue-50">
              Theo dõi tồn kho, giá trị hàng hóa và những sản phẩm cần được bổ sung.
            </p>
            <Link
              href="/admin/products"
              className="mt-5 inline-flex items-center gap-2 rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-[#176cb5] transition hover:bg-blue-50"
            >
              <Plus className="h-4 w-4" />
              Thêm sản phẩm
            </Link>
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[42%] md:block">
            <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-[#328fe0] to-transparent" />
            <img
              src="/laptop.webp"
              alt=""
              className="absolute right-8 top-1/2 h-[170px] w-[250px] -translate-y-1/2 object-contain"
            />
            <div className="absolute bottom-5 right-8 rounded-lg bg-white/15 px-3 py-2 text-xs font-medium text-white backdrop-blur-sm">
              {loading || errorMessage
                ? "Đang đồng bộ dữ liệu"
                : `${stats.totalProducts.toLocaleString("vi-VN")} sản phẩm đang quản lý`}
            </div>
          </div>
        </section>

        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Tổng sản phẩm"
            value={dash(stats.totalProducts.toLocaleString("vi-VN"))}
            icon={Package}
            iconClass="text-sky-700"
            iconBgClass="bg-sky-50"
          />
          <StatCard
            label="Giá trị tồn kho"
            value={dash(formatPrice(stats.inventoryValue))}
            icon={Wallet}
            iconClass="text-emerald-700"
            iconBgClass="bg-emerald-50"
          />
          <StatCard
            label="Sắp hết hàng"
            value={dash(stats.lowStock.toLocaleString("vi-VN"))}
            icon={AlertTriangle}
            iconClass="text-amber-700"
            iconBgClass="bg-amber-50"
          />
          <StatCard
            label="Hết hàng"
            value={dash(stats.outOfStock.toLocaleString("vi-VN"))}
            icon={XCircle}
            iconClass="text-rose-700"
            iconBgClass="bg-rose-50"
          />
        </section>

        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.85fr)]">
          <section className="rounded-xl border border-gray-200/80 bg-white p-5 sm:p-6">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Tình trạng tồn kho
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                  Phân bổ sản phẩm theo mức tồn hiện tại
                </p>
              </div>
              <Link
                href="/admin/products"
                className="inline-flex items-center gap-1 text-xs font-medium text-[#287ec3] hover:text-[#145f9c]"
              >
                Xem sản phẩm <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 items-center gap-6 sm:grid-cols-[minmax(150px,0.7fr)_minmax(0,1.3fr)]">
              <div className="flex justify-center">
                <div
                  className="relative flex h-36 w-36 items-center justify-center rounded-full"
                  style={{
                    background: `conic-gradient(#328fe0 0% ${distribution.rows[0].pct}%, #f3b847 ${distribution.rows[0].pct}% ${distribution.rows[0].pct + distribution.rows[1].pct}%, #e56b70 ${distribution.rows[0].pct + distribution.rows[1].pct}% 100%)`,
                  }}
                >
                  <div className="flex h-[92px] w-[92px] flex-col items-center justify-center rounded-full bg-white">
                    <span className="text-2xl font-semibold text-gray-900">
                      {loading || errorMessage || distribution.total === 0
                        ? "—"
                        : `${distribution.healthyPercent}%`}
                    </span>
                    <span className="mt-0.5 text-[11px] text-gray-500">
                      còn hàng
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {distribution.rows.map((row) => {
                  const status = STATUS_CONFIG[row.key];
                  return (
                    <div key={row.key}>
                      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                        <span className="inline-flex items-center gap-2 text-gray-600">
                          <span className={`h-2.5 w-2.5 rounded-full ${status.dotClass}`} />
                          {status.label}
                        </span>
                        <span className="font-semibold text-gray-900">
                          {loading || errorMessage
                            ? "—"
                            : `${row.count.toLocaleString("vi-VN")} · ${Math.round(row.pct)}%`}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={`h-full rounded-full ${status.dotClass}`}
                          style={{ width: `${row.pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 border-t border-gray-100 pt-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">
                  Tồn kho theo danh mục
                </h3>
                <span className="text-[11px] text-gray-400">Đơn vị: sản phẩm</span>
              </div>
              {loading ? (
                <p className="py-6 text-center text-sm text-gray-400">Đang tải...</p>
              ) : stockByCategory.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500">
                  Chưa có dữ liệu tồn kho theo danh mục.
                </p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {stockByCategory.map((item, index) => (
                    <div key={item.name} className="grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-3 py-3">
                      <span className="text-xs font-medium text-gray-400">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0">
                        <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                          <span className="truncate font-medium text-gray-700">{item.name}</span>
                          <span className="shrink-0 text-gray-500">{item.units.toLocaleString("vi-VN")}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className={`h-full rounded-full ${index === 0 ? "bg-[#328fe0]" : index === 1 ? "bg-[#42b8ba]" : index === 2 ? "bg-[#f3b847]" : "bg-[#8295d1]"}`}
                            style={{ width: `${(item.units / maxCategoryUnits) * 100}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-[11px] text-gray-400">sp</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <aside className="overflow-hidden rounded-xl border border-gray-200/80 bg-white">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">
                  Cần chú ý
                </h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  Sản phẩm sắp hết hoặc đã hết hàng
                </p>
              </div>
              {needAttention.length > 0 && (
                <span className="rounded-full bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700">
                  {needAttention.length}
                </span>
              )}
            </div>

            <div className="divide-y divide-gray-100 px-4">
              {loading ? (
                <p className="py-12 text-center text-sm text-gray-400">Đang tải...</p>
              ) : errorMessage ? (
                <p className="py-12 text-center text-sm text-gray-500">
                  Không tải được danh sách cảnh báo.
                </p>
              ) : needAttention.length === 0 ? (
                <div className="py-12 text-center">
                  <Check className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
                  <p className="text-sm font-medium text-gray-700">Tồn kho ổn định</p>
                  <p className="mt-1 text-xs text-gray-500">Không có sản phẩm cần bổ sung.</p>
                </div>
              ) : (
                needAttention.map((product) => {
                  const status = STATUS_CONFIG[getStatus(product.stock)];
                  return (
                    <div key={product.id} className="flex items-center gap-3 py-3">
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-gray-50">
                        <ProductImage
                          src={product.images?.[0]}
                          alt={product.name}
                          className="h-full w-full"
                          fallbackIconClassName="h-5 w-5"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-gray-900" title={product.name}>
                          {product.name}
                        </p>
                        <p className={`mt-1 text-[11px] font-medium ${status.className}`}>
                          {status.label}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-semibold text-gray-700">
                        {product.stock} sp
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <Link
              href="/admin/products"
              className="flex items-center justify-between border-t border-gray-100 px-5 py-3.5 text-sm font-medium text-[#287ec3] transition hover:bg-blue-50/60"
            >
              Mở quản lý sản phẩm
              <ArrowRight className="h-4 w-4" />
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default AdminInventory;