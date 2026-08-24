import React from 'react';
import Container from './Container';
import FooterTop from './FooterTop';
import Logo from './Logo';
import SocialMedia from './SocialMedia';
import { SubText, SubTitle } from './ui/text';
import { categoriesData, quickLinkData } from '@/constants/data';
import Link from 'next/link';
import { Button } from './ui/button';
import { Input } from './ui/input';

const Footer = () => {
  return  (
  <footer className='bg-white border-t'>
    <Container>
      <FooterTop />
      <div className='py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8'>
      <div className='space-y-4'>
        <Logo />
        <SubText>
          Discover curated furniture collections at TECHWISEAI, blending style and comfort to elevate your living spaces.
        </SubText>
        <SocialMedia />
      </div>

      <div>
        <SubTitle>Quick Links</SubTitle>
        <ul className='space-y-3 mt-4'>
          {quickLinkData?.map((item)=>(
            <li key={item?.title}>
              <SubText>
              <Link href={item?.href} className='hover:text-shop_light_green hoverEffect font-medium'>{item?.title}</Link>
              </SubText>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <SubTitle>Categories</SubTitle>
        <ul className='space-y-3 mt-4'>
          {categoriesData?.map((item)=>(
            <li key={item?.title}>
              <SubText>
                <Link href={`/category/${item?.href}`} className='hover:text-shop_light_green hoverEffect font-medium'>{item?.title}</Link>
              </SubText>
            </li>
          ))}
        </ul>
      </div>

      <div className='space-y-4'>
        <SubTitle>Newsletter</SubTitle>
        <SubText>Subscribe to our newsletter to receive updates and exclusive offers.</SubText>
        <form className='space-y-3'>
          <Input placeholder='Enter your email' />
          <Button className="w-full">Subscribe</Button>
        </form>
      </div>
      </div>
      <div className='py-6 border-t text-center text-sm text-gray-600'>
        <div>
        © {new Date().getFullYear()} <Logo className='text-sm'/>
        . All rights reserved.
        </div>
      </div>
    </Container>
  </footer>
  );
};

export default Footer;