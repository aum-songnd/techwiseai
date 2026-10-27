import { NextRequest, NextResponse } from "next/server";
import { updateServerReviewStatus } from "@/lib/server/reviews";
import { API_BASE_URL } from "@/lib/config/api";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const authHeader = req.headers.get("authorization");

  try {
    const body = await req.json();
    const status = (body.status || "APPROVED").toUpperCase() as "APPROVED" | "HIDDEN";

    try {
      const res = await fetch(`${API_BASE_URL}/admin/reviews/${encodeURIComponent(id)}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        const data = await res.json();
        updateServerReviewStatus(id, status);
        return NextResponse.json(data);
      }
    } catch {}

    const updated = updateServerReviewStatus(id, status);
    if (!updated) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy đánh giá" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Cập nhật trạng thái đánh giá thành công",
      data: updated,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Lỗi cập nhật trạng thái" },
      { status: 500 }
    );
  }
}
