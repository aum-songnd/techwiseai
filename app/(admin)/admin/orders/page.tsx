"use client";

// app/(admin)/admin/orders/page.tsx
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
} from "lucide-react";
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

const PAGE_SIZE = 10;

// Dữ liệu từ GET /admin/payments/orders/{orderId}
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
  "https://techwiseai-backend.up.railway.app/api/v1";

// Các tên field ảnh có thể có trong 1 dòng sản phẩm của đơn hàng
const ITEM_IMAGE_KEYS = [
  "thumbnailUrl",
  "productThumbnailUrl",
  "productImage",
  "imageUrl",
  "image",
  "thumbnail",
];

/* ----------------------------- Helpers ----------------------------- */

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

// Backend có thể đặt tên field khác nhau -> thử lần lượt các tên phổ biến.
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

const getItemCount = (order: AdminOrderListItem): number | null => {
  const n = pickNumber(order, [
    "totalItems",
    "itemCount",
    "totalQuantity",
    "quantity",
  ]);
  if (n !== null) return n;
  const items = pick(order, ["items"]);
  return Array.isArray(items) ? items.length : null;
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
    // Có thể BE lồng trong object "payment" / "paymentInfo" / "payments[0]"
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

// Các mốc trong "Tiến trình đơn hàng"
const PROGRESS_STEPS: { status: OrderStatus; label: string; hint: string }[] = [
  { status: "PENDING", label: "Khách đặt hàng", hint: "Đơn đã được tạo" },
  { status: "CONFIRMED", label: "Cửa hàng xác nhận", hint: "Chờ xác nhận" },
  { status: "PROCESSING", label: "Chuẩn bị hàng", hint: "Chờ xử lý" },
  { status: "SHIPPING", label: "Bàn giao vận chuyển", hint: "Chờ giao hàng" },
  { status: "DELIVERED", label: "Giao thành công", hint: "Chờ giao hàng" },
];

// Hành động kế tiếp (nút to bên phải tiêu đề)
const NEXT_ACTION: Partial<
  Record<OrderStatus, { next: OrderStatus; label: string }>
> = {
  PENDING: { next: "CONFIRMED", label: "Xác nhận đơn" },
  CONFIRMED: { next: "PROCESSING", label: "Bắt đầu xử lý" },
  PROCESSING: { next: "SHIPPING", label: "Giao cho vận chuyển" },
  SHIPPING: { next: "DELIVERED", label: "Đã giao hàng" },
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

// Chỉ hủy được khi đơn ở các trạng thái này (backend không cho hủy từ SHIPPING trở đi).
const CANCELLABLE_STATUSES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
];

// Lý do hủy gợi ý (admin có thể chọn nhanh hoặc tự nhập)
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

// Phương thức thanh toán online: bắt buộc PAID mới được xác nhận đơn.
// COD (và các phương thức khác) có thể xác nhận ngay khi khách đặt.
const ONLINE_PAYMENT_METHODS = ["VNPAY", "MOMO"];

// Đơn đang chờ xác nhận nhưng chưa thanh toán online -> chưa được xác nhận.
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

/* --------------------------- Small pieces --------------------------- */

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
    className={`bg-white rounded-xl border border-gray-200/80 p-3 sm:p-3.5 ${className}`}
  >
    {(title || action) && (
      <div className="flex items-center justify-between mb-2">
        {title && <h3 className="text-[15px] font-bold text-gray-900">{title}</h3>}
        {action}
      </div>
    )}
    {children}
  </div>
);

const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-4 py-1 text-[13px] leading-snug">
    <span className="text-gray-500 shrink-0">{label}</span>
    <span className="font-medium text-gray-900 text-right break-words min-w-0">
      {value}
    </span>
  </div>
);

/* ------------------------------ Page ------------------------------ */

