"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, LockKeyhole, UserRound } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { isAdminUser } from "@/lib/auth";

const SignInForm = () => {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get("registered") === "1";
  const sessionExpired = searchParams.get("expired") === "1";

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
    <main className="auth-login-shell flex min-h-screen items-center justify-center px-4 py-8 sm:px-8 sm:py-12">
      <section className="auth-login-card grid w-full max-w-6xl overflow-hidden rounded-[30px] bg-white shadow-[0_32px_100px_rgba(45,5,8,0.28)] md:min-h-[650px] md:grid-cols-[0.94fr_1.06fr]">
        <aside className="auth-login-art relative flex min-h-[270px] flex-col items-center justify-between overflow-hidden px-7 py-6 sm:min-h-[340px] sm:px-10 sm:py-8 md:min-h-full">
          <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border border-rose-950/15 bg-white/70 text-rose-950 shadow-sm">
            <span className="text-[22px] font-black leading-none">t</span>
          </div>
          <div className="relative z-10 flex w-full flex-1 items-center justify-center py-4 md:py-8">
            <Image
              src="/empty-cart.png"
              alt="Minh họa giỏ hàng TechWise AI"
              width={437}
              height={366}
              priority
              className="h-auto max-h-[330px] w-full max-w-[390px] object-contain mix-blend-multiply sm:max-h-[390px] md:max-h-[470px]"
              sizes="(max-width: 768px) 85vw, 42vw"
            />
          </div>
          <div className="relative z-10 max-w-sm text-center text-rose-950">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-rose-800/75">
              TechWise AI
            </p>
            <p className="mt-2 text-sm leading-6 text-rose-950/75 sm:text-base">
              Công nghệ bạn cần, trải nghiệm bạn yêu.
            </p>
          </div>
        </aside>

        <div className="flex items-center px-6 py-8 sm:px-12 sm:py-12 lg:px-16">
          <div className="mx-auto w-full max-w-md">
            <Link
              href="/"
              aria-label="Quay lại trang chủ"
              className="mb-9 inline-flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 hover:text-black"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

            <div className="mb-8">
              <h1 className="text-4xl font-medium tracking-tight text-gray-950 sm:text-5xl">
                Đăng nhập
              </h1>
              <p className="mt-3 text-sm text-gray-500">
                Chưa có tài khoản?{" "}
                <Link
                  href="/sign-up"
                  className="font-semibold text-gray-950 underline decoration-gray-400 underline-offset-4 transition-colors hover:text-rose-800"
                >
                  Tạo tài khoản
                </Link>
              </p>
            </div>

            {justRegistered && (
              <p className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                Đăng ký thành công. Vui lòng đăng nhập.
              </p>
            )}

            {sessionExpired && (
              <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="username"
                  className="mb-2 block text-sm font-medium text-gray-800"
                >
                  Tên đăng nhập
                </label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-400" />
                  <input
                    id="username"
                    type="text"
                    autoComplete="username"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-12 w-full rounded-full border border-gray-300 bg-white pl-11 pr-4 text-sm text-gray-950 outline-none transition focus:border-rose-800 focus:ring-4 focus:ring-rose-800/10"
                    placeholder="Nhập tên đăng nhập"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-gray-800"
                >
                  Mật khẩu
                </label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-400" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 w-full rounded-full border border-gray-300 bg-white pl-11 pr-12 text-sm text-gray-950 outline-none transition focus:border-rose-800 focus:ring-4 focus:ring-rose-800/10"
                    placeholder="Nhập mật khẩu"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
                  >
                    {showPassword ? (
                      <EyeOff className="h-[18px] w-[18px]" />
                    ) : (
                      <Eye className="h-[18px] w-[18px]" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 h-12 w-full rounded-full bg-gray-950 px-6 text-sm font-semibold text-white transition hover:bg-rose-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-900 disabled:cursor-wait disabled:opacity-60"
              >
                {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
              </button>
            </form>

            <div className="my-7 flex items-center gap-4" aria-hidden="true">
              <span className="h-px flex-1 bg-gray-200" />
              <span className="text-xs text-gray-400">hoặc</span>
              <span className="h-px flex-1 bg-gray-200" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled
                title="Đăng nhập Google chưa được cấu hình"
                className="flex h-11 items-center justify-center gap-2 rounded-full border border-gray-200 text-xs font-medium text-gray-500 opacity-75"
              >
                <span className="text-base font-bold text-[#4285f4]">G</span>
                Google
              </button>
              <button
                type="button"
                disabled
                title="Đăng nhập Facebook chưa được cấu hình"
                className="flex h-11 items-center justify-center gap-2 rounded-full border border-gray-200 text-xs font-medium text-gray-500 opacity-75"
              >
                <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#1877f2] text-xs font-bold text-white">
                  f
                </span>
                Facebook
              </button>
            </div>

            <p className="mt-8 text-center text-xs leading-5 text-gray-400">
              Bằng việc đăng nhập, bạn đồng ý với{" "}
              <Link
                href="/terms"
                className="font-medium text-gray-600 underline underline-offset-2 hover:text-rose-800"
              >
                Điều khoản sử dụng
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </main>
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