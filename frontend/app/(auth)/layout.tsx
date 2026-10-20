import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Image from "next/image";
import "../globals.css";
import { AuthProvider } from "@/context/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TechWise AI - Tài khoản",
  description: "Đăng nhập hoặc tạo tài khoản TechWise AI",
};

export default function AuthRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased text-neutral-900 min-h-screen relative bg-neutral-950`}
      >
        <AuthProvider>
          {/* Fullscreen Tech Background Image */}
          <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none select-none">
            <Image
              src="/auth-bg.jpg"
              alt="TechWise AI Background"
              fill
              priority
              className="object-cover object-center scale-105"
            />
            {/* Atmospheric dark gradient overlays to ensure optimum contrast */}
            <div className="absolute inset-0 bg-neutral-950/65 backdrop-blur-[1px]" />
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-neutral-950/80" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-shop_dark_green/25 via-transparent to-black/70" />
          </div>

          <main className="relative z-10">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}