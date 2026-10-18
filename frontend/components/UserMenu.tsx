"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Package, User as UserIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useOutsideClick } from "@/hooks";
import UserProfileModal from "./UserProfileModal";

const UserMenu = () => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const menuRef = useOutsideClick<HTMLDivElement>(() => setIsOpen(false));

  const handleLogout = () => {
    logout();
    setIsOpen(false);
    router.push("/");
  };

  const handleOpenProfile = () => {
    setShowProfile(true);
    setIsOpen(false);
  };

  const initial =
    user?.fullName?.[0]?.toUpperCase() ||
    user?.username?.[0]?.toUpperCase() ||
    "?";

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-8 h-8 rounded-full bg-shop_dark_green text-white flex items-center justify-center text-sm font-semibold hover:opacity-90 overflow-hidden cursor-pointer"
      >
        {user?.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.fullName || user.username}
            className="w-full h-full object-cover"
          />
        ) : (
          initial
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 border border-neutral-200 bg-white shadow-xl py-1 text-xs z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-3.5 py-2.5 border-b border-neutral-100">
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold text-neutral-900 truncate">
                {user?.fullName || user?.username || "Người dùng"}
              </p>
              {user?.authorities?.some((a) => a.includes("ADMIN")) && (
                <span className="px-1.5 py-0.5 text-[9px] font-mono font-semibold uppercase bg-shop_dark_green text-white">
                  Admin
                </span>
              )}
            </div>
            <p className="text-[11px] font-mono text-neutral-400 truncate mt-0.5">
              {user?.email || (user?.username ? `@${user.username}` : "")}
            </p>
          </div>

          <div className="py-1">
            <button
              type="button"
              onClick={handleOpenProfile}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left font-medium text-neutral-700 hover:bg-neutral-50 hover:text-shop_dark_green transition-colors"
            >
              <UserIcon className="w-4 h-4 text-neutral-400" />
              <span>Quản lý tài khoản</span>
            </button>

            <Link
              href="/orders"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left font-medium text-neutral-700 hover:bg-neutral-50 hover:text-shop_dark_green transition-colors"
            >
              <Package className="w-4 h-4 text-neutral-400" />
              <span>Đơn hàng của tôi</span>
            </Link>
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

      {showProfile && (
        <UserProfileModal onClose={() => setShowProfile(false)} />
      )}
    </div>
  );
};

export default UserMenu;