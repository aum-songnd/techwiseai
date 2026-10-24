import { NextRequest, NextResponse } from "next/server";
import { getServerProfile, saveServerProfile } from "@/lib/server/user-profiles";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://techwiseai-prod.up.railway.app/api/v1";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const checkUsername = body?.username;

  if (checkUsername) {
    const cached = getServerProfile(checkUsername);
    if (cached && (cached.locked === true || cached.active === false)) {
      return NextResponse.json(
        {
          success: false,
          status: 403,
          code: "ACCOUNT_LOCKED",
          message:
            "Tài khoản của bạn đã bị khóa bởi Quản trị viên. Vui lòng liên hệ hỗ trợ.",
        },
        { status: 403 }
      );
    }
  }

  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));

    // If login is successful, enrich user with server-cached profile (e.g. avatarUrl, phone)
    if (res.ok && data) {
      const loginData =
        (data.data as Record<string, unknown>) ||
        (data as Record<string, unknown>);
      const user =
        (loginData.user as Record<string, unknown>) ||
        (loginData as Record<string, unknown>);
      const username = (user?.username as string) || body.username;

      if (username) {
        const cached = getServerProfile(username);
        const resolvedEmail = (cached?.email || user.email) as string | undefined;
        const resolvedPhone = (cached?.phoneNumber || cached?.phone || user.phoneNumber || user.phone) as string | undefined;
        const resolvedFullName = (cached?.fullName || user.fullName) as string | undefined;
        const resolvedAvatar = (cached?.avatarUrl || user.avatarUrl) as string | undefined;

        // Save into server profile index for uniqueness checking across users
        saveServerProfile({
          username,
          email: resolvedEmail,
          phoneNumber: resolvedPhone,
          phone: resolvedPhone,
          fullName: resolvedFullName,
          avatarUrl: resolvedAvatar,
        });

        const enrichedUser = {
          ...user,
          fullName: resolvedFullName || user.fullName,
          phoneNumber: resolvedPhone || user.phoneNumber || user.phone,
          phone: resolvedPhone || user.phoneNumber || user.phone,
          email: resolvedEmail || user.email,
          avatarUrl: resolvedAvatar || user.avatarUrl,
        };

        if (loginData.user) {
          loginData.user = enrichedUser;
        } else {
          Object.assign(loginData, enrichedUser);
        }
      }
    }

    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    const isFetchFailed = error instanceof Error && error.message.toLowerCase().includes("fetch failed");
    return NextResponse.json(
      {
        success: false,
        message: isFetchFailed
          ? `Không thể kết nối đến máy chủ Backend (${API_BASE_URL}). Vui lòng kiểm tra máy chủ Backend đã được khởi động chưa.`
          : error instanceof Error ? error.message : "Đăng nhập thất bại",
      },
      { status: 500 }
    );
  }
}