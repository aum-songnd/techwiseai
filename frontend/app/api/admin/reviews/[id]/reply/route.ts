import { NextRequest, NextResponse } from "next/server";
import { replyServerReview } from "@/lib/server/reviews";
import { API_BASE_URL } from "@/lib/config/api";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const authHeader = req.headers.get("authorization");

  try {
    const body = await req.json();
    const reply = body.reply?.trim();

    if (!reply) {
      return NextResponse.json(
        { success: false, message: "Nội dung phản hồi không được để trống" },
        { status: 400 }
      );
    }

    try {
      const res = await fetch(`${API_BASE_URL}/admin/reviews/${encodeURIComponent(id)}/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        body: JSON.stringify({ reply }),
      });

      if (res.ok) {
        const data = await res.json();
        replyServerReview(id, reply);
        return NextResponse.json(data);
      }
    } catch {}

    const updated = replyServerReview(id, reply);
    if (!updated) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy đánh giá" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Phản hồi đánh giá thành công",
      data: updated,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Lỗi phản hồi đánh giá" },
      { status: 500 }
    );
  }
}
