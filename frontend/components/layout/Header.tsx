"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Container from "@/components/common/Container";
import Logo from "./Logo";
import MegaMenu from "./MegaMenu";
import SearchBar from "@/components/search/SearchBar";
import CartIcon from "@/components/cart/CartIcon";
import FavoriteButton from "@/components/common/FavoriteButton";
import CompareButton from "@/components/compare/CompareButton";
import SignIn from "@/components/auth/SignIn";
import MobileMenu from "./MobileMenu";
import { useAuth } from "@/context/AuthContext";
import UserMenu from "@/components/auth/UserMenu";
import { isAdminUser } from "@/lib/auth";
import { Flame, PhoneCall, ShieldCheck, Zap } from "lucide-react";

const Header = () => {
  const { isSignedIn, isLoading } = useAuth();
  const pathname = usePathname();

  const isAdminPage = pathname?.startsWith("/admin") ?? false;
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const syncAdminStatus = () => setIsAdmin(isAdminUser());
    syncAdminStatus();
    window.addEventListener("auth:login", syncAdminStatus);
    window.addEventListener("auth:logout", syncAdminStatus);
    return () => {
      window.removeEventListener("auth:login", syncAdminStatus);
      window.removeEventListener("auth:logout", syncAdminStatus);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-neutral-100 shadow-xs transition-all">
      {/* Top utility announcement strip */}
      {!isAdminPage && (
        <div className="hidden lg:block bg-neutral-900 text-neutral-300 text-[11px] py-1 border-b border-neutral-800">
          <Container className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <Zap className="w-3 h-3" />
                <span>Giao hàng siêu tốc 2H tại TP.HCM & Hà Nội</span>
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3 text-neutral-400" />
                <span>Cam kết 100% chính hãng - Đổi mới 30 ngày</span>
              </span>
            </div>

            <div className="flex items-center gap-5">
              <Link
                href="/deals"
                className="flex items-center gap-1 text-orange-400 font-semibold hover:text-orange-300 transition-colors"
              >
                <Flame className="w-3 h-3 fill-orange-400" />
                <span>Hot Deals hôm nay</span>
              </Link>
              <span>·</span>
              <span className="flex items-center gap-1">
                <PhoneCall className="w-3 h-3" />
                <span>Hotline: <strong className="text-white">1800 6868</strong> (Miễn phí)</span>
              </span>
            </div>
          </Container>
        </div>
      )}

      {/* Main navigation header */}
      <div className="py-3 sm:py-3.5">
        <Container className="flex items-center justify-between gap-3 md:gap-4">
          {/* Left: Mobile Toggle + Logo + MegaMenu */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {!isAdminPage && <MobileMenu />}
            <Logo />
            {!isAdminPage && (
              <div className="hidden lg:block">
                <MegaMenu />
              </div>
            )}
          </div>

          {/* Center: Prominent Omnibar Search */}
          {!isAdminPage && (
            <div className="hidden md:flex flex-1 items-center justify-center max-w-2xl">
              <SearchBar variant="prominent" />
            </div>
          )}

          {/* Right: Quick Links + Compare + Wishlist + Cart + Account */}
          <div className="flex items-center gap-2 sm:gap-3.5 shrink-0">
            {!isAdminPage && (
              <>
                {/* Mobile Search Icon */}
                <div className="md:hidden">
                  <SearchBar variant="icon" />
                </div>

                {/* Quick Navigation: Shop & Deals */}
                <Link
                  href="/shop"
                  className={`hidden xl:inline-flex text-xs font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-colors ${pathname === "/shop"
                    ? "text-shop_dark_green"
                    : "text-neutral-700 hover:text-shop_dark_green hover:bg-neutral-50"
                    }`}
                >
                  Sản phẩm
                </Link>

                <Link
                  href="/deals"
                  className={`hidden xl:inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-colors ${pathname === "/deals"
                    ? "text-orange-600 "
                    : "text-neutral-700 hover:text-orange-600 hover:bg-orange-50/60"
                    }`}
                >
                  <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
                  <span>Khuyến mãi</span>
                </Link>

                {/* Action Buttons with badges */}
                <CompareButton />
                <FavoriteButton />
                <CartIcon />

                {/* Admin Link if authorized */}
                {!isLoading && isSignedIn && isAdmin && (
                  <Link
                    href="/admin"
                    className="text-xs font-bold px-2.5 py-1.5 rounded-lg text-shop_dark_green  transition-colors"
                  >
                    Quản trị
                  </Link>
                )}
              </>
            )}

            {/* User Account / Sign In */}
            <div className="pl-1 border-l border-neutral-200">
              {!isLoading && (isSignedIn ? <UserMenu /> : <SignIn />)}
            </div>
          </div>
        </Container>
      </div>
    </header>
  );
};

export default Header;