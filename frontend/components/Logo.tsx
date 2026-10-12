import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const Logo = ({
  className,
  spanDesign,
  href = "/",
  suffix,
}: {
  className?: string;
  spanDesign?: string;
  href?: string;
  suffix?: string;
}) => {
  return (
    <Link href={href} className='inline-flex'> 
    <h2 className={cn(
        "text-2xl text-shop_dark_green font-black uppercase" ,
        "tracking-wider hover:text-shop_light_green hoverEffect group font-sans", 
    className

    )}>Techwise<span className={cn("text-shop_light_green group-hover:text-shop_dark_green hoverEffect",spanDesign )}>ai</span>
    {suffix && (
      <span className="ml-2 text-sm font-semibold text-lightColor group-hover:text-shop_light_green hoverEffect">
        {suffix}
      </span>
    )}
    </h2>
    </Link>
  );
}

export default Logo