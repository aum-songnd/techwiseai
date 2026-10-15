"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  User as UserIcon,
  Shield,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { changePasswordRequest } from "@/lib/auth";

interface UserProfileModalProps {
  onClose: () => void;
}

type TabKey = "profile" | "security";

const UserProfileModal = ({ onClose }: UserProfileModalProps) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("profile");
  const [mounted, setMounted] = useState(false);

  // Change password states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!currentPassword) {
      setError("Vui lòng nhập mật khẩu hiện tại");
      return;
    }

    if (newPassword.length < 6) {
      setError("Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp với mật khẩu mới");
      return;
    }

    if (currentPassword === newPassword) {
      setError("Mật khẩu mới không được trùng với mật khẩu hiện tại");
      return;
    }

    setIsSubmitting(true);
    try {
      await changePasswordRequest(currentPassword, newPassword);
      setSuccess("Đổi mật khẩu thành công! Mật khẩu mới đã có hiệu lực.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đổi mật khẩu thất bại");
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayName = user?.fullName || user?.username || "Người dùng";
  const initial = displayName[0]?.toUpperCase() || "?";

  if (!mounted) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-lg w-full max-w-3xl relative flex overflow-hidden min-h-[460px]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-lightColor hover:text-black z-10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-56 bg-gray-50 border-r px-5 py-6 shrink-0">
          <h2 className="text-xl font-semibold">Tài khoản</h2>
          <p className="text-sm text-lightColor mt-1 mb-6">
            Quản lý thông tin tài khoản
          </p>

          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab("profile")}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-all ${activeTab === "profile"
                ? "bg-white shadow-sm font-medium text-darkColor"
                : "text-lightColor hover:bg-white/60"
                }`}
            >
              <UserIcon className="w-4 h-4" />
              Thông tin cá nhân
            </button>
            <button
              onClick={() => setActiveTab("security")}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-all ${activeTab === "security"
                ? "bg-white shadow-sm font-medium text-darkColor"
                : "text-lightColor hover:bg-white/60"
                }`}
            >
              <Shield className="w-4 h-4" />
              Đổi mật khẩu
            </button>
          </nav>
        </div>

        <div className="flex-1 px-8 py-6 overflow-y-auto max-h-[85vh]">
          {activeTab === "profile" ? (
            <>
              <h3 className="text-lg font-semibold mb-6">Thông tin chi tiết</h3>

              <div className="space-y-6">
                <div className="flex items-center justify-between border-b pb-5">
                  <span className="text-sm text-lightColor w-32 shrink-0">
                    Ảnh đại diện
                  </span>
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center text-sm font-semibold shrink-0">
                      {initial}
                    </div>
                    <span className="font-medium">{displayName}</span>
                  </div>
                </div>

                {user?.email && (
                  <div className="flex items-center justify-between border-b pb-5">
                    <span className="text-sm text-lightColor w-32 shrink-0">
                      Địa chỉ Email
                    </span>
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-sm">{user.email}</span>
                      <span className="text-xs border rounded-full px-2 py-0.5 text-lightColor">
                        Chính
                      </span>
                    </div>
                  </div>
                )}

                {user?.phoneNumber && (
                  <div className="flex items-center justify-between border-b pb-5">
                    <span className="text-sm text-lightColor w-32 shrink-0">
                      Số điện thoại
                    </span>
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-sm">{user.phoneNumber}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pb-1">
                  <span className="text-sm text-lightColor w-32 shrink-0">
                    Tên đăng nhập
                  </span>
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-sm">{user?.username}</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <KeyRound className="w-5 h-5 text-teal-600" />
                <h3 className="text-lg font-semibold">Đổi mật khẩu</h3>
              </div>
              <p className="text-sm text-lightColor mb-6">
                Để bảo mật tài khoản, vui lòng không chia sẻ mật khẩu cho người khác.
              </p>

              {error && (
                <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span className="flex-1">{error}</span>
                </div>
              )}

              {success && (
                <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                  <span className="flex-1">{success}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Mật khẩu hiện tại
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Nhập mật khẩu hiện tại"
                      className="w-full px-3.5 py-2.5 pr-10 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label={showCurrentPassword ? "Ẩn" : "Hiện"}
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Mật khẩu mới
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Tối thiểu 6 ký tự"
                      className="w-full px-3.5 py-2.5 pr-10 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label={showNewPassword ? "Ẩn" : "Hiện"}
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Xác nhận mật khẩu mới
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu mới"
                      className="w-full px-3.5 py-2.5 pr-10 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label={showConfirmPassword ? "Ẩn" : "Hiện"}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg text-white bg-darkColor hover:bg-black transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Đang lưu...
                      </>
                    ) : (
                      "Đổi mật khẩu"
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default UserProfileModal;