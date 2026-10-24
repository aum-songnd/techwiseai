import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AdminRedirect from "@/components/auth/AdminRedirect";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { FavoriteProvider } from "@/context/FavoriteContext";
import { CompareProvider } from "@/context/CompareContext";
import { RecentlyViewedProvider } from "@/context/RecentlyViewedContext";
import { QuickViewProvider } from "@/context/QuickViewContext";
import CompareDrawer from "@/components/compare/CompareDrawer";
import QuickViewModal from "@/components/product/QuickViewModal";
import Chat from "@/components/chatbot/Chat";
import ScrollToTop from "@/components/common/ScrollToTop";
import CatalogSyncWatcher from "@/components/common/CatalogSyncWatcher";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "TechWise AI - Nền tảng mua sắm thiết bị công nghệ hàng đầu",
  description: "Trải nghiệm mua sắm Laptop, Điện thoại, Phụ kiện công nghệ cao cấp chính hãng cùng TechWise AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={inter.variable}>
      <body
        className={`${inter.className} ${inter.variable} font-sans antialiased bg-white text-neutral-900`}
      >
        <AuthProvider>
          <CartProvider>
            <FavoriteProvider>
              <CompareProvider>
                <RecentlyViewedProvider>
                  <QuickViewProvider>
                    <TooltipProvider>
                      <AdminRedirect>
                        <div className="flex flex-col min-h-screen">
                          <Header />
                          <main className="flex-1">{children}</main>
                          <Footer />
                        </div>
                      </AdminRedirect>

                      <CompareDrawer />
                      <QuickViewModal />
                      <Chat />
                      <ScrollToTop />
                      <CatalogSyncWatcher />
                    </TooltipProvider>
                  </QuickViewProvider>
                </RecentlyViewedProvider>
              </CompareProvider>
            </FavoriteProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
