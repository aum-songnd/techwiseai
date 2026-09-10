"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, User as UserIcon, Shield } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface UserProfileModalProps {
  onClose: () => void;
}

type TabKey = "profile" | "security";

const UserProfileModal = ({ onClose }: UserProfileModalProps) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("profile");
  const [mounted, setMounted] = useState(false);

  // Chỉ render portal sau khi mount trên client (tránh lỗi document undefined khi SSR)
  useEffect(() => {
    setMounted(true);
  }, []);

  const displayName = user?.fullName || user?.username || "Người dùng";
  const initial = displayName[0]?.toUpperCase() || "?";

  if (!mounted) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-lg w-full max-w-3xl relative flex overflow-hidden min-h-[420px]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-lightColor hover:text-black z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Sidebar */}
        <div className="w-56 bg-gray-50 border-r px-5 py-6 shrink-0">
          <h2 className="text-xl font-semibold">Account</h2>
          <p className="text-sm text-lightColor mt-1 mb-6">
            Manage your account info.
          </p>

          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab("profile")}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
                activeTab === "profile"
                  ? "bg-white shadow-sm font-medium"
                  : "text-lightColor hover:bg-white/60"
              }`}
            >
              <UserIcon className="w-4 h-4" />
              Profile
            </button>
            <button
              onClick={() => setActiveTab("security")}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
                activeTab === "security"
                  ? "bg-white shadow-sm font-medium"
                  : "text-lightColor hover:bg-white/60"
              }`}
            >
              <Shield className="w-4 h-4" />
              Security
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 px-8 py-6 overflow-y-auto">
          {activeTab === "profile" ? (
            <>
              <h3 className="text-lg font-semibold mb-6">Profile details</h3>

              <div className="space-y-6">
                {/* Profile row */}
                <div className="flex items-center justify-between border-b pb-5">
                  <span className="text-sm text-lightColor w-32 shrink-0">
                    Profile
                  </span>
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center text-sm font-semibold shrink-0">
                      {initial}
                    </div>
                    <span className="font-medium">{displayName}</span>
                  </div>
                  {/* <button className="text-sm text-blue-600 hover:underline whitespace-nowrap">
                    Update profile
                  </button> */}
                </div>

                {/* Email row */}
                {user?.email && (
                  <div className="flex items-center justify-between border-b pb-5">
                    <span className="text-sm text-lightColor w-32 shrink-0">
                      Email addresses
                    </span>
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-sm">{user.email}</span>
                      <span className="text-xs border rounded-full px-2 py-0.5 text-lightColor">
                        Primary
                      </span>
                    </div>
                  </div>
                )}

                {/* Phone row */}
                {user?.phoneNumber && (
                  <div className="flex items-center justify-between border-b pb-5">
                    <span className="text-sm text-lightColor w-32 shrink-0">
                      Phone number
                    </span>
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-sm">{user.phoneNumber}</span>
                    </div>
                  </div>
                )}

                {/* Username row */}
                <div className="flex items-center justify-between pb-1">
                  <span className="text-sm text-lightColor w-32 shrink-0">
                    Username
                  </span>
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-sm">{user?.username}</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold mb-6">Security</h3>
              <p className="text-sm text-lightColor">
                Chức năng đổi mật khẩu / bảo mật sẽ được bổ sung sau.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default UserProfileModal;