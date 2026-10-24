"use client";

import React from "react";
import Marquee from "react-fast-marquee";

type MarqueeRowProps = {
  children: React.ReactNode;

  direction?: "left" | "right";

  speed?: number;
};

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