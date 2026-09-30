"use client";

// app/(admin)/admin/layout.tsx
//
// Được bọc bởi root layout riêng app/(admin)/layout.tsx (có <html>,
// <body>, AuthProvider) nên KHÔNG có Header/Footer của trang khách.
// Thanh header dùng cùng kiểu với Header của trang khách (nền trắng mờ,
// Container, Logo mặc định).
// Bảo vệ route: chưa đăng nhập hoặc không phải ADMIN -> về trang chủ.
// Dùng "use client" vì token nằm ở localStorage nên chỉ check được ở
// client; trong lúc check chưa render nội dung admin để không lộ giao
// diện quản trị dù một nhịp.

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Container from "@/components/Container";
import Logo from "@/components/Logo";
import {
  clearStoredUser,
  clearToken,
  getToken,
  isAdminUser,
} from "@/lib/auth";

const NAV_ITEMS: { href: string; label: string; exact?: boolean }[] = [
  { href: "/admin", label: "Tổng quan", exact: true },
  { href: "/admin/orders", label: "Đơn hàng" },
  { href: "/admin/categories", label: "Danh mục" },
  { href: "/admin/products", label: "Sản phẩm" },
];

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
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
    // Không dùng useAuth() ở đây để layout admin không phụ thuộc vào việc
    // có AuthProvider bao bên ngoài hay không. Xoá token/user rồi về
    // trang chủ bằng tải lại trang để mọi state (AuthContext của nhóm
    // (client)) khởi tạo lại sạch.
    clearToken();
    clearStoredUser();
    window.location.href = "/";
  };

  const isActive = (item: { href: string; exact?: boolean }) =>
    item.exact
      ? pathname === item.href
      : pathname === item.href || pathname?.startsWith(`${item.href}/`);

  // Kiểu giống HeaderMenu của trang khách: chữ xanh lá + gạch chân ở mục
  // đang mở, rê chuột thì gạch chân chạy ra.
  const renderNavLinks = () =>
    NAV_ITEMS.map((item) => {
      const active = isActive(item);
      return (
        <Link
          key={item.href}
          href={item.href}
          aria-current={active ? "page" : undefined}
          className={`relative shrink-0 group hover:text-shop_light_green hoverEffect ${
            active ? "text-shop_light_green" : ""
          }`}
        >
          {item.label}
          <span
            className={`absolute -bottom-0.5 left-0 h-0.5 bg-shop_light_green hoverEffect ${
              active ? "w-full" : "w-0 group-hover:w-full"
            }`}
          />
        </Link>
      );
    });

  if (!checked) {
    return (
      <div className="min-h-screen bg-shop_light_bg flex items-center justify-center text-sm text-gray-400">
        Đang kiểm tra quyền truy cập...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-shop_light_bg">
      <header className="bg-white/70 backdrop-blur-md py-5 sticky top-0 z-50">
        <Container className="flex items-center justify-between text-lightColor">
          {/* Trái: logo */}
          <div className="w-auto md:w-1/3 flex items-center">
            <Logo href="/admin" suffix="Admin" />
          </div>

          {/* Giữa: menu (desktop) */}
          <nav className="hidden md:inline-flex w-1/3 items-center justify-center gap-7 text-sm font-semibold">
            {renderNavLinks()}
          </nav>

          {/* Phải: đăng xuất */}
          <div className="w-auto md:w-1/3 flex items-center justify-end">
            <button
              onClick={handleLogout}
              className="text-sm font-semibold hover:text-shop_dark_green hoverEffect"
            >
              Đăng xuất
            </button>
          </div>
        </Container>

        {/* Menu cho mobile: xuống hàng riêng, cuộn ngang nếu chật */}
        <nav className="md:hidden mt-4 px-4 flex items-center justify-center gap-6 overflow-x-auto text-sm font-semibold">
          {renderNavLinks()}
        </nav>
      </header>

      <main>{children}</main>
    </div>
  );
};

export default AdminLayout;