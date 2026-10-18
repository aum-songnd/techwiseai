"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  CalendarDays,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ShoppingCart,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import Logo from "@/components/Logo";
import { getAdminOrders } from "@/lib/admin-orders-api";
import {
  clearStoredUser,
  clearToken,
  getStoredUser,
  getToken,
  isAdminUser,
} from "@/lib/auth";
import { broadcastTabEvent, subscribeTabSync } from "@/lib/tab-sync";

const OPEN_ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPING",
] as const;

const countOpenOrders = async (): Promise<number> => {
  const counts = await Promise.all(
    OPEN_ORDER_STATUSES.map(async (status) => {
      const res = (await getAdminOrders({
        page: 0,
        size: 1,
        status,
      })) as unknown as Record<string, unknown>;
      if (typeof res.totalElements === "number") return res.totalElements;
      const list = Array.isArray(res.items)
        ? res.items
        : Array.isArray(res.content)
        ? res.content
        : [];
      return list.length;
    })
  );
  return counts.reduce((a, b) => a + b, 0);
};

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
  { href: "/admin/users", label: "Người dùng", icon: Users },
];

type AdminProfile = {
  name: string;
};

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
  const [openOrders, setOpenOrders] = useState(0);

  useEffect(() => {
    const token = getToken();
    if (!token || !isAdminUser()) {
      router.replace("/");
      return;
    }
    setProfile(readProfile());
    setChecked(true);
  }, [router]);

  useEffect(() => {
    if (!checked) return;
    let ignore = false;
    const refresh = async () => {
      try {
        const total = await countOpenOrders();
        if (!ignore) setOpenOrders(total);
      } catch {

      }
    };
    refresh();

    const unsubscribeSync = subscribeTabSync((event) => {
      if (event.type === "ADMIN_ORDERS_CHANGED") {
        refresh();
      }
    });

    window.addEventListener("admin-orders-changed", refresh);
    return () => {
      ignore = true;
      unsubscribeSync();
      window.removeEventListener("admin-orders-changed", refresh);
    };
  }, [checked]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const handleLogout = () => {

    clearToken();
    clearStoredUser();
    broadcastTabEvent({ type: "AUTH_LOGOUT" });
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
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center text-xs font-medium uppercase tracking-wider text-neutral-400">
        Đang kiểm tra quyền truy cập...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans">
      <style>{`
        #admin-header-title:not(:empty) ~ h2 { display: none; }
      `}</style>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-56 bg-white border-r border-neutral-200 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-16 px-4 flex items-center justify-between shrink-0 border-b border-neutral-200">
          <div className="flex flex-col min-w-0 leading-none">
            <Logo href="/admin" />
            <span className="mt-1 text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-500">
              Admin Portal
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 text-neutral-500 hover:bg-neutral-100 transition-colors"
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
                className={`flex items-center gap-3 px-3 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  active
                    ? "bg-shop_dark_green text-white shadow-sm"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-shop_dark_green"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
                {item.href === "/admin/orders" && openOrders > 0 && (
                  <span
                    className={`ml-auto min-w-[20px] h-5 px-1.5 font-mono text-[11px] font-semibold flex items-center justify-center ${
                      active
                        ? "bg-white/20 text-white"
                        : "bg-shop_dark_green text-white"
                    }`}
                    title={`${openOrders} đơn chưa hoàn thành`}
                  >
                    {openOrders > 99 ? "99+" : openOrders}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-neutral-200 flex flex-col gap-1">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-600 hover:bg-red-50 hover:text-red-600 transition-colors text-left"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      <div className="lg:pl-56 min-h-screen flex flex-col">
        <header className="h-16 sticky top-0 z-30 bg-white border-b border-neutral-200 px-4 sm:px-6 flex items-center justify-between gap-4 md:grid md:grid-cols-[auto_minmax(0,1fr)_auto]">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-neutral-600 hover:bg-neutral-100 transition-colors"
              aria-label="Mở menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div id="admin-header-title" className="min-w-0" />
            <h2 className="text-xl font-bold uppercase tracking-tight text-neutral-900 truncate">
              {currentTitle}
            </h2>
          </div>

          <div className="hidden md:block min-w-0 px-2">
            <div id="admin-header-actions" className="mx-auto w-full max-w-2xl" />
          </div>

          <div className="flex items-center gap-3 sm:gap-4 text-xs font-mono text-neutral-500 shrink-0">
            <div className="hidden sm:flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-neutral-400" />
              <span>{today}</span>
            </div>
            <div className="flex items-center gap-2.5 sm:pl-3 sm:border-l sm:border-neutral-200">
              <div
                title={displayName}
                aria-label={displayName}
                className="w-8 h-8 bg-shop_dark_green text-white flex items-center justify-center text-xs font-semibold"
              >
                {initial}
              </div>
              <span className="hidden md:inline font-sans text-xs font-semibold text-neutral-800 truncate max-w-[120px]">
                {displayName}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;