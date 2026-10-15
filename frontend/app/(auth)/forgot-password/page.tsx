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
  ShieldCheck,
  Loader2,
} from "lucide-react";
import Logo from "@/components/Logo";
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
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

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
    setDevOtpHint(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Vui lòng nhập địa chỉ email của bạn");
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await forgotPasswordRequest(trimmedEmail);
      setSuccessMessage(data.message || "Mã xác thực đã được gửi đến email của bạn.");
      if (data.devOtp) {
        setDevOtpHint(data.devOtp);
      }
      setStep("RESET");
      setCountdown(60);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gửi yêu cầu thất bại");
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
      const data = await forgotPasswordRequest(email.trim());
      setSuccessMessage("Đã gửi lại mã xác nhận mới!");
      if (data.devOtp) {
        setDevOtpHint(data.devOtp);
      }
      setCountdown(60);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gửi lại mã thất bại");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedOtp = otp.trim();
    if (!trimmedOtp) {
      setError("Vui lòng nhập mã xác thực OTP");
      return;
    }

    if (newPassword.length < 6) {
      setError("Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp với mật khẩu mới");
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPasswordRequest({
        email: email.trim(),
        otp: trimmedOtp,
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
    <main className="auth-shell">
      <section className="auth-signin-card">
        <div className="auth-grid">
          <div className="auth-form-panel">
            <div className="auth-form-inner">
              <Link
                href="/sign-in"
                aria-label="Quay lại đăng nhập"
                className="back-btn"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>

              <div className="brand-row">
                <Logo />
              </div>

              {step === "REQUEST" ? (
                <>
                  <h2 className="form-title">Quên mật khẩu</h2>
                  <p className="text-sm text-gray-500 mb-6">
                    Nhập địa chỉ email liên kết với tài khoản của bạn để nhận mã xác thực đặt lại mật khẩu.
                  </p>

                  {error && (
                    <p role="alert" className="status-box error">
                      {error}
                    </p>
                  )}

                  <form onSubmit={handleRequestOtp} className="auth-form">
                    <div className="field-wrap">
                      <Mail className="field-icon" />
                      <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="auth-input"
                        placeholder="Nhập địa chỉ email"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="login-btn"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Đang gửi mã...
                        </span>
                      ) : (
                        "Gửi mã xác nhận"
                      )}
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className="w-5 h-5 text-teal-600" />
                    <h2 className="form-title mb-0">Đặt lại mật khẩu</h2>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
                    Mã xác nhận đã được tạo cho email{" "}
                    <strong className="text-gray-800">{email}</strong>.{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setStep("REQUEST");
                        setError(null);
                        setSuccessMessage(null);
                      }}
                      className="text-teal-600 hover:underline font-medium text-xs ml-1"
                    >
                      Đổi email
                    </button>
                  </p>

                  {successMessage && (
                    <p className="status-box success">
                      {successMessage}
                    </p>
                  )}

                  {devOtpHint && (
                    <div className="mb-4 p-3 rounded-xl border border-teal-200 bg-teal-50 text-xs text-teal-900 flex items-center justify-between">
                      <span>Mã xác thực: <strong>{devOtpHint}</strong></span>
                      <button
                        type="button"
                        onClick={() => setOtp(devOtpHint)}
                        className="px-2 py-1 bg-teal-600 text-white rounded text-xs hover:bg-teal-700"
                      >
                        Điền nhanh
                      </button>
                    </div>
                  )}

                  {error && (
                    <p role="alert" className="status-box error">
                      {error}
                    </p>
                  )}

                  <form onSubmit={handleResetPassword} className="auth-form">
                    <div className="field-wrap">
                      <KeyRound className="field-icon" />
                      <input
                        id="otp"
                        type="text"
                        required
                        maxLength={10}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        className="auth-input font-mono tracking-widest text-center"
                        placeholder="Mã xác nhận (OTP)"
                      />
                    </div>

                    <div className="field-wrap">
                      <LockKeyhole className="field-icon" />
                      <input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="auth-input"
                        placeholder="Mật khẩu mới (tối thiểu 6 ký tự)"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((v) => !v)}
                        aria-label={showNewPassword ? "Ẩn" : "Hiện"}
                        className="eye-btn"
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4.5 w-4.5" />
                        ) : (
                          <Eye className="h-4.5 w-4.5" />
                        )}
                      </button>
                    </div>

                    <div className="field-wrap">
                      <LockKeyhole className="field-icon" />
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="auth-input"
                        placeholder="Xác nhận mật khẩu mới"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        aria-label={showConfirmPassword ? "Ẩn" : "Hiện"}
                        className="eye-btn"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4.5 w-4.5" />
                        ) : (
                          <Eye className="h-4.5 w-4.5" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500 mb-2 px-1">
                      <span>Chưa nhận được mã?</span>
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={countdown > 0 || isSubmitting}
                        className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        {countdown > 0 ? `Gửi lại sau (${countdown}s)` : "Gửi lại mã"}
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="login-btn"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Đang xử lý...
                        </span>
                      ) : (
                        "Đặt lại mật khẩu"
                      )}
                    </button>
                  </form>
                </>
              )}

              <p className="register-line">
                Đã nhớ mật khẩu?{" "}
                <Link href="/sign-in">Đăng nhập tại đây</Link>
              </p>
            </div>
          </div>

          <div className="auth-visual-panel">
            <div className="visual-sheen" />
            <div className="visual-scene">
              <Image
                src="/del.webp"
                alt="Delivery illustration"
                width={760}
                height={620}
                priority
                className="delivery-art"
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default ForgotPasswordPage;
