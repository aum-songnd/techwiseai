import nodemailer from "nodemailer";

export interface SendOtpEmailParams {
  to: string;
  otp: string;
}

// Thông tin tài khoản gửi Gmail mặc định (dùng khi môi trường deploy chưa cấu hình biến môi trường)
const DEFAULT_SMTP_USER = "nsong568@gmail.com";
const DEFAULT_SMTP_PASS = "ccpvvhsy eoquysmq".replace(/\s+/g, "");

export async function sendOtpEmail({
  to,
  otp,
}: SendOtpEmailParams): Promise<{ sent: boolean; reason?: string }> {
  const smtpUser = (
    process.env.SMTP_USER ||
    process.env.GMAIL_USER ||
    DEFAULT_SMTP_USER
  ).trim();

  const rawPass =
    process.env.SMTP_PASS ||
    process.env.GMAIL_APP_PASSWORD ||
    DEFAULT_SMTP_PASS;
  const smtpPass = rawPass.replace(/\s+/g, "").trim();

  const smtpHost = (process.env.SMTP_HOST || "smtp.gmail.com").trim();
  const configuredPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : null;
  const configuredSecure =
    process.env.SMTP_SECURE !== undefined
      ? process.env.SMTP_SECURE !== "false"
      : null;

  if (!smtpUser || !smtpPass) {
    console.warn(
      `[TechWise Mailer] Chưa cấu hình SMTP_USER & SMTP_PASS (Gmail App Password). Mã OTP tạo cho ${to} là: [${otp}]`
    );
    return {
      sent: false,
      reason: "MISSING_SMTP_CONFIG",
    };
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f6f6f6; margin: 0; padding: 24px; color: #151515; }
        .container { max-width: 540px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e5e5; padding: 32px; border-radius: 4px; }
        .header { border-bottom: 2px solid #063c28; padding-bottom: 16px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; }
        .brand { font-size: 22px; font-weight: 800; color: #063c28; letter-spacing: -0.5px; text-transform: uppercase; }
        .badge { font-size: 11px; font-family: monospace; color: #71717a; background: #f4f4f5; padding: 4px 8px; border-radius: 2px; }
        .title { font-size: 18px; font-weight: 700; color: #151515; margin-bottom: 12px; }
        .text { font-size: 14px; line-height: 1.6; color: #52525b; margin-bottom: 20px; }
        .otp-box { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; text-align: center; margin: 24px 0; border-radius: 4px; }
        .otp-label { font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; color: #166534; margin-bottom: 6px; }
        .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; color: #063c28; letter-spacing: 10px; }
        .footer { font-size: 12px; color: #a1a1aa; border-top: 1px solid #f4f4f5; padding-top: 16px; margin-top: 28px; line-height: 1.5; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <span class="brand">TechWise AI</span>
          <span class="badge">[ Security Code ]</span>
        </div>
        <h2 class="title">Xác thực đặt lại mật khẩu</h2>
        <p class="text">
          Xin chào,<br><br>
          Chúng tôi nhận được yêu cầu khôi phục mật khẩu cho tài khoản TechWise AI của bạn (<strong>${to}</strong>).<br>
          Dưới đây là mã xác nhận (OTP) dùng một lần của bạn:
        </p>
        <div class="otp-box">
          <div class="otp-label">Mã xác thực của bạn</div>
          <div class="otp-code">${otp}</div>
        </div>
        <p class="text" style="font-size: 13px;">
          Mã này có hiệu lực trong vòng <strong>15 phút</strong>.<br>
          Để bảo vệ an toàn cho tài khoản, <strong>tuyệt đối không chia sẻ mã này</strong> cho bất kỳ ai.<br><br>
          Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email hoặc liên hệ tổng đài hỗ trợ <strong>1900 6868</strong> để được trợ giúp.
        </p>
        <div class="footer">
          © 2026 TechWise AI. Hệ sinh thái công nghệ & AI chính hãng.<br>
          Đây là email tự động gửi từ hệ thống, vui lòng không trả lời thư này.
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"TechWise AI Security" <${smtpUser}>`,
    to,
    subject: `[TechWise AI] Mã xác nhận đặt lại mật khẩu: ${otp}`,
    html: htmlContent,
    text: `Mã xác nhận đặt lại mật khẩu TechWise AI của bạn là: ${otp}. Mã có hiệu lực trong 15 phút. Tuyệt đối không chia sẻ mã này.`,
  };

  // Cấu hình các phương án kết nối linh hoạt cho môi trường Deploy / Serverless (Vercel, Railway, Docker)
  // Ép IPv4 (family: 4) để tránh IPv6 timeout trên môi trường Cloud
  const connectionConfigs = [
    // Phương án 1: Port 465 (SSL trực tiếp)
    {
      host: smtpHost,
      port: configuredPort ?? 465,
      secure: configuredSecure ?? true,
      auth: { user: smtpUser, pass: smtpPass },
      family: 4,
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 12000,
      tls: { rejectUnauthorized: false },
    },
    // Phương án 2: Port 587 (STARTTLS) - phòng trường hợp Port 465 bị firewall cloud chặn
    {
      host: smtpHost,
      port: 587,
      secure: false,
      requireTLS: true,
      auth: { user: smtpUser, pass: smtpPass },
      family: 4,
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 12000,
      tls: { rejectUnauthorized: false },
    },
  ];

  let lastError: Error | null = null;

  for (const config of connectionConfigs) {
    try {
      const transporter = nodemailer.createTransport(config);
      const info = await transporter.sendMail(mailOptions);
      console.log(
        `[TechWise Mailer] ✓ Đã gửi mã OTP thành công đến ${to} qua ${config.host}:${config.port} (MessageId: ${info.messageId})`
      );
      return { sent: true };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(
        `[TechWise Mailer] ⚠ Gửi mail qua ${config.host}:${config.port} thất bại: ${lastError.message}. Đang thử phương án kết nối khác...`
      );
    }
  }

  console.error("[TechWise Mailer] ✗ Tất cả các cổng gửi email đều thất bại:", lastError);
  return {
    sent: false,
    reason: lastError ? lastError.message : "SEND_FAILED",
  };
}
