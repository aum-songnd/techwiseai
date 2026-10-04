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

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const socialButtons = [
    { label: "G", bg: "#ef4d46" },
    { label: "f", bg: "#3d69d6" },
    { label: "in", bg: "#1f7de0" },
    { label: "X", bg: "#1d9bf0" },
  ];

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

                <h2 className="form-title">Sign In To Your Account</h2>

                {justRegistered && (
                  <p className="status-box success">
                    Đăng ký thành công. Vui lòng đăng nhập.
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
                      placeholder="Email Address"
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
                      placeholder="Password"
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
                      <span>Remember me</span>
                    </label>

                    <Link href="/help" className="forgot-link">
                      Forgot Password
                    </Link>
                  </div>

                  {error && (
                    <p role="alert" className="status-box error">
                      {error}
                    </p>
                  )}

                  <button type="submit" disabled={isSubmitting} className="login-btn">
                    {isSubmitting ? "Signing in..." : "Login"}
                  </button>
                </form>

                <div className="divider">Or Login With</div>

                <div className="social-row">
                  {socialButtons.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      title={item.label}
                      className="social-btn"
                      style={{ background: item.bg }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

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