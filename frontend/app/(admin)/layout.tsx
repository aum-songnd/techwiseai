import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { AuthProvider } from "@/context/AuthContext";

// Root layout riêng cho khu vực quản trị: có <html>/<body> và AuthProvider
// (admin/layout.tsx cần useAuth) nhưng KHÔNG có Header/Footer/Cart của
// trang khách. Đặt tại app/(admin)/layout.tsx, còn các trang admin nằm ở
// app/(admin)/admin/... nên URL vẫn là /admin/...

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TechWise AI - Quản trị",
  description: "Khu vực quản trị TechWise AI",
};

export default function AdminRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="font-poppins">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}