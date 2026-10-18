import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://techwiseai-prod.up.railway.app/api/v1";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json(
      { success: false, message: "Thiếu Authorization header" },
      { status: 401 }
    );
  }

  const body = await req.json();

  try {
    const res = await fetch(`${API_BASE_URL}/cart/items`, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("Cart items POST error:", err);
    return NextResponse.json(
      { success: false, message: "Không thể kết nối đến máy chủ backend" },
      { status: 503 }
    );
  }
}