import { NextRequest, NextResponse } from "next/server";
import { saveServerProfile } from "@/lib/server-user-profiles";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://techwiseai-prod.up.railway.app/api/v1";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && body?.username) {
      saveServerProfile({
        username: body.username,
        email: body.email,
        phoneNumber: body.phoneNumber,
        phone: body.phoneNumber,
        fullName: body.fullName,
      });
    }

    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { success: false, message: "Proxy error khi gọi register" },
      { status: 502 }
    );
  }
}