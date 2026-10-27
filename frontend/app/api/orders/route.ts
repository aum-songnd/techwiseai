import { NextRequest, NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/config/api";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: "Thiếu Authorization header" },
        { status: 401 }
      );
    }

    const searchParams = req.nextUrl.searchParams.toString();
    const url = `${API_BASE_URL}/orders${searchParams ? `?${searchParams}` : ""}`;

    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        Authorization: authHeader,
      },
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Lỗi kết nối khi tải danh sách đơn hàng" },
      { status: 502 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: "Thiếu Authorization header" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const res = await fetch(`${API_BASE_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Lỗi kết nối khi tạo đơn hàng" },
      { status: 502 }
    );
  }
}
