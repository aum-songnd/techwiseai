"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Check, PackageSearch } from "lucide-react";
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

// PENDING → CONFIRMED → PROCESSING → SHIPPING → DELIVERED, CANCELLED.
const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  PROCESSING: "Đang xử lý",
  SHIPPING: "Đang giao hàng",
  DELIVERED: "Đã giao hàng",
  CANCELLED: "Đã hủy",
  RETURNED: "Trả hàng",
};

// Mô tả ngắn cho từng bước để khách biết đơn đang ở đâu.
const STATUS_DESCRIPTION: Record<OrderStatus, string> = {
  PENDING: "Cửa hàng đã nhận đơn và đang chờ xác nhận.",
  CONFIRMED: "Đơn hàng đã được xác nhận, sắp chuẩn bị hàng.",
  PROCESSING: "Cửa hàng đang chuẩn bị và đóng gói sản phẩm.",
  SHIPPING: "Đơn hàng đang trên đường giao đến bạn.",
  DELIVERED: "Đơn hàng đã được giao thành công.",
  CANCELLED: "Đơn hàng đã bị hủy.",
  RETURNED: "Đơn hàng đã được trả lại.",
};

// Các bước xử lý theo đúng thứ tự (không gồm CANCELLED).
const PROGRESS_STEPS: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPING",
  "DELIVERED",
];

// Chỉ cho phép khách tự hủy khi đơn còn ở giai đoạn sớm. Cần đối chiếu
// lại với luồng thật của backend (mục 8.1 đặc tả) nếu PROCESSING trở đi
// vẫn còn cho phép hủy.
const CANCELLABLE_STATUSES: OrderStatus[] = ["PENDING", "CONFIRMED"];

// Lý do hủy gợi ý để khách chọn nhanh (cũng có thể tự nhập).
const CANCEL_REASONS = [
  "Muốn thay đổi địa chỉ hoặc số điện thoại nhận hàng",
  "Muốn đổi sản phẩm khác",
  "Tìm được giá tốt hơn ở nơi khác",
  "Đặt nhầm sản phẩm",
  "Đổi ý, không muốn mua nữa",
];

// Đơn còn đang được xử lý thì tự làm mới trạng thái định kỳ.
const FINAL_STATUSES: OrderStatus[] = ["DELIVERED", "CANCELLED", "RETURNED"];
const POLL_INTERVAL_MS = 15000;

