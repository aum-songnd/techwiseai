"use client";

// components/AdminRedirect.tsx
//
// Đặt trong layout của nhóm route (client). Nếu người đang đăng nhập là
// ADMIN mà đang ở trang dành cho khách (trang chủ, shop, ...), tự chuyển
// thẳng sang /admin. Chạy lại mỗi khi pathname đổi nên cũng bắt được
// trường hợp vừa đăng nhập xong rồi router.push("/").

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getToken, isAdminUser } from "@/lib/auth";

const AdminRedirect = () => {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname?.startsWith("/admin")) return;
    if (getToken() && isAdminUser()) {
      router.replace("/admin");
    }
  }, [pathname, router]);

  return null;
};

export default AdminRedirect;