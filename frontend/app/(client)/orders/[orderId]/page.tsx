"use client";

import React, { useCallback, useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check,
  PackageSearch,
  Copy,
  Clock,
  Package,
  Truck,
  PackageCheck,
  XCircle,
  RotateCcw,
  ArrowLeft,
  ShoppingCart,
  X,
  Calendar,
  Phone,
  MapPin,
  CreditCard,
  Banknote,
  Smartphone,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import {
  cancelOrder,
  getOrderById,
  OrderAuthRequiredError,
  type OrderData,
  type OrderStatus,
  type PaymentMethod,
} from "../../../../lib/orders-api";
import { useCart } from "../../../../context/CartContext";

const formatPrice = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    value
  );

const formatDateTime = (iso?: string | null) => {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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
  RETURNED: "Đã trả hàng",
};

const STATUS_DESCRIPTION: Record<OrderStatus, string> = {
  PENDING: "Cửa hàng đã nhận đơn và đang chờ xác nhận.",
  CONFIRMED: "Đơn hàng đã được xác nhận, chuẩn bị đóng gói sản phẩm.",
  PROCESSING: "Cửa hàng đang kiểm tra và đóng gói sản phẩm kỹ thuật.",
  SHIPPING: "Đơn hàng đã bàn giao cho đơn vị vận chuyển và đang giao tới bạn.",
  DELIVERED: "Đơn hàng đã được giao thành công.",
  CANCELLED: "Đơn hàng đã bị hủy.",
  RETURNED: "Đơn hàng đã được trả lại cửa hàng.",
};

const PAYMENT_LABEL: Record<string, string> = {
  COD: "Thanh toán khi nhận (COD)",
  VNPAY: "VNPAY QR",
  MOMO: "Ví MoMo",
};

const PROGRESS_STEPS: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPING",
  "DELIVERED",
];

const CANCELLABLE_STATUSES: OrderStatus[] = ["PENDING", "CONFIRMED"];

const CANCEL_REASONS = [
  "Muốn thay đổi địa chỉ hoặc số điện thoại nhận hàng",
  "Muốn đổi cấu hình, màu sắc hoặc sản phẩm khác",
  "Tìm được giá tốt hơn ở nơi khác",
  "Đặt nhầm số lượng hoặc sản phẩm",
  "Đổi ý, không muốn mua nữa",
];

const FINAL_STATUSES: OrderStatus[] = ["DELIVERED", "CANCELLED", "RETURNED"];
const POLL_INTERVAL_MS = 15000;

// Thumbnail with error fallback
const ProductThumb = ({
  src,
  alt,
}: {
  src?: string | null;
  alt: string;
}) => {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div className="flex h-14 w-14 shrink-0 items-center justify-center border border-neutral-200 bg-neutral-50 text-neutral-400">
        <Package className="h-5 w-5" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={56}
      height={56}
      onError={() => setHasError(true)}
      className="h-14 w-14 shrink-0 border border-neutral-200 bg-white object-cover"
      loading="lazy"
    />
  );
};

