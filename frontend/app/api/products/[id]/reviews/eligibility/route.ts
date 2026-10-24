import { NextRequest, NextResponse } from "next/server";
import { readServerReviews } from "@/lib/server/reviews";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://techwiseai-prod.up.railway.app/api/v1";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const authHeader = req.headers.get("authorization");

  try {
    const backendUrl = `${API_BASE_URL}/products/${encodeURIComponent(id)}/reviews/eligibility`;
    const res = await fetch(backendUrl, {
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
  } catch {
    // Backend unreachable, continue to fallback
  }

  // Fallback for offline / local mode
  if (!authHeader) {
    return NextResponse.json({
      success: true,
      message: "Vui lòng đăng nhập để đánh giá sản phẩm",
      data: {
        productId: id,
        eligible: false,
        hasPurchased: false,
        alreadyReviewed: false,
        reason: "Vui lòng đăng nhập để đánh giá sản phẩm",
      },
    });
  }

  const allReviews = readServerReviews();
  const normalizedId = id.trim().toLowerCase();
  const existingReview = allReviews.find(
    (r) =>
      r.productId.trim().toLowerCase() === normalizedId &&
      r.status !== "HIDDEN"
  );

  return NextResponse.json({
    success: true,
    message: "Kiểm tra quyền đánh giá sản phẩm thành công",
    data: {
      productId: id,
      eligible: !existingReview,
      hasPurchased: true,
      alreadyReviewed: !!existingReview,
      reason: existingReview
        ? "Bạn đã gửi đánh giá cho sản phẩm này rồi"
        : "Bạn đủ điều kiện để đánh giá sản phẩm này",
    },
  });
}
