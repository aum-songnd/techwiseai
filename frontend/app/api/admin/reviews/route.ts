import { NextRequest, NextResponse } from "next/server";
import { searchAllServerReviews } from "@/lib/server/reviews";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://techwiseai-prod.up.railway.app/api/v1";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const authHeader = req.headers.get("authorization");

  try {
    const res = await fetch(`${API_BASE_URL}/admin/reviews?${searchParams.toString()}`, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.success) {
        return NextResponse.json(data);
      }
    }
  } catch {}

  // Fallback to local server reviews
  const keyword = searchParams.get("keyword") || undefined;
  const status = searchParams.get("status") || undefined;
  const rating = searchParams.get("rating") ? parseInt(searchParams.get("rating")!, 10) : undefined;
  const productId = searchParams.get("productId") || undefined;
  const page = parseInt(searchParams.get("page") || "0", 10);
  const size = parseInt(searchParams.get("size") || "15", 10);

  const result = searchAllServerReviews({
    keyword,
    status,
    rating,
    productId,
    page,
    size,
  });

  return NextResponse.json({
    success: true,
    message: "Lấy danh sách đánh giá quản trị thành công",
    data: {
      items: result.items,
      page: result.page,
      size: result.size,
      totalElements: result.totalElements,
      totalPages: result.totalPages,
      first: result.page === 0,
      last: result.page >= result.totalPages - 1,
    },
  });
}
