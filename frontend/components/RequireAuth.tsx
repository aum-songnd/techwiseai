"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const { isSignedIn, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isSignedIn) {
      router.replace("/sign-in");
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