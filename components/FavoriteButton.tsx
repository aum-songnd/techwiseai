"use client";

import React from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { useFavorite } from "@/context/FavoriteContext";

// Icon trái tim + badge số lượng, dùng đúng vị trí <FavoriteButton/> trong Header.tsx của bạn
const FavoriteButton = () => {
  const { favoriteCount } = useFavorite();

  return (
    <Link href="/wishlist" className="relative group">
      <Heart className="w-5 h-5 text-lightColor group-hover:text-shop_light_green hoverEffect" />
      <span className="absolute -top-2 -right-2 bg-shop_dark_green text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
        {favoriteCount}
      </span>
    </Link>
  );
};

export default FavoriteButton;