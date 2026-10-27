import { NextRequest, NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/config/api";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json(
      { success: false, message: "Thiếu Authorization header" },
      { status: 401 }
    );
  }

  try {
    const res = await fetch(`${API_BASE_URL}/cart`, {
      cache: "no-store",
      headers: { Authorization: authHeader },
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("Cart GET error:", err);
    return NextResponse.json(
      { success: false, message: "Không thể kết nối đến máy chủ backend" },
      { status: 503 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json(
      { success: false, message: "Thiếu Authorization header" },
      { status: 401 }
    );
  }

  try {
    const res = await fetch(`${API_BASE_URL}/cart`, {
      method: "DELETE",
      cache: "no-store",
      headers: { Authorization: authHeader },
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("Cart DELETE error:", err);
    return NextResponse.json(
      { success: false, message: "Không thể kết nối đến máy chủ backend" },
      { status: 503 }
    );
  }
}