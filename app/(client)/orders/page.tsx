"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PackageSearch, ShoppingBag } from "lucide-react";
import {
  getOrders,
  OrderAuthRequiredError,
  type OrderListItem,
  type OrderStatus,
} from "../../../lib/orders-api";

// Lấy 1 lần với size lớn rồi lọc theo tab ở client, thay vì gọi lại API
// mỗi khi đổi tab — vì GET /orders (khách hàng) không có tài liệu hỗ trợ
// query param `status` như /admin/orders. Nếu sau này backend hỗ trợ lọc
// server-side cho /orders, có thể đổi lại thành gọi getOrders kèm status.
const FETCH_SIZE = 100;

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
  { key: "PROCESSING", label: "Đang xử lý" },
  { key: "SHIPPING", label: "Đang giao" },
  { key: "DELIVERED", label: "Đã giao" },
  { key: "CANCELLED", label: "Đã hủy" },
];

const OrdersHistoryPage = () => {
  const router = useRouter();
  const [allItems, setAllItems] = useState<OrderListItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("ALL");
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

  // Đếm số đơn theo từng trạng thái để hiển thị badge số lượng trên tab.
  const countByStatus = useMemo(() => {
    const counts: Partial<Record<TabKey, number>> = { ALL: allItems.length };
    for (const order of allItems) {
      counts[order.status] = (counts[order.status] ?? 0) + 1;
    }
    return counts;
  }, [allItems]);

  const visibleItems = useMemo(
    () =>
      activeTab === "ALL"
        ? allItems
        : allItems.filter((order) => order.status === activeTab),
    [allItems, activeTab]
  );

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-gray-400 text-sm">
        Đang tải lịch sử đơn hàng...
      </div>
    );
  }

  if (errorMessage && allItems.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 flex flex-col items-center text-center gap-4">
        <PackageSearch className="w-14 h-14 text-gray-300" />
        <p className="text-gray-500 text-sm">{errorMessage}</p>
      </div>
    );
  }

  if (allItems.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 flex flex-col items-center text-center gap-4">
        <ShoppingBag className="w-14 h-14 text-gray-300" />
        <h1 className="text-xl font-bold text-shop_dark_green">
          Bạn chưa có đơn hàng nào
        </h1>
        <Link
          href="/"
          className="mt-2 bg-shop_dark_green/90 rounded-2xl px-6 py-3 text-white text-sm hover:bg-shop_dark_green transition-colors duration-300"
        >
          Tiếp tục mua sắm
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-shop_dark_green mb-4">
        Đơn hàng của tôi
      </h1>

      {/* Tabs lọc theo trạng thái */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        {TABS.map((tab) => {
          const count = countByStatus[tab.key] ?? 0;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`shrink-0 text-sm px-4 py-2 rounded-full border transition-colors ${
                isActive
                  ? "bg-shop_dark_green text-white border-shop_dark_green"
                  : "border-gray-300 text-gray-600 hover:border-shop_dark_green/40"
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={`ml-1.5 text-xs ${
                    isActive ? "text-white/80" : "text-gray-400"
                  }`}
                >
                  ({count})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {visibleItems.length === 0 ? (
        <div className="flex flex-col items-center text-center gap-3 py-16">
          <PackageSearch className="w-12 h-12 text-gray-300" />
          <p className="text-gray-500 text-sm">
            Không có đơn hàng nào ở trạng thái này.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visibleItems.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="flex items-center justify-between border border-gray-200 rounded-lg p-4 hover:border-shop_dark_green/40 transition-colors"
            >
              <div>
                <p className="text-sm font-semibold text-shop_dark_green">
                  Đơn #{order.id.slice(0, 8)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formatDateTime(order.createdAt)} · {order.totalItems} sản
                  phẩm
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-shop_dark_green">
                  {formatPrice(order.totalAmount)}
                </p>
                <span
                  className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                    order.status === "CANCELLED"
                      ? "bg-red-50 text-red-500"
                      : order.status === "DELIVERED"
                      ? "bg-green-50 text-green-600"
                      : "bg-shop_dark_green/10 text-shop_dark_green"
                  }`}
                >
                  {STATUS_LABEL[order.status] ?? order.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrdersHistoryPage;