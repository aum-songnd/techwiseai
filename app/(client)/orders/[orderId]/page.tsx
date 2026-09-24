"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PackageSearch } from "lucide-react";
import {
  cancelOrder,
  getOrderById,
  OrderAuthRequiredError,
  type OrderData,
  type OrderStatus,
} from "../../../../lib/orders-api";

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

// Nhãn hiển thị cho từng trạng thái, theo đúng luồng đã kiểm thử:
// PENDING → CONFIRMED → PROCESSING → SHIPPING → DELIVERED, CANCELLED.
const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  PROCESSING: "Đang xử lý",
  SHIPPING: "Đang giao hàng",
  DELIVERED: "Đã giao hàng",
  CANCELLED: "Đã hủy",
};

// Chỉ cho phép khách tự hủy khi đơn còn ở giai đoạn sớm. Cần đối chiếu
// lại với luồng thật của backend (mục 8.1 đặc tả) nếu PROCESSING trở đi
// vẫn còn cho phép hủy.
const CANCELLABLE_STATUSES: OrderStatus[] = ["PENDING", "CONFIRMED"];

const OrderDetailPage = () => {
  const params = useParams<{ orderId: string }>();
  const router = useRouter();
  const orderId = params?.orderId;

  const [order, setOrder] = useState<OrderData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    if (!orderId) return;

    let ignore = false;

    const load = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const data = await getOrderById(orderId);
        if (!ignore) setOrder(data);
      } catch (err) {
        if (err instanceof OrderAuthRequiredError) {
          router.push("/sign-in");
          return;
        }
        if (!ignore) {
          setErrorMessage(
            err instanceof Error
              ? err.message
              : "Không tải được thông tin đơn hàng."
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
  }, [orderId, router]);

  const handleCancel = async () => {
    if (!orderId) return;
    setIsCancelling(true);
    try {
      const updated = await cancelOrder(orderId);
      setOrder(updated);
      setIsConfirmOpen(false);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Hủy đơn hàng thất bại."
      );
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-gray-400 text-sm">
        Đang tải thông tin đơn hàng...
      </div>
    );
  }

  if (errorMessage && !order) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 flex flex-col items-center text-center gap-4">
        <PackageSearch className="w-14 h-14 text-gray-300" />
        <h1 className="text-xl font-bold text-shop_dark_green">
          Không tìm thấy đơn hàng
        </h1>
        <p className="text-gray-500 text-sm">{errorMessage}</p>
        <Link
          href="/orders"
          className="mt-2 bg-shop_dark_green/90 rounded-2xl px-6 py-3 text-white text-sm hover:bg-shop_dark_green transition-colors duration-300"
        >
          Xem lịch sử đơn hàng
        </Link>
      </div>
    );
  }

  if (!order) return null;

  const canCancel = CANCELLABLE_STATUSES.includes(order.status);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-shop_dark_green">
            Đơn hàng #{order.id.slice(0, 8)}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Đặt lúc {formatDateTime(order.createdAt)}
          </p>
        </div>
        <span
          className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
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

      {errorMessage && (
        <p className="text-sm text-red-500 mb-4">{errorMessage}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 flex flex-col gap-6">
          {/* Sản phẩm trong đơn */}
          <div className="border border-gray-200 rounded-lg p-5">
            <h2 className="font-bold text-shop_dark_green mb-4">Sản phẩm</h2>
            <div className="flex flex-col divide-y divide-gray-100">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-shop_dark_green line-clamp-1">
                      {item.productName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatPrice(item.unitPrice)} x {item.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-shop_dark_green shrink-0">
                    {formatPrice(item.subtotal)}
                  </p>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-200 mt-4 pt-4 flex items-center justify-between">
              <span className="font-bold text-shop_dark_green">Tổng cộng</span>
              <span className="font-bold text-lg text-shop_dark_green">
                {formatPrice(order.totalAmount)}
              </span>
            </div>
          </div>

          {/* Lịch sử trạng thái */}
          {order.statusHistory && order.statusHistory.length > 0 && (
            <div className="border border-gray-200 rounded-lg p-5">
              <h2 className="font-bold text-shop_dark_green mb-4">
                Lịch sử trạng thái
              </h2>
              <div className="flex flex-col gap-3">
                {order.statusHistory.map((entry, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-shop_dark_green mt-1.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-shop_dark_green">
                        {STATUS_LABEL[entry.status] ?? entry.status}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDateTime(entry.changedAt)}
                        {entry.note ? ` — ${entry.note}` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Thông tin nhận hàng */}
        <div className="md:col-span-1">
          <div className="border border-gray-200 rounded-lg p-5 sticky top-24">
            <h2 className="font-bold text-shop_dark_green mb-4">
              Thông tin nhận hàng
            </h2>
            <div className="flex flex-col gap-2 text-sm">
              <p>
                <span className="text-gray-500">Người nhận: </span>
                {order.recipientName}
              </p>
              <p>
                <span className="text-gray-500">Điện thoại: </span>
                {order.recipientPhone}
              </p>
              <p>
                <span className="text-gray-500">Địa chỉ: </span>
                {order.shippingAddress}
              </p>
              <p>
                <span className="text-gray-500">Thanh toán: </span>
                {order.paymentMethod}
              </p>
              {order.note && (
                <p>
                  <span className="text-gray-500">Ghi chú: </span>
                  {order.note}
                </p>
              )}
            </div>

            {canCancel && (
              <button
                onClick={() => setIsConfirmOpen(true)}
                className="mt-5 w-full text-center border border-red-200 text-red-500 rounded-2xl px-6 py-3 text-sm hover:bg-red-50 transition-colors duration-300"
              >
                Hủy đơn hàng
              </button>
            )}

            <Link
              href="/orders"
              className="block text-center text-sm text-gray-500 hover:text-shop_dark_green mt-4"
            >
              Xem tất cả đơn hàng
            </Link>
          </div>
        </div>
      </div>

      {isConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => !isCancelling && setIsConfirmOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-shop_dark_green mb-2">
              Hủy đơn hàng này?
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Đơn hàng sẽ được hủy và tồn kho sẽ được hoàn lại. Hành động này
              không thể hoàn tác.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setIsConfirmOpen(false)}
                disabled={isCancelling}
                className="px-4 py-2 text-sm rounded-xl text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                Đóng
              </button>
              <button
                onClick={handleCancel}
                disabled={isCancelling}
                className="px-4 py-2 text-sm rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {isCancelling ? "Đang hủy..." : "Hủy đơn hàng"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetailPage;