"use client";

import React, { useEffect, useState } from "react";
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
const MarqueeRow = ({
  children,
  direction = "left",
  speed = 35,
}: MarqueeRowProps) => {
  const [play, setPlay] = useState(true);

  // Tôn trọng prefers-reduced-motion: tắt chạy tự động.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPlay(!mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return (
    <Marquee
      direction={direction}
      speed={speed}
      play={play}
      pauseOnHover
      autoFill
      gradient={false}
      // pt-3: chừa chỗ cho các lớp viền nhô lên phía trên thẻ (container
      // của marquee có overflow hidden nên sẽ cắt mất nếu không có padding).
      className="pt-3 pb-1"
    >
      {children}
    </Marquee>
  );
};

export default MarqueeRow;