"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

/**
 * Bọc quanh page/section cần đăng nhập mới xem được.
 * Dùng trong page.tsx của route đó, ví dụ:
 *
 *   export default function AccountPage() {
 *     return (
 *       <RequireAuth>
 *         <AccountContent />
 *       </RequireAuth>
 *     );
 *   }
 */
const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const { isSignedIn, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isSignedIn) {
      router.replace("/sign-in");
    }
  }, [isLoading, isSignedIn, router]);

  // Trong lúc đang xác định trạng thái đăng nhập, không render gì
  // để tránh nháy nội dung nhạy cảm trước khi redirect.
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