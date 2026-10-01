"use client";

// app/(admin)/admin/layout.tsx
//
// Layout quản trị kiểu dashboard: sidebar trái cố định + topbar.
// Được bọc bởi root layout riêng app/(admin)/layout.tsx (có <html>,
// <body>, AuthProvider) nên KHÔNG có Header/Footer của trang khách.
// Bảo vệ route: chưa đăng nhập hoặc không phải ADMIN -> về trang chủ.
// Dùng "use client" vì token nằm ở localStorage nên chỉ check được ở
// client; trong lúc check chưa render nội dung admin.

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  CalendarDays,
  ExternalLink,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ShoppingCart,
  X,
  type LucideIcon,
} from "lucide-react";
import Logo from "@/components/Logo";
import {
  clearStoredUser,
  clearToken,
  getStoredUser,
  getToken,
  isAdminUser,
} from "@/lib/auth";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Tổng quan", icon: LayoutDashboard, exact: true },
  { href: "/admin/orders", label: "Đơn hàng", icon: ShoppingCart },
  { href: "/admin/categories", label: "Danh mục", icon: Layers },
  { href: "/admin/products", label: "Sản phẩm", icon: Package },
];

type AdminProfile = {
  name: string;
};

// Đọc user đã lưu lúc đăng nhập (lib/auth: User { username, fullName?, email? })
const readProfile = (): AdminProfile | null => {
  const user = getStoredUser();
  if (!user) return null;
  return { name: user.fullName?.trim() || user.username };
};

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<AdminProfile | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token || !isAdminUser()) {
      router.replace("/");
      return;
    }
    setProfile(readProfile());
    setChecked(true);
  }, [router]);

  // Đổi trang thì đóng sidebar (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    // Không dùng useAuth() để layout admin không phụ thuộc AuthProvider.
    // Xoá token/user rồi tải lại trang để mọi state khởi tạo lại sạch.
    clearToken();
    clearStoredUser();
    window.location.href = "/";
  };

  const isActive = (item: NavItem) =>
    item.exact
      ? pathname === item.href
      : pathname === item.href || pathname?.startsWith(`${item.href}/`);

  const currentTitle =
    NAV_ITEMS.find((item) => isActive(item))?.label ?? "Quản trị";

  const displayName = profile?.name || "Quản trị viên";
  const initial = displayName.charAt(0).toUpperCase();

  const today = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());

  if (!checked) {
    return (
      <div className="min-h-screen bg-shop_light_bg flex items-center justify-center text-sm text-gray-400">
        Đang kiểm tra quyền truy cập...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-shop_light_bg">
      <style>{`
        #admin-header-title:not(:empty) ~ h2 { display: none; }
      `}</style>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-56 bg-white border-r border-gray-100 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-16 px-4 flex items-center justify-between shrink-0">
          <div className="flex flex-col min-w-0 leading-none">
            <Logo href="/admin" />
            <span className="mt-0.5 text-sm font-semibold uppercase text-lightColor">
              Admin
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-md text-gray-500 hover:bg-gray-100"
            aria-label="Đóng menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-shop_light_green/10 text-shop_dark_green"
                    : "text-gray-600 hover:bg-gray-100 hover:text-shop_dark_green"
                }`}
              >
                <Icon className="w-[18px] h-[18px] shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4  flex flex-col gap-1">
          
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-500 transition-colors text-left"
          >
            <LogOut className="w-[18px] h-[18px] shrink-0" />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Phần chính */}
      <div className="lg:pl-56 min-h-screen flex flex-col">
        <header className="h-16 sticky top-0 z-30 bg-white px-4 sm:px-6 flex items-center justify-between gap-4 md:grid md:grid-cols-[auto_minmax(0,1fr)_auto]">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-md text-gray-600 hover:bg-gray-100"
              aria-label="Mở menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            {/* Trang có thể đổ tiêu đề riêng vào đây (portal). Khi slot có nội dung,
                tiêu đề mặc định bên dưới tự ẩn (xem thẻ <style> cuối file). */}
            <div id="admin-header-title" className="min-w-0" />
            <h2 className="text-base font-semibold text-gray-800">
              {currentTitle}
            </h2>
          </div>

          {/* Cột giữa: slot ô tìm kiếm của từng trang (portal), căn giữa và kéo dài */}
          <div className="hidden md:block min-w-0 px-2">
            <div id="admin-header-actions" className="mx-auto w-full max-w-2xl" />
          </div>

          <div className="flex items-center gap-3 sm:gap-4 text-sm text-gray-600 shrink-0">
            <div className="hidden sm:flex items-center gap-2 ">
              <CalendarDays className="w-4 h-4" />
              {today}
            </div>
            <div className="flex items-center gap-2.5 sm:pl-4 ">
              <div
                title={displayName}
                aria-label={displayName}
                className="w-9 h-9 rounded-full bg-shop_dark_green text-white flex items-center justify-center text-sm font-semibold"
              >
                {initial}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;