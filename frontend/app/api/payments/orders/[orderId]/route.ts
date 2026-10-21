import { NextRequest, NextResponse } from "next/server";

const RAW_API_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  "https://techwiseai-prod.up.railway.app"
).replace(/\/$/, "");

const API_BASE_URL = RAW_API_URL.endsWith("/api/v1")
  ? RAW_API_URL
  : `${RAW_API_URL}/api/v1`;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: "Thiếu Authorization header" },
        { status: 401 }
      );
    }

    const res = await fetch(`${API_BASE_URL}/payments/orders/${orderId}`, {
      cache: "no-store",
      headers: {
        Authorization: authHeader,
      },
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { success: false, message: "Lỗi kết nối khi tải thông tin thanh toán" },
      { status: 502 }
    );
  }
}
