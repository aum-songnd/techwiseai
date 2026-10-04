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
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Logo from "@/components/Logo";

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
      await register({ username, email, password, fullName, phoneNumber });
      router.push("/sign-in?registered=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng ký thất bại");
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
              <Link href="/" aria-label="Quay lại trang chủ" className="back-btn">
                <ArrowLeft className="h-5 w-5" />
              </Link>

              <Logo/>

              <h1 className="form-title">Tạo tài khoản</h1>

              <form onSubmit={handleSubmit} className="auth-form">
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                  }}
                >
                  <div className="field-wrap">
                    <UserRound className="field-icon" />
                    <input
                      id="fullName"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="auth-input"
                      placeholder="Họ và tên"
                    />
                  </div>

                  <div className="field-wrap">
                    <Mail className="field-icon" />
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="auth-input"
                      placeholder="Địa chỉ email"
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                  }}
                >
                  <div className="field-wrap">
                    <UserRound className="field-icon" />
                    <input
                      id="username"
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="auth-input"
                      placeholder="Tên đăng nhập"
                    />
                  </div>

                  <div className="field-wrap">
                    <Phone className="field-icon" />
                    <input
                      id="phoneNumber"
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="auth-input"
                      placeholder="Số điện thoại"
                    />
                  </div>
                </div>

                <div className="field-wrap">
                  <LockKeyhole className="field-icon" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
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

                <div className="field-wrap">
                  <LockKeyhole className="field-icon" />
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="auth-input"
                    placeholder="Xác nhận mật khẩu"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword((visible) => !visible)
                    }
                    aria-label={
                      showConfirmPassword
                        ? "Ẩn mật khẩu xác nhận"
                        : "Hiện mật khẩu xác nhận"
                    }
                    className="eye-btn"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4.5 w-4.5" />
                    ) : (
                      <Eye className="h-4.5 w-4.5" />
                    )}
                  </button>
                </div>

                {error && (
                  <p role="alert" className="status-box error">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="login-btn"
                >
                  {isSubmitting ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
                </button>
              </form>

              <p className="register-line">
                Đã có tài khoản?{" "}
                <Link href="/sign-in">Đăng nhập ngay</Link>
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

export default SignUpPage;