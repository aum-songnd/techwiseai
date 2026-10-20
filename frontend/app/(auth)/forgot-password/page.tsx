"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  RotateCcw,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import Logo from "@/components/Logo";
import Container from "@/components/Container";
import { forgotPasswordRequest, resetPasswordRequest } from "@/lib/auth";

type Step = "REQUEST" | "RESET";

const ForgotPasswordPage = () => {
  const router = useRouter();

  const [step, setStep] = useState<Step>("REQUEST");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Resend OTP countdown timer
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Vui lòng nhập địa chỉ email của bạn");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await forgotPasswordRequest(trimmedEmail);
      setSuccessMessage(res.message);
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setStep("RESET");
      setCountdown(60);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể gửi yêu cầu đặt lại mật khẩu"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0 || isSubmitting) return;
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      await forgotPasswordRequest(email.trim());
      setSuccessMessage("Mã xác nhận mới đã được gửi đến email của bạn!");
      setCountdown(60);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gửi lại mã xác nhận thất bại"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError("Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }

    setIsSubmitting(true);

    try {
      await resetPasswordRequest({
        email: email.trim(),
        otp: otp.trim(),
        newPassword,
      });
      router.push("/sign-in?reset=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đặt lại mật khẩu thất bại");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="font-sans min-h-screen text-white">
      <Container className="py-8 sm:py-10">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-neutral-300 mb-6">
          <Link
            href="/"
            className="hover:text-emerald-400 transition-colors flex items-center gap-1.5 text-neutral-300"
          >
            <ArrowLeft size={13} />
            <span>Trang chủ</span>
          </Link>
          <span className="text-neutral-500">/</span>
          <Link href="/sign-in" className="hover:text-emerald-400 transition-colors text-neutral-300">
            Đăng nhập
          </Link>
          <span className="text-neutral-500">/</span>
          <span className="text-white font-medium">Quên mật khẩu</span>
        </nav>

        {/* Header Bar */}
        <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between mb-8">
          <div className="flex items-end gap-3">
            <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-white drop-shadow-sm font-sans">
              Khôi phục mật khẩu
            </h1>
          </div>
        </div>

        {/* Main Content Grid: 12 Columns */}
        <div className="border border-white/15 bg-white/95 backdrop-blur-xl grid grid-cols-1 lg:grid-cols-12 shadow-2xl rounded-2xl overflow-hidden">
          {/* Left Column: Form Card (7 Cols) */}
          <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between text-neutral-900 bg-white">
            <div>
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-neutral-200">
                <Logo />
              </div>

              {error && (
                <div
                  role="alert"
                  className="mb-5 border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 flex items-center gap-2.5 rounded-lg"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                  <span>{error}</span>
                </div>
              )}

              {successMessage && step === "REQUEST" && (
                <div className="mb-5 border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 flex items-center gap-2.5 rounded-lg">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{successMessage}</span>
                </div>
              )}

              {step === "REQUEST" ? (
                <div>
                  <p className="text-xs text-neutral-600 mb-5 leading-relaxed font-sans">
                    Nhập địa chỉ email liên kết với tài khoản của bạn để nhận mã xác thực OTP qua Gmail.
                  </p>

                  <form onSubmit={handleRequestOtp} className="space-y-4">
                    <div className="space-y-1.5">
                      <label
                        htmlFor="email"
                        className="text-xs font-bold uppercase tracking-wider text-neutral-700 block font-sans"
                      >
                        Địa chỉ email *
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
                        <input
                          id="email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@example.com"
                          className="w-full border border-neutral-300 pl-10 pr-3.5 py-2.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-shop_dark_green focus:outline-none bg-white font-sans transition-colors rounded-lg"
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-shop_dark_green text-white text-center py-3 text-xs font-semibold uppercase tracking-wider hover:bg-shop_dark_green/90 transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50 rounded-lg font-sans"
                      >
                        {isSubmitting ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Đang gửi mã xác nhận...
                          </span>
                        ) : (
                          "Gửi mã xác nhận qua Gmail →"
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between text-xs text-neutral-600 mb-3 bg-neutral-50 px-3.5 py-2.5 border border-neutral-200 rounded-lg font-sans">
                    <span>
                      Email nhận mã: <strong>{email}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setStep("REQUEST");
                        setOtp("");
                        setNewPassword("");
                        setConfirmPassword("");
                        setError(null);
                        setSuccessMessage(null);
                      }}
                      className="text-shop_dark_green hover:underline font-semibold"
                    >
                      Đổi email
                    </button>
                  </div>

                  <div className="mb-5 border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 flex items-start gap-2.5 rounded-lg font-sans">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                    <span className="leading-relaxed">
                      Mã xác thực OTP đã được gửi đến email <strong>{email}</strong> (hiệu lực trong 15 phút). Vui lòng kiểm tra hộp thư đến (hoặc thư mục Spam) và điền mã 6 số vào ô bên dưới.
                    </span>
                  </div>

                  <form
                    onSubmit={handleResetPassword}
                    autoComplete="off"
                    className="space-y-4"
                  >
                    {/* Hidden decoys to completely neutralize browser credential autofill */}
                    <input
                      type="text"
                      name="chrome_fake_user"
                      tabIndex={-1}
                      aria-hidden="true"
                      autoComplete="off"
                      className="sr-only hidden"
                      style={{ display: "none" }}
                    />
                    <input
                      type="password"
                      name="chrome_fake_pass"
                      tabIndex={-1}
                      aria-hidden="true"
                      autoComplete="off"
                      className="sr-only hidden"
                      style={{ display: "none" }}
                    />

                    <div className="space-y-1.5">
                      <label
                        htmlFor="otp"
                        className="text-xs font-bold uppercase tracking-wider text-neutral-700 block font-sans"
                      >
                        Mã xác nhận từ Gmail (OTP) *
                      </label>
                      <div className="relative">
                        <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
                        <input
                          id="otp"
                          name="otp"
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          required
                          maxLength={10}
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          placeholder="Nhập mã 6 chữ số..."
                          className="w-full border border-neutral-300 pl-10 pr-3.5 py-2.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-shop_dark_green focus:outline-none bg-white font-sans transition-colors rounded-lg"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="newPassword"
                        className="text-xs font-bold uppercase tracking-wider text-neutral-700 block font-sans"
                      >
                        Mật khẩu mới *
                      </label>
                      <div className="relative">
                        <LockKeyhole className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
                        <input
                          id="newPassword"
                          name="newPassword"
                          type={showNewPassword ? "text" : "password"}
                          autoComplete="new-password"
                          required
                          minLength={6}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Mật khẩu mới (tối thiểu 6 ký tự)"
                          className="w-full border border-neutral-300 pl-10 pr-10 py-2.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-shop_dark_green focus:outline-none bg-white font-sans transition-colors rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword((v) => !v)}
                          aria-label={showNewPassword ? "Ẩn" : "Hiện"}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-1"
                        >
                          {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="confirmPassword"
                        className="text-xs font-bold uppercase tracking-wider text-neutral-700 block font-sans"
                      >
                        Xác nhận mật khẩu mới *
                      </label>
                      <div className="relative">
                        <LockKeyhole className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
                        <input
                          id="confirmPassword"
                          name="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          autoComplete="new-password"
                          required
                          minLength={6}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Nhập lại mật khẩu mới"
                          className="w-full border border-neutral-300 pl-10 pr-10 py-2.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-shop_dark_green focus:outline-none bg-white font-sans transition-colors rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((v) => !v)}
                          aria-label={showConfirmPassword ? "Ẩn" : "Hiện"}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-1"
                        >
                          {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-neutral-500 pt-1 font-sans">
                      <span>Chưa nhận được email?</span>
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={countdown > 0 || isSubmitting}
                        className="inline-flex items-center gap-1 text-shop_dark_green hover:underline font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <RotateCcw className="w-3 h-3" />
                        {countdown > 0 ? `Gửi lại sau (${countdown}s)` : "Gửi lại mã qua Gmail"}
                      </button>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-shop_dark_green text-white text-center py-3 text-xs font-semibold uppercase tracking-wider hover:bg-shop_dark_green/90 transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50 rounded-lg font-sans"
                      >
                        {isSubmitting ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Đang lưu mật khẩu mới...
                          </span>
                        ) : (
                          "Lưu mật khẩu mới & Đăng nhập →"
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            <div className="mt-8 pt-5 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500 font-sans">
              <span>Đã nhớ lại mật khẩu?</span>
              <Link
                href="/sign-in"
                className="font-bold uppercase tracking-wider text-shop_dark_green hover:underline flex items-center gap-1"
              >
                <span>Quay lại đăng nhập</span>
                <span>→</span>
              </Link>
            </div>
          </div>

          {/* Right Column: AI Tech Showcase Image (5 Cols) */}
          <div className="lg:col-span-5 relative hidden lg:block bg-neutral-950 overflow-hidden min-h-[520px]">
            <Image
              src="/auth-showcase.jpg"
              alt="TechWise AI Ecosystem Showcase"
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 42vw"
            />
            {/* Subtle Gradient & Brand Tag */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 p-8 text-white space-y-1.5 z-10">
              <span className="inline-block bg-shop_dark_green text-white text-xs font-medium px-2.5 py-1 border border-white/20 rounded">
                TechWise AI
              </span>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default ForgotPasswordPage;
