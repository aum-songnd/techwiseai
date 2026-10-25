"use client";

import { useEffect, useRef, useCallback } from "react";
import { recordInteraction } from "@/lib/api/recommendation/personalized";

export function useProductTracking(productId?: string) {
  const accumulatedSecondsRef = useRef<number>(0);
  const activeStartRef = useRef<number | null>(null);
  const isVisibleRef = useRef<boolean>(true);
  const lastReportedSecondsRef = useRef<number>(0);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cập nhật số giây tích lũy khi đang hiển thị
  const flushActiveDuration = useCallback(() => {
    if (isVisibleRef.current && activeStartRef.current !== null) {
      const now = Date.now();
      const elapsed = (now - activeStartRef.current) / 1000;
      accumulatedSecondsRef.current += Math.max(0, elapsed);
      activeStartRef.current = now;
    }
  }, []);

  const sendViewUpdate = useCallback((minThresholdSeconds = 3) => {
    flushActiveDuration();
    const currentTotal = Math.round(accumulatedSecondsRef.current);

    // Chỉ gửi khi đạt ngưỡng tối thiểu và có sự gia tăng thời lượng đáng kể (>= 4s so với lần gửi trước)
    if (
      productId &&
      currentTotal >= minThresholdSeconds &&
      (currentTotal - lastReportedSecondsRef.current >= 4 || lastReportedSecondsRef.current === 0)
    ) {
      lastReportedSecondsRef.current = currentTotal;
      recordInteraction({
        productId,
        eventType: "VIEW",
        durationSeconds: currentTotal,
      });
    }
  }, [productId, flushActiveDuration]);

  useEffect(() => {
    if (!productId) return;

    // Reset trạng thái cho sản phẩm mới
    accumulatedSecondsRef.current = 0;
    lastReportedSecondsRef.current = 0;
    isVisibleRef.current = typeof document !== "undefined" ? !document.hidden : true;
    activeStartRef.current = isVisibleRef.current ? Date.now() : null;

    // Xử lý khi người dùng chuyển tab hoặc ẩn trình duyệt (visibilitychange)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab bị ẩn: Tạm dừng tính thời gian và lưu lại checkpoint
        flushActiveDuration();
        isVisibleRef.current = false;
        activeStartRef.current = null;
        sendViewUpdate(3);
      } else {
        // Tab hiển thị trở lại: Tiếp tục đếm thời gian
        isVisibleRef.current = true;
        activeStartRef.current = Date.now();
      }
    };

    // Xử lý khi người dùng rời trang (pagehide / beforeunload)
    const handlePageExit = () => {
      flushActiveDuration();
      sendViewUpdate(2);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageExit);
    window.addEventListener("beforeunload", handlePageExit);

    // Heartbeat định kỳ: kiểm tra và cập nhật thời lượng tại các mốc 4s, 15s, 30s, 60s, 120s...
    // Giúp thời lượng xem 60s được ghi nhận chính xác ngay cả khi người dùng chưa rời trang
    heartbeatTimerRef.current = setInterval(() => {
      if (isVisibleRef.current) {
        sendViewUpdate(4);
      }
    }, 5000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageExit);
      window.removeEventListener("beforeunload", handlePageExit);

      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
      }

      // Khi unmount component: gửi tổng thời gian xem thực tế
      flushActiveDuration();
      sendViewUpdate(2);
    };
  }, [productId, flushActiveDuration, sendViewUpdate]);

  const trackClick = useCallback((targetProductId?: string) => {
    const id = targetProductId || productId;
    if (!id) return;
    recordInteraction({
      productId: id,
      eventType: "CLICK",
    });
  }, [productId]);

  const trackFavorite = useCallback((targetProductId?: string) => {
    const id = targetProductId || productId;
    if (!id) return;
    recordInteraction({
      productId: id,
      eventType: "FAVORITE",
    });
  }, [productId]);

  const trackAddToCart = useCallback((targetProductId?: string) => {
    const id = targetProductId || productId;
    if (!id) return;
    recordInteraction({
      productId: id,
      eventType: "ADD_TO_CART",
    });
  }, [productId]);

  return {
    trackClick,
    trackFavorite,
    trackAddToCart,
  };
}
