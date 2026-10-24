import { NextRequest, NextResponse } from "next/server";
import { likeServerReview } from "@/lib/server/reviews";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://techwiseai-prod.up.railway.app/api/v1";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  // Try backend first
  try {
    const res = await fetch(`${API_BASE_URL}/reviews/${encodeURIComponent(id)}/like`, {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.success) {
        likeServerReview(id);
        return NextResponse.json(data);
      }
    }
  } catch {}

  // Fallback to local
  const updated = likeServerReview(id);
  if (!updated) {
    return NextResponse.json(
      { success: false, message: "Không tìm thấy đánh giá" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Cảm ơn bạn đã bình chọn hữu ích",
    data: updated,
  });
}
