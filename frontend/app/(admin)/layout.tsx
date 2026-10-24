import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import { AuthProvider } from "@/context/AuthContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
  display: "swap",
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
    <html lang="vi" className={inter.variable}>
      <body
        className={`${inter.className} ${inter.variable} font-sans antialiased bg-neutral-50 text-neutral-900`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}