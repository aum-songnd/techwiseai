import React from 'react';
import Image from 'next/image';
import Container from "@/components/common/Container";
import FooterTop from "./FooterTop";
import Logo from "./Logo";
import SocialMedia from "@/components/common/SocialMedia";
import { categoriesData, quickLinkData } from '@/constants/data';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const Footer = () => {
  return (
    <footer className="bg-white border-t border-neutral-200 font-sans text-neutral-900">
      <Container>
        <FooterTop />
        <div className="py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 font-sans">
          <div className="space-y-4">
            <Logo />
            <p className="font-sans text-sm text-neutral-600 leading-relaxed">
              Explore smartphones, laptops, earphones, smartwatches, and more at TECHWISEAI.
            </p>
            <SocialMedia />
          </div>

          <div>
            <h4 className="font-sans text-sm sm:text-base font-bold uppercase tracking-wider text-neutral-900">
              Quick Links
            </h4>
            <ul className="space-y-3 mt-4">
              {quickLinkData?.map((item) => (
                <li key={item?.title}>
                  <Link
                    href={item?.href}
                    className="font-sans text-sm text-neutral-600 hover:text-shop_dark_green transition-colors font-medium"
                  >
                    {item?.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-sans text-sm sm:text-base font-bold uppercase tracking-wider text-neutral-900">
              Categories
            </h4>
            <ul className="space-y-3 mt-4">
              {categoriesData?.map((item) => (
                <li key={item?.title}>
                  <Link
                    href={`/shop?category=${item?.href?.replace(/^\//, "")}`}
                    className="font-sans text-sm text-neutral-600 hover:text-shop_dark_green transition-colors font-medium"
                  >
                    {item?.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-sans text-sm sm:text-base font-bold uppercase tracking-wider text-neutral-900">
              Newsletter
            </h4>
            <p className="font-sans text-sm text-neutral-600 leading-relaxed">
              Subscribe to our newsletter to receive updates and exclusive offers.
            </p>
            <form className="space-y-3">
              <Input
                placeholder="Enter your email"
                className="font-sans text-sm h-10 border-neutral-200 focus-visible:ring-shop_dark_green placeholder:text-neutral-400 text-neutral-900"
              />
              <Button className="w-full font-sans text-sm font-semibold uppercase tracking-wider bg-shop_dark_green hover:bg-shop_dark_green/90 text-white transition-colors h-10">
                Subscribe
              </Button>
            </form>
          </div>
        </div>
        <div className="py-6 border-t border-neutral-200 text-center font-sans text-sm text-neutral-500">
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-1.5 text-sm">
              © {new Date().getFullYear()} <Logo className="text-base" />
              . All rights reserved.
            </div>
            <Image
              src="/capybara.gif"
              alt="Capybara"
              width={80}
              height={80}
              unoptimized
            />
          </div>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;