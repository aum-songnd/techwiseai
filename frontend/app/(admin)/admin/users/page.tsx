"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  AlertCircle,
  Check,
  Lock,
  LockOpen,
  RefreshCw,
  Search,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import {
  getAdminUsers,
  setAdminUserActive,
  type AdminUser,
} from "@/lib/admin-users-api";
import { subscribeTabSync } from "@/lib/tab-sync";
import Loading from "@/app/(client)/loading";

const PAGE_SIZE = 10;

const isActiveUser = (u: AdminUser) => u.active !== false;

const isAdmin = (u: AdminUser) => {
  const auth = u.authorities ?? [];
  return (
    auth.includes("ADMIN") ||
    auth.includes("ROLE_ADMIN") ||
    u.username.toLowerCase() === "admin"
  );
};

const formatDate = (value?: string) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
};

const AdminUsersPage = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastUndoAction, setToastUndoAction] = useState<(() => void) | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((msg: string, undo?: () => void) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    setToastUndoAction(undo ? () => undo : null);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
      setToastUndoAction(null);
    }, 4500);
  }, []);

  const [searchInput, setSearchInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setSlot(document.getElementById("admin-header-actions"));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setKeyword(searchInput);
      setPage(0);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getAdminUsers({ page, size: PAGE_SIZE, keyword });
      setUsers(res.items);
      setTotal(res.total);
      setTotalPages(Math.max(1, res.totalPages));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được danh sách");
    } finally {
      setLoading(false);
    }
  }, [page, keyword]);

  useEffect(() => {
    load();
    const unsubscribe = subscribeTabSync((event) => {
      if (event.type === "USER_STATUS_CHANGED") {
        if (event.payload?.username || event.payload?.id) {
          const { id, username, active } = event.payload;
          setUsers((prev) =>
            prev.map((u) =>
              (id && u.id === id) ||
              (username && u.username.toLowerCase() === username.toLowerCase())
                ? { ...u, active: active !== false }
                : u
            )
          );
        } else {
          load();
        }
      }
    });
    return () => {
      unsubscribe();
    };
  }, [load]);

  const handleToggle = (user: AdminUser) => {
    if (isAdmin(user)) {
      showToast("Không thể khóa tài khoản Quản trị viên");
      return;
    }

    const willActivate = !isActiveUser(user);
    const name = user.fullName?.trim() || user.username;

    // 1. Cập nhật UI ngay lập tức (Optimistic Update)
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, active: willActivate } : u))
    );
    showToast(
      willActivate
        ? `Đã mở khóa tài khoản "${name}".`
        : `Đã khóa tài khoản "${name}".`,
      () => {
        // Hoàn tác
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, active: !willActivate } : u))
        );
        setAdminUserActive(user.id, !willActivate, user.username).catch(() => {});
      }
    );

    // 2. Chạy ngầm BE không gián đoạn
    setAdminUserActive(user.id, willActivate, user.username).catch((e) => {
      // Rollback nếu BE lỗi
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, active: !willActivate } : u))
      );
      showToast(`Cập nhật tài khoản "${name}" thất bại. Đã khôi phục.`);
    });
  };

  const searchBox = (className = "") => (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
      <input
        type="text"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        placeholder="Tìm theo tên, email, tài khoản, SĐT..."
        className="w-full h-9 pl-9 pr-3 bg-white border border-neutral-300 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-shop_dark_green focus:outline-none focus:ring-1 focus:ring-shop_dark_green transition-colors"
      />
      {searchInput && (
        <button
          type="button"
          onClick={() => setSearchInput("")}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 text-xs font-mono"
        >
          ✕
        </button>
      )}
    </div>
  );

  const activeCount = users.filter(isActiveUser).length;
  const lockedCount = users.filter((u) => !isActiveUser(u)).length;

  return (
    <div className="font-sans min-h-[calc(100vh-4rem)] bg-neutral-50 p-4 sm:p-6 lg:p-8 text-neutral-900">
      {slot && createPortal(searchBox(), slot)}

      <div className="mx-auto max-w-6xl space-y-6">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-neutral-500">
          <Link href="/admin" className="hover:text-shop_dark_green transition-colors">
            Admin
          </Link>
          <span>/</span>
          <span className="text-neutral-900 font-medium">Quản lý người dùng</span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-neutral-200 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold uppercase tracking-tight text-neutral-900">
                Quản lý người dùng
              </h1>
              <span className="text-xs text-neutral-500 font-mono">
                [ {total} tài khoản ]
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              Quản lý danh sách người dùng, thông tin liên hệ và trạng thái kích hoạt tài khoản
            </p>
          </div>

          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold uppercase tracking-wider text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-shop_dark_green" : ""}`} />
            <span>Làm mới</span>
          </button>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="border border-neutral-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Tổng người dùng
              </span>
              <Users className="w-4 h-4 text-neutral-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-neutral-900 font-mono">
              {total}
            </div>
            <div className="mt-1 text-[11px] text-neutral-500 font-mono">
              Hiển thị {users.length} trên trang này
            </div>
          </div>

          <div className="border border-neutral-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Đang hoạt động
              </span>
              <UserCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-700 font-mono">
              {activeCount}
            </div>
            <div className="mt-1 text-[11px] text-neutral-500 font-mono">
              Tài khoản hợp lệ và truy cập bình thường
            </div>
          </div>

          <div className="border border-neutral-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Đang bị khóa
              </span>
              <UserX className="w-4 h-4 text-red-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-red-600 font-mono">
              {lockedCount}
            </div>
            <div className="mt-1 text-[11px] text-neutral-500 font-mono">
              Tạm ngừng quyền đăng nhập hệ thống
            </div>
          </div>
        </div>

        {/* Search for Mobile */}
        <div className="md:hidden">
          {searchBox()}
        </div>

        {/* Users Table Card */}
        <div className="border border-neutral-200 bg-white">
          <div className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                Danh sách tài khoản
              </h3>
              <span className="text-xs font-mono text-neutral-500">
                ({users.length} người dùng)
              </span>
            </div>

            <div className="hidden sm:block w-72">
              {searchBox()}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-xs">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50/60 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  <th className="px-4 sm:px-6 py-3 font-semibold">Người dùng</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Điện thoại</th>
                  <th className="px-4 py-3 font-semibold">Ngày tạo</th>
                  <th className="px-4 py-3 font-semibold">Trạng thái</th>
                  <th className="px-4 sm:px-6 py-3 font-semibold text-right">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {loading && (
                  <tr>
                    <td colSpan={6} className="p-0">
                      <Loading
                        message="Đang tải danh sách người dùng..."
                        className="py-16 min-h-0"
                      />
                    </td>
                  </tr>
                )}

                {!loading && error && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="max-w-sm mx-auto flex flex-col items-center gap-3">
                        <AlertCircle className="w-6 h-6 text-red-500" />
                        <p className="text-xs text-red-600">{error}</p>
                        <button
                          type="button"
                          onClick={load}
                          className="border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wider text-neutral-800 hover:bg-neutral-50 transition-colors"
                        >
                          Thử lại
                        </button>
                      </div>
                    </td>
                  </tr>
                )}

                {!loading && !error && users.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-neutral-400 text-xs font-mono"
                    >
                      Không tìm thấy tài khoản người dùng nào phù hợp.
                    </td>
                  </tr>
                )}

                {!loading &&
                  !error &&
                  users.map((user) => {
                    const active = isActiveUser(user);
                    const userIsAdmin = isAdmin(user);
                    const name = user.fullName?.trim() || user.username;
                    const initial = (name.charAt(0) || "U").toUpperCase();
                    return (
                      <tr key={user.id} className="hover:bg-neutral-50/50 transition-colors">
                        <td className="px-4 sm:px-6 py-3.5">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 shrink-0 border border-neutral-200 bg-neutral-100 text-neutral-800 flex items-center justify-center text-xs font-bold font-mono">
                              {initial}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-neutral-900 truncate">
                                  {name}
                                </span>
                                {userIsAdmin && (
                                  <span className="border border-neutral-300 bg-neutral-100 text-neutral-600 px-1 py-0.2 text-[9px] font-mono uppercase tracking-wider font-semibold">
                                    Admin
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-neutral-400 font-mono truncate">
                                @{user.username}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-neutral-700 font-mono">
                          {user.email || "—"}
                        </td>
                        <td className="px-4 py-3.5 text-neutral-700 font-mono">
                          {user.phoneNumber || "—"}
                        </td>
                        <td className="px-4 py-3.5 text-neutral-500 font-mono tabular-nums">
                          {formatDate(user.createdAt)}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider border ${
                              active
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                : "border-red-200 bg-red-50 text-red-700"
                            }`}
                          >
                            {active ? "Hoạt động" : "Đã khóa"}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-3.5 text-right">
                          {userIsAdmin ? (
                            <span className="text-[11px] text-neutral-400 font-mono italic pr-2">
                              Hệ thống
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggle(user)}
                              disabled={busyId === user.id}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider border transition-colors disabled:opacity-50 ${
                                active
                                  ? "border-neutral-300 bg-white text-neutral-700 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                                  : "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-600 hover:text-white"
                              }`}
                            >
                              {active ? (
                                <Lock className="w-3.5 h-3.5" />
                              ) : (
                                <LockOpen className="w-3.5 h-3.5" />
                              )}
                              <span>{active ? "Khóa" : "Mở khóa"}</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="px-4 sm:px-6 py-3.5 flex items-center justify-between border-t border-neutral-200 bg-neutral-50/40 text-xs text-neutral-500">
              <span className="font-mono">
                Trang <strong className="text-neutral-900 font-semibold">{page + 1}</strong> / {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0 || loading}
                  className="border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Trước
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1 || loading}
                  className="border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Toast Notification */}
      {toastMessage && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 border border-neutral-800 bg-neutral-900 px-4 py-3 text-xs font-medium text-white shadow-2xl"
        >
          <Check className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          {toastUndoAction && (
            <button
              type="button"
              onClick={() => {
                toastUndoAction();
                setToastMessage(null);
                setToastUndoAction(null);
              }}
              className="ml-2 font-bold text-emerald-400 hover:text-emerald-300 underline transition-colors"
            >
              Hoàn tác
            </button>
          )}
        </aside>
      )}
    </div>
  );
};

export default AdminUsersPage;