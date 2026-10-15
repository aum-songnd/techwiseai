"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  getOrders,
  OrderAuthRequiredError,
  type OrderListItem,
  type OrderStatus,
} from "../../../lib/orders-api";

const FETCH_SIZE = 100;

const formatPrice = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    value
  );

const formatDateTime = (iso: string) => {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
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
  RETURNED: "Đã trả hàng",
};

const STATUS_STYLE: Record<OrderStatus, string> = {
  PENDING: "bg-amber-50 text-amber-800 border-amber-200",
  CONFIRMED: "bg-blue-50 text-blue-800 border-blue-200",
  PROCESSING: "bg-indigo-50 text-indigo-800 border-indigo-200",
  SHIPPING: "bg-teal-50 text-teal-800 border-teal-200",
  DELIVERED: "bg-emerald-50 text-emerald-800 border-emerald-200",
  CANCELLED: "bg-neutral-100 text-neutral-600 border-neutral-200",
  RETURNED: "bg-purple-50 text-purple-800 border-purple-200",
};

type TabKey = "ALL" | OrderStatus;

const TABS: { key: TabKey; label: string }[] = [
  { key: "ALL", label: "Tất cả" },
  { key: "PENDING", label: "Chờ xác nhận" },
  { key: "PROCESSING", label: "Đang xử lý" },
  { key: "SHIPPING", label: "Đang giao" },
  { key: "DELIVERED", label: "Đã giao" },
  { key: "CANCELLED", label: "Đã hủy" },
];

