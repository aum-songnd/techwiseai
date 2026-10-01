"use client";

import React from "react";
import Marquee from "react-fast-marquee";

type MarqueeRowProps = {
  children: React.ReactNode;
  // "left": chạy sang trái, "right": chạy sang phải.
  direction?: "left" | "right";
  // Tốc độ tính bằng px/giây.
  speed?: number;
};

// Client Component nhỏ bọc react-fast-marquee. Phần fetch dữ liệu và render
// thẻ vẫn nằm ở Server Component (HomeCategories / HomeBrands), truyền vào
// đây qua `children`.
// Luôn chạy, kể cả khi hệ điều hành bật giảm chuyển động.
const MarqueeRow = ({
  children,
  direction = "left",
  speed = 35,
}: MarqueeRowProps) => {
  return (
    <Marquee
      direction={direction}
      speed={speed}
      play
      pauseOnHover
      autoFill
      gradient={false}
    >
      {children}
    </Marquee>
  );
};

export default MarqueeRow;