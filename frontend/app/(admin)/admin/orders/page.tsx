"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  PackageSearch,
  Search,
  ArrowLeft,
  ImageOff,
  Loader2,
} from "lucide-react";
import Loading from "@/app/(client)/loading";
import {
  getAdminOrders,
  getAdminOrderById,
  getAdminPaymentByOrderId,
  updateOrderStatus,
  OrderAuthRequiredError,
  type AdminOrderListItem,
  type AdminOrderDetail,
} from "../../../../lib/admin-orders-api";
import {
  type OrderStatus,
  type PaymentStatus,
} from "../../../../lib/orders-api";
import StatusBadge from "@/components/admin/StatusBadge";
import { getToken } from "@/lib/auth";
import { broadcastTabEvent } from "@/lib/tab-sync";

const PAGE_SIZE = 10;

type AdminPayment = {
  status?: string | null;
  paymentMethod?: string | null;
  transactionCode?: string | null;
  providerTransactionId?: string | null;
  failureReason?: string | null;
  paidAt?: string | null;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "https://techwiseai-prod.up.railway.app/api/v1";

const ITEM_IMAGE_KEYS = [
  "thumbnailUrl",
  "productThumbnailUrl",
  "productImage",
  "imageUrl",
  "image",
  "thumbnail",
];

const formatPrice = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    value
  );

const formatDateTime = (iso?: string | null) => {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

const pick = (obj: unknown, keys: string[]): unknown => {
  if (!obj || typeof obj !== "object") return undefined;
  const o = obj as Record<string, unknown>;
  for (const key of keys) {
    if (o[key] !== undefined && o[key] !== null && o[key] !== "") return o[key];
  }
  return undefined;
};

const pickString = (obj: unknown, keys: string[]): string | null => {
  const v = pick(obj, keys);
  return typeof v === "string" || typeof v === "number" ? String(v) : null;
};

const pickNumber = (obj: unknown, keys: string[]): number | null => {
  const v = pick(obj, keys);
  return typeof v === "number" ? v : null;
};

const PAYMENT_LABELS: Record<string, string> = {
  COD: "Thanh toán khi nhận hàng",
  BANK_TRANSFER: "Chuyển khoản",
  CREDIT_CARD: "Thẻ tín dụng",
  VNPAY: "VNPay",
  MOMO: "MoMo",
};

const PAYMENT_METHOD_KEYS = [
  "paymentMethod",
  "paymentMethodName",
  "paymentMethodCode",
  "paymentType",
  "payment_method",
  "method",
];

const getPaymentLabel = (order: unknown): string | null => {
  let raw = pick(order, PAYMENT_METHOD_KEYS);
  if (!raw) {

    const nested =
      pick(order, ["payment", "paymentInfo", "paymentDetail"]) ??
      (() => {
        const list = pick(order, ["payments"]);
        return Array.isArray(list) ? list[0] : undefined;
      })();
    raw = pick(nested, [...PAYMENT_METHOD_KEYS, "code", "name"]);
  }
  if (raw && typeof raw === "object") {
    raw = pick(raw, ["code", "method", "name"]);
  }
  if (typeof raw !== "string" || !raw.trim()) return null;
  return PAYMENT_LABELS[raw.trim().toUpperCase()] ?? raw.trim();
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
  { key: "RETURNED", label: "Trả hàng" },
];

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  PROCESSING: "Đang xử lý",
  SHIPPING: "Đang giao",
  DELIVERED: "Đã giao",
  CANCELLED: "Đã hủy",
  RETURNED: "Trả hàng",
};

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Chưa thanh toán",
  PAID: "Đã thanh toán",
  FAILED: "Thanh toán thất bại",
  CANCELLED: "Đã hủy thanh toán",
};

const PROGRESS_STEPS: { status: OrderStatus; label: string; hint: string }[] = [
  { status: "PENDING", label: "Khách đặt hàng", hint: "Đơn đã được tạo" },
  { status: "CONFIRMED", label: "Cửa hàng xác nhận", hint: "Chờ xác nhận" },
  { status: "PROCESSING", label: "Chuẩn bị hàng", hint: "Chờ xử lý" },
  { status: "SHIPPING", label: "Bàn giao vận chuyển", hint: "Chờ giao hàng" },
  { status: "DELIVERED", label: "Giao thành công", hint: "Chờ giao hàng" },
];

