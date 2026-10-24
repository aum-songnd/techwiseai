"use client";

import { ShoppingBag } from 'lucide-react';
import React from 'react';
import Link from 'next/link';
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";

const CartIcon = () => {
    const { totalQuantity, requiresLogin } = useCart();
    const { isSignedIn } = useAuth();
    const displayQuantity = !isSignedIn || requiresLogin ? 0 : totalQuantity;

    return (
    <Link href="/cart" className="group relative">
        <ShoppingBag className="w-5 h-5 hover:text-shop_light_green hoverEffect"/>
        <span className="absolute -top-1 -right-1
        bg-shop_btn_dark_green text-white h-3.5 w-3.5
        rounded-full text-xs font-semibold flex items-center justify-center">{displayQuantity > 9 ? '9+' : displayQuantity}</span>
        </Link>
    );
};

export default CartIcon;