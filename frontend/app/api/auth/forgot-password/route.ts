import { NextRequest, NextResponse } from "next/server";
import { sendOtpEmail } from "@/lib/mailer";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://techwiseai-prod.up.railway.app/api/v1";

interface BackendForgotPasswordData {
  email?: string;
  message?: string;
  devOtp?: string;
}

interface BackendResponse {
  success?: boolean;
  message?: string;
  data?: BackendForgotPasswordData;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = body?.email?.trim();

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập địa chỉ email hợp lệ" },
        { status: 400 }
      );
    }

    const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data: BackendResponse = await res.json().catch(() => ({}));

    if (!res.ok || data.success === false) {
      return NextResponse.json(data, { status: res.status });
    }

    const otp = data.data?.devOtp;
    if (otp && email) {
      // Send real email with OTP to the user's Gmail
      const mailRes = await sendOtpEmail({ to: email, otp });
      if (!mailRes.sent) {
        console.error(`[ForgotPassword API] Gửi email thất bại: ${mailRes.reason}`);
        return NextResponse.json(
          {
            success: false,
            message: `Không thể gửi mã OTP tới email ${email}. Lỗi: ${mailRes.reason || "Lỗi SMTP"}. Vui lòng thử lại sau.`,
          },
          { status: 500 }
        );
      }
    }

    // Sanitize response: NEVER expose OTP to the frontend
    const sanitizedResponse = {
      success: true,
      message:
        "Mã xác thực đã được gửi đến địa chỉ email của bạn. Vui lòng kiểm tra hộp thư đến (hoặc thư mục Spam).",
      data: {
        email,
        message:
          "Mã xác thực đã được gửi đến email của bạn. Mã có hiệu lực trong 15 phút.",
      },
    };

    return NextResponse.json(sanitizedResponse, { status: 200 });
  } catch (err) {
    console.error("LỖI FORGOT-PASSWORD ROUTE:", err);
    return NextResponse.json(
      { success: false, message: "Lỗi kết nối khi gửi yêu cầu quên mật khẩu" },
      { status: 502 }
    );
  }
}
