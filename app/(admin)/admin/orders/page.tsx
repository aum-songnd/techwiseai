"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PackageSearch } from "lucide-react";
import {
  getAdminOrders,
  OrderAuthRequiredError,
  type AdminOrderListItem,
} from "../../../../lib/admin-orders-api";
import type { OrderStatus } from "../../../../lib/orders-api";

const PAGE_SIZE = 10;

const formatPrice = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    value
  );

const formatDateTime = (iso: string) => {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  PROCESSING: "Đang xử lý",
  SHIPPING: "Đang giao hàng",
  DELIVERED: "Đã giao hàng",
  CANCELLED: "Đã hủy",
};

type TabKey = "ALL" | OrderStatus;

const TABS: { key: TabKey; label: string }[] = [
  { key: "ALL", label: "Tất cả" },
  { key: "PENDING", label: "Chờ xác nhận" },
  { key: "CONFIRMED", label: "Đã xác nhận" },
  { key: "PROCESSING", label: "Đang xử lý" },
  { key: "SHIPPING", label: "Đang giao" },
  { key: "DELIVERED", label: "Đã giao" },
  { key: "CANCELLED", label: "Đã hủy" },
];

const AdminOrdersPage = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("ALL");
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<AdminOrderListItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const result = await getAdminOrders({
          page,
          size: PAGE_SIZE,
          status: activeTab === "ALL" ? undefined : activeTab,
        });
        if (ignore) return;

        // Chấp nhận cả DTO { items } lẫn Page mặc định của Spring { content }.
        const raw = result as unknown as Record<string, unknown>;
        const list = (
          Array.isArray(raw.items)
            ? raw.items
            : Array.isArray(raw.content)
            ? raw.content
            : []
        ) as AdminOrderListItem[];

        setItems(list);
        setTotalPages((raw.totalPages as number) ?? 1);
        setTotalElements((raw.totalElements as number) ?? list.length);
      } catch (err) {
        if (err instanceof OrderAuthRequiredError) {
          router.push("/sign-in");
          return;
        }
        if (!ignore) {
          const message =
            err instanceof Error
              ? err.message
              : "Không tải được danh sách đơn hàng.";
          setErrorMessage(
            message.includes("(403)")
              ? "Tài khoản của bạn không có quyền quản trị (ROLE_ADMIN)."
              : message
          );
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };

    load();
    return () => {
      ignore = true;
    };
  }, [activeTab, page, router]);

  const changeTab = (key: TabKey) => {
    setActiveTab(key);
    setPage(0);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-end justify-between mb-4">
        <h1 className="text-2xl font-bold text-shop_dark_green">
          Quản lý đơn hàng
        </h1>
        {!isLoading && !errorMessage && (
          <p className="text-sm text-gray-500">{totalElements} đơn</p>
        )}
      </div>

      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => changeTab(tab.key)}
              className={`shrink-0 text-sm px-4 py-2 rounded-full border transition-colors ${
                isActive
                  ? "bg-shop_dark_green text-white border-shop_dark_green"
                  : "border-gray-300 text-gray-600 hover:border-shop_dark_green/40"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-gray-400 text-sm">
          Đang tải danh sách đơn hàng...
        </div>
      ) : errorMessage ? (
        <div className="flex flex-col items-center text-center gap-3 py-16">
          <PackageSearch className="w-12 h-12 text-gray-300" />
          <p className="text-gray-500 text-sm">{errorMessage}</p>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center text-center gap-3 py-16">
          <PackageSearch className="w-12 h-12 text-gray-300" />
          <p className="text-gray-500 text-sm">
            Không có đơn hàng nào ở trạng thái này.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {items.map((order) => (
              <Link
                key={order.id}
                href={`/admin/orders/${order.id}`}
                className="flex items-center justify-between gap-4 border border-gray-200 rounded-lg p-4 hover:border-shop_dark_green/40 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-shop_dark_green">
                    Đơn #{order.id.slice(0, 8)}
                    {order.customerName ? ` · ${order.customerName}` : ""}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatDateTime(order.createdAt)} · {order.totalItems} sản
                    phẩm · {order.paymentMethod}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-shop_dark_green">
                    {formatPrice(order.totalAmount)}
                  </p>
                  <span
                    className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                      order.status === "CANCELLED"
                        ? "bg-red-50 text-red-500"
                        : order.status === "DELIVERED"
                        ? "bg-green-50 text-green-600"
                        : order.status === "PENDING"
                        ? "bg-amber-50 text-amber-600"
                        : "bg-shop_dark_green/10 text-shop_dark_green"
                    }`}
                  >
                    {STATUS_LABEL[order.status] ?? order.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6 text-sm">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:border-shop_dark_green/40 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Trang trước
              </button>
              <span className="text-gray-500">
                Trang {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:border-shop_dark_green/40 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Trang sau
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminOrdersPage;