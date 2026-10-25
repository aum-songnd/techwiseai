import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://techwiseai-prod.up.railway.app/api/v1";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = req.headers.get("x-session-id") || req.cookies.get("tw_guest_session")?.value;
  const authHeader = req.headers.get("authorization");
  const cookieHeader = req.headers.get("cookie");

  try {
    // Chỉ chuyển tiếp limit và refresh, không chuyển tiếp sessionId tùy ý qua query params (P0)
    const cleanParams = new URLSearchParams();
    if (searchParams.get("limit")) cleanParams.set("limit", searchParams.get("limit")!);
    if (searchParams.get("refresh")) cleanParams.set("refresh", searchParams.get("refresh")!);

    const backendUrl = `${API_BASE_URL}/recommendations/for-you?${cleanParams.toString()}`;
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (sessionId) {
      headers["X-Session-Id"] = sessionId;
    }
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }
    if (cookieHeader) {
      headers["Cookie"] = cookieHeader;
    }

    const res = await fetch(backendUrl, {
      cache: "no-store",
      headers,
    });

    if (res.ok) {
      const data = await res.json();
      const responseHeaders: Record<string, string> = {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      };
      const signedSid = res.headers.get("X-Session-Id");
      if (signedSid) {
        responseHeaders["X-Session-Id"] = signedSid;
      }
      const setCookie = res.headers.get("set-cookie");
      if (setCookie) {
        responseHeaders["Set-Cookie"] = setCookie;
      }
      return NextResponse.json(data, {
        headers: responseHeaders,
      });
    }

    const errorData = await res.json().catch(() => null);
    return NextResponse.json(
      errorData || { success: false, message: "Lỗi kết nối gợi ý từ hệ thống" },
      {
        status: res.status,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || "Không thể kết nối đến máy chủ" },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  }
}
