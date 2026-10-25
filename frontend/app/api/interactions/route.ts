import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://techwiseai-prod.up.railway.app/api/v1";

export async function POST(req: NextRequest) {
  const sessionId = req.headers.get("x-session-id") || req.cookies.get("tw_guest_session")?.value;
  const authHeader = req.headers.get("authorization");
  const cookieHeader = req.headers.get("cookie");

  try {
    const body = await req.json();
    const backendUrl = `${API_BASE_URL}/interactions`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
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
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      const responseHeaders: Record<string, string> = {};
      const signedSid = res.headers.get("X-Session-Id");
      if (signedSid) {
        responseHeaders["X-Session-Id"] = signedSid;
      }
      const setCookie = res.headers.get("set-cookie");
      if (setCookie) {
        responseHeaders["Set-Cookie"] = setCookie;
      }
      return NextResponse.json(data, { headers: responseHeaders });
    }

    const errorData = await res.json().catch(() => null);
    return NextResponse.json(
      errorData || { success: false, message: "Lỗi ghi nhận tương tác" },
      { status: res.status }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || "Không thể kết nối đến máy chủ" },
      { status: 500 }
    );
  }
}
