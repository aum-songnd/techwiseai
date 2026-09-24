"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image, { type StaticImageData } from "next/image";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { productImages } from "@/images";
import {
  createOrder,
  createPayment,
  OrderAuthRequiredError,
  type PaymentMethod,
} from "../../../lib/orders-api";

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

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; hint: string }[] = [
  {
    value: "COD",
    label: "Thanh toán khi nhận hàng (COD)",
    hint: "Trả tiền mặt cho shipper khi giao hàng",
  },
  {
    value: "VNPAY",
    label: "VNPAY",
    hint: "Chuyển hướng sang cổng thanh toán VNPAY",
  },
  {
    value: "MOMO",
    label: "Ví MoMo",
    hint: "Chuyển hướng sang ứng dụng/cổng MoMo",
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

  if (!isLoaded) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center text-gray-400 text-sm">
        Đang tải thông tin giỏ hàng...
      </div>
    );
  }

  if (requiresLogin) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 flex flex-col items-center text-center gap-4">
        <ShoppingBag className="w-14 h-14 text-gray-300" />
        <h1 className="text-xl font-bold text-shop_dark_green">
          Vui lòng đăng nhập để thanh toán
        </h1>
        <Link
          href="/sign-in"
          className="mt-2 bg-shop_dark_green/90 rounded-2xl px-6 py-3 text-white text-sm hover:bg-shop_dark_green transition-colors duration-300"
        >
          Đăng nhập
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 flex flex-col items-center text-center gap-4">
        <ShoppingBag className="w-14 h-14 text-gray-300" />
        <h1 className="text-xl font-bold text-shop_dark_green">
          Giỏ hàng đang trống
        </h1>
        <p className="text-gray-500 text-sm">
          Thêm sản phẩm vào giỏ trước khi tiến hành thanh toán.
        </p>
        <Link
          href="/"
          className="mt-2 bg-shop_dark_green/90 rounded-2xl px-6 py-3 text-white text-sm hover:bg-shop_dark_green transition-colors duration-300"
        >
          Tiếp tục mua sắm
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      // 1) Tạo đơn hàng từ giỏ hàng hiện tại (backend tự chốt giá, trừ
      //    tồn kho và xóa giỏ trong cùng transaction).
      const order = await createOrder({
        recipientName: recipientName.trim(),
        recipientPhone: recipientPhone.trim(),
        shippingAddress: shippingAddress.trim(),
        paymentMethod,
        note: note.trim() || undefined,
      });

      // 2) Khởi tạo phiên thanh toán cho đơn vừa tạo.
      const payment = await createPayment({
        orderId: order.id,
        paymentMethod,
      });

      // Giỏ hàng đã được backend xóa trong transaction tạo đơn -> đồng
      // bộ lại state phía client cho khớp.
      clearCart();

      if (payment.paymentUrl) {
        // VNPAY / MoMo: chuyển hướng sang cổng thanh toán.
        window.location.href = payment.paymentUrl;
        return;
      }

      // COD hoặc phương thức không cần redirect: sang trang chi tiết đơn.
      router.push(`/orders/${order.id}`);
    } catch (err) {
      if (err instanceof OrderAuthRequiredError) {
        router.push("/sign-in");
        return;
      }
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Đã có lỗi xảy ra khi tạo đơn hàng. Vui lòng thử lại."
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-shop_dark_green mb-6">
        Thanh toán
      </h1>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 lg:grid-cols-3 gap-8"
      >
        {/* Thông tin nhận hàng + phương thức thanh toán */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="border border-gray-200 rounded-lg p-5">
            <h2 className="font-bold text-shop_dark_green mb-4">
              Thông tin nhận hàng
            </h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Họ và tên người nhận
                </label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-shop_dark_green"
                  placeholder="Nguyễn Văn A"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-shop_dark_green"
                  placeholder="0912345678"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Địa chỉ giao hàng
                </label>
                <input
                  type="text"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-shop_dark_green"
                  placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Ghi chú (không bắt buộc)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-shop_dark_green"
                  placeholder="Giao hàng trong giờ hành chính..."
                />
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-5">
            <h2 className="font-bold text-shop_dark_green mb-4">
              Phương thức thanh toán
            </h2>
            <div className="flex flex-col gap-3">
              {PAYMENT_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start gap-3 border rounded-xl px-4 py-3 cursor-pointer transition-colors ${
                    paymentMethod === option.value
                      ? "border-shop_dark_green bg-shop_dark_green/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={option.value}
                    checked={paymentMethod === option.value}
                    onChange={() => setPaymentMethod(option.value)}
                    className="mt-1"
                  />
                  <div>
                    <p className="text-sm font-medium text-shop_dark_green">
                      {option.label}
                    </p>
                    <p className="text-xs text-gray-500">{option.hint}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Tóm tắt đơn hàng */}
        <div className="lg:col-span-1">
          <div className="border border-gray-200 rounded-lg p-5 sticky top-24">
            <h2 className="font-bold text-shop_dark_green mb-4">
              Đơn hàng của bạn
            </h2>

            <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-1 mb-4">
              {items.map((item) => {
                const image = resolveProductImage(item.thumbnailUrl);
                return (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="relative w-12 h-12 shrink-0 bg-gray-100 rounded-md overflow-hidden">
                      {image ? (
                        <Image
                          src={image}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      ) : null}
                      <span className="absolute -top-1 -right-1 bg-shop_dark_green text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-shop_dark_green line-clamp-1">
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatPrice(item.unitPrice)} x {item.quantity}
                      </p>
                    </div>
                    <p className="text-xs font-semibold text-shop_dark_green shrink-0">
                      {formatPrice(item.subtotal)}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-500">Tạm tính</span>
              <span className="font-medium">{formatPrice(totalAmount)}</span>
            </div>
            <div className="flex items-center justify-between text-sm mb-4">
              <span className="text-gray-500">Phí vận chuyển</span>
              <span className="font-medium">Tính khi giao hàng</span>
            </div>
            <div className="border-t border-gray-200 pt-4 flex items-center justify-between mb-4">
              <span className="font-bold text-shop_dark_green">Tổng cộng</span>
              <span className="font-bold text-lg text-shop_dark_green">
                {formatPrice(totalAmount)}
              </span>
            </div>

            {errorMessage && (
              <p className="text-xs text-red-500 mb-3">{errorMessage}</p>
            )}

            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="block text-center w-full bg-shop_dark_green/90 rounded-2xl px-6 py-3 text-white text-sm hover:bg-shop_dark_green transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Đang xử lý..." : "Đặt hàng"}
            </button>
            <Link
              href="/cart"
              className="block text-center text-sm text-gray-500 hover:text-shop_dark_green mt-3"
            >
              Quay lại giỏ hàng
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CheckoutPage;