"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PackageSearch, ShoppingBag } from "lucide-react";
import {
  getOrders,
  OrderAuthRequiredError,
  type OrderListItem,
  type OrderStatus,
  type PagedOrders,
} from "../../../lib/orders-api";

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

const OrdersHistoryPage = () => {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const [data, setData] = useState<PagedOrders | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const result = await getOrders(page, PAGE_SIZE);
        if (!ignore) setData(result);
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
  }, [page, router]);

  if (isLoading && !data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-gray-400 text-sm">
        Đang tải lịch sử đơn hàng...
      </div>
    );
  }

  if (errorMessage && !data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 flex flex-col items-center text-center gap-4">
        <PackageSearch className="w-14 h-14 text-gray-300" />
        <p className="text-gray-500 text-sm">{errorMessage}</p>
      </div>
    );
  }

  const items: OrderListItem[] = data?.items ?? [];

  if (items.length === 0) {
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
      <h1 className="text-2xl font-bold text-shop_dark_green mb-6">
        Đơn hàng của tôi
      </h1>

      <div className="flex flex-col gap-3">
        {items.map((order) => (
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
                {formatDateTime(order.createdAt)} · {order.totalItems} sản phẩm
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

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-4 py-2 text-sm rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Trước
          </button>
          <span className="text-sm text-gray-500">
            Trang {page + 1} / {data.totalPages}
          </span>
          <button
            onClick={() =>
              setPage((p) => Math.min((data.totalPages ?? 1) - 1, p + 1))
            }
            disabled={page + 1 >= data.totalPages}
            className="px-4 py-2 text-sm rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Sau
          </button>
        </div>
      )}
    </div>
  );
};

export default OrdersHistoryPage;