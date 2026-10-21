import { NextRequest, NextResponse } from "next/server";

const RAW_API_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  "https://techwiseai-prod.up.railway.app"
).replace(/\/$/, "");

const API_BASE_URL = RAW_API_URL.endsWith("/api/v1")
  ? RAW_API_URL
  : `${RAW_API_URL}/api/v1`;

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams.toString();

    // Trigger backend IPN processing to persist PAID/FAILED status to database
    if (searchParams) {
      try {
        await fetch(`${API_BASE_URL}/payments/vnpay/ipn?${searchParams}`, {
          cache: "no-store",
        });
      } catch (ipnErr) {
        console.warn("Could not pre-trigger VNPay IPN:", ipnErr);
      }
    }

    const url = `${API_BASE_URL}/payments/vnpay/return${
      searchParams ? `?${searchParams}` : ""
    }`;

    const res = await fetch(url, {
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { success: false, message: "Lỗi kết nối khi xác thực kết quả VNPAY" },
      { status: 502 }
    );
  }
}
