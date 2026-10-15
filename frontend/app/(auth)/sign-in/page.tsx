"use client";

import React, { Suspense, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { isAdminUser } from "@/lib/auth";
import Logo from "@/components/Logo";

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
    <>
      <main className="auth-shell">
        <section className="auth-signin-card">
          <div className="auth-grid">
            <div className="auth-form-panel">
              <div className="auth-form-inner">
                <Link href="/" aria-label="Quay lại trang chủ" className="back-btn">
                  <ArrowLeft className="h-5 w-5" />
                </Link>

                <div className="brand-row">
                <Logo/>

                </div>

                <h2 className="form-title">Đăng nhập tài khoản</h2>

                {justRegistered && (
                  <p className="status-box success">
                    Đăng ký thành công. Vui lòng đăng nhập.
                  </p>
                )}

                {justResetPassword && (
                  <p className="status-box success">
                    Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.
                  </p>
                )}

                {sessionExpired && (
                  <p className="status-box warning">
                    Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.
                  </p>
                )}

                <form onSubmit={handleSubmit} className="auth-form">
                  <div className="field-wrap">
                    <Mail className="field-icon" />
                    <input
                      id="username"
                      type="text"
                      autoComplete="username"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="auth-input"
                      placeholder="Email hoặc Tên đăng nhập"
                    />
                  </div>

                  <div className="field-wrap">
                    <LockKeyhole className="field-icon" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="auth-input"
                      placeholder="Mật khẩu"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      className="eye-btn"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4.5 w-4.5" />
                      ) : (
                        <Eye className="h-4.5 w-4.5" />
                      )}
                    </button>
                  </div>

                  <div className="row-between">
                    <label className="check-row">
                      <input type="checkbox" />
                      <span>Ghi nhớ đăng nhập</span>
                    </label>

                    <Link href="/forgot-password" className="forgot-link">
                      Quên mật khẩu?
                    </Link>
                  </div>

                  {error && (
                    <p role="alert" className="status-box error">
                      {error}
                    </p>
                  )}

                  <button type="submit" disabled={isSubmitting} className="login-btn">
                    {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
                  </button>
                </form>

                <p className="register-line">
                  Don&apos;t have an account?{" "}
                  <Link href="/sign-up">Register here</Link>
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
    </>
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