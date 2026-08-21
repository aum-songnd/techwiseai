import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const Logo = ({className}: {className?: string}) => {
  return (
    <Link href={"/"}> 
    <h2 className={cn(
        "text-2xl text-shop_dark_green font-black uppercase" ,
        "tracking-wider hover:text-shop_light_green hoverEffect group font-sans", 
    className

    )}>Techwise<span className="text-shop_light_green group-hover:text-shop_dark_green hoverEffect">ai</span>
    </h2>
    </Link>
  );
}

export default Logo