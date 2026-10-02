"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, Check, Clock, Loader2, X } from "lucide-react";

type ResultStatus = "PAID" | "FAILED" | "CANCELLED" | "PENDING" | "ERROR";

type Summary = {
  orderId: string | null;
  amount: number | null;
  method: string | null;
  bank: string | null;
  transactionNo: string | null;
  paidAt: string | null;
};

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ??
  "https://techwiseai-backend.up.railway.app"
).replace(/\/$/, "");

const formatPrice = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    value
  );

// vnp_PayDate dạng yyyyMMddHHmmss -> dd/MM/yyyy HH:mm:ss
const formatPayDate = (raw: string | null): string | null => {
  if (!raw) return null;
  if (/^\d{14}$/.test(raw)) {
    return `${raw.slice(6, 8)}/${raw.slice(4, 6)}/${raw.slice(0, 4)} ${raw.slice(
      8,
      10
    )}:${raw.slice(10, 12)}:${raw.slice(12, 14)}`;
  }
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString("vi-VN");
};

// vnp_OrderInfo có dạng "Thanh toan don hang <orderId>" -> lấy UUID.
const extractOrderId = (orderInfo: string | null): string | null => {
  if (!orderInfo) return null;
  const match = orderInfo.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
  );
  return match ? match[0] : null;
};

const summaryFromParams = (sp: URLSearchParams): Summary => {
  const rawAmount = sp.get("vnp_Amount");
  return {
    orderId: sp.get("orderId") ?? extractOrderId(sp.get("vnp_OrderInfo")),
    amount: rawAmount ? Number(rawAmount) / 100 : null,
    method: "VNPAY",
    bank: sp.get("vnp_BankCode"),
    transactionNo: sp.get("vnp_TransactionNo"),
    paidAt: formatPayDate(sp.get("vnp_PayDate")),
  };
};

type Theme = {
  title: string;
  description: string;
  gradient: string;
  halo: string;
  badge: string;
  titleColor: string;
  icon: React.ReactNode;
};

const THEMES: Record<ResultStatus, Theme> = {
  PAID: {
    title: "Thanh toán thành công!",
    description:
      "Cảm ơn bạn đã mua hàng. Đơn hàng đã được ghi nhận và đang được chuẩn bị để giao.",
    gradient: "from-green-100",
    halo: "bg-green-200/60",
    badge: "bg-green-500",
    titleColor: "text-shop_dark_green",
    icon: <Check className="w-7 h-7" strokeWidth={3.5} />,
  },
  FAILED: {
    title: "Thanh toán không thành công",
    description:
      "Giao dịch chưa hoàn tất. Bạn có thể thử thanh toán lại từ trang đơn hàng.",
    gradient: "from-red-100",
    halo: "bg-red-200/60",
    badge: "bg-red-500",
    titleColor: "text-red-700",
    icon: <X className="w-7 h-7" strokeWidth={3.5} />,
  },
  CANCELLED: {
    title: "Bạn đã hủy thanh toán",
    description:
      "Đơn hàng vẫn được giữ lại. Bạn có thể thanh toán lại từ trang đơn hàng.",
    gradient: "from-orange-100",
    halo: "bg-orange-200/60",
    badge: "bg-orange-500",
    titleColor: "text-orange-700",
    icon: <X className="w-7 h-7" strokeWidth={3.5} />,
  },
  PENDING: {
    title: "Giao dịch đang xử lý",
    description:
      "Chưa có kết quả cuối cùng. Vui lòng kiểm tra lại trạng thái đơn hàng sau ít phút.",
    gradient: "from-amber-100",
    halo: "bg-amber-200/60",
    badge: "bg-amber-500",
    titleColor: "text-amber-700",
    icon: <Clock className="w-7 h-7" strokeWidth={3} />,
  },
  ERROR: {
    title: "Không xác minh được giao dịch",
    description:
      "Có lỗi khi xác minh kết quả thanh toán. Nếu tiền đã bị trừ, vui lòng kiểm tra đơn hàng hoặc liên hệ hỗ trợ.",
    gradient: "from-red-100",
    halo: "bg-red-200/60",
    badge: "bg-red-500",
    titleColor: "text-red-700",
    icon: <AlertTriangle className="w-7 h-7" strokeWidth={3} />,
  },
};

/* ---------- UI nhỏ ---------- */

const SealBadge = ({ theme }: { theme: Theme }) => (
  <div
    className={`w-24 h-24 rounded-full flex items-center justify-center ${theme.halo}`}
  >
    <div className="w-[72px] h-[72px] rounded-full bg-white/70 flex items-center justify-center">
      <div className="relative w-14 h-14 flex items-center justify-center">
        {/* Hai hình vuông bo góc xoay lệch nhau 45° tạo thành huy hiệu nhiều cạnh */}
        <span className={`absolute inset-0 rounded-2xl ${theme.badge}`} />
        <span
          className={`absolute inset-0 rounded-2xl rotate-45 ${theme.badge}`}
        />
        <span className="relative text-white">{theme.icon}</span>
      </div>
    </div>
  </div>
);

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-start justify-between gap-4 text-xs">
    <dt className="text-shop_dark_green/70 shrink-0">{label}</dt>
    <dd className="font-semibold text-shop_dark_green text-right break-all">
      {value}
    </dd>
  </div>
);

const CardShell = ({
  theme,
  children,
}: {
  theme: Theme;
  children: React.ReactNode;
}) => (
  <div className="min-h-[75vh] flex items-center justify-center px-4 py-10 ">
    <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">
      <div
        className={`absolute inset-x-0 top-0 h-56 bg-gradient-to-b ${theme.gradient} to-white`}
      />
      <Link
        href="/"
        aria-label="Đóng"
        className="absolute top-4 right-4 z-10 text-gray-600 hover:text-black transition-colors"
      >
        <X className="w-5 h-5" />
      </Link>
      <div className="relative px-6 pt-10 pb-6 flex flex-col items-center text-center">
        {children}
      </div>
    </div>
  </div>
);

/* ---------- Nội dung chính ---------- */

const PaymentResultContent = () => {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<ResultStatus | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const calledRef = useRef(false);

  useEffect(() => {
    // Tránh gọi 2 lần do React Strict Mode (dev).
    if (calledRef.current) return;
    calledRef.current = true;

    const base = summaryFromParams(searchParams);
    const responseCode = searchParams.get("vnp_ResponseCode");

    // Không có tham số VNPAY -> không có gì để xác minh.
    if (!responseCode) {
      setSummary(base);
      setStatus("ERROR");
      return;
    }

    const failedStatus: ResultStatus =
      responseCode === "24" ? "CANCELLED" : "FAILED"; // 24 = người dùng hủy

    const verify = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/v1/payments/vnpay/return?${searchParams.toString()}`
        );
        const json = await res.json();
        const data = json?.data;

        setSummary({
          ...base,
          orderId: data?.orderId ?? base.orderId,
          amount: data?.amount != null ? Number(data.amount) : base.amount,
          method: data?.paymentMethod ?? base.method,
          transactionNo: data?.providerTransactionId ?? base.transactionNo,
          paidAt: base.paidAt ?? formatPayDate(data?.paidAt ?? null),
        });

        if (!res.ok || json?.success === false) {
          setStatus(failedStatus);
          return;
        }

        const paymentStatus = String(data?.status ?? "").toUpperCase();
        if (paymentStatus === "PAID") setStatus("PAID");
        else if (paymentStatus === "PENDING") setStatus("PENDING");
        else setStatus(failedStatus);
      } catch {
        setSummary(base);
        setStatus("ERROR");
      }
    };

    verify();
  }, [searchParams]);

  if (!status || !summary) {
    return (
      <CardShell theme={THEMES.PAID}>
        <div className="py-16 flex flex-col items-center gap-3 text-gray-400 text-sm">
          <Loader2 className="w-8 h-8 animate-spin" />
          Đang xác minh giao dịch...
        </div>
      </CardShell>
    );
  }

  const theme = THEMES[status];

  const rows: { label: string; value: string }[] = [];
  if (summary.orderId)
    rows.push({
      label: "Mã đơn hàng",
      value: `#${summary.orderId.slice(0, 8).toUpperCase()}`,
    });
  if (summary.transactionNo)
    rows.push({ label: "Mã giao dịch", value: summary.transactionNo });
  if (summary.paidAt)
    rows.push({ label: "Thời gian thanh toán", value: summary.paidAt });
  if (summary.method)
    rows.push({
      label: "Phương thức",
      value: summary.bank
        ? `${summary.method} - ${summary.bank}`
        : summary.method,
    });

  const showSummary = rows.length > 0 || summary.amount != null;

  return (
    <CardShell theme={theme}>
      <SealBadge theme={theme} />

      <h1
        className={`mt-6 text-xl font-bold uppercase tracking-wide ${theme.titleColor}`}
      >
        {theme.title}
      </h1>
      <p className="mt-2 text-xs text-shop_dark_green/70 max-w-[16rem]">
        {theme.description}
      </p>

      {showSummary && (
        <div className="mt-6 w-full border border-gray-200 rounded-2xl text-left">
          <h2 className="px-4 py-3 text-base text-shop_dark_green">
            Tóm tắt đơn hàng
          </h2>

          {/* Đường kẻ kiểu vé với 2 nửa hình tròn ở hai mép */}
          <div className="relative border-t border-gray-200">
            <span className="absolute -left-px -top-1 w-[5px] h-2 rounded-r-full bg-shop_dark_green" />
            <span className="absolute -right-px -top-1 w-[5px] h-2 rounded-l-full bg-shop_dark_green" />
          </div>

          <dl className="px-4 py-4 flex flex-col gap-3">
            {rows.map((row) => (
              <Row key={row.label} label={row.label} value={row.value} />
            ))}
            {summary.amount != null && (
              <div className="flex items-center justify-between pt-3 mt-1 border-t border-gray-100">
                <dt className="text-xs font-bold uppercase text-shop_dark_green">
                  Tổng tiền
                </dt>
                <dd className="text-sm font-bold text-shop_dark_green">
                  {formatPrice(summary.amount)}
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}

      <div className="mt-6 w-full flex flex-col gap-3">
        <Link
          href="/"
          className="w-full text-center rounded-full bg-shop_dark_green py-2.5 text-xs font-semibold uppercase tracking-wide text-white hover:opacity-90 transition-opacity"
        >
          Về trang chủ
        </Link>
        {summary.orderId && (
          <Link
            href={`/orders/${summary.orderId}${status === "PAID" ? "?placed=1" : ""}`}
            className="w-full text-center rounded-full border border-shop_dark_green/40 py-2.5 text-xs font-semibold uppercase tracking-wide text-shop_dark_green hover:bg-shop_dark_green/5 transition-colors"
          >
            {status === "PAID" ? "Theo dõi đơn hàng" : "Xem đơn hàng"}
          </Link>
        )}
      </div>
    </CardShell>
  );
};

// useSearchParams cần được bọc trong Suspense khi build Next.js (App Router).
const PaymentResultPage = () => (
  <Suspense
    fallback={
      <div className="max-w-xl mx-auto px-4 py-20 text-center text-gray-400 text-sm">
        Đang tải kết quả thanh toán...
      </div>
    }
  >
    <PaymentResultContent />
  </Suspense>
);

export default PaymentResultPage;