import { NextRequest, NextResponse } from "next/server";
import { deleteServerReview } from "@/lib/server/reviews";
import { API_BASE_URL } from "@/lib/config/api";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const authHeader = req.headers.get("authorization");

  try {
    try {
      await fetch(`${API_BASE_URL}/admin/reviews/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: {
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
      });
    } catch {}

    deleteServerReview(id);

    return NextResponse.json({
      success: true,
      message: "Đã xóa đánh giá thành công",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Lỗi xóa đánh giá" },
      { status: 500 }
    );
  }
}
