"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

const SignInForm = () => {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get("registered") === "1";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(username, password);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-semibold text-center">Đăng nhập</h1>

        {justRegistered && (
          <p className="text-sm text-center text-green-600 bg-green-50 rounded-lg py-2 px-3">
            Đăng ký thành công! Vui lòng đăng nhập.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="text-sm font-medium">
              Tên đăng nhập
            </label>
            <input
              id="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
              placeholder="admin"
            />
          </div>

          <div>
            <label htmlFor="password" className="text-sm font-medium">
              Mật khẩu
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-black text-white py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>

        <p className="text-sm text-center text-lightColor">
          Chưa có tài khoản?{" "}
          <Link href="/sign-up" className="font-semibold hover:text-darkColor">
            Đăng ký
          </Link>
        </p>
      </div>
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