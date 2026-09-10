"use client";

import React from 'react';
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

const Header = () => {
  const { isSignedIn, isLoading } = useAuth();

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

          {!isLoading && (isSignedIn ? <UserMenu /> : <SignIn />)}
         </div>
      </Container>
    </header>
  );
};

export default Header;