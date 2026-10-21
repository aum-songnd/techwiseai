"use client";

import React, { useEffect, useMemo, useState } from "react";
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
  MapPin,
  User as UserIcon,
  PenLine,
  Building2,
  CalendarDays,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { productImages } from "@/images";
import { FREE_SHIP_THRESHOLD } from "@/components/ServiceFeatures";
import { getSavedUserProfile, saveUserProfile, setStoredUser } from "@/lib/auth";
import {
  createOrder,
  createOrGetPayment,
  getOrders,
  OrderAuthRequiredError,
  type PaymentMethod,
} from "@/lib/orders-api";
import {
  fetchProvincesV1,
  fetchDistrictsV1,
  fetchWardsV1,
  fetchProvincesV2,
  fetchWardsV2,
  type Province,
  type District,
  type Ward,
} from "@/lib/provinces-api";
import Loading from "@/app/(client)/loading";

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
  const { user, isSignedIn, isLoading: isAuthLoading } = useAuth();
  const { items, totalAmount, isLoaded, requiresLogin, clearCart } = useCart();

  // Recipient source state: "account" vs "manual"
  const [recipientSource, setRecipientSource] = useState<"account" | "manual">(
    "account"
  );
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");

  // Administrative dataset version: "v2" (Sau sáp nhập - Mặc định) vs "v1" (Trước sáp nhập)
  const [adminVersion, setAdminVersion] = useState<"v2" | "v1">("v2");

  // Delivery time option: "all_week" (full-time) vs "office_hours" (hành chính)
  const [deliveryTimeOption, setDeliveryTimeOption] = useState<
    "all_week" | "office_hours"
  >("all_week");

  // Address inputs state
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);

  const [selectedProvinceCode, setSelectedProvinceCode] = useState<string>("");
  const [selectedDistrictCode, setSelectedDistrictCode] = useState<string>("");
  const [selectedWardCode, setSelectedWardCode] = useState<string>("");
  const [streetAddress, setStreetAddress] = useState(""); // Số nhà, tên đường

  // Combined shipping address string
  const [shippingAddress, setShippingAddress] = useState("");
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("COD");

  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load provinces whenever adminVersion changes
  useEffect(() => {
    setLoadingProvinces(true);
    setSelectedProvinceCode("");
    setSelectedDistrictCode("");
    setSelectedWardCode("");
    setDistricts([]);
    setWards([]);

    const loader =
      adminVersion === "v2" ? fetchProvincesV2() : fetchProvincesV1();

    loader
      .then((data) => {
        setProvinces(data);
      })
      .finally(() => {
        setLoadingProvinces(false);
      });
  }, [adminVersion]);

  // Autofill recipient name and phone from account (with fallback to saved registration profile and past orders)
  useEffect(() => {
    if (user && recipientSource === "account") {
      const savedProfile = getSavedUserProfile(user.username);
      const accName =
        user.fullName ||
        savedProfile?.fullName ||
        user.username ||
        "";
      if (accName) setRecipientName(accName);

      const rawUser = user as unknown as Record<string, unknown>;
      const phoneCandidate =
        user.phoneNumber ||
        savedProfile?.phoneNumber ||
        (typeof rawUser.phone === "string" ? rawUser.phone : "") ||
        (typeof rawUser.phoneNumber === "string" ? rawUser.phoneNumber : "") ||
        "";

      if (phoneCandidate) {
        setRecipientPhone(phoneCandidate);
        if (!user.phoneNumber) {
          const updated = {
            ...user,
            phoneNumber: phoneCandidate,
            phone: phoneCandidate,
            fullName: accName,
          };
          setStoredUser(updated);
        }
      } else {
        // Fallback: Check past orders to retrieve and update user phone number
        getOrders(0, 1)
          .then((res) => {
            const lastOrder = res.items?.[0];
            if (lastOrder?.recipientPhone) {
              setRecipientPhone(lastOrder.recipientPhone);
              const updated = {
                ...user,
                phoneNumber: lastOrder.recipientPhone,
                phone: lastOrder.recipientPhone,
                fullName: accName || lastOrder.recipientName,
              };
              setStoredUser(updated);
              saveUserProfile({
                username: user.username,
                phoneNumber: lastOrder.recipientPhone,
                fullName: accName || lastOrder.recipientName,
              });
            }
          })
          .catch(() => {});
      }
    }
  }, [user, recipientSource]);

  // Sync combined address into shippingAddress
  const syncCombinedAddress = (
    street: string,
    provCode: string,
    distCode: string,
    wardCode: string,
    currentDistricts: District[],
    currentWards: Ward[],
    currentVersion: "v2" | "v1"
  ) => {
    const prov = provinces.find((p) => String(p.code) === provCode)?.name;
    const dist = currentDistricts.find((d) => String(d.code) === distCode)?.name;
    const ward = currentWards.find((w) => String(w.code) === wardCode)?.name;

    const parts = [
      street.trim(),
      ward,
      currentVersion === "v1" ? dist : undefined,
      prov,
    ].filter(Boolean);

    const combined = parts.join(", ");
    setShippingAddress(combined);
    return combined;
  };

  const handleProvinceChange = async (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const code = e.target.value;
    setSelectedProvinceCode(code);
    setSelectedDistrictCode("");
    setSelectedWardCode("");
    setDistricts([]);
    setWards([]);

    if (!code) {
      syncCombinedAddress(
        streetAddress,
        "",
        "",
        "",
        [],
        [],
        adminVersion
      );
      return;
    }

    if (adminVersion === "v2") {
      // In v2: Wards are directly under province
      setLoadingWards(true);
      const wList = await fetchWardsV2(Number(code));
      setWards(wList);
      setLoadingWards(false);
      syncCombinedAddress(
        streetAddress,
        code,
        "",
        "",
        [],
        wList,
        "v2"
      );
    } else {
      // In v1: Districts are under province
      setLoadingDistricts(true);
      const dists = await fetchDistrictsV1(Number(code));
      setDistricts(dists);
      setLoadingDistricts(false);
      syncCombinedAddress(
        streetAddress,
        code,
        "",
        "",
        dists,
        [],
        "v1"
      );
    }
  };

  const handleDistrictChange = async (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const code = e.target.value;
    setSelectedDistrictCode(code);
    setSelectedWardCode("");
    setWards([]);

    if (code) {
      setLoadingWards(true);
      const wList = await fetchWardsV1(Number(code));
      setWards(wList);
      setLoadingWards(false);
      syncCombinedAddress(
        streetAddress,
        selectedProvinceCode,
        code,
        "",
        districts,
        wList,
        "v1"
      );
    } else {
      syncCombinedAddress(
        streetAddress,
        selectedProvinceCode,
        "",
        "",
        districts,
        [],
        "v1"
      );
    }
  };

  const handleWardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    setSelectedWardCode(code);

    syncCombinedAddress(
      streetAddress,
      selectedProvinceCode,
      selectedDistrictCode,
      code,
      districts,
      wards,
      adminVersion
    );
  };

  const handleStreetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setStreetAddress(val);
    syncCombinedAddress(
      val,
      selectedProvinceCode,
      selectedDistrictCode,
      selectedWardCode,
      districts,
      wards,
      adminVersion
    );
  };

  // Phone validation helper
  const cleanPhone = recipientPhone.replace(/\s+/g, "");
  const isPhoneValid = /^(0\d{9}|\+84\d{9})$/.test(cleanPhone);

  const isFormValid = useMemo(() => {
    const hasName = recipientName.trim().length > 0;
    const hasValidPhone = isPhoneValid;
    const hasProvince = selectedProvinceCode !== "";
    const hasWard = selectedWardCode !== "";
    const hasDistrict = adminVersion === "v2" || selectedDistrictCode !== "";
    const hasStreet = streetAddress.trim().length > 0;

    return (
      hasName &&
      hasValidPhone &&
      hasProvince &&
      hasWard &&
      hasDistrict &&
      hasStreet
    );
  }, [
    recipientName,
    isPhoneValid,
    adminVersion,
    selectedProvinceCode,
    selectedWardCode,
    selectedDistrictCode,
    streetAddress,
  ]);

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

  if (!isLoaded || isAuthLoading) {
    return <Loading message="Đang tải thông tin đơn hàng..." />;
  }

  if (!isSignedIn || requiresLogin) {
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

  if (isRedirecting) {
    return (
      <div className="font-sans min-h-screen bg-white flex flex-col items-center justify-center gap-4 text-neutral-700">
        <Loader2 className="w-8 h-8 animate-spin text-shop_dark_green" />
        <p className="text-sm font-semibold uppercase tracking-wider text-neutral-800">
          {paymentMethod === "VNPAY"
            ? "Đang chuyển hướng sang cổng thanh toán VNPAY..."
            : "Đang chuyển đến trang chi tiết đơn hàng..."}
        </p>
        <p className="text-xs text-neutral-500">
          Vui lòng đợi trong giây lát, hệ thống đang hoàn tất đơn hàng của bạn.
        </p>
      </div>
    );
  }

  if (items.length === 0 && !isRedirecting && !isSubmitting) {
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
      const deliveryTimeLabel =
        deliveryTimeOption === "office_hours"
          ? "Giao giờ hành chính (T2 - T6, 8h00 - 18h00)"
          : "Giao tất cả các ngày trong tuần (Full-time, cả T7 & CN)";

      const noteParts: string[] = [`[Thời gian nhận: ${deliveryTimeLabel}]`];
      if (note.trim()) {
        noteParts.push(note.trim());
      }

      const order = await createOrder({
        recipientName: recipientName.trim(),
        recipientPhone: cleanPhone,
        shippingAddress: shippingAddress.trim(),
        paymentMethod,
        note: noteParts.join(" - "),
      });

      // Persist phone number into user profile in localStorage and cache
      if (user && cleanPhone) {
        saveUserProfile({
          username: user.username,
          phoneNumber: cleanPhone,
          fullName: recipientName.trim(),
        });
        const updatedUser = {
          ...user,
          phoneNumber: cleanPhone,
          phone: cleanPhone,
          fullName: recipientName.trim(),
        };
        setStoredUser(updatedUser);
      }

      if (paymentMethod === "VNPAY") {
        let payment;
        try {
          payment = await createOrGetPayment({
            orderId: order.id,
            paymentMethod: "VNPAY",
          });
        } catch (paymentErr) {
          console.error("Lỗi khi khởi tạo thanh toán VNPAY:", paymentErr);
        }

        if (payment?.paymentUrl) {
          setIsRedirecting(true);
          clearCart();
          window.location.href = payment.paymentUrl;
          return;
        }

        setIsSubmitting(false);
        setErrorMessage(
          "Không thể tạo liên kết thanh toán VNPAY. Vui lòng thử lại hoặc chọn phương thức khác."
        );
        return;
      }

      // COD: nhảy thẳng tới trang chi tiết đơn hàng
      setIsRedirecting(true);
      clearCart();
      router.push(`/orders/${order.id}`);
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
            {/* Section 1: Thông tin người nhận & Địa chỉ */}
            <div className="border border-neutral-200 p-6 bg-white space-y-6">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                  1. Thông tin người nhận & Địa chỉ
                </span>
                <span className="text-[11px] text-neutral-400">
                  * Vui lòng điền chính xác để đảm bảo nhận hàng
                </span>
              </div>

              {/* 1.1: Nguồn thông tin người nhận (Theo tài khoản vs Điền tay) */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-neutral-700">
                  Thông tin người nhận <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setRecipientSource("account");
                      if (user) {
                        const saved = getSavedUserProfile(user.username);
                        const n = user.fullName || saved?.fullName || user.username || "";
                        const p =
                          user.phoneNumber ||
                          saved?.phoneNumber ||
                          ((user as unknown as Record<string, unknown>)?.phone as string) ||
                          "";
                        if (n) setRecipientName(n);
                        if (p) setRecipientPhone(p);
                      }
                    }}
                    className={`flex items-start gap-3 p-3.5 border text-left transition-all ${
                      recipientSource === "account"
                        ? "border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900/10"
                        : "border-neutral-200 hover:border-neutral-300 bg-white"
                    }`}
                  >
                    <div
                      className={`p-2 rounded-full shrink-0 ${
                        recipientSource === "account"
                          ? "bg-neutral-900 text-white"
                          : "bg-neutral-100 text-neutral-500"
                      }`}
                    >
                      <UserIcon size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-neutral-900">
                          Sử dụng thông tin tài khoản
                        </span>
                        {recipientSource === "account" && (
                          <Check
                            size={14}
                            className="text-neutral-900 shrink-0"
                            strokeWidth={2.5}
                          />
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                        {user
                          ? `${recipientName || user.fullName || user.username || "Tài khoản"}${
                              recipientPhone || user.phoneNumber
                                ? ` • ${recipientPhone || user.phoneNumber}`
                                : " • (Cập nhật SĐT)"
                            }`
                          : "Đang tải thông tin tài khoản..."}
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRecipientSource("manual");
                    }}
                    className={`flex items-start gap-3 p-3.5 border text-left transition-all ${
                      recipientSource === "manual"
                        ? "border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900/10"
                        : "border-neutral-200 hover:border-neutral-300 bg-white"
                    }`}
                  >
                    <div
                      className={`p-2 rounded-full shrink-0 ${
                        recipientSource === "manual"
                          ? "bg-neutral-900 text-white"
                          : "bg-neutral-100 text-neutral-500"
                      }`}
                    >
                      <PenLine size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-neutral-900">
                          Điền tay người nhận khác
                        </span>
                        {recipientSource === "manual" && (
                          <Check
                            size={14}
                            className="text-neutral-900 shrink-0"
                            strokeWidth={2.5}
                          />
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                        Tùy ý nhập tên & số điện thoại người nhận mới
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Recipient Name & Phone Inputs (Locked when using account info) */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-neutral-700">
                      Họ và tên người nhận <span className="text-red-500">*</span>
                    </label>
                    {recipientSource === "account" && (
                      <span className="text-[11px] text-neutral-400">
                        (Cố định từ tài khoản)
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    disabled={recipientSource === "account"}
                    required
                    placeholder="Ví dụ: Nguyễn Văn A"
                    className="w-full border border-neutral-300 px-3.5 py-2.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-shop_dark_green focus:outline-none transition-colors disabled:bg-neutral-100 disabled:text-neutral-600 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-neutral-700">
                      Số điện thoại liên hệ <span className="text-red-500">*</span>
                    </label>
                    {recipientSource === "account" && (
                      <span className="text-[11px] text-neutral-400">
                        {recipientPhone
                          ? "(Cố định từ tài khoản)"
                          : "(Nhập để lưu vào tài khoản)"}
                      </span>
                    )}
                  </div>
                  <input
                    type="tel"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    disabled={
                      recipientSource === "account" && Boolean(recipientPhone)
                    }
                    required
                    placeholder="Ví dụ: 0912345678 (10 chữ số)"
                    className={`w-full border px-3.5 py-2.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-shop_dark_green focus:outline-none transition-colors disabled:bg-neutral-100 disabled:text-neutral-600 disabled:cursor-not-allowed ${
                      recipientPhone && !isPhoneValid
                        ? "border-amber-400 bg-amber-50/20"
                        : "border-neutral-300"
                    }`}
                  />
                  {recipientPhone && !isPhoneValid && (
                    <p className="text-[11px] text-amber-600 mt-1">
                      Số điện thoại cần có 10 chữ số hợp lệ (ví dụ: 0912345678 hoặc +84912345678).
                    </p>
                  )}
                </div>
              </div>

              {/* 1.2: Địa chỉ nhận hàng (Clean, non-flashy, with Hamlet/Thôn input) */}
              <div className="space-y-3.5 pt-2">
                <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                  <label className="text-xs font-semibold text-neutral-900">
                    Địa chỉ nhận hàng <span className="text-red-500">*</span>
                  </label>

                  {/* Clean, standard dataset switcher */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-[11px] text-neutral-500">Dữ liệu:</span>
                    <button
                      type="button"
                      onClick={() => setAdminVersion("v2")}
                      className={`px-2.5 py-1 text-[11px] font-medium border transition-colors ${
                        adminVersion === "v2"
                          ? "border-neutral-900 bg-neutral-900 text-white"
                          : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
                      }`}
                    >
                      Sau sáp nhập (34 Tỉnh)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdminVersion("v1")}
                      className={`px-2.5 py-1 text-[11px] font-medium border transition-colors ${
                        adminVersion === "v1"
                          ? "border-neutral-900 bg-neutral-900 text-white"
                          : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
                      }`}
                    >
                      Trước sáp nhập (63 Tỉnh)
                    </button>
                  </div>
                </div>

                {/* Dropdowns based on adminVersion */}
                {adminVersion === "v2" ? (
                  /* V2 (Sau sáp nhập): 2 levels (Tỉnh/Thành -> Phường/Xã) */
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-[11px] font-medium text-neutral-500 mb-1">
                        Tỉnh / Thành phố <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedProvinceCode}
                        onChange={handleProvinceChange}
                        disabled={loadingProvinces}
                        required
                        className="w-full border border-neutral-300 bg-white px-3 py-2.5 text-xs text-neutral-900 focus:border-shop_dark_green focus:outline-none transition-colors"
                      >
                        <option value="">-- Chọn Tỉnh / Thành phố --</option>
                        {provinces.map((p) => (
                          <option key={p.code} value={p.code}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-neutral-500 mb-1">
                        Phường / Xã trực thuộc <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedWardCode}
                        onChange={handleWardChange}
                        disabled={!selectedProvinceCode || loadingWards}
                        required
                        className="w-full border border-neutral-300 bg-white px-3 py-2.5 text-xs text-neutral-900 focus:border-shop_dark_green focus:outline-none transition-colors disabled:bg-neutral-100 disabled:cursor-not-allowed"
                      >
                        <option value="">
                          {loadingWards
                            ? "Đang tải phường/xã..."
                            : "-- Chọn Phường / Xã --"}
                        </option>
                        {wards.map((w) => (
                          <option key={w.code} value={w.code}>
                            {w.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  /* V1 (Trước sáp nhập): 3 levels (Tỉnh -> Huyện -> Xã) */
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="block text-[11px] font-medium text-neutral-500 mb-1">
                        Tỉnh / Thành phố <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedProvinceCode}
                        onChange={handleProvinceChange}
                        disabled={loadingProvinces}
                        required
                        className="w-full border border-neutral-300 bg-white px-3 py-2.5 text-xs text-neutral-900 focus:border-shop_dark_green focus:outline-none transition-colors"
                      >
                        <option value="">-- Chọn Tỉnh / Thành phố --</option>
                        {provinces.map((p) => (
                          <option key={p.code} value={p.code}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-neutral-500 mb-1">
                        Quận / Huyện <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedDistrictCode}
                        onChange={handleDistrictChange}
                        disabled={!selectedProvinceCode || loadingDistricts}
                        required
                        className="w-full border border-neutral-300 bg-white px-3 py-2.5 text-xs text-neutral-900 focus:border-shop_dark_green focus:outline-none transition-colors disabled:bg-neutral-100 disabled:cursor-not-allowed"
                      >
                        <option value="">
                          {loadingDistricts
                            ? "Đang tải quận/huyện..."
                            : "-- Chọn Quận / Huyện --"}
                        </option>
                        {districts.map((d) => (
                          <option key={d.code} value={d.code}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-neutral-500 mb-1">
                        Phường / Xã <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedWardCode}
                        onChange={handleWardChange}
                        disabled={!selectedDistrictCode || loadingWards}
                        required
                        className="w-full border border-neutral-300 bg-white px-3 py-2.5 text-xs text-neutral-900 focus:border-shop_dark_green focus:outline-none transition-colors disabled:bg-neutral-100 disabled:cursor-not-allowed"
                      >
                        <option value="">
                          {loadingWards
                            ? "Đang tải phường/xã..."
                            : "-- Chọn Phường / Xã --"}
                        </option>
                        {wards.map((w) => (
                          <option key={w.code} value={w.code}>
                            {w.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Street & house number */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    Số nhà, tên đường, ngõ xóm chi tiết <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={streetAddress}
                    onChange={handleStreetChange}
                    required
                    placeholder="Ví dụ: Số 25 ngõ 180 Hoàng Quốc Việt"
                    className="w-full border border-neutral-300 px-3.5 py-2.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-shop_dark_green focus:outline-none transition-colors"
                  />
                  <p className="text-[11px] text-neutral-400 mt-1">
                    Điền số nhà, ngõ/ngách/hẻm hoặc tên tòa nhà, số căn hộ.
                  </p>
                </div>

                {/* Address Preview (Standard, non-flashy box) */}
                {shippingAddress ? (
                  <div className="border border-neutral-200 bg-neutral-50 p-3 text-xs flex items-start gap-2.5">
                    <MapPin size={15} className="text-neutral-600 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      <span className="text-neutral-500">Địa chỉ giao hàng đầy đủ: </span>
                      <span className="font-semibold text-neutral-900">
                        {shippingAddress}
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* 1.3: Lựa chọn thời gian giao hàng (Giờ hành chính vs Full time) */}
              <div className="space-y-2.5 pt-2">
                <label className="block text-xs font-semibold text-neutral-700">
                  Thời gian nhận hàng thuận tiện <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`flex items-start gap-3 border p-3.5 cursor-pointer transition-all ${
                      deliveryTimeOption === "all_week"
                        ? "border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900/10"
                        : "border-neutral-200 hover:border-neutral-300 bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="deliveryTimeOption"
                      value="all_week"
                      checked={deliveryTimeOption === "all_week"}
                      onChange={() => setDeliveryTimeOption("all_week")}
                      className="mt-0.5 h-4 w-4 text-shop_dark_green accent-shop_dark_green"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays
                          size={14}
                          className={
                            deliveryTimeOption === "all_week"
                              ? "text-neutral-900"
                              : "text-neutral-500"
                          }
                        />
                        <span className="text-xs font-bold text-neutral-900">
                          Tất cả các ngày (Full-time)
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                        Giao cả Thứ 7 và Chủ Nhật (Phù hợp địa chỉ nhà riêng).
                      </p>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 border p-3.5 cursor-pointer transition-all ${
                      deliveryTimeOption === "office_hours"
                        ? "border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900/10"
                        : "border-neutral-200 hover:border-neutral-300 bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="deliveryTimeOption"
                      value="office_hours"
                      checked={deliveryTimeOption === "office_hours"}
                      onChange={() => setDeliveryTimeOption("office_hours")}
                      className="mt-0.5 h-4 w-4 text-shop_dark_green accent-shop_dark_green"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <Building2
                          size={14}
                          className={
                            deliveryTimeOption === "office_hours"
                              ? "text-neutral-900"
                              : "text-neutral-500"
                          }
                        />
                        <span className="text-xs font-bold text-neutral-900">
                          Chỉ giờ hành chính (Office hours)
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                        Thứ 2 đến Thứ 6 (08:00 - 18:00, phù hợp cơ quan, văn phòng).
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Order Note */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  Ghi chú đơn hàng (tuỳ chọn)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="Ghi chú thêm về thời gian giao hàng, chỉ dẫn vị trí nhận kiện hàng..."
                  className="w-full border border-neutral-300 px-3.5 py-2.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-shop_dark_green focus:outline-none transition-colors resize-none"
                />
              </div>
            </div>

            {/* Section 2: Phương thức thanh toán (MoMo removed & no badges) */}
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
                      className={`flex items-start gap-4 border p-4 cursor-pointer transition-all ${
                        isSelected
                          ? "border-neutral-900 bg-neutral-50 shadow-xs"
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
                          <Icon
                            className={`h-4 w-4 ${
                              isSelected
                                ? "text-neutral-900"
                                : "text-neutral-500"
                            }`}
                          />
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
              <div className="flex flex-col divide-y divide-neutral-100 max-h-64 overflow-y-auto pr-1">
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

              {/* Delivery Details Summary Card */}
              <div className="space-y-2 border-t border-neutral-200 pt-3 text-xs">
                <div className="flex items-start justify-between">
                  <span className="text-neutral-500 shrink-0">Người nhận:</span>
                  <span className="font-medium text-neutral-800 text-right truncate max-w-[170px]">
                    {recipientName || "Chưa nhập"} ({recipientPhone || "Chưa nhập"})
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 shrink-0">Thời gian nhận:</span>
                  <span className="font-medium text-neutral-800 text-right">
                    {deliveryTimeOption === "office_hours"
                      ? "Giờ hành chính (T2 - T6)"
                      : "Full-time (Cả T7 & CN)"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 shrink-0">Hành chính:</span>
                  <span className="font-medium text-neutral-800 text-right">
                    {adminVersion === "v2"
                      ? "Sau sáp nhập (34 tỉnh)"
                      : "Trước sáp nhập (63 tỉnh)"}
                  </span>
                </div>
              </div>

              {/* Price Breakdown */}
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