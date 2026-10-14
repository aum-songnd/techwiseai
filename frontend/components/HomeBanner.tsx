import React from "react";
import { banner_1 } from "@/images";
import BannerCarousel, { type BannerSlide } from "./BannerCarousel";

const slides: BannerSlide[] = [
  {
    id: "headphone-sale",
    titleLines: ["Giảm đến 50%", "cho tai nghe chọn lọc"],
    buttonLabel: "Mua ngay",
    href: "/shop",
    image: banner_1,
    bgClass: "bg-shop_light_pink",
  },
  {
    id: "new-arrivals",
    titleLines: ["Sản phẩm mới về", "khám phá ngay hôm nay"],
    buttonLabel: "Xem ngay",
    href: "/shop",
    image: banner_1,
    bgClass: "bg-gray-100",
  },
  {
    id: "free-shipping",
    titleLines: ["Miễn phí giao hàng", "cho đơn từ 100$"],
    buttonLabel: "Mua sắm ngay",
    href: "/shop",
    image: banner_1,
    bgClass: "bg-emerald-50",
  },
];

const HomeBanner = () => {
  return <BannerCarousel slides={slides} />;
};

export default HomeBanner;