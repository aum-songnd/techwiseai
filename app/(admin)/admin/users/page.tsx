"use client";

// app/(admin)/admin/users/page.tsx
//
// Quản lý tài khoản khách hàng: danh sách, tìm kiếm, phân trang,
// khóa / mở khóa tài khoản. Ô tìm kiếm được đưa lên topbar qua portal
// (#admin-header-actions) trên màn hình md trở lên, giống các trang admin khác;
// trên mobile slot đó bị ẩn nên có thêm một ô tìm kiếm trong nội dung trang.

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Lock, LockOpen, Search } from "lucide-react";
import {
  USE_MOCK_USERS,
  getAdminUsers,
  setAdminUserActive,
  type AdminUser,
} from "@/lib/admin-users-api";

const PAGE_SIZE = 10;

const isActiveUser = (u: AdminUser) => u.active !== false;
// Trang này chỉ quản lý khách hàng, không hiện tài khoản quản trị.
const isCustomer = (u: AdminUser) => {
  const auth = u.authorities ?? [];
  return !(auth.includes("ADMIN") || auth.includes("ROLE_ADMIN"));
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

  const [searchInput, setSearchInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  // Slot trên topbar chỉ tồn tại sau khi layout render xong.
  useEffect(() => {
    setSlot(document.getElementById("admin-header-actions"));
  }, []);

  // Debounce ô tìm kiếm 400ms, đổi từ khóa thì về trang đầu.
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
      setUsers(res.items.filter(isCustomer));
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
  }, [load]);

  const handleToggle = async (user: AdminUser) => {
    const willActivate = !isActiveUser(user);
    const name = user.fullName?.trim() || user.username;
    const ok = window.confirm(
      willActivate
        ? `Mở khóa tài khoản "${name}"?`
        : `Khóa tài khoản "${name}"? Người dùng sẽ không đăng nhập được.`
    );
    if (!ok) return;

    setBusyId(user.id);
    try {
      await setAdminUserActive(user.id, willActivate);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, active: willActivate } : u))
      );
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Cập nhật thất bại");
    } finally {
      setBusyId(null);
    }
  };

  const searchBox = (className = "") => (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        type="text"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        placeholder="Tìm theo tên, email, tài khoản, SĐT..."
        className="w-full h-10 pl-9 pr-3 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-shop_dark_green"
      />
    </div>
  );

  return (
    <div className="p-4 sm:p-6">
      {slot && createPortal(searchBox(), slot)}

      <div className="md:hidden mb-4">{searchBox()}</div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-4 sm:px-5 py-4 flex items-center justify-between gap-3 border-b border-gray-100">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-sm font-semibold text-gray-800">
              Tài khoản khách hàng
            </h3>
            {USE_MOCK_USERS && (
              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[11px] font-medium">
                Dữ liệu mẫu
              </span>
            )}
          </div>
          <span className="text-xs text-gray-500 shrink-0">
            {total} tài khoản
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-gray-500 bg-gray-50">
                <th className="px-4 sm:px-5 py-3 font-medium">Người dùng</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Điện thoại</th>
                <th className="px-4 py-3 font-medium">Ngày tạo</th>
                <th className="px-4 py-3 font-medium">Trạng thái</th>
                <th className="px-4 sm:px-5 py-3 font-medium text-right">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-gray-400"
                  >
                    Đang tải...
                  </td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center">
                    <p className="text-red-500">{error}</p>
                    <button
                      onClick={load}
                      className="mt-3 px-4 py-2 rounded-lg bg-shop_dark_green text-white text-sm hover:opacity-90"
                    >
                      Thử lại
                    </button>
                  </td>
                </tr>
              )}

              {!loading && !error && users.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-gray-400"
                  >
                    Không có tài khoản nào.
                  </td>
                </tr>
              )}

              {!loading &&
                !error &&
                users.map((user) => {
                  const active = isActiveUser(user);
                  const name = user.fullName?.trim() || user.username;
                  return (
                    <tr key={user.id} className="hover:bg-gray-50/60">
                      <td className="px-4 sm:px-5 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 shrink-0 rounded-full bg-shop_dark_green/10 text-shop_dark_green flex items-center justify-center text-sm font-semibold">
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 truncate">
                              {name}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              @{user.username}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {user.email || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {user.phoneNumber || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            active
                              ? "bg-green-50 text-green-700"
                              : "bg-red-50 text-red-600"
                          }`}
                        >
                          {active ? "Hoạt động" : "Đã khóa"}
                        </span>
                      </td>
                      <td className="px-4 sm:px-5 py-3 text-right">
                        <button
                          onClick={() => handleToggle(user)}
                          disabled={busyId === user.id}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 transition-colors disabled:opacity-50 ${
                            active
                              ? "hover:bg-red-50 hover:text-red-500 hover:border-red-200"
                              : "hover:bg-green-50 hover:text-green-700 hover:border-green-200"
                          }`}
                        >
                          {active ? (
                            <Lock className="w-3.5 h-3.5" />
                          ) : (
                            <LockOpen className="w-3.5 h-3.5" />
                          )}
                          {active ? "Khóa" : "Mở khóa"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-4 sm:px-5 py-3 flex items-center justify-between border-t border-gray-100 text-sm text-gray-600">
            <span>
              Trang {page + 1} / {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0 || loading}
                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Trước
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1 || loading}
                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsersPage;