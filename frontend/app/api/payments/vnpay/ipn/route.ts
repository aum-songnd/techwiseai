import { NextRequest, NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/config/api";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams.toString();
    const url = `${API_BASE_URL}/payments/vnpay/ipn${
      searchParams ? `?${searchParams}` : ""
    }`;

    const res = await fetch(url, {
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { RspCode: "99", Message: "Unknown error" },
      { status: 200 }
    );
  }
}
