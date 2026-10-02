"use client";
import React, { useEffect, useState } from "react";

const pad = (n: number) => String(n).padStart(2, "0");

const TimeBox = ({ value, label }: { value: string; label: string }) => (
  <div className="flex flex-col items-center gap-1.5">
    <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100 text-2xl font-bold tabular-nums text-gray-900 sm:h-16 sm:w-16 sm:text-3xl md:h-[72px] md:w-[72px] md:text-4xl">
      {value}
    </span>
  </div>
);

// Dấu ":" căn giữa theo chiều cao ô số (nhãn nằm bên dưới nên cần đệm).
const Colon = () => (
  <span
    className="flex h-14 items-center text-2xl font-bold text-gray-900 sm:h-16 sm:text-3xl md:h-[72px] md:text-4xl"
    aria-hidden="true"
  >
    :
  </span>
);

// Đồng hồ đếm ngược tới `endsAt` (timestamp ms).
// Chỉ render sau khi mount để tránh lệch SSR/client (hydration mismatch).
const FlashSaleCountdown = ({ endsAt }: { endsAt: number }) => {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, endsAt - Date.now()));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [endsAt]);

  // Giữ chỗ để layout không nhảy khi đồng hồ xuất hiện.
  if (remaining === null) return <div className="h-24 md:h-28" aria-hidden="true" />;

  if (remaining === 0) {
    return <span className="text-sm text-gray-500">Deal đã kết thúc</span>;
  }

  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return (
    <div
      className="flex items-start justify-center gap-1.5 sm:gap-3"
      role="timer"
      aria-live="off"
    >
      {days > 0 && (
        <>
          <TimeBox value={pad(days)} label="Ngày" />
          <Colon />
        </>
      )}
      <TimeBox value={pad(hours)} label="Giờ" />
      <Colon />
      <TimeBox value={pad(minutes)} label="Phút" />
      <Colon />
      <TimeBox value={pad(seconds)} label="Giây" />
    </div>
  );
};

export default FlashSaleCountdown;