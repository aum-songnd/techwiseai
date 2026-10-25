import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://techwiseai-prod.up.railway.app/api/v1";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cookieHeader = req.headers.get("cookie");

    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }
    if (cookieHeader) {
      headers["Cookie"] = cookieHeader;
    }

    const res = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      headers,
    });

    const responseHeaders: Record<string, string> = {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    };

    let data = { success: true, message: "Đăng xuất thành công" };
    if (res.ok) {
      data = await res.json().catch(() => data);
      const setCookie = res.headers.get("set-cookie");
      if (setCookie) {
        responseHeaders["Set-Cookie"] = setCookie;
      }
      const newSid = res.headers.get("X-Session-Id");
      if (newSid) {
        responseHeaders["X-Session-Id"] = newSid;
      }
    } else {
      // Fallback: Xóa cookie tw_guest_session ngay cả khi backend lỗi
      responseHeaders["Set-Cookie"] = "tw_guest_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax";
    }

    return NextResponse.json(data, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: true, message: "Đã xóa phiên đăng xuất" },
      {
        status: 200,
        headers: {
          "Set-Cookie": "tw_guest_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax",
        },
      }
    );
  }
}