const OrdersHistoryPage = () => {
  const router = useRouter();
  const [allItems, setAllItems] = useState<OrderListItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const result = await getOrders(0, FETCH_SIZE);
        if (!ignore) setAllItems(result.items);
      } catch (err) {
        if (err instanceof OrderAuthRequiredError) {
          router.push("/sign-in");
          return;
        }
        if (!ignore) {
          setErrorMessage(
            err instanceof Error
              ? err.message
              : "Không tải được lịch sử đơn hàng."
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
  }, [router]);

  const countByStatus = useMemo(() => {
    const counts: Partial<Record<TabKey, number>> = { ALL: allItems.length };
    for (const order of allItems) {
      counts[order.status] = (counts[order.status] ?? 0) + 1;
    }
    return counts;
  }, [allItems]);

  const visibleItems = useMemo(() => {
    return allItems.filter((order) => {
      if (activeTab !== "ALL" && order.status !== activeTab) return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const code = (order.orderCode || order.id).toLowerCase();
      const recipient = (order.recipientName || "").toLowerCase();
      return code.includes(q) || recipient.includes(q);
    });
  }, [allItems, activeTab, searchQuery]);

  if (isLoading) {
    return (
      <div className="font-sans min-h-screen bg-white">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center text-sm text-neutral-400">
          Đang tải lịch sử đơn hàng...
        </div>
      </div>
    );
  }

  if (errorMessage && allItems.length === 0) {
    return (
      <div className="font-sans min-h-screen bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-20 text-center">
          <p className="text-sm text-neutral-500">{errorMessage}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-xs font-semibold text-neutral-900 underline underline-offset-4"
          >
            Thử tải lại trang
          </button>
        </div>
      </div>
    );
  }

  if (allItems.length === 0) {
    return (
      <div className="font-sans min-h-screen bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-20 text-center">
          <Image
            src="/empty-cart.png"
            alt="Chưa có đơn hàng"
            width={437}
            height={366}
            className="h-auto w-56 select-none sm:w-72"
            priority
          />
          <h1 className="text-xl font-bold uppercase tracking-tight text-neutral-900">
            Bạn chưa có đơn hàng nào
          </h1>
          <p className="text-sm text-neutral-500">
            Khám phá các sản phẩm và đặt đơn hàng đầu tiên của bạn.
          </p>
          <Link
            href="/"
            className="mt-2 bg-neutral-900 px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
          >
            Tiếp tục mua sắm
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="font-sans min-h-screen bg-white text-neutral-900">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-neutral-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-3">
            <h1 className="text-xl font-bold uppercase tracking-tight text-neutral-900">
              Đơn hàng của tôi
            </h1>
            <span className="pb-0.5 text-xs text-neutral-500">
              [ {allItems.length} đơn hàng ]
            </span>
          </div>

          <div className="w-full sm:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo mã đơn hoặc người nhận..."
              className="w-full border border-neutral-300 px-3 py-2 text-xs text-neutral-900 placeholder-neutral-400 transition-colors focus:border-neutral-900 focus:outline-none"
            />
          </div>
        </div>

        {/* Status Tabs */}
        <div className="mt-6 flex items-center gap-6 overflow-x-auto border-b border-neutral-200 text-xs">
          {TABS.map((tab) => {
            const count = countByStatus[tab.key] ?? 0;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`whitespace-nowrap border-b-2 pb-3 font-semibold uppercase tracking-wider transition-colors ${
                  isActive
                    ? "border-neutral-900 text-neutral-900"
                    : "border-transparent text-neutral-400 hover:text-neutral-700"
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span className="ml-1 text-[11px] text-neutral-400">
                    ({count})
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Empty Search Result */}
        {visibleItems.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-sm text-neutral-500">
              Không tìm thấy đơn hàng phù hợp.
            </p>
            {(activeTab !== "ALL" || searchQuery) && (
              <button
                onClick={() => {
                  setActiveTab("ALL");
                  setSearchQuery("");
                }}
                className="mt-2 text-xs font-semibold text-neutral-900 underline underline-offset-4"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        )}

        {/* Desktop Table View */}
        {visibleItems.length > 0 && (
          <div className="mt-4 hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  <th className="py-3 pr-4">Mã đơn hàng</th>
                  <th className="py-3 pr-4">Ngày đặt</th>
                  <th className="py-3 pr-4">Người nhận</th>
                  <th className="py-3 pr-4">Số lượng</th>
                  <th className="py-3 pr-4">Tổng tiền</th>
                  <th className="py-3 pr-4">Trạng thái</th>
                  <th className="py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-sm">
                {visibleItems.map((order) => {
                  const displayCode =
                    order.orderCode ||
                    `ORD-${order.id.slice(0, 8).toUpperCase()}`;
                  const badgeStyle =
                    STATUS_STYLE[order.status] ?? STATUS_STYLE.PENDING;

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-neutral-50/70 transition-colors"
                    >
                      <td className="py-4 pr-4">
                        <span className="font-mono text-xs font-semibold text-neutral-900">
                          {displayCode}
                        </span>
                      </td>

                      <td className="py-4 pr-4 text-xs text-neutral-500">
                        {formatDateTime(order.createdAt)}
                      </td>

                      <td className="py-4 pr-4 text-xs text-neutral-700">
                        {order.recipientName || "—"}
                      </td>

                      <td className="py-4 pr-4 text-xs text-neutral-600">
                        {order.totalQuantity ?? order.totalItems} sản phẩm
                      </td>

                      <td className="py-4 pr-4 font-semibold text-neutral-900">
                        {formatPrice(order.totalAmount)}
                      </td>

                      <td className="py-4 pr-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 text-xs font-medium border rounded ${badgeStyle}`}
                        >
                          {STATUS_LABEL[order.status] ?? order.status}
                        </span>
                      </td>

                      <td className="py-4 text-right">
                        <Link
                          href={`/orders/${order.id}`}
                          className="text-xs font-semibold text-neutral-900 hover:underline underline-offset-4"
                        >
                          Chi tiết &rarr;
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Mobile List View */}
        {visibleItems.length > 0 && (
          <div className="mt-4 divide-y divide-neutral-200 border-t border-neutral-200 md:hidden">
            {visibleItems.map((order) => {
              const displayCode =
                order.orderCode || `ORD-${order.id.slice(0, 8).toUpperCase()}`;
              const badgeStyle =
                STATUS_STYLE[order.status] ?? STATUS_STYLE.PENDING;

              return (
                <div key={order.id} className="py-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-neutral-900">
                      {displayCode}
                    </span>
                    <span
                      className={`inline-block px-2 py-0.5 text-[11px] font-medium border rounded ${badgeStyle}`}
                    >
                      {STATUS_LABEL[order.status] ?? order.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <span>{formatDateTime(order.createdAt)}</span>
                    <span>
                      {order.totalQuantity ?? order.totalItems} sản phẩm
                    </span>
                  </div>

                  {order.recipientName && (
                    <p className="text-xs text-neutral-600">
                      Người nhận:{" "}
                      <strong className="text-neutral-900">
                        {order.recipientName}
                      </strong>
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-sm font-bold text-neutral-900">
                      {formatPrice(order.totalAmount)}
                    </span>
                    <Link
                      href={`/orders/${order.id}`}
                      className="text-xs font-semibold text-neutral-900 underline underline-offset-4"
                    >
                      Xem chi tiết &rarr;
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersHistoryPage;