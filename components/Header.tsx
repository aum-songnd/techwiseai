import React from 'react';
import Container from './Container';
import Logo from './Logo';
import HeaderMenu from './HeaderMenu';
import SearchBar from './SearchBar';
import CartIcon from './CartIcon';
import FavoriteButton from './FavoriteButton';
import Signin from './Signin';
import MobileMenu from './MobileMenu';

const Header = () => {
  return (
    <header  className="bg-white py-5 border-b border-b-black/20">
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
          <Signin/>
         </div>
      </Container>
    </header>
  );
};

export default Header;