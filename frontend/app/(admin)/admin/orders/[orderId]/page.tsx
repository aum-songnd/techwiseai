"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PackageSearch } from "lucide-react";
import {
  getAdminOrderById,
  updateOrderStatus,
  OrderAuthRequiredError,
  type AdminOrderDetail,
} from "../../../../../lib/admin-orders-api";
import {
  type OrderStatus,
  type PaymentStatus,
} from "../../../../../lib/orders-api";

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
  RETURNED: "Trả hàng",
};

const NEXT_STEP: Partial<
  Record<OrderStatus, { status: OrderStatus; label: string }>
> = {
  PENDING: { status: "CONFIRMED", label: "Xác nhận đơn hàng" },
  CONFIRMED: { status: "PROCESSING", label: "Bắt đầu xử lý" },
  PROCESSING: { status: "SHIPPING", label: "Bàn giao vận chuyển" },
  SHIPPING: { status: "DELIVERED", label: "Đánh dấu đã giao" },
};

const ADMIN_CANCELLABLE: OrderStatus[] = ["PENDING", "CONFIRMED", "PROCESSING"];

const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: "Chưa thanh toán",
  PAID: "Đã thanh toán",
  FAILED: "Thanh toán thất bại",
  CANCELLED: "Đã hủy thanh toán",
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  COD: "Thanh toán khi nhận hàng (COD)",
  VNPAY: "VNPay",
  MOMO: "MoMo",
};

const getMethodLabel = (method?: string | null): string => {
  if (!method) return "—";
  return PAYMENT_METHOD_LABEL[method.toUpperCase()] ?? method;
};

