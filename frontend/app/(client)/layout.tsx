import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AdminRedirect from "@/components/AdminRedirect";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { FavoriteProvider } from "@/context/FavoriteContext";
import Chat from "@/components/Chat";
import ScrollToTop from "@/components/ScrollToTop";
import CatalogSyncWatcher from "@/components/CatalogSyncWatcher";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TechWise AI",
  description: "AI-powered technology e-commerce platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-white text-neutral-900`}
      >
        <AuthProvider>
          <CartProvider>
            <FavoriteProvider>
              <TooltipProvider>
                <AdminRedirect>
                  <div className="flex flex-col min-h-screen">
                    <Header />
                    <main className="flex-1">{children}</main>
                    <Footer />
                  </div>
                </AdminRedirect>

                <Chat />
                <ScrollToTop />
                <CatalogSyncWatcher />
              </TooltipProvider>
            </FavoriteProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
