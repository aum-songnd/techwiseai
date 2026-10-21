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
import Loading from "@/app/(client)/loading";

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

const getNextStep = (
  orderStatus: OrderStatus,
  paymentMethod?: string | null
): { status: OrderStatus; label: string } | undefined => {
  const isVnpay =
    paymentMethod === "VNPAY" ||
    paymentMethod?.toUpperCase().includes("VNPAY");
  if (orderStatus === "PENDING" && isVnpay) {
    return { status: "PROCESSING", label: "Bắt đầu chuẩn bị hàng" };
  }
  return NEXT_STEP[orderStatus];
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
    const next = getNextStep(order.status, order.paymentMethod);
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
    return <Loading message="Đang tải chi tiết đơn hàng..." />;
  }

  if (errorMessage || !order) {
    return (
      <div className="font-sans min-h-[calc(100vh-4rem)] bg-neutral-50 p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <div className="max-w-md w-full border border-neutral-200 bg-white p-8 text-center flex flex-col items-center gap-4">
          <PackageSearch className="w-12 h-12 text-neutral-300" />
          <h1 className="text-xl font-bold uppercase tracking-tight text-neutral-900">
            Không mở được đơn hàng
          </h1>
          <p className="text-neutral-500 text-xs">{errorMessage}</p>
          <Link
            href="/admin/orders"
            className="mt-2 bg-shop_dark_green px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-shop_dark_green/90 shadow-sm"
          >
            &larr; Về danh sách đơn hàng
          </Link>
        </div>
      </div>
    );
  }

  const next = getNextStep(order.status, order.paymentMethod);
  const canCancel = ADMIN_CANCELLABLE.includes(order.status);
  const isFinal =
    order.status === "DELIVERED" ||
    order.status === "CANCELLED" ||
    order.status === "RETURNED";

  const paymentMethod = order.paymentMethod;

  return (
    <div className="font-sans min-h-[calc(100vh-4rem)] bg-neutral-50 p-4 sm:p-6 lg:p-8 text-neutral-900">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-neutral-500">
          <Link href="/admin" className="hover:text-shop_dark_green transition-colors">
            Admin
          </Link>
          <span>/</span>
          <Link href="/admin/orders" className="hover:text-shop_dark_green transition-colors">
            Đơn hàng
          </Link>
          <span>/</span>
          <span className="text-neutral-900 font-medium">Chi tiết đơn</span>
        </nav>

        {/* Order Header */}
        <div className="flex flex-col gap-4 border-b border-neutral-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-3">
            <h1 className="text-xl font-bold uppercase tracking-tight text-neutral-900">
              Đơn hàng {order.orderCode ?? `#${order.id.slice(0, 8)}`}
            </h1>
            <span className="pb-0.5 text-xs text-neutral-500 font-mono">
              [ {formatDateTime(order.createdAt)} ]
            </span>
          </div>
          <span className="border border-neutral-200 bg-white px-3 py-1 text-xs font-mono font-semibold text-neutral-800">
            {STATUS_LABEL[order.status] ?? order.status}
          </span>
        </div>

        {/* 2-Column Content Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          <div className="md:col-span-2 flex flex-col gap-6">
            {/* Status Workflow Card */}
            <div className="border border-neutral-200 bg-white p-5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-200 pb-3 mb-3">
                Xử lý đơn hàng
              </h2>
              {isFinal ? (
                <p className="text-xs text-neutral-500">
                  Đơn hàng đã ở trạng thái hoàn tất ({STATUS_LABEL[order.status]}), không thể thay đổi thêm.
                </p>
              ) : (
                <>
                  <p className="text-xs text-neutral-500 mb-3">
                    {order.status === "PENDING"
                      ? order.paymentMethod === "VNPAY"
                        ? "Đơn thanh toán VNPAY: bỏ qua bước xác nhận, chuyển thẳng sang bước chuẩn bị hàng."
                        : "Đơn mới đang chờ quản trị viên xác nhận."
                      : `Bước tiếp theo trong quy trình: ${STATUS_LABEL[next!.status]}.`}
                  </p>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    Ghi chú xử lý (khách hàng sẽ xem được trong lịch sử đơn):
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    disabled={isUpdating}
                    className="w-full border border-neutral-300 px-3 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-shop_dark_green focus:outline-none focus:ring-1 focus:ring-shop_dark_green disabled:opacity-60 resize-none"
                    placeholder="Ví dụ: Đã gọi điện xác nhận địa chỉ và số lượng với người nhận"
                  />
                  {actionError && (
                    <p className="text-xs text-red-600 font-medium mt-2">{actionError}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2.5 mt-4 border-t border-neutral-100 pt-3">
                    {next && (
                      <button
                        onClick={handleAdvance}
                        disabled={isUpdating}
                        className="bg-shop_dark_green px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-shop_dark_green/90 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
                        className="border border-red-200 bg-white px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        Hủy đơn hàng
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Products Table Card */}
            <div className="border border-neutral-200 bg-white p-5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-200 pb-3 mb-3">
                Danh sách sản phẩm trong đơn ({order.items.length})
              </h2>
              <div className="flex flex-col divide-y divide-neutral-100">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-3.5 first:pt-1 last:pb-1"
                  >
                    <div className="min-w-0 pr-4">
                      <p className="text-xs font-semibold text-neutral-900 hover:text-shop_dark_green transition-colors line-clamp-1">
                        {item.productName}
                      </p>
                      <p className="text-[11px] font-mono text-neutral-400 mt-0.5">
                        {formatPrice(item.unitPrice)} × {item.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-neutral-900 tabular-nums shrink-0">
                      {formatPrice(item.subtotal)}
                    </p>
                  </div>
                ))}
              </div>
              <div className="border-t border-neutral-200 mt-4 pt-3 flex items-center justify-between">
                <span className="font-bold text-xs uppercase tracking-tight text-neutral-900">Tổng cộng</span>
                <span className="font-bold text-lg text-neutral-900 tabular-nums">
                  {formatPrice(order.totalAmount)}
                </span>
              </div>
            </div>

            {/* Status History Card */}
            {order.statusHistory && order.statusHistory.length > 0 && (
              <div className="border border-neutral-200 bg-white p-5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-200 pb-3 mb-4">
                  Lịch sử trạng thái đơn hàng
                </h2>
                <div className="flex flex-col gap-3">
                  {order.statusHistory.map((entry, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-xs">
                      <div className="w-2 h-2 rounded-full bg-shop_dark_green mt-1.5 shrink-0" />
                      <div>
                        <p className="font-semibold text-neutral-900">
                          {STATUS_LABEL[entry.status] ?? entry.status}
                        </p>
                        <p className="text-[11px] font-mono text-neutral-400 mt-0.5">
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

          {/* Right Column: Customer & Payment Details */}
          <div className="md:col-span-1">
            <div className="border border-neutral-200 bg-white p-5 sticky top-24 space-y-5">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-200 pb-3 mb-3">
                  Thông tin giao hàng
                </h2>
                <div className="flex flex-col gap-2 text-xs">
                  <p className="flex justify-between">
                    <span className="text-neutral-500">Người nhận:</span>
                    <span className="font-semibold text-neutral-900 text-right">{order.recipientName}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-neutral-500">Điện thoại:</span>
                    <span className="font-semibold text-neutral-900 font-mono text-right">{order.recipientPhone}</span>
                  </p>
                  <div className="pt-1">
                    <span className="text-neutral-500 block mb-0.5">Địa chỉ:</span>
                    <span className="font-medium text-neutral-800 leading-snug">{order.shippingAddress}</span>
                  </div>
                  {order.note && (
                    <div className="pt-2 border-t border-neutral-100 text-neutral-600">
                      <span className="text-neutral-500 font-semibold block mb-0.5">Ghi chú của khách:</span>
                      <span>{order.note}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-neutral-200 pt-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-200 pb-3 mb-3">
                  Tóm tắt thanh toán
                </h2>
                <div className="flex flex-col gap-2 text-xs">
                  <p className="flex justify-between">
                    <span className="text-neutral-500">Phương thức:</span>
                    <span className="font-semibold text-neutral-900 text-right">{getMethodLabel(paymentMethod)}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-neutral-500">Trạng thái:</span>
                    <span className="font-semibold text-neutral-900 text-right">
                      {order.paymentStatus
                        ? PAYMENT_STATUS_LABEL[order.paymentStatus] ?? order.paymentStatus
                        : paymentMethod === "COD"
                        ? "Thu tiền khi giao hàng"
                        : "Chưa có thông tin"}
                    </span>
                  </p>
                  {order.transactionNo && (
                    <p className="flex justify-between font-mono">
                      <span className="text-neutral-500">Mã giao dịch:</span>
                      <span className="font-semibold text-neutral-900 text-right">{order.transactionNo}</span>
                    </p>
                  )}
                  {order.paidAt && (
                    <p className="flex justify-between font-mono">
                      <span className="text-neutral-500">Thời gian:</span>
                      <span className="font-medium text-neutral-700 text-right">{formatDateTime(order.paidAt)}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cancel Confirmation Modal */}
        {isCancelOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            onClick={() => !isUpdating && setIsCancelOpen(false)}
          >
            <div
              className="bg-white border border-neutral-200 p-6 shadow-xl w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-200 pb-3 mb-2">
                Hủy đơn hàng này?
              </h2>
              <p className="text-xs text-neutral-500 mb-3">
                Đơn hàng sẽ chuyển sang trạng thái đã hủy và khách hàng sẽ nhận được thông báo.
              </p>
              <textarea
                value={cancelNote}
                onChange={(e) => setCancelNote(e.target.value)}
                rows={3}
                disabled={isUpdating}
                className="w-full border border-neutral-300 px-3 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-shop_dark_green focus:outline-none focus:ring-1 focus:ring-shop_dark_green resize-none"
                placeholder="Nhập lý do hủy đơn..."
              />
              {actionError && (
                <p className="text-xs text-red-600 font-medium mt-2">{actionError}</p>
              )}
              <div className="flex items-center justify-end gap-2.5 mt-5 border-t border-neutral-200 pt-4">
                <button
                  onClick={() => setIsCancelOpen(false)}
                  disabled={isUpdating}
                  className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-neutral-700 border border-neutral-300 bg-white hover:bg-neutral-50 transition-colors disabled:opacity-50"
                >
                  Đóng
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isUpdating || cancelNote.trim().length === 0}
                  className="px-5 py-2 text-xs font-semibold uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  {isUpdating ? "Đang hủy..." : "Xác nhận hủy"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOrderDetailPage;