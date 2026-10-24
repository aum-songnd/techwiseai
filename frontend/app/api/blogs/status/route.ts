import { NextRequest, NextResponse } from "next/server";
import {
  getServerHiddenBlogsMap,
  setServerBlogHidden,
  setServerHiddenBlogsMap,
} from "@/lib/server/blog-status";

export async function GET() {
  const data = getServerHiddenBlogsMap();
  return NextResponse.json({ success: true, data });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.hiddenMap && typeof body.hiddenMap === "object") {
      const updated = setServerHiddenBlogsMap(body.hiddenMap);
      return NextResponse.json({ success: true, data: updated });
    }

    if (body.id) {
      const isHidden = body.active === false || body.hidden === true;
      const updated = setServerBlogHidden(body.id, isHidden);
      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json(
      { success: false, message: "Thiếu id hoặc hiddenMap" },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { success: false, message: "Lỗi cập nhật trạng thái blog" },
      { status: 500 }
    );
  }
}