const NEXT_ACTION: Partial<
  Record<OrderStatus, { next: OrderStatus; label: string }>
> = {
  PENDING: { next: "CONFIRMED", label: "Xác nhận đơn" },
  CONFIRMED: { next: "PROCESSING", label: "Bắt đầu xử lý" },
  PROCESSING: { next: "SHIPPING", label: "Giao cho vận chuyển" },
  SHIPPING: { next: "DELIVERED", label: "Đã giao hàng" },
};

const getNextAction = (
  orderStatus: OrderStatus,
  paymentMethod?: string | null
): { next: OrderStatus; label: string } | undefined => {
  const isVnpay =
    paymentMethod === "VNPAY" ||
    paymentMethod?.toUpperCase().includes("VNPAY");
  if (orderStatus === "PENDING" && isVnpay) {
    return { next: "PROCESSING", label: "Chuẩn bị hàng" };
  }
  return NEXT_ACTION[orderStatus];
};

const getHistoryTime = (
  detail: AdminOrderDetail,
  status: OrderStatus
): string | null => {
  const history = (detail.statusHistory ?? []) as unknown[];
  const found = history.find((h) => pickString(h, ["newStatus", "status", "toStatus"]) === status);
  return found
    ? pickString(found, ["createdAt", "changedAt", "updatedAt", "timestamp"])
    : null;
};

const CANCELLABLE_STATUSES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
];

const CANCEL_REASONS = [
  "Khách yêu cầu hủy đơn",
  "Hết hàng",
  "Không liên lạc được với khách",
  "Thông tin giao hàng không hợp lệ",
  "Khách chưa thanh toán",
];

const getHistoryNote = (
  detail: AdminOrderDetail,
  status: OrderStatus
): string | null => {
  const history = (detail.statusHistory ?? []) as unknown[];
  const found = history.find(
    (h) => pickString(h, ["newStatus", "status", "toStatus"]) === status
  );
  return found
    ? pickString(found, ["note", "reason", "cancelReason", "comment"])
    : null;
};

const ONLINE_PAYMENT_METHODS = ["VNPAY", "MOMO"];

const isAwaitingPayment = (
  detail: AdminOrderDetail,
  paymentStatus?: string | null
): boolean => {
  if (detail.status !== "PENDING") return false;
  const method = String(pick(detail, PAYMENT_METHOD_KEYS) ?? "")
    .trim()
    .toUpperCase();
  return (
    ONLINE_PAYMENT_METHODS.includes(method) &&
    (paymentStatus ?? detail.paymentStatus) !== "PAID"
  );
};

const Card = ({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`bg-white border border-neutral-200 p-4 sm:p-5 ${className}`}
  >
    {(title || action) && (
      <div className="flex items-center justify-between border-b border-neutral-200 pb-3 mb-4">
        {title && <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900">{title}</h3>}
        {action}
      </div>
    )}
    {children}
  </div>
);

const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-4 py-1.5 text-xs leading-normal">
    <span className="text-neutral-500 shrink-0">{label}:</span>
    <span className="font-semibold text-neutral-900 text-right break-words min-w-0">
      {value}
    </span>
  </div>
);

type OrdersSnapshot = { items: AdminOrderListItem[]; totalPages: number; totalElements: number; at: number };
const orderSnapshots = new Map<string, OrdersSnapshot>();
const ORDER_SNAPSHOT_MS = 2 * 60 * 1000;
const orderKey = (tab: TabKey, page: number) => JSON.stringify([getToken(), tab, page]);
let countsSnapshot: { token: string | null; counts: Partial<Record<TabKey, number>>; at: number } | null = null;

