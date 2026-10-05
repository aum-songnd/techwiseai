"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Package,
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

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <section className="bg-white rounded-2xl border border-gray-200/40 p-5">
            <h2 className="mb-4 text-base font-semibold text-gray-900">
              Tổng quan tồn kho
            </h2>
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

          <aside className="flex flex-col gap-4">
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
                        <ProductImage
                          src={image}
                          alt={p.name}
                          className="h-full w-full"
                          fallbackIconClassName="h-5 w-5"
                        />
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
            Quản lý sản phẩm
            <ArrowRight className="w-4 h-4" />
          </Link>
          </aside>
      </div>
    </div>
  );
};

export default AdminInventory;