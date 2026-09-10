"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Container from './Container';
import Logo from './Logo';
import HeaderMenu from './HeaderMenu';
import SearchBar from './SearchBar';
import CartIcon from './CartIcon';
import FavoriteButton from './FavoriteButton';
import SignIn from './SignIn';
import MobileMenu from './MobileMenu';
import { useAuth } from '../context/AuthContext';
import UserMenu from './UserMenu';
import { isAdminUser } from '@/lib/auth';

const Header = () => {
  const { isSignedIn, isLoading } = useAuth();

  // Đọc quyền admin từ localStorage (lib/auth.ts) — tách state riêng vì
  // AuthContext hiện chỉ expose isSignedIn/isLoading, chưa có field
  // quyền (authorities). Lắng nghe thêm sự kiện "auth:login"/"auth:logout"
  // (setToken/clearToken tự bắn ra) để cập nhật ngay khi đăng nhập/đăng
  // xuất mà không cần load lại trang.
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const syncAdminStatus = () => setIsAdmin(isAdminUser());
    syncAdminStatus();
    window.addEventListener('auth:login', syncAdminStatus);
    window.addEventListener('auth:logout', syncAdminStatus);
    return () => {
      window.removeEventListener('auth:login', syncAdminStatus);
      window.removeEventListener('auth:logout', syncAdminStatus);
    };
  }, []);

  return (
    <header className="bg-white/70 backdrop-blur-md py-5 sticky top-0 z-50">
      <Container className="flex items-center justify-between text-lightColor">
         <div className="w-auto md:w-1/3 flex items-center justify-items-start  gap-2.5 md:gap-0">
          <MobileMenu />
          <Logo />
         </div>
         <HeaderMenu />
         <div className="w-auto md:w-1/3 flex items-center justify-end gap-5">
          <SearchBar/>
          <CartIcon/>
          <FavoriteButton/>

          {!isLoading && isSignedIn && isAdmin && (
            <Link
              href="/admin"
              className="text-sm font-semibold text-shop_dark_green hover:underline"
            >
              Quản trị
            </Link>
          )}

          {!isLoading && (isSignedIn ? <UserMenu /> : <SignIn />)}
         </div>
      </Container>
    </header>
  );
};

export default Header;