const AdminOrdersPage = () => {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabKey>("ALL");
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<AdminOrderListItem[]>(() => orderSnapshots.get(orderKey("ALL", 0))?.items ?? []);
  const [totalPages, setTotalPages] = useState(() => orderSnapshots.get(orderKey("ALL", 0))?.totalPages ?? 1);
  const [totalElements, setTotalElements] = useState(() => orderSnapshots.get(orderKey("ALL", 0))?.totalElements ?? 0);
  const [isLoading, setIsLoading] = useState(() => !orderSnapshots.has(orderKey("ALL", 0)));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");

  const [statusCounts, setStatusCounts] = useState<
    Partial<Record<TabKey, number>>
  >(() => countsSnapshot?.token === getToken() ? countsSnapshot.counts : {});

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminOrderDetail | null>(null);

  const [payment, setPayment] = useState<AdminPayment | null>(null);

  const [productImages, setProductImages] = useState<Record<string, string>>({});
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState<string | null>(null);

  const [titleSlot, setTitleSlot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setTitleSlot(document.getElementById("admin-header-title"));
  }, []);

  const handleError = useCallback(
    (err: unknown, fallback: string): string | null => {
      if (err instanceof OrderAuthRequiredError) {
        router.push("/sign-in");
        return null;
      }
      const message = err instanceof Error ? err.message : fallback;
      return message.includes("(403)")
        ? "Tài khoản của bạn không có quyền quản trị (ROLE_ADMIN)."
        : message;
    },
    [router]
  );

  const loadCounts = useCallback(async () => {
    if (countsSnapshot?.token === getToken() && Date.now() - countsSnapshot.at < ORDER_SNAPSHOT_MS) {
      setStatusCounts(countsSnapshot.counts);
      return;
    }
    const entries = await Promise.all(
      TABS.map(async (tab) => {
        try {
          const res = await getAdminOrders({
            page: 0,
            size: 1,
            status: tab.key === "ALL" ? undefined : tab.key,
          });
          const raw = res as unknown as Record<string, unknown>;
          const list = Array.isArray(raw.items)
            ? raw.items
            : Array.isArray(raw.content)
            ? raw.content
            : [];
          return [tab.key, (raw.totalElements as number) ?? list.length] as const;
        } catch {
          return null;
        }
      })
    );
    const counts = Object.fromEntries(entries.filter((e): e is readonly [TabKey, number] => e !== null));
    setStatusCounts((prev) => {
      const merged = { ...prev, ...counts };
      countsSnapshot = { token: getToken(), counts: merged, at: Date.now() };
      return merged;
    });
  }, []);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      const key = orderKey(activeTab, page);
      const snapshot = orderSnapshots.get(key);
      if (snapshot) {
        setItems(snapshot.items);
        setTotalPages(snapshot.totalPages);
        setTotalElements(snapshot.totalElements);
        setIsLoading(false);
        setSelectedId((cur) => cur && snapshot.items.some((o) => o.id === cur) ? cur : snapshot.items[0]?.id ?? null);
        if (Date.now() - snapshot.at < ORDER_SNAPSHOT_MS) return;
      } else {
        setIsLoading(true);
      }
      setErrorMessage(null);
      try {
        const result = await getAdminOrders({
          page,
          size: PAGE_SIZE,
          status: activeTab === "ALL" ? undefined : activeTab,
        });
        if (ignore) return;

        const raw = result as unknown as Record<string, unknown>;
        const list = (
          Array.isArray(raw.items)
            ? raw.items
            : Array.isArray(raw.content)
            ? raw.content
            : []
        ) as AdminOrderListItem[];

        const tabTotal = (raw.totalElements as number) ?? list.length;
        setItems(list);
        setTotalPages((raw.totalPages as number) ?? 1);
        setTotalElements(tabTotal);
        setStatusCounts((prev) => ({ ...prev, [activeTab]: tabTotal }));
        orderSnapshots.set(key, {
          items: list, totalPages: (raw.totalPages as number) ?? 1,
          totalElements: tabTotal, at: Date.now(),
        });

        setSelectedId((cur) =>
          cur && list.some((o) => o.id === cur) ? cur : list[0]?.id ?? null
        );
      } catch (err) {
        if (ignore) return;
        const msg = handleError(err, "Không tải được danh sách đơn hàng.");
        if (msg) setErrorMessage(msg);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };

    load();
    return () => {
      ignore = true;
    };
  }, [activeTab, page, handleError]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let ignore = false;

    const loadDetail = async () => {
      setIsDetailLoading(true);
      setDetail(null);
      setDetailError(null);
      setPayment(null);
      try {

        const [result, pay] = await Promise.all([
          getAdminOrderById(selectedId),
          getAdminPaymentByOrderId(selectedId).catch(() => null),
        ]);
        if (!ignore) {
          setDetail(result);
          setPayment(pay);
        }
      } catch (err) {
        if (ignore) return;
        const msg = handleError(err, "Không tải được chi tiết đơn hàng.");
        if (msg) setDetailError(msg);
      } finally {
        if (!ignore) setIsDetailLoading(false);
      }
    };

    loadDetail();
    return () => {
      ignore = true;
    };
  }, [selectedId, handleError]);

  useEffect(() => {
    if (!selectedId || !detail || detail.id !== selectedId) return;
    const method = String(pick(detail, PAYMENT_METHOD_KEYS) ?? "").toUpperCase();
    if (
      method === "COD" ||
      payment?.status === "PAID" ||
      detail.paymentStatus === "PAID"
    )
      return;

    let ignore = false;
    const refresh = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const [fresh, pay] = await Promise.all([
          getAdminOrderById(selectedId),
          getAdminPaymentByOrderId(selectedId).catch(() => null),
        ]);
        if (!ignore) {
          setDetail(fresh);
          setPayment(pay);
        }
      } catch {

      }
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      ignore = true;
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [selectedId, detail, payment]);

  useEffect(() => {
    if (!detail) return;
    const ids = Array.from(
      new Set(
        ((detail.items ?? []) as unknown[])
          .filter((it) => !pickString(it, ITEM_IMAGE_KEYS))
          .map((it) => pickString(it, ["productId"]))
          .filter((id): id is string => !!id)
      )
    );
    if (ids.length === 0) return;
    let ignore = false;

    Promise.all(
      ids.map(async (id) => {
        try {
          const res = await fetch(`${API_BASE_URL}/products/${id}`, {
            cache: "no-store",
          });
          if (!res.ok) return null;
          const json = await res.json();
          const data = json?.data ?? json;
          const firstImage = Array.isArray(data?.images) ? data.images[0] : null;
          const url =
            pickString(data, ["thumbnailUrl", "imageUrl", "image"]) ??
            pickString(firstImage, ["imageUrl", "url"]);
          return url ? ([id, url] as const) : null;
        } catch {
          return null;
        }
      })
    ).then((pairs) => {
      if (ignore) return;
      const found = Object.fromEntries(
        pairs.filter((x): x is readonly [string, string] => x !== null)
      );
      if (Object.keys(found).length > 0) {
        setProductImages((prev) => ({ ...prev, ...found }));
      }
    });

    return () => {
      ignore = true;
    };
  }, [detail]);

  const changeTab = (key: TabKey) => {
    setActiveTab(key);
    setPage(0);
  };

  const handleAdvanceStatus = async () => {
    if (!detail) return;
    const paymentLabel = getPaymentLabel(detail);
    const action = getNextAction(
      detail.status,
      paymentLabel ?? (detail as unknown as { paymentMethod?: string }).paymentMethod
    );
    if (!action) return;
    if (isAwaitingPayment(detail, payment?.status)) {
      setDetailError("Đơn thanh toán online phải được thanh toán trước khi xác nhận.");
      return;
    }
    setIsUpdating(true);
    setDetailError(null);
    try {
      const updated = await updateOrderStatus(detail.id, { status: action.next });
      setDetail(updated);
      setItems((prev) =>
        prev.map((o) =>
          o.id === updated.id ? { ...o, status: updated.status } : o
        )
      );

      orderSnapshots.clear();
      countsSnapshot = null;
      window.dispatchEvent(new Event("admin-orders-changed"));
      broadcastTabEvent({ type: "ADMIN_ORDERS_CHANGED" });

      loadCounts();
    } catch (err) {
      const msg = handleError(err, "Không cập nhật được trạng thái đơn hàng.");
      if (msg) setDetailError(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  const openCancelDialog = () => {
    if (!detail || !CANCELLABLE_STATUSES.includes(detail.status)) return;
    setCancelReason("");
    setCancelError(null);
    setCancelOpen(true);
  };

  const closeCancelDialog = () => {
    if (isUpdating) return;
    setCancelOpen(false);
  };

  const handleConfirmCancel = async () => {
    if (!detail || !CANCELLABLE_STATUSES.includes(detail.status)) return;
    const reason = cancelReason.trim();
    if (!reason) {
      setCancelError("Vui lòng nhập lý do hủy đơn.");
      return;
    }
    setIsUpdating(true);
    setCancelError(null);
    setDetailError(null);
    try {

      const updated = await updateOrderStatus(detail.id, {
        status: "CANCELLED",
        note: reason,
      });
      setDetail(updated);
      setItems((prev) =>
        prev.map((o) =>
          o.id === updated.id ? { ...o, status: updated.status } : o
        )
      );
      setCancelOpen(false);
      orderSnapshots.clear();
      countsSnapshot = null;
      window.dispatchEvent(new Event("admin-orders-changed"));
      broadcastTabEvent({ type: "ADMIN_ORDERS_CHANGED" });
      loadCounts();
    } catch (err) {
      const msg = handleError(err, "Không hủy được đơn hàng.");
      if (msg) setCancelError(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  const visibleItems = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        (o.customerName ?? "").toLowerCase().includes(q)
    );
  }, [items, keyword]);

  if (isLoading && items.length === 0) {
    return <Loading message="Đang tải danh sách đơn hàng..." />;
  }

  const listColumn = (
    <aside
      className={`${
        selectedId ? "hidden lg:flex" : "flex"
      } flex-col gap-4 min-w-0 lg:w-[380px] lg:shrink-0`}
    >
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Tìm theo mã đơn hoặc tên khách..."
          className="w-full h-10 pl-9 pr-3 text-xs bg-white border border-neutral-300 outline-none placeholder:text-neutral-400 focus:border-shop_dark_green focus:ring-1 focus:ring-shop_dark_green transition-colors"
        />
      </div>

      <div>
        <div className="flex flex-wrap gap-1.5">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => changeTab(tab.key)}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                activeTab === tab.key
                  ? "bg-shop_dark_green text-white shadow-sm border border-shop_dark_green"
                  : "bg-white text-neutral-600 border border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900"
              }`}
            >
              {tab.label}
              {statusCounts[tab.key] !== undefined && (
                <span
                  className={`inline-flex items-center justify-center h-4 min-w-4 px-1 text-[10px] font-mono font-semibold ${
                    activeTab === tab.key
                      ? "bg-white/20 text-white"
                      : "bg-neutral-100 text-neutral-700"
                  }`}
                >
                  {statusCounts[tab.key]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-shop_dark_green">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-xs font-medium text-neutral-500">
            Đang tải danh sách đơn hàng...
          </span>
        </div>
      ) : errorMessage ? (
        <div className="flex flex-col items-center text-center gap-2 py-16 border border-neutral-200 bg-white p-6">
          <PackageSearch className="w-8 h-8 text-neutral-300" />
          <p className="text-xs text-neutral-500">{errorMessage}</p>
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="flex flex-col items-center text-center gap-2 py-16 border border-neutral-200 bg-white p-6">
          <PackageSearch className="w-8 h-8 text-neutral-300" />
          <p className="text-xs text-neutral-500">Không có đơn hàng phù hợp.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {visibleItems.map((order) => {
              const active = order.id === selectedId;
              return (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => setSelectedId(order.id)}
                  className={`text-left bg-white border p-3.5 transition-colors ${
                    active
                      ? "border-shop_dark_green ring-1 ring-shop_dark_green/40 bg-neutral-50/50"
                      : "border-neutral-200 hover:border-neutral-400"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold font-mono uppercase text-neutral-900 truncate">
                      {order.orderCode ?? `#${order.id.slice(0, 8)}`}
                    </p>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="text-xs text-neutral-500 mt-1 truncate">
                    {order.customerName || "Khách vãng lai"}
                  </p>
                  <div className="mt-2.5 pt-2 border-t border-neutral-100 flex items-center justify-between text-xs">
                    <span className="font-mono text-[11px] text-neutral-400">
                      {formatDateTime(order.createdAt)}
                    </span>
                    <span className="font-bold text-sm text-neutral-900 tabular-nums">
                      {formatPrice(order.totalAmount)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-2 text-xs text-neutral-500 pt-1">
            <span className="font-mono">{totalElements} đơn hàng</span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-1 border border-neutral-300 bg-white text-neutral-600 hover:border-shop_dark_green disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Trang trước"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-xs">
                  {page + 1} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-1 border border-neutral-300 bg-white text-neutral-600 hover:border-shop_dark_green disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Trang sau"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  );

  const renderDetail = () => {
    if (isDetailLoading || (!detail && selectedId)) {
      return (
        <div className="border border-neutral-200 bg-white p-8">
          <Loading message="Đang tải chi tiết đơn hàng..." className="min-h-[380px]" />
        </div>
      );
    }
    if (detailError && !detail) {
      return (
        <div className="flex flex-col items-center text-center gap-2 py-24 border border-neutral-200 bg-white p-6">
          <PackageSearch className="w-10 h-10 text-neutral-300" />
          <p className="text-xs text-neutral-500">{detailError}</p>
        </div>
      );
    }
    if (!detail) {
      return (
        <div className="flex flex-col items-center text-center gap-2 py-24 border border-neutral-200 bg-white p-6">
          <PackageSearch className="w-10 h-10 text-neutral-300" />
          <p className="text-xs text-neutral-500">
            Chọn một đơn hàng từ danh sách để xem chi tiết.
          </p>
        </div>
      );
    }

    const paymentLabel = getPaymentLabel(detail) ?? null;
    const action = getNextAction(
      detail.status,
      paymentLabel ?? (detail as unknown as { paymentMethod?: string }).paymentMethod
    );
    const awaitingPayment = isAwaitingPayment(detail, payment?.status);
    const currentIndex = PROGRESS_STEPS.findIndex(
      (s) => s.status === detail.status
    );
    const cancelled = detail.status === "CANCELLED";
    const itemsList = (detail.items ?? []) as unknown[];
    const paymentStatusValue = payment?.status ?? detail.paymentStatus ?? null;
    const paymentStatusLabel = paymentStatusValue
      ? PAYMENT_STATUS_LABELS[paymentStatusValue as PaymentStatus] ??
        paymentStatusValue
      : paymentLabel === PAYMENT_LABELS.COD
      ? "Thu tiền khi giao hàng"
      : "Chưa có thông tin";

    return (
      <div className={`space-y-5 ${isDetailLoading ? "opacity-60" : ""}`}>
        {/* Navigation & Header Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-4">
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="lg:hidden inline-flex items-center gap-1 font-semibold text-neutral-800 hover:text-shop_dark_green"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Quay lại
            </button>
            <span className="hidden lg:inline">Đơn hàng</span>
            <span className="hidden lg:inline">/</span>
            <span className="font-mono text-xs font-bold text-shop_dark_green bg-shop_dark_green/10 px-2 py-0.5">
              {detail.orderCode ?? `#${detail.id.slice(0, 8)}`}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {action && (
              <button
                type="button"
                onClick={handleAdvanceStatus}
                disabled={isUpdating || awaitingPayment}
                title={awaitingPayment ? "Chờ khách thanh toán xong mới xác nhận được" : undefined}
                className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white bg-shop_dark_green hover:bg-shop_dark_green/90 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdating ? "Đang cập nhật..." : action.label}
              </button>
            )}

            {CANCELLABLE_STATUSES.includes(detail.status) && (
              <button
                type="button"
                onClick={openCancelDialog}
                disabled={isUpdating}
                className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-red-600 border border-red-200 bg-white hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Hủy đơn hàng
              </button>
            )}
          </div>
        </div>

        {awaitingPayment && (
          <div className="border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 font-medium">
            Đơn thanh toán qua {paymentLabel ?? "online"} — chỉ xác nhận được sau
            khi khách hàng thanh toán thành công.
          </div>
        )}

        {detailError && (
          <div className="border border-red-200 bg-red-50 p-3 text-xs text-red-600 font-medium">
            {detailError}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] gap-5 items-start">
          {/* Left Column: Items and Invoice */}
          <div className="space-y-5 min-w-0">
            <Card title={`Danh sách sản phẩm (${itemsList.length})`}>
              <div className="divide-y divide-neutral-100 -mx-4 -mb-4 sm:-mx-5 sm:-mb-5">
                {itemsList.length === 0 ? (
                  <p className="p-5 text-xs text-neutral-400">
                    Đơn hàng chưa có sản phẩm.
                  </p>
                ) : (
                  itemsList.map((item, idx) => {
                    const name =
                      pickString(item, ["productName", "name", "title"]) ??
                      pickString(pick(item, ["product"]), ["name", "title"]) ??
                      "Sản phẩm";
                    const productId = pickString(item, ["productId", "id"]);
                    const image =
                      pickString(item, ITEM_IMAGE_KEYS) ??
                      pickString(pick(item, ["product"]), ["thumbnailUrl", "imageUrl", "image"]) ??
                      (productId ? productImages[productId] : null);
                    const qty = pickNumber(item, ["quantity", "qty"]) ?? 1;
                    const unit = pickNumber(item, ["unitPrice", "price"]);
                    const lineTotal =
                      pickNumber(item, ["totalPrice", "subtotal", "lineTotal"]) ??
                      (unit !== null ? unit * qty : null);

                    return (
                      <div key={`${productId ?? "item"}-${idx}`} className="flex items-center gap-3 p-4 hover:bg-neutral-50/50 transition-colors">
                        <div className="w-14 h-14 shrink-0 border border-neutral-200 bg-white flex items-center justify-center overflow-hidden">
                          {image ? (
                            <img src={typeof image === "string" ? image : (image as { src: string }).src} alt={name} className="w-full h-full object-cover" />
                          ) : (
                            <ImageOff className="w-5 h-5 text-neutral-300" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-neutral-900 hover:text-shop_dark_green truncate transition-colors">
                            {name}
                          </p>
                          <p className="text-[11px] font-mono text-neutral-400 mt-0.5 truncate">
                            {productId ? `[${productId.slice(0, 8)}] ` : ""}
                            Đơn giá: {unit !== null ? formatPrice(unit) : "—"} × {qty}
                          </p>
                        </div>
                        <p className="text-sm font-bold text-neutral-900 tabular-nums shrink-0">
                          {lineTotal !== null ? formatPrice(lineTotal) : "—"}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </div>

          {/* Right Column: Progress & Customer Info */}
          <div className="space-y-5 min-w-0">
            <Card title="Tiến trình đơn hàng">
              {cancelled ? (
                <div className="space-y-1.5 p-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-red-600">
                    Đơn hàng đã bị hủy
                    {getHistoryTime(detail, "CANCELLED")
                      ? ` lúc ${formatDateTime(getHistoryTime(detail, "CANCELLED"))}`
                      : "."}
                  </p>
                  {getHistoryNote(detail, "CANCELLED") && (
                    <p className="text-xs text-neutral-600 mt-1">
                      <span className="font-semibold text-neutral-700">Lý do hủy: </span>
                      {getHistoryNote(detail, "CANCELLED")}
                    </p>
                  )}
                </div>
              ) : (
                <ol className="relative space-y-3 pl-4">
                  <span className="absolute left-[4px] top-1.5 bottom-1.5 w-px bg-neutral-200" />
                  {PROGRESS_STEPS.map((step, idx) => {
                    const reached = idx <= currentIndex;
                    const time =
                      step.status === "PENDING"
                        ? detail.createdAt
                        : getHistoryTime(detail, step.status);
                    return (
                      <li key={step.status} className="relative">
                        <span
                          className={`absolute -left-4 top-1 w-2.5 h-2.5 rounded-full border ${
                            reached
                              ? "bg-shop_dark_green border-shop_dark_green"
                              : "bg-white border-neutral-300"
                          }`}
                        />
                        <p
                          className={`text-xs font-semibold uppercase tracking-wider leading-tight ${
                            reached ? "text-neutral-900" : "text-neutral-400"
                          }`}
                        >
                          {step.label}
                        </p>
                        <p className="text-[11px] font-mono text-neutral-500 leading-tight mt-0.5">
                          {reached && time ? formatDateTime(time) : step.hint}
                        </p>
                      </li>
                    );
                  })}
                </ol>
              )}
            </Card>

            <Card title="Thông tin giao hàng & khách hàng">
              <InfoRow label="Người nhận" value={detail.recipientName || "—"} />
              <InfoRow label="Số điện thoại" value={detail.recipientPhone || "—"} />
              <InfoRow label="Địa chỉ giao hàng" value={detail.shippingAddress || "—"} />
              <InfoRow
                label="Tài khoản khách"
                value={detail.customerName || detail.recipientName || "Khách vãng lai"}
              />
              <InfoRow label="Ngày đặt hàng" value={formatDateTime(detail.createdAt)} />
              {(payment?.providerTransactionId || payment?.transactionCode) && (
                <InfoRow
                  label="Mã giao dịch"
                  value={payment.providerTransactionId ?? payment.transactionCode}
                />
              )}
              {payment?.paidAt && (
                <InfoRow label="Thời gian thanh toán" value={formatDateTime(payment.paidAt)} />
              )}
              {payment?.failureReason && (
                <InfoRow label="Lý do thất bại" value={payment.failureReason} />
              )}
              <InfoRow
                label="Trạng thái đơn hàng"
                value={STATUS_LABELS[detail.status] ?? detail.status}
              />
            </Card>

            <Card title="Tóm tắt thanh toán">
              <InfoRow label="Phương thức thanh toán" value={paymentLabel ?? "—"} />
              <InfoRow label="Trạng thái thanh toán" value={paymentStatusLabel} />
              <InfoRow label="Số lượng mặt hàng" value={`${itemsList.length} sản phẩm`} />
              <div className="mt-3 pt-3 border-t border-neutral-200 flex items-center justify-between">
                <span className="font-bold text-xs uppercase tracking-tight text-neutral-900">
                  Tổng thanh toán
                </span>
                <span className="font-bold text-lg text-neutral-900 tabular-nums">
                  {formatPrice(detail.totalAmount)}
                </span>
              </div>
              {detail.note && (
                <div className="mt-3 pt-2 border-t border-neutral-100 text-xs text-neutral-500">
                  <span className="font-semibold text-neutral-700">Ghi chú của khách:</span> {detail.note}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="font-sans w-full min-h-[calc(100vh-3.5rem)] bg-neutral-50 p-4 sm:p-6 lg:p-8 text-neutral-900">
      {titleSlot &&
        createPortal(
          <div className="leading-tight">
            <h1 className="text-xl font-bold uppercase tracking-tight text-neutral-900 truncate">
              Quản lý đơn hàng
            </h1>
          </div>,
          titleSlot
        )}

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {listColumn}
        <section
          className={`${selectedId ? "block" : "hidden lg:block"} flex-1 min-w-0 w-full`}
        >
          {renderDetail()}
        </section>
      </div>

      {cancelOpen && detail && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40"
          onClick={closeCancelDialog}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-dialog-title"
            className="w-full max-w-md bg-white border border-neutral-200 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="cancel-dialog-title"
              className="text-xs font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-200 pb-3"
            >
              Hủy đơn hàng {detail.orderCode ?? `#${detail.id.slice(0, 8)}`}
            </h3>
            <p className="mt-2 text-xs text-neutral-500">
              Vui lòng chọn hoặc nhập lý do hủy đơn hàng này.
            </p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {CANCEL_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setCancelReason(r);
                    setCancelError(null);
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider border transition-colors ${
                    cancelReason === r
                      ? "bg-shop_dark_green text-white border-shop_dark_green"
                      : "bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-50"
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
                setCancelError(null);
              }}
              rows={3}
              maxLength={500}
              placeholder="Nhập lý do hủy đơn cụ thể..."
              className="mt-3 w-full border border-neutral-300 px-3 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-shop_dark_green focus:outline-none focus:ring-1 focus:ring-shop_dark_green resize-none"
            />

            {cancelError && (
              <p className="mt-2 text-xs text-red-600 font-medium">{cancelError}</p>
            )}

            <div className="mt-5 flex justify-end gap-2 border-t border-neutral-200 pt-4">
              <button
                type="button"
                onClick={closeCancelDialog}
                disabled={isUpdating}
                className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-neutral-700 border border-neutral-300 bg-white hover:bg-neutral-50 transition-colors disabled:opacity-50"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isUpdating || !cancelReason.trim()}
                className="px-5 py-2 text-xs font-semibold uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdating ? "Đang hủy..." : "Xác nhận hủy"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrdersPage;