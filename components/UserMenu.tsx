"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User as UserIcon } from "lucide-react";
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
        className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-sm font-semibold hover:opacity-90"
      >
        {initial}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-lg border bg-white shadow-lg py-1 text-sm z-50">
          <div className="px-3 py-2 border-b">
            <p className="font-medium truncate">{user?.fullName || user?.username || "Người dùng"}</p>
            <p className="text-lightColor truncate text-xs">{user?.email}</p>
          </div>

          <button
            onClick={handleOpenProfile}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50"
          >
            <UserIcon className="w-4 h-4" />
            Quản lý tài khoản
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-red-500"
          >
            <LogOut className="w-4 h-4" />
            Đăng xuất
          </button>
        </div>
      )}

      {showProfile && (
        <UserProfileModal onClose={() => setShowProfile(false)} />
      )}
    </div>
  );
};

export default UserMenu;