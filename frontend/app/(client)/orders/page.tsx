"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Copy, Check, X, Package } from "lucide-react";
import {
  getOrders,
  getOrderById,
  cancelOrder,
  OrderAuthRequiredError,
  type OrderListItem,
  type OrderStatus,
  type OrderData,
  type PaymentMethod,
} from "../../../lib/orders-api";
import { useCart } from "../../../context/CartContext";
import Loading from "../loading";

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

const PAYMENT_LABEL: Record<string, string> = {
  COD: "Thanh toán khi nhận (COD)",
  VNPAY: "VNPAY QR",
  MOMO: "Ví MoMo",
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

type SortKey = "newest" | "oldest" | "price_desc" | "price_asc";

const CANCEL_REASONS = [
  "Muốn thay đổi địa chỉ hoặc số điện thoại nhận hàng",
  "Muốn đổi cấu hình, màu sắc hoặc sản phẩm khác",
  "Tìm được giá tốt hơn ở nơi khác",
  "Thời gian giao hàng lâu hơn dự kiến",
  "Đặt nhầm sản phẩm",
  "Đổi ý, không muốn mua nữa",
];

// Product thumbnail with error fallback
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
      <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-neutral-200 bg-neutral-50 text-neutral-400">
        <Package className="h-4 w-4" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={44}
      height={44}
      onError={() => setHasError(true)}
      className="h-11 w-11 shrink-0 border border-neutral-200 bg-white object-cover"
      loading="lazy"
    />
  );
};

const OrdersHistoryPage = () => {
  const router = useRouter();
  const { addToCart } = useCart();

  const [allItems, setAllItems] = useState<OrderListItem[]>([]);
  const [detailsMap, setDetailsMap] = useState<Record<string, OrderData>>({});
  const [activeTab, setActiveTab] = useState<TabKey>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals state
  const [cancelModalOrder, setCancelModalOrder] = useState<OrderListItem | null>(null);
  const [itemsModalOrder, setItemsModalOrder] = useState<OrderListItem | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Re-order state
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [isNavigatingToCart, setIsNavigatingToCart] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  }, []);

  const copyOrderCode = (code: string, id: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedId(id);
    showToast(`Đã sao chép mã đơn: ${code}`);
    setTimeout(() => {
      setCopiedId((curr) => (curr === id ? null : curr));
    }, 2000);
  };

  const load = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await getOrders(0, FETCH_SIZE);
      setAllItems(result.items);
    } catch (err) {
      if (err instanceof OrderAuthRequiredError) {
        router.push("/sign-in");
        return;
      }
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Không tải được lịch sử đơn hàng."
      );
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  // Background detail loader for enriched information
  useEffect(() => {
    if (allItems.length === 0) return;
    let isMounted = true;

    const enrichItems = async () => {
      const pendingOrders = allItems.filter(
        (o) => !detailsMap[o.id] && (!o.items || o.items.length === 0)
      );

      const BATCH_SIZE = 3;
      for (let i = 0; i < pendingOrders.length; i += BATCH_SIZE) {
        if (!isMounted) break;
        const batch = pendingOrders.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map((order) => getOrderById(order.id))
        );

        if (!isMounted) break;

        const freshEntries: Record<string, OrderData> = {};
        results.forEach((res, idx) => {
          if (res.status === "fulfilled" && res.value) {
            freshEntries[batch[idx].id] = res.value;
          }
        });

        if (Object.keys(freshEntries).length > 0) {
          setDetailsMap((prev) => ({ ...prev, ...freshEntries }));
        }
      }
    };

    enrichItems();

    return () => {
      isMounted = false;
    };
  }, [allItems]);

  // Stats calculation
  const stats = useMemo(() => {
    let totalSpent = 0;
    let pendingCount = 0;
    let shippingCount = 0;
    let deliveredCount = 0;

    for (const order of allItems) {
      if (order.status !== "CANCELLED" && order.status !== "RETURNED") {
        totalSpent += order.totalAmount;
      }
      if (
        order.status === "PENDING" ||
        order.status === "CONFIRMED" ||
        order.status === "PROCESSING"
      ) {
        pendingCount++;
      } else if (order.status === "SHIPPING") {
        shippingCount++;
      } else if (order.status === "DELIVERED") {
        deliveredCount++;
      }
    }

    return {
      totalOrders: allItems.length,
      totalSpent,
      pendingCount,
      shippingCount,
      deliveredCount,
    };
  }, [allItems]);

  const countByStatus = useMemo(() => {
    const counts: Partial<Record<TabKey, number>> = { ALL: allItems.length };
    for (const order of allItems) {
      counts[order.status] = (counts[order.status] ?? 0) + 1;
    }
    return counts;
  }, [allItems]);

  const visibleItems = useMemo(() => {
    const filtered = allItems.filter((order) => {
      if (activeTab !== "ALL" && order.status !== activeTab) return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const code = (order.orderCode || order.id).toLowerCase();
      const recipient = (order.recipientName || "").toLowerCase();
      const phone = (
        order.recipientPhone ||
        detailsMap[order.id]?.recipientPhone ||
        ""
      ).toLowerCase();

      const items = detailsMap[order.id]?.items ?? order.items ?? [];
      const productMatched = items.some((item) =>
        item.productName.toLowerCase().includes(q)
      );

      return (
        code.includes(q) ||
        recipient.includes(q) ||
        phone.includes(q) ||
        productMatched
      );
    });

    return [...filtered].sort((a, b) => {
      if (sortKey === "newest") {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
      if (sortKey === "oldest") {
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      }
      if (sortKey === "price_desc") {
        return b.totalAmount - a.totalAmount;
      }
      if (sortKey === "price_asc") {
        return a.totalAmount - b.totalAmount;
      }
      return 0;
    });
  }, [allItems, activeTab, searchQuery, sortKey, detailsMap]);

  // Re-order handler
  const handleReorder = (order: OrderListItem) => {
    setIsNavigatingToCart(true);
    const items = detailsMap[order.id]?.items ?? order.items ?? [];
    if (items.length === 0) {
      getOrderById(order.id)
        .then((fresh) => {
          if (fresh?.items) {
            for (const it of fresh.items) {
              const pId = it.productId || (it as unknown as { id: string }).id;
              if (!pId) continue;
              addToCart(String(pId), it.quantity || 1, {
                id: `temp-${pId}`,
                productId: String(pId),
                name: it.productName || "Sản phẩm",
                sku: it.productSku,
                thumbnailUrl: it.productThumbnailUrl || it.thumbnailUrl,
                unitPrice: it.unitPrice,
                originalPrice: it.unitPrice,
                quantity: it.quantity || 1,
                subtotal: it.subtotal || it.unitPrice * (it.quantity || 1),
                stockQuantity: 999,
                available: true,
              }).catch(() => {});
            }
          }
        })
        .catch(() => {});
      router.push("/cart");
      return;
    }

    for (const it of items) {
      const pId = it.productId || (it as unknown as { id: string }).id;
      if (!pId) continue;

      addToCart(String(pId), it.quantity || 1, {
        id: `temp-${pId}`,
        productId: String(pId),
        name: it.productName || "Sản phẩm",
        sku: it.productSku,
        thumbnailUrl: it.productThumbnailUrl || it.thumbnailUrl,
        unitPrice: it.unitPrice,
        originalPrice: it.unitPrice,
        quantity: it.quantity || 1,
        subtotal: it.subtotal || it.unitPrice * (it.quantity || 1),
        stockQuantity: 999,
        available: true,
      }).catch((err) => {
        console.warn("Failed to add item to cart during reorder:", err);
      });
    }

    router.push("/cart");
  };

  // Cancel order handler
  const handleConfirmCancel = async () => {
    if (!cancelModalOrder) return;
    const reason = cancelReason.trim();
    if (!reason) {
      setCancelError("Vui lòng chọn hoặc nhập lý do hủy đơn.");
      return;
    }
    setIsCancelling(true);
    setCancelError(null);
    try {
      const updated = await cancelOrder(cancelModalOrder.id, reason);
      setAllItems((prev) =>
        prev.map((o) =>
          o.id === cancelModalOrder.id ? { ...o, status: "CANCELLED" } : o
        )
      );
      setDetailsMap((prev) => ({ ...prev, [cancelModalOrder.id]: updated }));
      setCancelModalOrder(null);
      setCancelReason("");
      showToast("Đã hủy đơn hàng thành công.");
    } catch (err) {
      setCancelError(
        err instanceof Error ? err.message : "Hủy đơn hàng thất bại."
      );
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading || isNavigatingToCart) {
    return (
      <Loading
        message={
          isNavigatingToCart
            ? "Đang thêm sản phẩm và chuyển tới giỏ hàng..."
            : "Đang tải lịch sử đơn hàng..."
        }
      />
    );
  }

  if (errorMessage && allItems.length === 0) {
    return (
      <div className="font-sans min-h-screen bg-white">
        <div className="mx-auto flex w-[90%] flex-col items-center gap-4 px-4 py-20 text-center">
          <p className="text-sm text-neutral-500">{errorMessage}</p>
          <button
            onClick={() => load()}
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
        <div className="mx-auto flex w-[90%] flex-col items-center gap-4 px-4 py-20 text-center">
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
            className="mt-2 bg-shop_dark_green px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-shop_dark_green/90"
          >
            Tiếp tục mua sắm
          </Link>
        </div>
      </div>
    );
  }

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
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-gray-500 mb-6">
          <Link href="/" className="hover:text-shop_dark_green transition-colors">
            Trang chủ
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">Đơn hàng của tôi</span>
        </nav>

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

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
            {/* Search Input */}
            <div className="w-full sm:w-72">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo mã đơn, người nhận, sản phẩm..."
                className="w-full border border-neutral-300 px-3 py-2 text-xs text-neutral-900 placeholder-neutral-400 transition-colors focus:border-shop_dark_green focus:outline-none"
              />
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-1.5 text-xs text-neutral-500 shrink-0">
              <span className="font-semibold uppercase tracking-wider text-[11px]">
                Sắp xếp:
              </span>
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="border border-neutral-300 px-2 py-2 text-xs text-neutral-900 focus:border-shop_dark_green focus:outline-none bg-white cursor-pointer"
              >
                <option value="newest">Mới nhất</option>
                <option value="oldest">Cũ nhất</option>
                <option value="price_desc">Tổng tiền cao nhất</option>
                <option value="price_asc">Tổng tiền thấp nhất</option>
              </select>
            </div>
          </div>
        </div>

        {/* 4 Overview Metric Blocks (Strictly following the old minimalist border & typography rules) */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 border-b border-neutral-200 pb-6">
          <div className="border border-neutral-200 p-3.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              Tổng số đơn hàng
            </span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-lg font-bold tracking-tight text-neutral-900">
                {stats.totalOrders}
              </span>
              <span className="text-xs text-neutral-500">
                {formatPrice(stats.totalSpent)}
              </span>
            </div>
          </div>

          <div className="border border-neutral-200 p-3.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              Đang chuẩn bị
            </span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-lg font-bold tracking-tight text-neutral-900">
                {stats.pendingCount}
              </span>
              <span className="text-xs text-neutral-400">Chờ duyệt & đóng gói</span>
            </div>
          </div>

          <div className="border border-neutral-200 p-3.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              Đang giao hàng
            </span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-lg font-bold tracking-tight text-neutral-900">
                {stats.shippingCount}
              </span>
              <span className="text-xs text-neutral-400">Đang vận chuyển</span>
            </div>
          </div>

          <div className="border border-neutral-200 p-3.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              Đã giao thành công
            </span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-lg font-bold tracking-tight text-neutral-900">
                {stats.deliveredCount}
              </span>
              <span className="text-xs text-neutral-400">Hoàn tất</span>
            </div>
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
                    ? "border-shop_dark_green text-shop_dark_green"
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
                className="mt-2 text-xs font-semibold text-shop_dark_green underline underline-offset-4 hover:opacity-80"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        )}

        {/* Desktop Table View (Full electronics e-commerce columns, strictly adhering to original font & border rules) */}
        {visibleItems.length > 0 && (
          <div className="mt-4 hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  <th className="py-3 pr-3 text-center w-12">STT</th>
                  <th className="py-3 pr-4">Mã đơn hàng</th>
                  <th className="py-3 pr-4">Ngày đặt</th>
                  <th className="py-3 pr-4">Sản phẩm</th>
                  <th className="py-3 pr-4">Thông tin nhận hàng</th>
                  <th className="py-3 pr-4">Thanh toán</th>
                  <th className="py-3 pr-4">Tổng tiền</th>
                  <th className="py-3 pr-4">Trạng thái</th>
                  <th className="py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-sm">
                {visibleItems.map((order, orderIndex) => {
                  const displayCode =
                    order.orderCode ||
                    `ORD-${order.id.slice(0, 8).toUpperCase()}`;
                  const badgeStyle =
                    STATUS_STYLE[order.status] ?? STATUS_STYLE.PENDING;

                  const detail = detailsMap[order.id];
                  const items = detail?.items ?? order.items ?? [];
                  const firstItem = items[0];

                  const recipient =
                    detail?.recipientName || order.recipientName || "—";
                  const phone =
                    detail?.recipientPhone || order.recipientPhone || "";
                  const address =
                    detail?.shippingAddress || order.shippingAddress || "";

                  const paymentKey =
                    (detail?.paymentMethod ?? order.paymentMethod) || "COD";
                  const paymentText =
                    PAYMENT_LABEL[paymentKey] ?? paymentKey;

                  const canCancel =
                    order.status === "PENDING" || order.status === "CONFIRMED";

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-neutral-50/70 transition-colors"
                    >
                      {/* 0. STT */}
                      <td className="py-4 pr-3 text-center text-xs text-neutral-500 align-top font-mono">
                        {orderIndex + 1}
                      </td>

                      {/* 1. Mã đơn hàng */}
                      <td className="py-4 pr-4 align-top">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-semibold text-neutral-900">
                            {displayCode}
                          </span>
                          <button
                            onClick={() => copyOrderCode(displayCode, order.id)}
                            title="Sao chép mã"
                            className="text-neutral-400 hover:text-neutral-700"
                          >
                            {copiedId === order.id ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* 2. Ngày đặt */}
                      <td className="py-4 pr-4 text-xs text-neutral-500 align-top whitespace-nowrap">
                        {formatDateTime(order.createdAt)}
                      </td>

                      {/* 3. Sản phẩm (Electronics Product Column) */}
                      <td className="py-4 pr-4 align-top min-w-[240px] max-w-[320px]">
                        {firstItem ? (
                          <div className="flex items-start gap-2.5">
                            <ProductThumb
                              src={
                                firstItem.productThumbnailUrl ||
                                firstItem.thumbnailUrl
                              }
                              alt={firstItem.productName}
                            />
                            <div className="flex-1 min-w-0">
                              <Link
                                href={`/orders/${order.id}`}
                                className="line-clamp-1 text-xs font-medium text-neutral-900 hover:underline underline-offset-2"
                              >
                                {firstItem.productName}
                              </Link>
                              <div className="text-[11px] text-neutral-500">
                                {firstItem.productSku && (
                                  <span className="mr-1.5 font-mono text-[10px] text-neutral-600">
                                    [{firstItem.productSku}]
                                  </span>
                                )}
                                {formatPrice(firstItem.unitPrice)} ×{" "}
                                {firstItem.quantity}
                              </div>
                              {items.length > 1 && (
                                <button
                                  onClick={() => setItemsModalOrder(order)}
                                  className="mt-0.5 text-[11px] font-semibold text-neutral-900 underline underline-offset-2"
                                >
                                  +{items.length - 1} sản phẩm khác
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-neutral-600">
                            {order.totalQuantity ?? order.totalItems} sản phẩm
                          </span>
                        )}
                      </td>

                      {/* 4. Thông tin nhận hàng (Chi tiết, rõ ràng) */}
                      <td className="py-4 pr-4 text-xs align-top min-w-[210px] max-w-[270px]">
                        <div className="space-y-1">
                          <div>
                            <span className="text-[11px] text-neutral-500">Người nhận: </span>
                            <span className="font-semibold text-neutral-900">{recipient}</span>
                          </div>

                          {phone ? (
                            <div className="text-[11px]">
                              <span className="text-neutral-500">Số điện thoại: </span>
                              <span className="font-mono text-neutral-800">{phone}</span>
                            </div>
                          ) : null}

                          {address ? (
                            <div className="text-[11px] leading-relaxed break-words">
                              <span className="text-neutral-500">Địa chỉ giao: </span>
                              <span className="text-neutral-700">{address}</span>
                            </div>
                          ) : (
                            <div className="text-[11px] text-neutral-400">
                              <span className="text-neutral-500">Địa chỉ giao: </span>
                              <span>Đang cập nhật...</span>
                            </div>
                          )}

                          {detail?.note && (
                            <div className="text-[11px] text-neutral-600 line-clamp-1">
                              <span className="text-neutral-500">Ghi chú: </span>
                              <span className="text-neutral-700 italic">{detail.note}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 5. Thanh toán */}
                      <td className="py-4 pr-4 text-xs text-neutral-700 align-top whitespace-nowrap">
                        <span>{paymentText}</span>
                      </td>

                      {/* 6. Tổng tiền */}
                      <td className="py-4 pr-4 font-semibold text-neutral-900 align-top whitespace-nowrap">
                        <div>{formatPrice(order.totalAmount)}</div>
                        <span className="text-[11px] font-normal text-neutral-500">
                          {order.totalQuantity ?? order.totalItems} sản phẩm
                        </span>
                      </td>

                      {/* 7. Trạng thái */}
                      <td className="py-4 pr-4 text-xs text-neutral-700 align-top whitespace-nowrap">
                        <span>{STATUS_LABEL[order.status] ?? order.status}</span>
                      </td>

                      {/* 8. Thao tác */}
                      <td className="py-4 text-right align-top whitespace-nowrap">
                        <div className="flex flex-col items-end gap-1.5">
                          <Link
                            href={`/orders/${order.id}`}
                            className="inline-block bg-shop_dark_green text-white px-3 py-1 text-xs font-semibold hover:bg-shop_dark_green/90 transition-colors"
                          >
                            Chi tiết &rarr;
                          </Link>

                          {order.status === "DELIVERED" && (
                            <button
                              onClick={() => handleReorder(order)}
                              disabled={reorderingId === order.id}
                              className="inline-block border border-shop_dark_green text-shop_dark_green hover:bg-shop_dark_green hover:text-white px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-50"
                            >
                              {reorderingId === order.id
                                ? "Đang thêm..."
                                : "Mua lại"}
                            </button>
                          )}

                          {canCancel && (
                            <button
                              onClick={() => {
                                setCancelModalOrder(order);
                                setCancelReason("");
                                setCancelError(null);
                              }}
                              className="text-xs font-medium text-neutral-500 hover:text-red-600 hover:underline underline-offset-4"
                            >
                              Hủy đơn
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Mobile List View (Enriched with product & payment details according to original mobile style) */}
        {visibleItems.length > 0 && (
          <div className="mt-4 divide-y divide-neutral-200 border-t border-neutral-200 md:hidden">
            {visibleItems.map((order) => {
              const displayCode =
                order.orderCode || `ORD-${order.id.slice(0, 8).toUpperCase()}`;
              const badgeStyle =
                STATUS_STYLE[order.status] ?? STATUS_STYLE.PENDING;

              const detail = detailsMap[order.id];
              const items = detail?.items ?? order.items ?? [];
              const firstItem = items[0];

              const recipient =
                detail?.recipientName || order.recipientName || "";
              const phone =
                detail?.recipientPhone || order.recipientPhone || "";
              const address =
                detail?.shippingAddress || order.shippingAddress || "";

              const paymentKey =
                (detail?.paymentMethod ?? order.paymentMethod) || "COD";
              const paymentText =
                PAYMENT_LABEL[paymentKey] ?? paymentKey;

              const canCancel =
                order.status === "PENDING" || order.status === "CONFIRMED";

              return (
                <div key={order.id} className="py-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-neutral-900">
                        {displayCode}
                      </span>
                      <button
                        onClick={() => copyOrderCode(displayCode, order.id)}
                        className="text-neutral-400 hover:text-neutral-700"
                        title="Sao chép"
                      >
                        {copiedId === order.id ? (
                          <Check className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>

                    <span className="text-[11px] font-medium text-neutral-700">
                      {STATUS_LABEL[order.status] ?? order.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <span>{formatDateTime(order.createdAt)}</span>
                    <span>
                      {order.totalQuantity ?? order.totalItems} sản phẩm
                    </span>
                  </div>

                  {/* Product preview on mobile */}
                  {firstItem && (
                    <div className="flex items-start gap-2.5 border-t border-neutral-100 pt-2">
                      <ProductThumb
                        src={
                          firstItem.productThumbnailUrl ||
                          firstItem.thumbnailUrl
                        }
                        alt={firstItem.productName}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-neutral-900 line-clamp-1">
                          {firstItem.productName}
                        </p>
                        <p className="text-[11px] text-neutral-500">
                          {formatPrice(firstItem.unitPrice)} × {firstItem.quantity}
                        </p>
                        {items.length > 1 && (
                          <button
                            onClick={() => setItemsModalOrder(order)}
                            className="text-[11px] font-semibold text-neutral-900 underline underline-offset-2"
                          >
                            +{items.length - 1} sản phẩm khác
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {recipient && (
                    <div className="text-xs text-neutral-700 space-y-1">
                      <div>
                        <span className="text-neutral-500">Người nhận: </span>
                        <strong className="text-neutral-900">{recipient}</strong>
                        {phone && <span className="ml-1 text-neutral-600">({phone})</span>}
                      </div>
                      {address && (
                        <p className="text-[11px] text-neutral-600 leading-relaxed break-words">
                          <span className="text-neutral-500">Địa chỉ giao: </span>
                          <span>{address}</span>
                        </p>
                      )}
                      {detail?.note && (
                        <p className="text-[11px] text-neutral-500 italic">
                          <span>Ghi chú: </span>
                          <span>{detail.note}</span>
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <span>Hình thức thanh toán:</span>
                    <span className="font-medium text-neutral-800">
                      {paymentText}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-neutral-100">
                    <span className="text-sm font-bold text-neutral-900">
                      {formatPrice(order.totalAmount)}
                    </span>
                    <div className="flex items-center gap-2">
                      {order.status === "DELIVERED" && (
                        <button
                          onClick={() => handleReorder(order)}
                          disabled={reorderingId === order.id}
                          className="border border-shop_dark_green text-shop_dark_green hover:bg-shop_dark_green hover:text-white px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          Mua lại
                        </button>
                      )}

                      {canCancel && (
                        <button
                          onClick={() => {
                            setCancelModalOrder(order);
                            setCancelReason("");
                            setCancelError(null);
                          }}
                          className="text-xs font-medium text-neutral-500 hover:text-red-600 underline underline-offset-4"
                        >
                          Hủy đơn
                        </button>
                      )}

                      <Link
                        href={`/orders/${order.id}`}
                        className="bg-shop_dark_green text-white px-3 py-1 text-xs font-semibold hover:bg-shop_dark_green/90 transition-colors"
                      >
                        Chi tiết &rarr;
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Hủy đơn hàng (Strictly following original borders and font rules) */}
      {cancelModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md border border-neutral-300 bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-tight text-neutral-900">
                Xác nhận hủy đơn hàng
              </h3>
              <button
                onClick={() => setCancelModalOrder(null)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              <p className="text-xs text-neutral-600">
                Bạn có chắc chắn muốn hủy đơn hàng{" "}
                <strong className="font-mono text-neutral-900">
                  {cancelModalOrder.orderCode || cancelModalOrder.id}
                </strong>
                ? Vui lòng chọn lý do:
              </p>

              <div className="space-y-1.5">
                {CANCEL_REASONS.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => {
                      setCancelReason(reason);
                      setCancelError(null);
                    }}
                    className={`w-full border p-2 text-left text-xs transition-colors ${
                      cancelReason === reason
                        ? "border-shop_dark_green bg-shop_dark_green/10 font-semibold text-shop_dark_green"
                        : "border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>

              <div>
                <textarea
                  value={cancelReason}
                  onChange={(e) => {
                    setCancelReason(e.target.value);
                    setCancelError(null);
                  }}
                  rows={2}
                  placeholder="Hoặc nhập lý do khác..."
                  className="w-full border border-neutral-300 p-2 text-xs text-neutral-900 placeholder-neutral-400 focus:border-shop_dark_green focus:outline-none"
                />
              </div>

              {cancelError && (
                <p className="text-xs font-semibold text-red-600">
                  {cancelError}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-neutral-200 pt-4">
              <button
                type="button"
                onClick={() => setCancelModalOrder(null)}
                disabled={isCancelling}
                className="border border-neutral-300 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isCancelling}
                className="bg-shop_dark_green px-4 py-2 text-xs font-semibold text-white hover:bg-shop_dark_green/90 disabled:opacity-50 transition-colors"
              >
                {isCancelling ? "Đang hủy..." : "Xác nhận hủy đơn"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Xem toàn bộ sản phẩm của đơn (Original border & font rules) */}
      {itemsModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg border border-neutral-300 bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-tight text-neutral-900">
                  Sản phẩm trong đơn
                </h3>
                <span className="font-mono text-xs text-neutral-500">
                  {itemsModalOrder.orderCode || itemsModalOrder.id}
                </span>
              </div>
              <button
                onClick={() => setItemsModalOrder(null)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto py-3 divide-y divide-neutral-100">
              {(
                detailsMap[itemsModalOrder.id]?.items ??
                itemsModalOrder.items ??
                []
              ).map((it, idx) => (
                <div key={it.id} className="flex items-center gap-3 py-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[11px] font-semibold text-neutral-600 font-mono">
                    {idx + 1}
                  </span>
                  <ProductThumb
                    src={it.productThumbnailUrl || it.thumbnailUrl}
                    alt={it.productName}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-neutral-900 line-clamp-1">
                      {it.productName}
                    </p>
                    {it.productSku && (
                      <span className="text-[10px] font-mono text-neutral-500">
                        [{it.productSku}]
                      </span>
                    )}
                    <p className="text-[11px] text-neutral-500">
                      {formatPrice(it.unitPrice)} × {it.quantity}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-neutral-900 whitespace-nowrap">
                    {formatPrice(it.subtotal)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-neutral-200 pt-4">
              <div>
                <span className="text-xs text-neutral-500">Tổng tiền:</span>
                <p className="text-sm font-bold text-neutral-900">
                  {formatPrice(itemsModalOrder.totalAmount)}
                </p>
              </div>

              <Link
                href={`/orders/${itemsModalOrder.id}`}
                className="bg-shop_dark_green px-4 py-2 text-xs font-semibold text-white hover:bg-shop_dark_green/90 transition-colors"
              >
                Chi tiết &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersHistoryPage;