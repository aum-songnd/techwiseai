"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const { isSignedIn, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isSignedIn) {
      const redirectTo =
        typeof window !== "undefined"
          ? window.location.pathname + window.location.search
          : "/";
      router.replace(`/sign-in?redirect=${encodeURIComponent(redirectTo)}`);
    }
  }, [isLoading, isSignedIn, router]);

  if (isLoading || !isSignedIn) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-sm text-lightColor">
        Đang kiểm tra đăng nhập...
      </div>
    );
  }

  return <>{children}</>;
};

export default RequireAuth;