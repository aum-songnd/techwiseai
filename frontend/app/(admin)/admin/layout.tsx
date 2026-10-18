"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  CalendarDays,
  ChevronDown,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ShoppingCart,
  Store,
  User as UserIcon,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import Logo from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import { useOutsideClick } from "@/hooks";
import UserProfileModal from "@/components/UserProfileModal";
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
  const { user, logout } = useAuth();
  const [checked, setChecked] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [openOrders, setOpenOrders] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const menuRef = useOutsideClick<HTMLDivElement>(() => setIsMenuOpen(false));

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
        // ignore errors
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
    setIsMenuOpen(false);
    logout();
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

  const displayName =
    user?.fullName?.trim() ||
    user?.username ||
    profile?.name ||
    "Quản trị viên";
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
        className={`fixed inset-y-0 left-0 z-50 w-56 bg-white border-r border-neutral-200 flex flex-col transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
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
                className={`flex items-center gap-3 px-3 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${active
                  ? "bg-shop_dark_green text-white shadow-sm"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-shop_dark_green"
                  }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
                {item.href === "/admin/orders" && openOrders > 0 && (
                  <span
                    className={`ml-auto min-w-[20px] h-5 px-1.5 font-mono text-[11px] font-semibold flex items-center justify-center ${active
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

        {/* <div className="px-3 py-4 border-t border-neutral-200 flex flex-col gap-1">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-600 hover:bg-red-50 hover:text-red-600 transition-colors text-left"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Đăng xuất</span>
          </button>
        </div> */}
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

            {/* Admin User Avatar & Dropdown Menu */}
            <div
              ref={menuRef}
              className="relative flex items-center sm:pl-3 sm:border-l sm:border-neutral-200"
            >
              <button
                type="button"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 text-left cursor-pointer group focus:outline-none"
                title={`Tài khoản: ${displayName}`}
                aria-label="Menu tài khoản quản trị"
                aria-expanded={isMenuOpen}
              >
                <div className="w-8 h-8 rounded-full bg-shop_dark_green text-white flex items-center justify-center text-xs font-semibold overflow-hidden transition-transform group-hover:scale-105 shadow-sm">
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    initial
                  )}
                </div>
                <div className="hidden md:flex items-center gap-1 min-w-0">
                  <span className="font-sans text-xs font-semibold text-neutral-800 truncate max-w-[120px] group-hover:text-shop_dark_green transition-colors">
                    {displayName}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 ${isMenuOpen ? "rotate-180 text-shop_dark_green" : ""
                      }`}
                  />
                </div>
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 border border-neutral-200 bg-white shadow-xl py-1 text-xs z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-3.5 py-2.5 border-b border-neutral-100">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-neutral-900 truncate">
                        {displayName}
                      </p>
                      <span className="px-1.5 py-0.5 text-[9px] font-mono font-semibold uppercase bg-shop_dark_green text-white">
                        Admin
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-neutral-400 truncate mt-0.5">
                      {user?.email || (user?.username ? `@${user.username}` : "admin")}
                    </p>
                  </div>

                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfile(true);
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left font-medium text-neutral-700 hover:bg-neutral-50 hover:text-shop_dark_green transition-colors"
                    >
                      <UserIcon className="w-4 h-4 text-neutral-400" />
                      <span>Quản lý tài khoản</span>
                    </button>
                  </div>

                  <div className="border-t border-neutral-100 pt-1">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left font-semibold uppercase tracking-wider text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4 text-red-500" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>

      {showProfile && (
        <UserProfileModal onClose={() => setShowProfile(false)} />
      )}
    </div>
  );
};

export default AdminLayout;