"use client";

// app/admin/layout.tsx
//
// Bảo vệ toàn bộ nhóm route /admin/*: nếu chưa đăng nhập hoặc user không
// có quyền ADMIN -> đá về trang chủ. Dùng "use client" vì cần đọc
// localStorage (getToken/getStoredUser) — không thể check ở server
// component. Vì vậy sẽ có 1 nhịp flash rỗng trước khi check xong; nếu
// cần chặn triệt để hơn (không lộ layout admin dù 1 khung hình) nên làm
// thêm middleware.ts đọc cookie, nhưng hiện token đang lưu ở
// localStorage (không phải cookie) nên middleware không đọc được — để
// làm được cần đổi sang lưu token ở cookie trước.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getToken, isAdminUser } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const { logout } = useAuth();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token || !isAdminUser()) {
      router.replace("/");
      return;
    }
    setChecked(true);
  }, [router]);

  const handleLogout = () => {
    // Dùng logout() của AuthContext (thay vì tự gọi clearToken/
    // clearStoredUser) để state `user` trong context được xoá ngay lập
    // tức -> Header cập nhật liền, không cần F5 mới thấy đăng xuất.
    logout();
    router.replace("/");
  };

  // Chưa check xong (hoặc đang redirect) -> không render gì để tránh
  // lộ nội dung admin trong 1 nhịp.
  if (!checked) return null;

  return (
    <div className="min-h-screen bg-shop_light_bg">
      <header className="bg-shop_dark_green text-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="font-semibold">
              Admin
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/admin/categories" className="hover:underline">
                Danh mục
              </Link>
              <Link href="/admin/products" className="hover:underline">
                Sản phẩm
              </Link>
            </nav>
          </div>
          <button onClick={handleLogout} className="text-sm hover:underline">
            Đăng xuất
          </button>
        </div>
      </header>
      {children}
    </div>
  );
};

export default AdminLayout;