const AdminOrdersPage = () => {
  const router = useRouter();

  // Danh sách (cột trái)
  const [activeTab, setActiveTab] = useState<TabKey>("ALL");
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<AdminOrderListItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  // Số đơn của từng tab trạng thái (hiển thị cạnh tên tab)
  const [statusCounts, setStatusCounts] = useState<
    Partial<Record<TabKey, number>>
  >({});

  // Chi tiết (cột phải)
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminOrderDetail | null>(null);
  // Thông tin thanh toán của đơn đang chọn (endpoint riêng cho admin)
  const [payment, setPayment] = useState<AdminPayment | null>(null);
  // Ảnh sản phẩm lấy bù từ /products/{id} khi đơn hàng không kèm ảnh
  const [productImages, setProductImages] = useState<Record<string, string>>({});
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  // Popup nhập lý do hủy đơn
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Tiêu đề được đưa lên topbar của layout bằng portal (giống trang Kho hàng)
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

  // Tải số đơn cho từng trạng thái (mỗi tab 1 request nhẹ, size = 1, chỉ lấy totalElements)
  const loadCounts = useCallback(async () => {
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
    setStatusCounts((prev) => ({
      ...prev,
      ...Object.fromEntries(
        entries.filter((e): e is readonly [TabKey, number] => e !== null)
      ),
    }));
  }, []);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  // Tải danh sách
  useEffect(() => {
    let ignore = false;

    const load = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const result = await getAdminOrders({
          page,
          size: PAGE_SIZE,
          status: activeTab === "ALL" ? undefined : activeTab,
        });
        if (ignore) return;

        // Chấp nhận cả DTO { items } lẫn Page mặc định của Spring { content }.
        const raw = result as unknown as Record<string, unknown>;
        const list = (
          Array.isArray(raw.items)
            ? raw.items
            : Array.isArray(raw.content)
            ? raw.content
            : []
        ) as AdminOrderListItem[];

        setItems(list);
        setTotalPages((raw.totalPages as number) ?? 1);
        setTotalElements((raw.totalElements as number) ?? list.length);
        // Tự chọn đơn đầu tiên nếu đơn đang chọn không nằm trong trang này
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

  // Tải chi tiết đơn đang chọn
  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let ignore = false;

    const loadDetail = async () => {
      setIsDetailLoading(true);
      setDetailError(null);
      setPayment(null);
      try {
        // Đơn COD có thể chưa có bản ghi thanh toán -> bỏ qua lỗi, coi như null
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

  // Đơn thanh toán online chưa PAID -> tải lại chi tiết khi admin quay lại tab,
  // để thấy trạng thái thanh toán mới sau khi VNPay gọi IPN.
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
        // im lặng: lần tải đầu đã báo lỗi nếu có
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

  // Đơn hàng không trả ảnh -> lấy thumbnailUrl từ chi tiết sản phẩm (API công khai)
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
    const action = NEXT_ACTION[detail.status];
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
      // Báo cho layout tải lại số đơn chưa hoàn thành ở menu
      window.dispatchEvent(new Event("admin-orders-changed"));
      // Cập nhật lại số đơn trên các tab
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
      // Lý do hủy gửi qua field "note" của UpdateOrderStatusPayload.
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
      window.dispatchEvent(new Event("admin-orders-changed"));
      loadCounts();
    } catch (err) {
      const msg = handleError(err, "Không hủy được đơn hàng.");
      if (msg) setCancelError(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  // Tìm kiếm trong trang đang hiển thị
  const visibleItems = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        (o.customerName ?? "").toLowerCase().includes(q)
    );
  }, [items, keyword]);

  /* ------------------------- Cột trái: danh sách ------------------------- */

  const listColumn = (
    <aside
      className={`${
        selectedId ? "hidden lg:flex" : "flex"
      } flex-col gap-3 min-w-0 lg:w-[380px] lg:shrink-0`}
    >
      {/* Ô tìm kiếm */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Tìm theo mã đơn hoặc khách hàng"
          className="w-full h-12 pl-10 pr-3 text-base bg-white rounded-xl border border-gray-200/80 outline-none placeholder:text-gray-400 focus:border-shop_dark_green/50"
        />
      </div>

      {/* Tabs trạng thái: xuống dòng để hiển thị đủ tất cả */}
      <div>
        <div className="flex flex-wrap gap-1.5">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => changeTab(tab.key)}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-[13px] font-medium rounded-2xl transition-colors ${
                activeTab === tab.key
                  ? "bg-shop_dark_green text-white"
                  : "bg-white text-gray-600 border border-gray-200/80 hover:bg-gray-100"
              }`}
            >
              {tab.label}
              {statusCounts[tab.key] !== undefined && (
                <span
                  className={`inline-flex items-center justify-center h-5 min-w-5 px-1 text-[11px] leading-none font-semibold rounded-full ${
                    activeTab === tab.key
                      ? "bg-white/20 text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {statusCounts[tab.key]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Danh sách thẻ đơn hàng */}
      {isLoading ? (
        <p className="py-16 text-center text-base text-gray-400">
          Đang tải danh sách đơn hàng...
        </p>
      ) : errorMessage ? (
        <div className="flex flex-col items-center text-center gap-3 py-16">
          <PackageSearch className="w-10 h-10 text-gray-300" />
          <p className="text-base text-gray-500">{errorMessage}</p>
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="flex flex-col items-center text-center gap-3 py-16">
          <PackageSearch className="w-10 h-10 text-gray-300" />
          <p className="text-base text-gray-500">Không có đơn hàng phù hợp.</p>
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
                  className={`text-left bg-white rounded-xl border p-3.5 transition-colors ${
                    active
                      ? "border-shop_dark_green ring-1 ring-shop_dark_green/30"
                      : "border-gray-200/80 hover:border-shop_dark_green/40"
                  }`}
                >
                  <p className="text-base font-semibold text-gray-900 truncate">
                    Mã đơn: {order.orderCode ?? `#${order.id.slice(0, 8)}`}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5 truncate">
                    {order.customerName || "Khách vãng lai"}
                  </p>
                  <div className="mt-2 space-y-1 text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Ngày đặt</span>
                      <span className="text-gray-700">
                        {formatDateTime(order.createdAt)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Tổng tiền</span>
                      <span className="font-semibold text-gray-900">
                        {formatPrice(order.totalAmount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-500">Trạng thái</span>
                      <StatusBadge status={order.status} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Tổng + phân trang */}
          <div className="flex items-center justify-between gap-2 text-sm">
            <p className="text-gray-500">{totalElements} đơn</p>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-shop_dark_green/40 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Trang trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-gray-500">
                  {page + 1} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-shop_dark_green/40 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Trang sau"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  );

  /* ------------------------ Cột phải: chi tiết ------------------------ */

  const renderDetail = () => {
    if (isDetailLoading && !detail) {
      return (
        <p className="py-24 text-center text-base text-gray-400">
          Đang tải chi tiết đơn hàng...
        </p>
      );
    }
    if (detailError && !detail) {
      return (
        <div className="flex flex-col items-center text-center gap-3 py-24">
          <PackageSearch className="w-12 h-12 text-gray-300" />
          <p className="text-base text-gray-500">{detailError}</p>
        </div>
      );
    }
    if (!detail) {
      return (
        <div className="flex flex-col items-center text-center gap-3 py-24">
          <PackageSearch className="w-12 h-12 text-gray-300" />
          <p className="text-base text-gray-500">
            Chọn một đơn hàng để xem chi tiết.
          </p>
        </div>
      );
    }

    const action = NEXT_ACTION[detail.status];
    const awaitingPayment = isAwaitingPayment(detail, payment?.status);
    const currentIndex = PROGRESS_STEPS.findIndex(
      (s) => s.status === detail.status
    );
    const cancelled = detail.status === "CANCELLED";
    const itemsList = (detail.items ?? []) as unknown[];
    // Thông tin thanh toán lấy từ /admin/payments/orders/{orderId}
    // (/payments/orders/{id} chỉ dành cho chủ đơn nên admin bị 404).
    const paymentLabel = getPaymentLabel(detail) ?? null;
    const paymentStatusValue = payment?.status ?? detail.paymentStatus ?? null;
    const paymentStatusLabel = paymentStatusValue
      ? PAYMENT_STATUS_LABELS[paymentStatusValue as PaymentStatus] ??
        paymentStatusValue
      : paymentLabel === PAYMENT_LABELS.COD
      ? "Thu tiền khi giao hàng"
      : "Chưa có thông tin";

    return (
      <div className={`space-y-4 ${isDetailLoading ? "opacity-60" : ""}`}>
        {/* Breadcrumb + nút quay lại (mobile) */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className="lg:hidden inline-flex items-center gap-1 text-gray-600"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Quay lại
          </button>
          <span className="hidden lg:inline">Đơn hàng</span>
          <ChevronRight className="hidden lg:block w-3 h-3" />
          <span className="px-2.5 py-1 rounded-full bg-shop_dark_green/10 text-shop_dark_green font-medium">
            {detail.orderCode ?? `#${detail.id.slice(0, 8)}`}
          </span>
        </div>

        {/* Tiêu đề + nút hành động */}
        <div className="flex flex-wrap items-center justify-self-end gap-3">
          {action && (
            <button
              type="button"
              onClick={handleAdvanceStatus}
              disabled={isUpdating || awaitingPayment}
              title={awaitingPayment ? "Chờ khách thanh toán xong mới xác nhận được" : undefined}
              className="px-5 py-1.5 text-base font-semibold text-[13px] text-white rounded-full bg-shop_dark_green hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdating ? "Đang cập nhật..." : action.label}
            </button>
          )}
          {/* Nút hủy đơn: chỉ hiện khi chờ xác nhận / đã xác nhận / đang xử lý */}
          {CANCELLABLE_STATUSES.includes(detail.status) && (
            <button
              type="button"
              onClick={openCancelDialog}
              disabled={isUpdating}
              className="px-5 py-1.5 text-[13px] font-semibold text-red-600 rounded-full border border-red-200 bg-white hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Hủy đơn hàng
            </button>
          )}
        </div>

        {awaitingPayment && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            Đơn thanh toán qua {paymentLabel ?? "online"} — chỉ xác nhận được sau
            khi khách thanh toán thành công.
          </p>
        )}

        {detailError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {detailError}
          </p>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-4 items-start">
          {/* Cột giữa: sản phẩm + hóa đơn */}
          <div className="space-y-4 min-w-0">
            <Card className="!p-0">
              <div className="divide-y divide-gray-100">
                {itemsList.length === 0 ? (
                  <p className="p-5 text-base text-gray-400">
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
                      <div key={`${productId ?? "item"}-${idx}`} className="flex items-center gap-3 p-4">
                        <div className="w-16 h-16 shrink-0 rounded-xl border border-gray-200/80 bg-gray-50 flex items-center justify-center overflow-hidden">
                          {image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={image} alt={name} className="w-full h-full object-cover" />
                          ) : (
                            <ImageOff className="w-5 h-5 text-gray-300" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-base font-semibold text-gray-900 truncate">
                            {name}
                          </p>
                          <p className="text-[13px] text-gray-500 mt-0.5 truncate">
                            {productId ? `Mã SP: ${productId.slice(0, 8)} | ` : ""}
                            Số lượng: {qty}
                          </p>
                        </div>
                        <p className="text-base font-bold text-gray-900 shrink-0">
                          {lineTotal !== null ? formatPrice(lineTotal) : "—"}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>

            <Card title="Hóa đơn">
              <InfoRow label="Phương thức thanh toán" value={paymentLabel ?? "—"} />
              <InfoRow label="Trạng thái thanh toán" value={paymentStatusLabel} />
              <InfoRow label="Số sản phẩm" value={itemsList.length} />
              <div className="mt-2 pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-base font-bold text-gray-900">
                  Tổng thanh toán
                </span>
                <span className="text-base font-bold text-gray-900">
                  {formatPrice(detail.totalAmount)}
                </span>
              </div>
              {detail.note && (
                <p className="mt-2 text-sm text-gray-500">Ghi chú: {detail.note}</p>
              )}
            </Card>
          </div>

          {/* Cột phải: tiến trình + chi tiết */}
          <div className="space-y-4 min-w-0">
            <Card title="Tiến trình đơn hàng">
              {cancelled ? (
                <div className="space-y-1.5">
                  <p className="text-base text-red-600">
                    Đơn hàng đã bị hủy
                    {getHistoryTime(detail, "CANCELLED")
                      ? ` lúc ${formatDateTime(getHistoryTime(detail, "CANCELLED"))}`
                      : "."}
                  </p>
                  {getHistoryNote(detail, "CANCELLED") && (
                    <p className="text-[13px] text-gray-700">
                      <span className="text-gray-500">Lý do hủy: </span>
                      {getHistoryNote(detail, "CANCELLED")}
                    </p>
                  )}
                </div>
              ) : (
                <ol className="relative space-y-2 pl-4">
                  <span className="absolute left-[4px] top-1.5 bottom-1.5 w-px bg-gray-200" />
                  {PROGRESS_STEPS.map((step, idx) => {
                    const reached = idx <= currentIndex;
                    const time =
                      step.status === "PENDING"
                        ? detail.createdAt
                        : getHistoryTime(detail, step.status);
                    return (
                      <li key={step.status} className="relative">
                        <span
                          className={`absolute -left-4 top-1 w-[9px] h-[9px] rounded-full border-[1.5px] ${
                            reached
                              ? "bg-gray-900 border-gray-900"
                              : "bg-white border-gray-300"
                          }`}
                        />
                        <p
                          className={`text-[13px] font-semibold leading-tight ${
                            reached ? "text-gray-900" : "text-gray-500"
                          }`}
                        >
                          {step.label}
                        </p>
                        <p className="text-xs text-gray-500 leading-tight">
                          {reached && time ? formatDateTime(time) : step.hint}
                        </p>
                      </li>
                    );
                  })}
                </ol>
              )}
            </Card>

            <Card title="Thông tin đơn hàng">
              <InfoRow label="Địa chỉ giao hàng" value={detail.shippingAddress || "—"} />
              <InfoRow
                label="Khách hàng"
                value={detail.customerName || detail.recipientName || "Khách vãng lai"}
              />
              <InfoRow label="Người nhận" value={detail.recipientName || "—"} />
              <InfoRow label="Số điện thoại" value={detail.recipientPhone || "—"} />
              <InfoRow label="Ngày đặt" value={formatDateTime(detail.createdAt)} />
              <InfoRow label="Phương thức thanh toán" value={paymentLabel ?? "—"} />
              <InfoRow label="Trạng thái thanh toán" value={paymentStatusLabel} />
              {(payment?.providerTransactionId || payment?.transactionCode) && (
                <InfoRow
                  label="Mã giao dịch"
                  value={payment.providerTransactionId ?? payment.transactionCode}
                />
              )}
              {payment?.paidAt && (
                <InfoRow label="Thanh toán lúc" value={formatDateTime(payment.paidAt)} />
              )}
              {payment?.failureReason && (
                <InfoRow label="Lý do thất bại" value={payment.failureReason} />
              )}
              <InfoRow
                label="Trạng thái"
                value={STATUS_LABELS[detail.status] ?? detail.status}
              />
            </Card>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full min-h-[calc(100vh-3.5rem)] bg-gray-50 p-4 sm:p-6 lg:p-8">
      {/* Topbar (portal): tiêu đề trang */}
      {titleSlot &&
        createPortal(
          <div className="leading-tight">
            <h1 className="text-xl font-bold tracking-tight text-gray-900 truncate">
              Đơn hàng
            </h1>
          </div>,
          titleSlot
        )}

      <div className="flex flex-col lg:flex-row gap-5 lg:gap-6 items-start">
        {listColumn}
        <section
          className={`${selectedId ? "block" : "hidden lg:block"} flex-1 min-w-0 w-full`}
        >
          {renderDetail()}
        </section>
      </div>

      {/* Popup nhập lý do hủy đơn */}
      {cancelOpen && detail && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40"
          onClick={closeCancelDialog}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-dialog-title"
            className="w-full max-w-md bg-white rounded-2xl shadow-xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="cancel-dialog-title"
              className="text-lg font-bold text-gray-900"
            >
              Hủy đơn hàng
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Đơn {detail.orderCode ?? `#${detail.id.slice(0, 8)}`}. Vui lòng
              cho biết lý do hủy đơn.
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
                  className={`px-3 py-1.5 text-[13px] rounded-2xl border transition-colors ${
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
                setCancelError(null);
              }}
              rows={3}
              maxLength={500}
              placeholder="Nhập lý do hủy đơn..."
              className="mt-3 w-full px-3 py-2 text-sm rounded-xl border border-gray-200 outline-none resize-none placeholder:text-gray-400 focus:border-shop_dark_green/50"
            />

            {cancelError && (
              <p className="mt-2 text-sm text-red-600">{cancelError}</p>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeCancelDialog}
                disabled={isUpdating}
                className="px-5 py-1.5 text-[13px] font-semibold text-gray-600 rounded-full border border-gray-200 bg-white hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isUpdating || !cancelReason.trim()}
                className="px-5 py-1.5 text-[13px] font-semibold text-white rounded-full bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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