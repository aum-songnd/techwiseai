import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Container from "@/components/Container";
import { ClerkProvider } from "@clerk/nextjs";

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
     <ClerkProvider>
      <html lang="en" className="font-poppins">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <TooltipProvider>
         <div className="flex flex-col min-h-screen">
           <Header/>
          <main className="flex-1">{children}</main>
          <Footer/>
         </div>
          </TooltipProvider>
      </body>
    </html>
     </ClerkProvider>
  );
}