const OrderDetailPage = () => {
  const params = useParams<{ orderId: string }>();
  const router = useRouter();
  const orderId = params?.orderId;
  const { addToCart } = useCart();

  const [order, setOrder] = useState<OrderData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelDialogError, setCancelDialogError] = useState<string | null>(null);
  const [justPlaced, setJustPlaced] = useState(false);

  // Re-order state
  const [isReordering, setIsReordering] = useState(false);

  // Copy feedback toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  }, []);

  const copyOrderCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    setIsCopied(true);
    showToast(`Đã sao chép mã đơn: ${code}`);
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };

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

  useEffect(() => {
    let ignore = false;
    load(() => ignore);
    return () => {
      ignore = true;
    };
  }, [load]);

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
      setCancelDialogError("Vui lòng chọn hoặc nhập lý do hủy đơn.");
      return;
    }
    setIsCancelling(true);
    setCancelDialogError(null);
    try {
      const updated = await cancelOrder(orderId, reason);
      setOrder(updated);
      setIsConfirmOpen(false);
      setJustPlaced(false);
      showToast("Đã hủy đơn hàng thành công.");
    } catch (err) {
      setCancelDialogError(
        err instanceof Error ? err.message : "Hủy đơn hàng thất bại."
      );
    } finally {
      setIsCancelling(false);
    }
  };

  // Re-order handler
  const handleReorder = async () => {
    if (!order || !order.items || order.items.length === 0) return;
    setIsReordering(true);
    try {
      for (const item of order.items) {
        if (item.productId) {
          await addToCart(item.productId, item.quantity);
        }
      }
      showToast(`Đã thêm ${order.items.length} sản phẩm vào giỏ hàng.`);
      router.push("/cart");
    } catch {
      showToast("Có lỗi khi thêm sản phẩm vào giỏ hàng.");
    } finally {
      setIsReordering(false);
    }
  };

  if (isLoading) {
    return (
      <div className="font-sans min-h-screen bg-white">
        <div className="mx-auto w-[90%] py-20 text-center text-sm text-neutral-400">
          Đang tải thông tin đơn hàng...
        </div>
      </div>
    );
  }

  if (errorMessage && !order) {
    return (
      <div className="font-sans min-h-screen bg-white">
        <div className="mx-auto flex w-[90%] max-w-xl flex-col items-center gap-4 py-20 text-center">
          <PackageSearch className="h-12 w-12 text-neutral-300" />
          <h1 className="text-xl font-bold uppercase tracking-tight text-neutral-900">
            Không tìm thấy đơn hàng
          </h1>
          <p className="text-sm text-neutral-500">{errorMessage}</p>
          <Link
            href="/orders"
            className="mt-2 bg-shop_dark_green px-6 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-shop_dark_green/90"
          >
            Quay lại danh sách đơn hàng
          </Link>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const canCancel = CANCELLABLE_STATUSES.includes(order.status);
  const isCancelled = order.status === "CANCELLED";
  const isReturned = order.status === "RETURNED";
  const currentStepIndex = PROGRESS_STEPS.indexOf(order.status);

  const stepTimes: Partial<Record<OrderStatus, string>> = {};
  for (const entry of order.statusHistory ?? []) {
    stepTimes[entry.status] = entry.changedAt;
  }
  if (!stepTimes.PENDING) stepTimes.PENDING = order.createdAt;

  let cancelNote: string | null = null;
  for (const entry of order.statusHistory ?? []) {
    if (entry.status === "CANCELLED" && entry.note) cancelNote = entry.note;
  }

  const displayCode =
    order.orderCode || `ORD-${order.id.slice(0, 8).toUpperCase()}`;
  const paymentMethodText =
    PAYMENT_LABEL[order.paymentMethod || "COD"] ?? (order.paymentMethod || "COD");

  // Subtotal calculation fallback
  const calculatedSubtotal =
    order.subtotal ??
    order.items.reduce((sum, it) => sum + (it.subtotal || it.unitPrice * it.quantity), 0);

  return (
    <div className="font-sans min-h-screen bg-white text-neutral-900">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 border border-neutral-900 bg-neutral-900 px-4 py-2.5 text-xs font-medium text-white shadow">
          <Check className="h-3.5 w-3.5 text-white" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="mx-auto w-[90%] py-8 sm:py-10">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-neutral-500 mb-6">
          <Link href="/" className="hover:text-shop_dark_green transition-colors">
            Trang chủ
          </Link>
          <span>/</span>
          <Link href="/orders" className="hover:text-shop_dark_green transition-colors">
            Đơn hàng của tôi
          </Link>
          <span>/</span>
          <span className="text-neutral-900 font-medium">Chi tiết đơn hàng</span>
        </nav>

        {/* Just Placed Alert */}
        {justPlaced && !isCancelled && (
          <div className="mb-6 flex items-start gap-3 border border-neutral-300 bg-neutral-50 p-4">
            <Check className="h-4 w-4 mt-0.5 text-neutral-900" />
            <div className="text-xs">
              <p className="font-bold uppercase tracking-tight text-neutral-900">
                Đặt hàng thành công
              </p>
              <p className="text-neutral-600 mt-0.5">
                Cửa hàng đã ghi nhận đơn hàng của bạn. Bạn có thể theo dõi tiến
                trình xử lý và giao hàng chi tiết ngay bên dưới.
              </p>
            </div>
          </div>
        )}

        {/* Order Header */}
        <div className="flex flex-col gap-4 border-b border-neutral-200 pb-5 sm:flex-row sm:items-end sm:justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold uppercase tracking-tight text-neutral-900 font-mono">
                {displayCode}
              </h1>
              <button
                onClick={() => copyOrderCode(displayCode)}
                className="text-neutral-400 hover:text-neutral-700 transition"
                title="Sao chép mã đơn"
              >
                {isCopied ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Ngày đặt: {formatDateTime(order.createdAt)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="text-xs">
              <span className="text-neutral-500">Trạng thái: </span>
              <span className="font-semibold text-shop_dark_green">
                {STATUS_LABEL[order.status] ?? order.status}
              </span>
            </div>

            <button
              onClick={handleReorder}
              disabled={isReordering}
              className="bg-shop_dark_green text-white hover:bg-shop_dark_green/90 px-3.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {isReordering ? "Đang thêm..." : "Mua lại đơn này"}
            </button>

            {canCancel && (
              <button
                onClick={openCancelDialog}
                className="border border-red-300 text-red-600 px-3.5 py-1.5 text-xs font-semibold hover:bg-red-50 transition-colors"
              >
                Hủy đơn hàng
              </button>
            )}

            <Link
              href="/orders"
              className="border border-shop_dark_green text-shop_dark_green hover:bg-shop_dark_green hover:text-white px-3.5 py-1.5 text-xs font-semibold transition-colors"
            >
              &larr; Danh sách đơn
            </Link>
          </div>
        </div>

        {errorMessage && (
          <p className="text-xs font-semibold text-red-600 mb-4">{errorMessage}</p>
        )}

        {/* Order Progress Stepper */}
        <div className="border border-neutral-200 p-5 mb-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
              Tiến trình đơn hàng
            </h2>
            <span className="text-xs text-neutral-500">
              {STATUS_DESCRIPTION[order.status]}
            </span>
          </div>

          {isCancelled ? (
            <div className="mt-4 border border-neutral-200 bg-neutral-50 p-4 text-xs text-neutral-700">
              <p className="font-semibold text-red-600">
                Đơn hàng đã hủy
                {stepTimes.CANCELLED
                  ? ` lúc ${formatDateTime(stepTimes.CANCELLED)}`
                  : ""}
                . Tồn kho sản phẩm đã được hoàn lại.
              </p>
              {cancelNote && (
                <p className="mt-1 text-neutral-600">
                  <span className="text-neutral-500">Lý do hủy: </span>
                  {cancelNote}
                </p>
              )}
            </div>
          ) : isReturned ? (
            <div className="mt-4 border border-neutral-200 bg-neutral-50 p-4 text-xs text-neutral-700">
              <p className="font-semibold text-purple-700">
                Đơn hàng đã được hoàn trả lại cửa hàng
                {stepTimes.RETURNED
                  ? ` lúc ${formatDateTime(stepTimes.RETURNED)}`
                  : ""}
                .
              </p>
            </div>
          ) : (
            <div className="mt-6">
              <ol className="flex flex-col md:flex-row md:items-start">
                {PROGRESS_STEPS.map((step, idx) => {
                  const isDone = idx < currentStepIndex;
                  const isCurrent = idx === currentStepIndex;
                  const isLast = idx === PROGRESS_STEPS.length - 1;
                  const showCheck = isDone || (isCurrent && step === "DELIVERED");
                  const time = stepTimes[step];

                  return (
                    <li
                      key={step}
                      className="relative flex md:flex-1 md:flex-col md:items-center gap-3 md:gap-2 pb-6 md:pb-0 last:pb-0"
                    >
                      {!isLast && (
                        <>
                          <span
                            aria-hidden
                            className={`absolute left-[13px] top-7 bottom-0 w-0.5 md:hidden ${
                              isDone ? "bg-shop_dark_green" : "bg-neutral-200"
                            }`}
                          />
                          <span
                            aria-hidden
                            className={`hidden md:block absolute top-[13px] left-1/2 h-0.5 w-full ${
                              isDone ? "bg-shop_dark_green" : "bg-neutral-200"
                            }`}
                          />
                        </>
                      )}

                      <span
                        className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center border text-xs font-semibold ${
                          showCheck
                            ? "border-shop_dark_green bg-shop_dark_green text-white"
                            : isCurrent
                            ? "border-shop_dark_green bg-white text-shop_dark_green ring-2 ring-shop_dark_green/15"
                            : "border-neutral-300 bg-white text-neutral-400"
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
                          className={`text-xs ${
                            isCurrent
                              ? "font-bold text-shop_dark_green"
                              : isDone
                              ? "font-semibold text-neutral-800"
                              : "text-neutral-400"
                          }`}
                        >
                          {STATUS_LABEL[step]}
                        </p>
                        {time && (isDone || isCurrent) && (
                          <p className="text-[11px] text-neutral-500 mt-0.5">
                            {formatDateTime(time)}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </div>

        {/* 2-Column Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column: Products List & Status History */}
          <div className="md:col-span-2 flex flex-col gap-6">
            {/* Products List (WITHOUT STT, as requested) */}
            <div className="border border-neutral-200 p-5">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3 mb-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                  Sản phẩm trong đơn ({order.items.length})
                </h2>
                <span className="text-xs text-neutral-500">
                  Tổng {order.totalQuantity ?? order.items.length} món
                </span>
              </div>

              <div className="flex flex-col divide-y divide-neutral-100">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between py-3.5 first:pt-0 last:pb-0 gap-3"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <ProductThumb
                        src={item.productThumbnailUrl || item.thumbnailUrl}
                        alt={item.productName}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-neutral-900 line-clamp-2">
                          {item.productName}
                        </p>
                        {item.productSku && (
                          <span className="mt-0.5 inline-block font-mono text-[10px] text-neutral-500">
                            [{item.productSku}]
                          </span>
                        )}
                        <p className="text-xs text-neutral-500 mt-1">
                          {formatPrice(item.unitPrice)} × {item.quantity}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-neutral-900 whitespace-nowrap">
                        {formatPrice(item.subtotal)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Status History Timeline */}
            {order.statusHistory && order.statusHistory.length > 0 && (
              <div className="border border-neutral-200 p-5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-200 pb-3 mb-4">
                  Lịch sử cập nhật đơn hàng
                </h2>
                <div className="flex flex-col gap-3">
                  {order.statusHistory.map((entry, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-shop_dark_green mt-1.5 shrink-0" />
                      <div className="text-xs">
                        <p className="font-semibold text-neutral-900">
                          {STATUS_LABEL[entry.status] ?? entry.status}
                        </p>
                        <p className="text-[11px] text-neutral-500 mt-0.5">
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

          {/* Right Column: Shipping Info & Payment Summary */}
          <div className="md:col-span-1 flex flex-col gap-6">
            {/* Shipping Information Card */}
            <div className="border border-neutral-200 p-5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-200 pb-3 mb-4">
                Thông tin nhận hàng
              </h2>
              <div className="flex flex-col gap-2.5 text-xs">
                <div>
                  <span className="text-neutral-500 text-[11px]">Người nhận: </span>
                  <strong className="text-neutral-900 block font-semibold">
                    {order.recipientName}
                  </strong>
                </div>

                <div>
                  <span className="text-neutral-500 text-[11px]">Số điện thoại: </span>
                  <span className="text-neutral-800 block font-mono">
                    {order.recipientPhone}
                  </span>
                </div>

                <div>
                  <span className="text-neutral-500 text-[11px]">Địa chỉ giao hàng: </span>
                  <span className="text-neutral-700 block leading-relaxed break-words">
                    {order.shippingAddress}
                  </span>
                </div>

                {order.note && (
                  <div>
                    <span className="text-neutral-500 text-[11px]">Ghi chú: </span>
                    <span className="text-neutral-700 block italic leading-relaxed">
                      {order.note}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Payment & Financial Summary Card */}
            <div className="border border-neutral-200 p-5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-200 pb-3 mb-4">
                Thanh toán & Chi phí
              </h2>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Hình thức:</span>
                  <span className="font-medium text-neutral-900">
                    {paymentMethodText}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Tạm tính hàng hóa:</span>
                  <span className="text-neutral-800">
                    {formatPrice(calculatedSubtotal)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Phí vận chuyển:</span>
                  <span className="text-neutral-800">
                    {order.shippingFee && order.shippingFee > 0
                      ? formatPrice(order.shippingFee)
                      : "Miễn phí"}
                  </span>
                </div>

                {order.discountAmount && order.discountAmount > 0 ? (
                  <div className="flex items-center justify-between text-emerald-700">
                    <span>Giảm giá:</span>
                    <span>- {formatPrice(order.discountAmount)}</span>
                  </div>
                ) : null}

                <div className="border-t border-neutral-200 pt-3 mt-3 flex items-center justify-between">
                  <span className="font-bold text-xs uppercase tracking-tight text-neutral-900">
                    Tổng thanh toán
                  </span>
                  <span className="font-bold text-base text-neutral-900">
                    {formatPrice(order.totalAmount)}
                  </span>
                </div>
              </div>

              {canCancel && (
                <button
                  onClick={openCancelDialog}
                  className="mt-5 w-full border border-red-300 text-red-600 px-4 py-2.5 text-xs font-semibold hover:bg-red-50 transition-colors"
                >
                  Hủy đơn hàng này
                </button>
              )}

              <Link
                href="/orders"
                className="mt-3 block text-center bg-shop_dark_green text-white px-4 py-2.5 text-xs font-semibold hover:bg-shop_dark_green/90 transition-colors"
              >
                Quay lại danh sách đơn hàng
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      {isConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => !isCancelling && setIsConfirmOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-dialog-title"
            className="bg-white border border-neutral-300 p-6 w-full max-w-md shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3 mb-3">
              <h2
                id="cancel-dialog-title"
                className="text-sm font-bold uppercase tracking-tight text-neutral-900"
              >
                Xác nhận hủy đơn hàng
              </h2>
              <button
                onClick={() => setIsConfirmOpen(false)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-600 mb-3">
              Đơn hàng sẽ được hủy và số lượng tồn kho sản phẩm sẽ được hoàn lại.
              Vui lòng cho cửa hàng biết lý do bạn muốn hủy đơn:
            </p>

            <div className="space-y-1.5 mb-3">
              {CANCEL_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  disabled={isCancelling}
                  onClick={() => {
                    setCancelReason(r);
                    setCancelDialogError(null);
                  }}
                  className={`w-full border p-2 text-left text-xs transition-colors disabled:opacity-50 ${
                    cancelReason === r
                      ? "border-shop_dark_green bg-shop_dark_green/10 font-semibold text-shop_dark_green"
                      : "border-neutral-200 text-neutral-700 hover:bg-neutral-50"
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
              rows={2}
              maxLength={500}
              placeholder="Hoặc nhập lý do khác..."
              className="w-full border border-neutral-300 p-2 text-xs text-neutral-900 placeholder-neutral-400 focus:border-shop_dark_green focus:outline-none"
            />

            {cancelDialogError && (
              <p className="mt-2 text-xs font-semibold text-red-600">
                {cancelDialogError}
              </p>
            )}

            <div className="mt-4 flex items-center justify-end gap-2 border-t border-neutral-200 pt-3">
              <button
                onClick={() => setIsConfirmOpen(false)}
                disabled={isCancelling}
                className="border border-neutral-300 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-50"
              >
                Đóng
              </button>
              <button
                onClick={handleCancel}
                disabled={isCancelling || !cancelReason.trim()}
                className="bg-shop_dark_green text-white px-4 py-2 text-xs font-semibold hover:bg-shop_dark_green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCancelling ? "Đang hủy..." : "Xác nhận hủy đơn"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetailPage;