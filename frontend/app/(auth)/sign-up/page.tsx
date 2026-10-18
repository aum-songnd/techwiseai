"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Phone,
  UserRound,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { saveUserProfile } from "@/lib/auth";
import Logo from "@/components/Logo";
import Container from "@/components/Container";

const SignUpPage = () => {
  const { register } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setIsSubmitting(true);

    try {
      saveUserProfile({ username, email, fullName, phoneNumber });
      await register({ username, email, password, fullName, phoneNumber });
      saveUserProfile({ username, email, fullName, phoneNumber });
      router.push("/sign-in?registered=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng ký thất bại");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="font-sans min-h-screen bg-white text-neutral-900">
      <Container className="py-8 sm:py-10">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-neutral-500 mb-6">
          <Link
            href="/"
            className="hover:text-shop_dark_green transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft size={13} />
            <span>Trang chủ</span>
          </Link>
          <span>/</span>
          <span className="text-neutral-900 font-medium">Tạo tài khoản mới</span>
        </nav>

        {/* Header Bar */}
        <div className="flex flex-col gap-4 border-b border-neutral-200 pb-5 sm:flex-row sm:items-end sm:justify-between mb-8">
          <div className="flex items-end gap-3">
            <h1 className="text-xl font-bold uppercase tracking-tight text-neutral-900">
              Đăng ký tài khoản
            </h1>
            <span className="pb-0.5 text-xs text-neutral-500 font-mono">
              [ TechWise AI ID ]
            </span>
          </div>
          <p className="text-xs text-neutral-500">
            Trở thành thành viên TechWise AI để nhận trọn bộ voucher độc quyền và bảo hành điện tử 24/7.
          </p>
        </div>

        {/* Main Content Grid: 12 Columns */}
        <div className="border border-neutral-200 bg-white grid grid-cols-1 lg:grid-cols-12 shadow-sm overflow-hidden">
          {/* Left Column: Form Card (7 Cols) */}
          <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-neutral-200">
                <Logo />
                <span className="text-[11px] font-mono uppercase text-neutral-400 bg-neutral-100 px-2.5 py-1">
                  Đăng ký an toàn
                </span>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mb-5 border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 flex items-center gap-2.5"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                  <span>{error}</span>
                </div>
              )}

              {/* Registration Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="fullName"
                      className="text-xs font-semibold uppercase tracking-wider text-neutral-700 block"
                    >
                      Họ và tên *
                    </label>
                    <div className="relative">
                      <UserRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
                      <input
                        id="fullName"
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Nguyễn Văn A"
                        className="w-full border border-neutral-300 pl-10 pr-3.5 py-2.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-shop_dark_green focus:outline-none bg-white transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="email"
                      className="text-xs font-semibold uppercase tracking-wider text-neutral-700 block"
                    >
                      Địa chỉ email *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
                      <input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full border border-neutral-300 pl-10 pr-3.5 py-2.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-shop_dark_green focus:outline-none bg-white transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="username"
                      className="text-xs font-semibold uppercase tracking-wider text-neutral-700 block"
                    >
                      Tên đăng nhập *
                    </label>
                    <div className="relative">
                      <UserRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
                      <input
                        id="username"
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="username123"
                        className="w-full border border-neutral-300 pl-10 pr-3.5 py-2.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-shop_dark_green focus:outline-none bg-white transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="phoneNumber"
                      className="text-xs font-semibold uppercase tracking-wider text-neutral-700 block"
                    >
                      Số điện thoại *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
                      <input
                        id="phoneNumber"
                        type="tel"
                        required
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="0912 345 678"
                        className="w-full border border-neutral-300 pl-10 pr-3.5 py-2.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-shop_dark_green focus:outline-none bg-white transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Tối thiểu 6 ký tự"
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

                  <div className="space-y-1.5">
                    <label
                      htmlFor="confirmPassword"
                      className="text-xs font-semibold uppercase tracking-wider text-neutral-700 block"
                    >
                      Xác nhận mật khẩu *
                    </label>
                    <div className="relative">
                      <LockKeyhole className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        minLength={6}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Nhập lại mật khẩu"
                        className="w-full border border-neutral-300 pl-10 pr-10 py-2.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-shop_dark_green focus:outline-none bg-white transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((visible) => !visible)}
                        aria-label={
                          showConfirmPassword
                            ? "Ẩn mật khẩu xác nhận"
                            : "Hiện mật khẩu xác nhận"
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-1"
                      >
                        {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-shop_dark_green text-white text-center py-3 text-xs font-semibold uppercase tracking-wider hover:bg-shop_dark_green/90 transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmitting ? "Đang tạo tài khoản..." : "Hoàn tất đăng ký →"}
                  </button>
                </div>
              </form>
            </div>

            <div className="mt-8 pt-5 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500">
              <span>Đã có tài khoản TechWise AI?</span>
              <Link
                href="/sign-in"
                className="font-bold uppercase tracking-wider text-shop_dark_green hover:underline flex items-center gap-1"
              >
                <span>Đăng nhập ngay</span>
                <span>→</span>
              </Link>
            </div>
          </div>

          {/* Right Column: AI Tech Showcase Image (5 Cols) */}
          <div className="lg:col-span-5 relative hidden lg:block bg-neutral-950 overflow-hidden min-h-[560px]">
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

export default SignUpPage;