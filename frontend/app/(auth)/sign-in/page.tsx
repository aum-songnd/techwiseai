"use client";

import React, { Suspense, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { isAdminUser } from "@/lib/auth";
import Logo from "@/components/Logo";
import Container from "@/components/Container";

const SignInForm = () => {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get("registered") === "1";
  const sessionExpired = searchParams.get("expired") === "1";
  const justResetPassword = searchParams.get("reset") === "1";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(username, password);
      router.replace(isAdminUser() ? "/admin" : "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="font-sans min-h-screen bg-white text-neutral-900">
      <Container className="py-8 sm:py-10">
        {/* Breadcrumb Navigation - Matching Cart & Blog style */}
        <nav className="flex items-center gap-2 text-xs text-neutral-500 mb-6">
          <Link
            href="/"
            className="hover:text-shop_dark_green transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft size={13} />
            <span>Trang chủ</span>
          </Link>
          <span>/</span>
          <span className="text-neutral-900 font-medium">Đăng nhập tài khoản</span>
        </nav>

        {/* Header Bar - Matching Cart, Blog & Deals style */}
        <div className="flex flex-col gap-4 border-b border-neutral-200 pb-5 sm:flex-row sm:items-end sm:justify-between mb-8">
          <div className="flex items-end gap-3">
            <h1 className="text-xl font-bold uppercase tracking-tight text-neutral-900">
              Đăng nhập tài khoản
            </h1>
            <span className="pb-0.5 text-xs text-neutral-500 font-mono">
              [ TechWise AI ID ]
            </span>
          </div>
          <p className="text-xs text-neutral-500">
            Đăng nhập để đồng bộ đơn hàng, giỏ hàng và quản lý tài khoản của bạn.
          </p>
        </div>

        {/* Main Split Card: Form on Left, Showcase Image on Right */}
        <div className="border border-neutral-200 bg-white grid grid-cols-1 lg:grid-cols-12 shadow-sm overflow-hidden">
          {/* Left Column: Form Card (7 Cols) */}
          <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-neutral-200">
                <Logo />
                <span className="text-[11px] font-mono uppercase text-neutral-400 bg-neutral-100 px-2.5 py-1">
                  Cổng đăng nhập an toàn
                </span>
              </div>

              {/* Notification Alerts */}
              {justRegistered && (
                <div className="mb-5 border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>Đăng ký thành công! Vui lòng đăng nhập để bắt đầu trải nghiệm.</span>
                </div>
              )}

              {justResetPassword && (
                <div className="mb-5 border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.</span>
                </div>
              )}

              {sessionExpired && (
                <div className="mb-5 border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800 flex items-center gap-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.</span>
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  className="mb-5 border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 flex items-center gap-2.5"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                  <span>{error}</span>
                </div>
              )}

              {/* Sign-in Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label
                    htmlFor="username"
                    className="text-xs font-semibold uppercase tracking-wider text-neutral-700 block"
                  >
                    Email hoặc Tên đăng nhập *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
                    <input
                      id="username"
                      type="text"
                      autoComplete="username"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Nhập email hoặc tên tài khoản của bạn..."
                      className="w-full border border-neutral-300 pl-10 pr-3.5 py-2.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-shop_dark_green focus:outline-none bg-white transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="password"
                    className="text-xs font-semibold uppercase tracking-wider text-neutral-700 block"
                  >
                    Mật khẩu *
                  </label>
                  <div className="relative">
                    <LockKeyhole className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Nhập mật khẩu..."
                      className="w-full border border-neutral-300 pl-10 pr-10 py-2.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-shop_dark_green focus:outline-none bg-white transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-1"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 accent-shop_dark_green rounded border-neutral-300"
                    />
                    <span className="text-xs text-neutral-600">Ghi nhớ đăng nhập</span>
                  </label>

                  <Link
                    href="/forgot-password"
                    className="text-xs font-semibold text-shop_dark_green hover:underline"
                  >
                    Quên mật khẩu?
                  </Link>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-shop_dark_green text-white text-center py-3 text-xs font-semibold uppercase tracking-wider hover:bg-shop_dark_green/90 transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmitting ? "Đang xác thực thông tin..." : "Đăng nhập ngay →"}
                  </button>
                </div>
              </form>
            </div>

            <div className="mt-8 pt-5 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500">
              <span>Chưa có tài khoản TechWise AI?</span>
              <Link
                href="/sign-up"
                className="font-bold uppercase tracking-wider text-shop_dark_green hover:underline flex items-center gap-1"
              >
                <span>Tạo tài khoản mới</span>
                <span>→</span>
              </Link>
            </div>
          </div>

          {/* Right Column: AI Tech Ecosystem Showcase Image (5 Cols) */}
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
              <span className="inline-block bg-shop_dark_green text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 border border-white/20">
                TechWise AI
              </span>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
};

const SignInPage = () => {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
};

export default SignInPage;