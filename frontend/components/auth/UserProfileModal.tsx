"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Camera,
  Pencil,
  Check,
  Lock,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { changePasswordRequest } from "@/lib/auth";

interface UserProfileModalProps {
  onClose: () => void;
}

type TabKey = "profile" | "security";
type EditableField = "fullName" | "email" | "phone" | null;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;

/**
 * Resizes, center-crops to square, and compresses the image to a lightweight JPEG data URL.
 * Keeps localStorage safe from quota limits (~30KB instead of 5MB).
 */
async function compressAndCropAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Không thể đọc file ảnh"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Không thể xử lý hình ảnh"));
      img.onload = () => {
        try {
          const size = 320;
          const canvas = document.createElement("canvas");
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(reader.result as string);
            return;
          }

          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;

          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
          resolve(canvas.toDataURL("image/jpeg", 0.88));
        } catch {
          resolve(reader.result as string);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

const UserProfileModal = ({ onClose }: UserProfileModalProps) => {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("profile");
  const [mounted, setMounted] = useState(false);

  // Field editing state
  const [activeEditingField, setActiveEditingField] =
    useState<EditableField>(null);
  const [editValue, setEditValue] = useState("");
  const [isSavingField, setIsSavingField] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Change password states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const startEditing = (field: EditableField) => {
    setProfileError(null);
    setProfileSuccess(null);
    setActiveEditingField(field);

    if (field === "fullName") {
      setEditValue(user?.fullName || "");
    } else if (field === "email") {
      setEditValue(user?.email || "");
    } else if (field === "phone") {
      setEditValue(user?.phoneNumber || (user?.phone as string) || "");
    }
  };

  const cancelEditing = () => {
    setActiveEditingField(null);
    setEditValue("");
    setProfileError(null);
  };

  const handleSaveField = async (field: EditableField) => {
    if (!field) return;
    setProfileError(null);
    setProfileSuccess(null);

    const clean = editValue.trim();

    if (field === "fullName") {
      if (!clean) {
        setProfileError("Họ và tên không được để trống");
        return;
      }
      if (clean === user?.fullName?.trim()) {
        setActiveEditingField(null);
        return;
      }
      setIsSavingField(true);
      try {
        await updateUser({ fullName: clean });
        setActiveEditingField(null);
        setProfileSuccess("Cập nhật họ và tên thành công!");
        setTimeout(() => setProfileSuccess(null), 3000);
      } catch (err) {
        setProfileError(
          err instanceof Error ? err.message : "Cập nhật họ và tên thất bại"
        );
      } finally {
        setIsSavingField(false);
      }
    } else if (field === "email") {
      if (!clean) {
        setProfileError("Địa chỉ email không được để trống");
        return;
      }
      if (!EMAIL_REGEX.test(clean)) {
        setProfileError(
          "Địa chỉ email không đúng định dạng (VD: example@email.com)"
        );
        return;
      }
      if (clean.toLowerCase() === user?.email?.trim().toLowerCase()) {
        setActiveEditingField(null);
        return;
      }
      setIsSavingField(true);
      try {
        await updateUser({ email: clean.toLowerCase() });
        setActiveEditingField(null);
        setProfileSuccess("Cập nhật địa chỉ email thành công!");
        setTimeout(() => setProfileSuccess(null), 3000);
      } catch (err) {
        setProfileError(
          err instanceof Error ? err.message : "Cập nhật email thất bại"
        );
      } finally {
        setIsSavingField(false);
      }
    } else if (field === "phone") {
      if (!clean) {
        setProfileError("Số điện thoại không được để trống");
        return;
      }
      if (!PHONE_REGEX.test(clean)) {
        setProfileError(
          "Số điện thoại không hợp lệ (gồm 10 số, bắt đầu bằng 03, 05, 07, 08, 09)"
        );
        return;
      }
      const currentPhone = (user?.phoneNumber || (user?.phone as string))?.trim();
      if (clean === currentPhone) {
        setActiveEditingField(null);
        return;
      }
      setIsSavingField(true);
      try {
        await updateUser({ phoneNumber: clean });
        setActiveEditingField(null);
        setProfileSuccess("Cập nhật số điện thoại thành công!");
        setTimeout(() => setProfileSuccess(null), 3000);
      } catch (err) {
        setProfileError(
          err instanceof Error ? err.message : "Cập nhật số điện thoại thất bại"
        );
      } finally {
        setIsSavingField(false);
      }
    }
  };

  const handleAvatarFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setProfileError("Chỉ hỗ trợ file ảnh định dạng JPEG, PNG hoặc WEBP.");
      e.target.value = "";
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setProfileError("Dung lượng ảnh không được vượt quá 5MB.");
      e.target.value = "";
      return;
    }

    setIsUploadingAvatar(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      const optimizedBase64 = await compressAndCropAvatar(file);
      await updateUser({ avatarUrl: optimizedBase64 });
      setProfileSuccess("Cập nhật ảnh đại diện thành công!");
      setTimeout(() => setProfileSuccess(null), 3000);
    } catch (err) {
      setProfileError(
        err instanceof Error ? err.message : "Cập nhật ảnh đại diện thất bại"
      );
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveAvatar = async () => {
    setIsUploadingAvatar(true);
    setProfileError(null);
    try {
      await updateUser({ avatarUrl: "" });
      setProfileSuccess("Đã gỡ ảnh đại diện.");
      setTimeout(() => setProfileSuccess(null), 3000);
    } catch (err) {
      setProfileError(
        err instanceof Error ? err.message : "Không thể gỡ ảnh đại diện"
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError("Vui lòng nhập mật khẩu hiện tại");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Mật khẩu xác nhận không khớp với mật khẩu mới");
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError("Mật khẩu mới không được trùng với mật khẩu hiện tại");
      return;
    }

    setIsSubmittingPassword(true);
    try {
      await changePasswordRequest(currentPassword, newPassword);
      setPasswordSuccess("Đổi mật khẩu thành công! Mật khẩu mới đã có hiệu lực.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(null), 4000);
    } catch (err) {
      setPasswordError(
        err instanceof Error ? err.message : "Đổi mật khẩu thất bại"
      );
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  const displayName = user?.fullName || user?.username || "Người dùng";
  const initial = displayName[0]?.toUpperCase() || "?";
  const authorities = user?.authorities || [];
  const isAdmin =
    authorities.includes("ADMIN") || authorities.includes("ROLE_ADMIN");
  const avatarUrl = user?.avatarUrl;

  if (!mounted) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="font-sans antialiased text-neutral-900 relative flex flex-col md:flex-row w-full max-w-3xl h-[600px] max-h-[92vh] overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng cửa sổ"
          className="absolute top-4 right-4 z-20 rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Sidebar Navigation */}
        <div className="w-full md:w-64 bg-neutral-50/70 border-b md:border-b-0 md:border-r border-neutral-200 p-5 md:p-6 flex flex-col shrink-0 justify-between">
          <div>
            <div className="pb-4">
              <h2 className="text-base sm:text-lg font-bold uppercase tracking-tight text-neutral-900">
                Tài khoản
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Quản lý hồ sơ & bảo mật
              </p>
            </div>

            <nav className="flex md:flex-col gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("profile");
                  setProfileError(null);
                }}
                className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-2.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm transition-all cursor-pointer ${activeTab === "profile"
                  ? "bg-white shadow-xs border border-neutral-200/80 font-bold text-shop_dark_green"
                  : "text-neutral-600 hover:text-neutral-900 hover:bg-white/60 font-medium"
                  }`}
              >
                <UserIcon className="w-4 h-4 shrink-0" />
                <span>Thông tin cá nhân</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("security");
                  setPasswordError(null);
                }}
                className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-2.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm transition-all cursor-pointer ${activeTab === "security"
                  ? "bg-white shadow-xs border border-neutral-200/80 font-bold text-shop_dark_green"
                  : "text-neutral-600 hover:text-neutral-900 hover:bg-white/60 font-medium"
                  }`}
              >
                <Shield className="w-4 h-4 shrink-0" />
                <span>Đổi mật khẩu</span>
              </button>
            </nav>
          </div>

          <div className="hidden md:block pt-6 border-t border-neutral-200 text-[11px] text-neutral-400">
            TechWiseAI Account Portal
          </div>
        </div>

        {/* Right Main Content */}
        <div className="flex-1 min-h-0 h-full overflow-y-auto p-6 sm:p-8 flex flex-col">
          {activeTab === "profile" ? (
            <div className="space-y-5">
              {/* Header */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
                  Thông tin cá nhân
                </h3>
                <p className="text-xs text-neutral-500 mt-1">
                  Bấm biểu tượng cây bút để chỉnh sửa từng mục thông tin.
                </p>
              </div>

              {/* Profile Card with Avatar Upload */}
              <div className="flex items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-neutral-50/60 p-4">
                <div className="flex items-center gap-4 min-w-0">
                  {/* Clickable Avatar with Camera badge */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="relative group shrink-0 cursor-pointer"
                    title="Bấm để đổi ảnh đại diện"
                  >
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-shop_dark_green text-white font-bold text-xl flex items-center justify-center shadow-xs border-2 border-white group-hover:ring-2 group-hover:ring-shop_dark_green transition-all">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={displayName}
                          className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                        />
                      ) : (
                        initial
                      )}
                    </div>

                    {/* Camera overlay badge */}
                    <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-shop_dark_green text-white border-2 border-white group-hover:bg-shop_dark_green/90 transition-transform group-hover:scale-105 shadow-xs">
                      {isUploadingAvatar ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Camera className="w-3.5 h-3.5" />
                      )}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm sm:text-base text-neutral-900 truncate">
                        {displayName}
                      </p>
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md text-neutral-700">
                        {isAdmin ? "Quản trị viên" : "Khách hàng"}
                      </span>
                    </div>

                  </div>
                </div>

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarFileChange}
                  className="hidden"
                />

                {/* Avatar Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-neutral-700 bg-white border border-neutral-200 hover:bg-neutral-100 hover:text-shop_dark_green transition-colors cursor-pointer disabled:opacity-50"
                    title="Đổi ảnh đại diện"
                  >
                    {isUploadingAvatar ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Pencil className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden sm:inline">Đổi ảnh</span>
                  </button>
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      disabled={isUploadingAvatar}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 bg-white border border-red-200 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
                      title="Gỡ ảnh đại diện"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Gỡ ảnh</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Feedback Alerts */}
              {profileError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/80 p-3.5 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span className="flex-1">{profileError}</span>
                </div>
              )}

              {profileSuccess && (
                <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-xs text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                  <span className="flex-1">{profileSuccess}</span>
                </div>
              )}

              {/* Field Rows with Pencil Edit Button */}
              <div className="divide-y divide-neutral-200 border border-neutral-200 rounded-xl bg-white overflow-hidden">
                {/* 1. Họ và tên */}
                <div className="p-4 transition-colors">
                  {activeEditingField === "fullName" ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSaveField("fullName");
                      }}
                      className="space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                          Họ và tên
                        </label>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          className="text-xs text-neutral-400 hover:text-neutral-700 cursor-pointer"
                        >
                          Hủy
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") cancelEditing();
                          }}
                          autoFocus
                          placeholder="Nhập họ và tên..."
                          className="flex-1 px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-neutral-300 focus:border-shop_dark_green focus:ring-2 focus:ring-shop_dark_green/15 outline-none transition-colors text-neutral-900"
                        />
                        <button
                          type="submit"
                          disabled={isSavingField}
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-xl text-white bg-shop_dark_green hover:bg-shop_dark_green/90 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                        >
                          {isSavingField ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          <span>Lưu</span>
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                          Họ và tên
                        </p>
                        <p className="font-semibold text-sm text-neutral-900 mt-0.5 truncate">
                          {user?.fullName || "Chưa cập nhật"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => startEditing("fullName")}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-neutral-700 hover:bg-neutral-200 hover:text-shop_dark_green transition-colors cursor-pointer shrink-0"
                        title="Chỉnh sửa họ và tên"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. Địa chỉ Email */}
                <div className="p-4 transition-colors">
                  {activeEditingField === "email" ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSaveField("email");
                      }}
                      className="space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                          Địa chỉ Email
                        </label>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          className="text-xs text-neutral-400 hover:text-neutral-700 cursor-pointer"
                        >
                          Hủy
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="email"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") cancelEditing();
                          }}
                          autoFocus
                          placeholder="example@email.com"
                          className="flex-1 px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-neutral-300 focus:border-shop_dark_green focus:ring-2 focus:ring-shop_dark_green/15 outline-none transition-colors text-neutral-900"
                        />
                        <button
                          type="submit"
                          disabled={isSavingField}
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-xl text-white bg-shop_dark_green hover:bg-shop_dark_green/90 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                        >
                          {isSavingField ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          <span>Lưu</span>
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                          Địa chỉ Email
                        </p>
                        <p className="font-semibold text-sm text-neutral-900 mt-0.5 truncate">
                          {user?.email || "Chưa cập nhật"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => startEditing("email")}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-neutral-700  hover:bg-neutral-200 hover:text-shop_dark_green transition-colors cursor-pointer shrink-0"
                        title="Chỉnh sửa địa chỉ email"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* 3. Số điện thoại */}
                <div className="p-4 transition-colors">
                  {activeEditingField === "phone" ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSaveField("phone");
                      }}
                      className="space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                          Số điện thoại
                        </label>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          className="text-xs text-neutral-400 hover:text-neutral-700 cursor-pointer"
                        >
                          Hủy
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="tel"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") cancelEditing();
                          }}
                          autoFocus
                          placeholder="VD: 0912345678"
                          className="flex-1 px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-neutral-300 focus:border-shop_dark_green focus:ring-2 focus:ring-shop_dark_green/15 outline-none transition-colors text-neutral-900"
                        />
                        <button
                          type="submit"
                          disabled={isSavingField}
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-xl text-white bg-shop_dark_green hover:bg-shop_dark_green/90 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                        >
                          {isSavingField ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          <span>Lưu</span>
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                          Số điện thoại
                        </p>
                        <p className="font-semibold text-sm text-neutral-900 mt-0.5 truncate">
                          {user?.phoneNumber ||
                            (user?.phone as string) ||
                            "Chưa cập nhật"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => startEditing("phone")}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-neutral-700 hover:bg-neutral-200 hover:text-shop_dark_green transition-colors cursor-pointer shrink-0"
                        title="Chỉnh sửa số điện thoại"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* 4. Tên đăng nhập (Read-only) */}
                <div className="p-4 bg-neutral-50/40">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                        Tên đăng nhập
                      </p>
                      <p className="font-mono font-semibold text-sm text-neutral-700 mt-0.5 truncate">
                        @{user?.username}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium text-neutral-400  shrink-0">
                      <Lock className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Header */}
              <div>
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-shop_dark_green" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
                    Đổi mật khẩu
                  </h3>
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  Để bảo mật tài khoản, vui lòng không chia sẻ mật khẩu cho người khác.
                </p>
              </div>

              {/* Feedback Notifications */}
              {passwordError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/80 p-3.5 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span className="flex-1">{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-xs text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                  <span className="flex-1">{passwordSuccess}</span>
                </div>
              )}

              {/* Change Password Form */}
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-900 mb-1.5">
                    Mật khẩu hiện tại
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => {
                        setCurrentPassword(e.target.value);
                        if (passwordError) setPasswordError(null);
                      }}
                      placeholder="Nhập mật khẩu hiện tại..."
                      className="w-full px-3.5 py-2.5 pr-10 text-xs sm:text-sm rounded-xl border border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400 focus:border-shop_dark_green focus:ring-2 focus:ring-shop_dark_green/15 outline-none transition-colors"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer"
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
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-900 mb-1.5">
                    Mật khẩu mới
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (passwordError) setPasswordError(null);
                      }}
                      placeholder="Tối thiểu 6 ký tự..."
                      className="w-full px-3.5 py-2.5 pr-10 text-xs sm:text-sm rounded-xl border border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400 focus:border-shop_dark_green focus:ring-2 focus:ring-shop_dark_green/15 outline-none transition-colors"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer"
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
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-900 mb-1.5">
                    Xác nhận mật khẩu mới
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (passwordError) setPasswordError(null);
                      }}
                      placeholder="Nhập lại mật khẩu mới..."
                      className="w-full px-3.5 py-2.5 pr-10 text-xs sm:text-sm rounded-xl border border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400 focus:border-shop_dark_green focus:ring-2 focus:ring-shop_dark_green/15 outline-none transition-colors"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer"
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

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingPassword}
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-md text-white bg-shop_dark_green hover:bg-shop_dark_green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                  >
                    {isSubmittingPassword ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang lưu...</span>
                      </>
                    ) : (
                      <span>Đổi mật khẩu</span>
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