import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://techwiseai-production.up.railway.app/api/v1";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json(
      { success: false, message: "Thiếu Authorization header" },
      { status: 401 }
    );
  }

  const res = await fetch(`${API_BASE_URL}/cart`, {
    cache: "no-store",
    headers: { Authorization: authHeader },
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export async function DELETE(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json(
      { success: false, message: "Thiếu Authorization header" },
      { status: 401 }
    );
  }

  const res = await fetch(`${API_BASE_URL}/cart`, {
    method: "DELETE",
    cache: "no-store",
    headers: { Authorization: authHeader },
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}