const AdminOrderDetailPage = () => {
  const params = useParams<{ orderId: string }>();
  const router = useRouter();
  const orderId = params?.orderId;

  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [note, setNote] = useState("");
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [cancelNote, setCancelNote] = useState("");

  useEffect(() => {
    if (!orderId) return;
    let ignore = false;

    const load = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const data = await getAdminOrderById(orderId);
        if (!ignore) setOrder(data);
      } catch (err) {
        if (err instanceof OrderAuthRequiredError) {
          router.push("/sign-in");
          return;
        }
        if (!ignore) {
          const message =
            err instanceof Error ? err.message : "Không tải được đơn hàng.";
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
  }, [orderId, router]);

  const applyStatus = async (status: OrderStatus, statusNote?: string) => {
    if (!orderId) return false;
    setIsUpdating(true);
    setActionError(null);
    try {
      const updated = await updateOrderStatus(orderId, {
        status,
        note: statusNote?.trim() || undefined,
      });
      setOrder(updated);
      return true;
    } catch (err) {
      if (err instanceof OrderAuthRequiredError) {
        router.push("/sign-in");
        return false;
      }
      setActionError(
        err instanceof Error ? err.message : "Cập nhật trạng thái thất bại."
      );
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAdvance = async () => {
    if (!order) return;
    const next = NEXT_STEP[order.status];
    if (!next) return;
    const ok = await applyStatus(next.status, note);
    if (ok) setNote("");
  };

  const handleCancel = async () => {
    const ok = await applyStatus("CANCELLED", cancelNote);
    if (ok) {
      setIsCancelOpen(false);
      setCancelNote("");
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center text-gray-400 text-sm">
        Đang tải thông tin đơn hàng...
      </div>
    );
  }

  if (errorMessage || !order) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 flex flex-col items-center text-center gap-4">
        <PackageSearch className="w-14 h-14 text-gray-300" />
        <h1 className="text-xl font-bold text-shop_dark_green">
          Không mở được đơn hàng
        </h1>
        <p className="text-gray-500 text-sm">{errorMessage}</p>
        <Link
          href="/admin/orders"
          className="mt-2 bg-shop_dark_green/90 rounded-2xl px-6 py-3 text-white text-sm hover:bg-shop_dark_green transition-colors duration-300"
        >
          Về danh sách đơn hàng
        </Link>
      </div>
    );
  }

  const next = NEXT_STEP[order.status];
  const canCancel = ADMIN_CANCELLABLE.includes(order.status);
  const isFinal =
    order.status === "DELIVERED" ||
    order.status === "CANCELLED" ||
    order.status === "RETURNED";

  const paymentMethod = order.paymentMethod;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link
        href="/admin/orders"
        className="text-sm text-gray-500 hover:text-shop_dark_green"
      >
        Quay lại danh sách
      </Link>

      <div className="flex items-center justify-between mt-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-shop_dark_green">
            Đơn hàng {order.orderCode ?? `#${order.id.slice(0, 8)}`}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Đặt lúc {formatDateTime(order.createdAt)}
            {order.customerName ? ` bởi ${order.customerName}` : ""}
          </p>
        </div>
        <span
          className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
            order.status === "CANCELLED"
              ? "bg-red-50 text-red-500"
              : order.status === "DELIVERED"
              ? "bg-green-50 text-green-600"
              : order.status === "RETURNED"
              ? "bg-orange-50 text-orange-600"
              : order.status === "PENDING"
              ? "bg-amber-50 text-amber-600"
              : "bg-shop_dark_green/10 text-shop_dark_green"
          }`}
        >
          {STATUS_LABEL[order.status] ?? order.status}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 flex flex-col gap-6">

          <div className="border border-gray-200 rounded-lg p-5">
            <h2 className="font-bold text-shop_dark_green mb-1">Xử lý đơn</h2>
            {isFinal ? (
              <p className="text-sm text-gray-500">
                Đơn hàng đã ở trạng thái cuối, không thể thay đổi thêm.
              </p>
            ) : (
              <>
                <p className="text-sm text-gray-500 mb-4">
                  {order.status === "PENDING"
                    ? "Đơn mới đang chờ bạn xác nhận."
                    : `Bước tiếp theo: ${STATUS_LABEL[next!.status]}.`}
                </p>
                <label className="block text-sm text-gray-600 mb-1">
                  Ghi chú (không bắt buộc, khách sẽ thấy trong lịch sử)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  disabled={isUpdating}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-shop_dark_green disabled:opacity-60"
                  placeholder="Ví dụ: Đã liên hệ khách xác nhận địa chỉ"
                />
                {actionError && (
                  <p className="text-sm text-red-500 mt-3">{actionError}</p>
                )}
                <div className="flex flex-wrap items-center gap-3 mt-4">
                  {next && (
                    <button
                      onClick={handleAdvance}
                      disabled={isUpdating}
                      className="bg-shop_dark_green/90 rounded-2xl px-6 py-3 text-white text-sm hover:bg-shop_dark_green transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUpdating ? "Đang cập nhật..." : next.label}
                    </button>
                  )}
                  {canCancel && (
                    <button
                      onClick={() => {
                        setActionError(null);
                        setIsCancelOpen(true);
                      }}
                      disabled={isUpdating}
                      className="border border-red-200 text-red-500 rounded-2xl px-6 py-3 text-sm hover:bg-red-50 transition-colors duration-300 disabled:opacity-50"
                    >
                      Hủy đơn
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

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
              {order.note && (
                <p>
                  <span className="text-gray-500">Ghi chú của khách: </span>
                  {order.note}
                </p>
              )}
            </div>

            <h2 className="font-bold text-shop_dark_green mt-5 mb-3">
              Thanh toán
            </h2>
            <div className="flex flex-col gap-2 text-sm">
              <p>
                <span className="text-gray-500">Phương thức: </span>
                {getMethodLabel(paymentMethod)}
              </p>
              <p>
                <span className="text-gray-500">Trạng thái: </span>
                {order.paymentStatus
                  ? PAYMENT_STATUS_LABEL[order.paymentStatus] ?? order.paymentStatus
                  : paymentMethod === "COD"
                  ? "Thu tiền khi giao hàng"
                  : "Chưa có thông tin"}
              </p>
              {order.transactionNo && (
                <p>
                  <span className="text-gray-500">Mã giao dịch: </span>
                  {order.transactionNo}
                </p>
              )}
              {order.paidAt && (
                <p>
                  <span className="text-gray-500">Thanh toán lúc: </span>
                  {formatDateTime(order.paidAt)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {isCancelOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => !isUpdating && setIsCancelOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-shop_dark_green mb-2">
              Hủy đơn hàng này?
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Đơn hàng sẽ bị hủy và khách sẽ thấy lý do bên dưới. Hành động này
              không thể hoàn tác.
            </p>
            <textarea
              value={cancelNote}
              onChange={(e) => setCancelNote(e.target.value)}
              rows={3}
              disabled={isUpdating}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-shop_dark_green"
              placeholder="Lý do hủy đơn"
            />
            {actionError && (
              <p className="text-sm text-red-500 mt-3">{actionError}</p>
            )}
            <div className="flex items-center justify-end gap-3 mt-5">
              <button
                onClick={() => setIsCancelOpen(false)}
                disabled={isUpdating}
                className="px-4 py-2 text-sm rounded-xl text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                Đóng
              </button>
              <button
                onClick={handleCancel}
                disabled={isUpdating || cancelNote.trim().length === 0}
                className="px-4 py-2 text-sm rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {isUpdating ? "Đang hủy..." : "Hủy đơn hàng"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrderDetailPage;