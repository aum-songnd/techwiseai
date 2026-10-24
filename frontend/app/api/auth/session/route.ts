import { NextRequest, NextResponse } from "next/server";
import {
  registerActiveSession,
  verifyActiveSession,
  removeActiveSession,
  touchActiveSession,
} from "@/lib/server/session-manager";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username");
  const sessionId = searchParams.get("sessionId");

  if (!username || !sessionId) {
    return NextResponse.json({ success: true, valid: true });
  }

  const result = verifyActiveSession(username, sessionId);
  if (result.valid) {
    touchActiveSession(username, sessionId);
  }

  return NextResponse.json({
    success: true,
    valid: result.valid,
    reason: result.reason,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, sessionId } = body;

    if (!username || !sessionId) {
      return NextResponse.json(
        { success: false, message: "Thiếu username hoặc sessionId" },
        { status: 400 }
      );
    }

    const userAgent = req.headers.get("user-agent") || undefined;
    const ip = req.headers.get("x-forwarded-for") || undefined;

    registerActiveSession(username, sessionId, { userAgent, ip });

    return NextResponse.json({
      success: true,
      message: "Đã đăng ký phiên làm việc duy nhất thành công",
      sessionId,
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Lỗi đăng ký session" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username");
    const sessionId = searchParams.get("sessionId");

    if (username) {
      removeActiveSession(username, sessionId || undefined);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
