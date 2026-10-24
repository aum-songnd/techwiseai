"use client";

import React, { useEffect, useState } from "react";

const pad = (n: number) => String(n).padStart(2, "0");

const TimeBox = ({ value }: { value: string }) => (
  <span className="flex items-center justify-center min-w-[28px] sm:min-w-[32px] h-6 sm:h-7 px-1.5 rounded-md bg-[#ea580c] text-white font-extrabold text-xs sm:text-sm tabular-nums shadow-2xs">
    {value}
  </span>
);

const Colon = () => (
  <span
    className="text-[#ea580c] font-black text-xs sm:text-sm mx-0.5 select-none"
    aria-hidden="true"
  >
    :
  </span>
);

const FlashSaleCountdown = ({ endsAt }: { endsAt: number }) => {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, endsAt - Date.now()));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [endsAt]);

  if (remaining === null) {
    return (
      <div className="flex items-center gap-1 font-sans">
        <TimeBox value="00" />
        <Colon />
        <TimeBox value="00" />
        <Colon />
        <TimeBox value="00" />
      </div>
    );
  }

  if (remaining === 0) {
    return (
      <span className="font-sans text-xs font-semibold text-neutral-500">
        Deal đã kết thúc
      </span>
    );
  }

  const totalSeconds = Math.floor(remaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return (
    <div
      className="flex items-center gap-0.5 font-sans"
      role="timer"
      aria-label="Thời gian còn lại"
    >
      <TimeBox value={pad(hours)} />
      <Colon />
      <TimeBox value={pad(minutes)} />
      <Colon />
      <TimeBox value={pad(seconds)} />
    </div>
  );
};

export default FlashSaleCountdown;