const OrderDetailPage = () => {
  const params = useParams<{ orderId: string }>();
  const router = useRouter();
  const orderId = params?.orderId;

  const [order, setOrder] = useState<OrderData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelDialogError, setCancelDialogError] = useState<string | null>(null);
  const [justPlaced, setJustPlaced] = useState(false);

  // Trang checkout chuyển sang đây kèm ?placed=1 -> hiện thông báo đặt
  // hàng thành công. Đọc bằng window để không phải bọc Suspense.
  useEffect(() => {
    const placed = new URLSearchParams(window.location.search).get("placed");
    if (placed === "1") setJustPlaced(true);
  }, []);

  const load = useCallback(
    async (isCancelled: () => boolean, silent = false) => {
      if (!orderId) return;
      if (!silent) {
        setIsLoading(true);
        setErrorMessage(null);
      }
      try {
        const data = await getOrderById(orderId);
        if (!isCancelled()) setOrder(data);
      } catch (err) {
        if (err instanceof OrderAuthRequiredError) {
          router.push("/sign-in");
          return;
        }
        // Lần làm mới ngầm thất bại thì giữ nguyên dữ liệu đang hiển thị.
        if (!silent && !isCancelled()) {
          setErrorMessage(
            err instanceof Error
              ? err.message
              : "Không tải được thông tin đơn hàng."
          );
        }
      } finally {
        if (!silent && !isCancelled()) setIsLoading(false);
      }
    },
    [orderId, router]
  );

  // Tải lần đầu.
  useEffect(() => {
    let ignore = false;
    load(() => ignore);
    return () => {
      ignore = true;
    };
  }, [load]);

  // Tự làm mới trạng thái khi đơn chưa ở trạng thái cuối.
  const currentStatus = order?.status;
  useEffect(() => {
    if (!currentStatus || FINAL_STATUSES.includes(currentStatus)) return;

    let ignore = false;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        load(() => ignore, true);
      }
    }, POLL_INTERVAL_MS);

    return () => {
      ignore = true;
      clearInterval(timer);
    };
  }, [currentStatus, load]);

  const openCancelDialog = () => {
    setCancelReason("");
    setCancelDialogError(null);
    setIsConfirmOpen(true);
  };

  const handleCancel = async () => {
    if (!orderId) return;
    const reason = cancelReason.trim();
    if (!reason) {
      setCancelDialogError("Vui lòng nhập lý do hủy đơn.");
      return;
    }
    setIsCancelling(true);
    setCancelDialogError(null);
    try {
      const updated = await cancelOrder(orderId, reason);
      setOrder(updated);
      setIsConfirmOpen(false);
      setJustPlaced(false);
    } catch (err) {
      setCancelDialogError(
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
  const isCancelled = order.status === "CANCELLED";
  const isReturned = order.status === "RETURNED";
  const currentStepIndex = PROGRESS_STEPS.indexOf(order.status);

  // Thời điểm đơn chuyển sang từng bước (lấy lần ghi nhận gần nhất).
  const stepTimes: Partial<Record<OrderStatus, string>> = {};
  for (const entry of order.statusHistory ?? []) {
    stepTimes[entry.status] = entry.changedAt;
  }
  if (!stepTimes.PENDING) stepTimes.PENDING = order.createdAt;

  // Lý do hủy (nếu có) nằm trong ghi chú của bản ghi CANCELLED.
  let cancelNote: string | null = null;
  for (const entry of order.statusHistory ?? []) {
    if (entry.status === "CANCELLED" && entry.note) cancelNote = entry.note;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {justPlaced && !isCancelled && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-shop_dark_green/20 bg-shop_dark_green/5 p-4">
          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-shop_dark_green text-white">
            <Check className="h-3 w-3" strokeWidth={3} />
          </div>
          <div className="text-sm">
            <p className="font-semibold text-shop_dark_green">
              Đặt hàng thành công
            </p>
            <p className="text-gray-600 mt-0.5">
              Cửa hàng sẽ xác nhận đơn của bạn sớm. Bạn có thể theo dõi tiến
              trình xử lý ngay bên dưới.
            </p>
          </div>
        </div>
      )}

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
            isCancelled
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

      {/* Tiến trình xử lý đơn hàng */}
      <div className="border border-gray-200 rounded-lg p-5 mb-6">
        <h2 className="font-bold text-shop_dark_green mb-1">
          Tiến trình đơn hàng
        </h2>
        <p className="text-sm text-gray-500 mb-5">
          {STATUS_DESCRIPTION[order.status]}
        </p>

        {isCancelled ? (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-500">
            Đơn hàng đã hủy
            {stepTimes.CANCELLED
              ? ` lúc ${formatDateTime(stepTimes.CANCELLED)}`
              : ""}
            . Tồn kho đã được hoàn lại.
            {cancelNote && (
              <p className="mt-1.5 text-gray-700">
                <span className="text-gray-500">Lý do hủy: </span>
                {cancelNote}
              </p>
            )}
          </div>
        ) : isReturned ? (
          <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Đơn hàng đã được trả lại
            {stepTimes.RETURNED
              ? ` lúc ${formatDateTime(stepTimes.RETURNED)}`
              : ""}
            .
          </div>
        ) : (
          <ol className="flex flex-col md:flex-row md:items-start">
            {PROGRESS_STEPS.map((step, idx) => {
              const isDone = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              const isLast = idx === PROGRESS_STEPS.length - 1;
              // Đơn đã giao xong thì bước cuối cũng tính là hoàn thành.
              const showCheck = isDone || (isCurrent && step === "DELIVERED");
              const time = stepTimes[step];

              return (
                <li
                  key={step}
                  className="relative flex md:flex-1 md:flex-col md:items-center gap-3 md:gap-2 pb-6 md:pb-0 last:pb-0"
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {/* Đường nối */}
                  {!isLast && (
                    <>
                      <span
                        aria-hidden
                        className={`absolute left-[13px] top-7 bottom-0 w-0.5 md:hidden ${
                          isDone ? "bg-shop_dark_green" : "bg-gray-200"
                        }`}
                      />
                      <span
                        aria-hidden
                        className={`hidden md:block absolute top-[13px] left-1/2 h-0.5 w-full ${
                          isDone ? "bg-shop_dark_green" : "bg-gray-200"
                        }`}
                      />
                    </>
                  )}

                  {/* Chấm trạng thái */}
                  <span
                    className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold ${
                      showCheck
                        ? "border-shop_dark_green bg-shop_dark_green text-white"
                        : isCurrent
                        ? "border-shop_dark_green bg-white text-shop_dark_green ring-4 ring-shop_dark_green/15"
                        : "border-gray-300 bg-white text-gray-400"
                    }`}
                  >
                    {showCheck ? (
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    ) : (
                      idx + 1
                    )}
                  </span>

                  <div className="md:text-center">
                    <p
                      className={`text-sm ${
                        isCurrent
                          ? "font-semibold text-shop_dark_green"
                          : isDone
                          ? "font-medium text-shop_dark_green"
                          : "text-gray-400"
                      }`}
                    >
                      {STATUS_LABEL[step]}
                    </p>
                    {time && (isDone || isCurrent) && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatDateTime(time)}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

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
                onClick={openCancelDialog}
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
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-dialog-title"
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="cancel-dialog-title"
              className="text-lg font-bold text-shop_dark_green mb-2"
            >
              Hủy đơn hàng này?
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Vui lòng cho cửa hàng biết lý do hủy. Đơn hàng sẽ được hủy và tồn
              kho sẽ được hoàn lại. Hành động này không thể hoàn tác.
            </p>

            <div className="flex flex-wrap gap-2 mb-3">
              {CANCEL_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  disabled={isCancelling}
                  onClick={() => {
                    setCancelReason(r);
                    setCancelDialogError(null);
                  }}
                  className={`px-3 py-1.5 text-xs rounded-2xl border transition-colors disabled:opacity-50 ${
                    cancelReason === r
                      ? "bg-shop_dark_green text-white border-shop_dark_green"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <textarea
              value={cancelReason}
              onChange={(e) => {
                setCancelReason(e.target.value);
                setCancelDialogError(null);
              }}
              disabled={isCancelling}
              rows={3}
              maxLength={500}
              placeholder="Nhập lý do hủy đơn..."
              className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 outline-none resize-none placeholder:text-gray-400 focus:border-shop_dark_green/50"
            />

            {cancelDialogError && (
              <p className="mt-2 text-sm text-red-500">{cancelDialogError}</p>
            )}

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsConfirmOpen(false)}
                disabled={isCancelling}
                className="px-4 py-2 text-sm rounded-xl text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                Đóng
              </button>
              <button
                onClick={handleCancel}
                disabled={isCancelling || !cancelReason.trim()}
                className="px-4 py-2 text-sm rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCancelling ? "Đang hủy..." : "Xác nhận hủy"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetailPage;