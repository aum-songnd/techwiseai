"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image, { type StaticImageData } from "next/image";
import {
  Check,
  ShieldCheck,
  RotateCcw,
  Truck,
  CreditCard,
  Banknote,
  Package,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { productImages } from "@/images";
import { FREE_SHIP_THRESHOLD } from "@/components/ServiceFeatures";
import {
  createOrder,
  createPayment,
  OrderAuthRequiredError,
  type PaymentMethod,
} from "@/lib/orders-api";

const formatPrice = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    value
  );

const resolveProductImage = (
  fileName?: string
): StaticImageData | string | null => {
  if (!fileName) return null;
  const localImage = (
    productImages as Record<string, StaticImageData | undefined>
  )[fileName];
  return localImage ?? fileName;
};

// Payment options excluding MoMo
const PAYMENT_OPTIONS: {
  value: PaymentMethod;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
}[] = [
  {
    value: "COD",
    label: "Thanh toán khi nhận hàng (COD)",
    hint: "Thanh toán bằng tiền mặt trực tiếp cho nhân viên giao hàng khi nhận kiện hàng.",
    icon: Banknote,
  },
  {
    value: "VNPAY",
    label: "Cổng thanh toán trực tuyến VNPAY",
    hint: "Thanh toán tiện lợi qua ứng dụng ngân hàng, VNPAY QR, thẻ ATM nội địa hoặc thẻ quốc tế Visa / MasterCard.",
    icon: CreditCard,
  },
];

const CheckoutPage = () => {
  const router = useRouter();
  const { items, totalAmount, isLoaded, requiresLogin, clearCart } = useCart();

  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("COD");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isFormValid = useMemo(
    () =>
      recipientName.trim().length > 0 &&
      recipientPhone.trim().length > 0 &&
      shippingAddress.trim().length > 0,
    [recipientName, recipientPhone, shippingAddress]
  );

  const originalTotal = items.reduce(
    (sum, item) => sum + (item.originalPrice ?? item.unitPrice) * item.quantity,
    0
  );
  const discountAmount = Math.max(0, originalTotal - totalAmount);
  const discountPercent =
    originalTotal > 0 ? Math.round((discountAmount / originalTotal) * 100) : 0;

  const isFreeShip = totalAmount >= FREE_SHIP_THRESHOLD;
  const remainingForFreeShip = FREE_SHIP_THRESHOLD - totalAmount;
  const shipProgress = Math.min(
    100,
    Math.max(0, (totalAmount / FREE_SHIP_THRESHOLD) * 100)
  );

  if (!isLoaded) {
    return (
      <div className="font-sans min-h-screen bg-white">
        <div className="mx-auto w-[90%] py-20 text-center text-xs text-neutral-400">
          Đang tải thông tin đơn hàng...
        </div>
      </div>
    );
  }

  if (requiresLogin) {
    return (
      <div className="font-sans min-h-screen bg-white text-neutral-900">
        <div className="mx-auto w-[90%] py-8 sm:py-10">
          <nav className="flex items-center gap-2 text-xs text-neutral-500 mb-6">
            <Link href="/" className="hover:text-shop_dark_green transition-colors">
              Trang chủ
            </Link>
            <span>/</span>
            <span className="text-neutral-900 font-medium">Thanh toán</span>
          </nav>

          <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
            <Image
              src="/empty-cart.png"
              alt="Yêu cầu đăng nhập"
              width={437}
              height={366}
              className="h-auto w-56 select-none sm:w-72"
              priority
            />
            <h1 className="text-xl font-bold uppercase tracking-tight text-neutral-900">
              Vui lòng đăng nhập để thanh toán
            </h1>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Bạn cần đăng nhập để lưu trữ thông tin giao hàng và theo dõi tình trạng đơn hàng của mình.
            </p>
            <Link
              href={`/sign-in?redirect=${encodeURIComponent("/checkout")}`}
              className="mt-2 bg-shop_dark_green px-8 py-3 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-shop_dark_green/90"
            >
              Đăng nhập ngay
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="font-sans min-h-screen bg-white text-neutral-900">
        <div className="mx-auto w-[90%] py-8 sm:py-10">
          <nav className="flex items-center gap-2 text-xs text-neutral-500 mb-6">
            <Link href="/" className="hover:text-shop_dark_green transition-colors">
              Trang chủ
            </Link>
            <span>/</span>
            <span className="text-neutral-900 font-medium">Thanh toán</span>
          </nav>

          <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
            <Image
              src="/empty-cart.png"
              alt="Giỏ hàng trống"
              width={437}
              height={366}
              className="h-auto w-56 select-none sm:w-72"
              priority
            />
            <h1 className="text-xl font-bold uppercase tracking-tight text-neutral-900">
              Giỏ hàng của bạn đang trống
            </h1>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Bạn chưa có sản phẩm nào để thanh toán. Hãy khám phá và mua sắm ngay!
            </p>
            <Link
              href="/shop"
              className="mt-2 bg-shop_dark_green px-8 py-3 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-shop_dark_green/90"
            >
              Khám phá sản phẩm
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const order = await createOrder({
        recipientName: recipientName.trim(),
        recipientPhone: recipientPhone.trim(),
        shippingAddress: shippingAddress.trim(),
        paymentMethod,
        note: note.trim() || undefined,
      });

      clearCart();

      let payment;
      try {
        payment = await createPayment({
          orderId: order.id,
          paymentMethod,
        });
      } catch {
        router.push(`/orders/${order.id}?placed=1`);
        return;
      }

      if (payment.paymentUrl) {
        window.location.href = payment.paymentUrl;
        return;
      }

      router.push(`/orders/${order.id}?placed=1`);
    } catch (err) {
      if (err instanceof OrderAuthRequiredError) {
        router.push("/sign-in");
        return;
      }
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Đã có lỗi xảy ra khi tạo đơn hàng. Vui lòng kiểm tra lại thông tin."
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="font-sans min-h-screen bg-white text-neutral-900">
      <div className="mx-auto w-[90%] py-8 sm:py-10">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-neutral-500 mb-6">
          <Link href="/" className="hover:text-shop_dark_green transition-colors">
            Trang chủ
          </Link>
          <span>/</span>
          <Link href="/cart" className="hover:text-shop_dark_green transition-colors">
            Giỏ hàng của tôi
          </Link>
          <span>/</span>
          <span className="text-neutral-900 font-medium">Thanh toán đơn hàng</span>
        </nav>

        {/* Header & Free Shipping Bar */}
        <div className="flex flex-col gap-4 border-b border-neutral-200 pb-5 sm:flex-row sm:items-end sm:justify-between mb-8">
          <div className="flex items-end gap-3">
            <h1 className="text-xl font-bold uppercase tracking-tight text-neutral-900">
              Thanh toán đơn hàng
            </h1>
            <span className="pb-0.5 text-xs text-neutral-500 font-mono">
              [ {items.length} sản phẩm ]
            </span>
          </div>

          <div className="w-full sm:w-80">
            <p className="mb-2 flex items-center gap-1.5 text-xs text-neutral-700">
              {isFreeShip ? (
                <>
                  <Check
                    size={14}
                    className="shrink-0 text-shop_dark_green"
                    strokeWidth={3}
                  />
                  <span className="font-semibold text-shop_dark_green">
                    Đơn hàng đủ điều kiện miễn phí vận chuyển!
                  </span>
                </>
              ) : (
                <>
                  Mua thêm{" "}
                  <span className="font-semibold text-shop_dark_green">
                    {formatPrice(remainingForFreeShip)}
                  </span>{" "}
                  để được miễn phí vận chuyển
                </>
              )}
            </p>
            <div
              className="h-1.5 w-full bg-neutral-200 overflow-hidden"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(shipProgress)}
            >
              <div
                className="h-full bg-shop_dark_green transition-all duration-500"
                style={{ width: `${shipProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Main Checkout Form */}
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:items-start"
        >
          {/* Left Column: Delivery Info & Payment Methods */}
          <div className="flex flex-col gap-6 lg:col-span-2">
            {/* Section 1: Thông tin nhận hàng */}
            <div className="border border-neutral-200 p-6 bg-white space-y-5">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                  1. Thông tin giao hàng
                </span>
                <span className="text-[11px] text-neutral-400">
                  * Vui lòng điền chính xác để đảm bảo nhận hàng
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    Họ và tên người nhận <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    required
                    placeholder="Ví dụ: Nguyễn Văn A"
                    className="w-full border border-neutral-300 px-3.5 py-2.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-shop_dark_green focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    Số điện thoại liên hệ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    required
                    placeholder="Ví dụ: 0912345678"
                    className="w-full border border-neutral-300 px-3.5 py-2.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-shop_dark_green focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  Địa chỉ giao hàng chi tiết <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  required
                  placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
                  className="w-full border border-neutral-300 px-3.5 py-2.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-shop_dark_green focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  Ghi chú đơn hàng (tuỳ chọn)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="Ghi chú thêm về thời gian giao hàng, chỉ dẫn địa chỉ cụ thể..."
                  className="w-full border border-neutral-300 px-3.5 py-2.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-shop_dark_green focus:outline-none transition-colors resize-none"
                />
              </div>
            </div>

            {/* Section 2: Phương thức thanh toán (MoMo removed) */}
            <div className="border border-neutral-200 p-6 bg-white space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                  2. Phương thức thanh toán
                </span>
                <span className="text-[11px] text-neutral-500 font-mono">
                  [ {PAYMENT_OPTIONS.length} hình thức ]
                </span>
              </div>

              <div className="space-y-3 pt-1">
                {PAYMENT_OPTIONS.map((option) => {
                  const isSelected = paymentMethod === option.value;
                  const Icon = option.icon;
                  return (
                    <label
                      key={option.value}
                      className={`flex items-start gap-4 border p-4 cursor-pointer transition-all ${isSelected
                          ? "border-shop_dark_green bg-neutral-50/80 shadow-xs"
                          : "border-neutral-200 hover:border-neutral-300 bg-white"
                        }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={option.value}
                        checked={isSelected}
                        onChange={() => setPaymentMethod(option.value)}
                        className="mt-1 h-4 w-4 text-shop_dark_green accent-shop_dark_green focus:ring-shop_dark_green"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${isSelected ? "text-shop_dark_green" : "text-neutral-500"}`} />
                          <span className="text-xs font-bold text-neutral-900">
                            {option.label}
                          </span>
                        </div>
                        <p className="mt-1.5 text-xs text-neutral-500 leading-relaxed">
                          {option.hint}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary Sidebar */}
          <aside className="lg:col-span-1">
            <div className="border border-neutral-200 p-5 space-y-5 sticky top-24 bg-white">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                  Tóm tắt đơn hàng
                </h2>
                <span className="text-xs text-neutral-500 font-mono">
                  [ {items.length} ]
                </span>
              </div>

              {/* Product Preview List */}
              <div className="flex flex-col divide-y divide-neutral-100 max-h-72 overflow-y-auto pr-1">
                {items.map((item) => {
                  const image = resolveProductImage(item.thumbnailUrl);
                  return (
                    <div key={item.id} className="py-2.5 flex items-start gap-3">
                      <div className="relative h-14 w-14 shrink-0 border border-neutral-200 bg-white overflow-hidden">
                        {image ? (
                          <Image
                            src={image}
                            alt={item.name}
                            fill
                            className="object-cover"
                            sizes="56px"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-neutral-50 text-[10px] text-neutral-400">
                            <Package className="h-4 w-4" />
                          </div>
                        )}
                        <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-shop_dark_green px-1 text-[9px] font-semibold text-white">
                          {item.quantity}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-neutral-900 line-clamp-1 hover:text-shop_dark_green transition-colors">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-neutral-400 mt-0.5">
                          {formatPrice(item.unitPrice)} x {item.quantity}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-neutral-900 tabular-nums shrink-0">
                        {formatPrice(item.subtotal)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Breakdown */}
              <div className="space-y-2.5 text-xs border-t border-neutral-200 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Tạm tính hàng hóa:</span>
                  <span className="text-neutral-800 font-medium">
                    {formatPrice(originalTotal)}
                  </span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex items-center justify-between text-emerald-700">
                    <span>
                      Giảm giá{discountPercent > 0 && ` (${discountPercent}%)`}:
                    </span>
                    <span className="font-semibold">
                      - {formatPrice(discountAmount)}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Phí vận chuyển:</span>
                  <span
                    className={
                      isFreeShip
                        ? "text-shop_dark_green font-semibold"
                        : "text-neutral-700"
                    }
                  >
                    {isFreeShip ? "Miễn phí" : "Tính khi giao hàng"}
                  </span>
                </div>

                <div className="border-t border-neutral-200 pt-3 mt-3 flex items-baseline justify-between">
                  <span className="font-bold text-xs uppercase tracking-tight text-neutral-900">
                    Tổng thanh toán
                  </span>
                  <span className="font-bold text-lg text-neutral-900">
                    {formatPrice(totalAmount)}
                  </span>
                </div>
              </div>

              {errorMessage && (
                <div className="border border-red-200 bg-red-50 p-2.5 text-xs text-red-600">
                  {errorMessage}
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  disabled={!isFormValid || isSubmitting}
                  className="block w-full bg-shop_dark_green text-white text-center py-3 text-xs font-semibold uppercase tracking-wider hover:bg-shop_dark_green/90 transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? "Đang xử lý đặt hàng..." : "Xác nhận đặt hàng →"}
                </button>
                <Link
                  href="/cart"
                  className="block w-full border border-neutral-300 text-neutral-700 text-center py-2.5 text-xs font-semibold uppercase tracking-wider hover:border-shop_dark_green hover:text-shop_dark_green transition-colors"
                >
                  ← Quay lại giỏ hàng
                </Link>
              </div>

              {/* Trust Badges */}
              <div className="border-t border-neutral-200 pt-4 space-y-2.5 text-[11px] text-neutral-500">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-shop_dark_green shrink-0" />
                  <span>100% Sản phẩm chính hãng & bảo hành uy tín</span>
                </div>
                <div className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-shop_dark_green shrink-0" />
                  <span>Đổi trả dễ dàng trong vòng 7 ngày</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-shop_dark_green shrink-0" />
                  <span>Giao hàng nhanh chóng & an toàn toàn quốc</span>
                </div>
              </div>
            </div>
          </aside>
        </form>
      </div>
    </div>
  );
};

export default CheckoutPage;