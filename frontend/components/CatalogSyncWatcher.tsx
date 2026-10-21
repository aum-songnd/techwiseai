"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { subscribeTabSync } from "@/lib/tab-sync";
import { clearRequestCache } from "@/lib/request-cache";

export default function CatalogSyncWatcher() {
  const router = useRouter();
  const lastSyncTimeRef = useRef(Date.now());

  useEffect(() => {
    const triggerRefresh = () => {
      lastSyncTimeRef.current = Date.now();
      clearRequestCache("catalog:");
      router.refresh();
    };

    // 1. Cross-tab or in-tab BroadcastChannel sync
    const unsubscribe = subscribeTabSync((event) => {
      if (
        event.type === "CATALOG_UPDATED" ||
        event.type === "BLOGS_STATUS_CHANGED"
      ) {
        triggerRefresh();
      }
    });

    // 2. Tab focus & visibility change detection
    const checkFreshness = () => {
      try {
        const lastUpdated = Number(
          localStorage.getItem("techwiseai_catalog_updated_at") || "0"
        );
        if (lastUpdated > lastSyncTimeRef.current) {
          triggerRefresh();
        }
      } catch {}
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkFreshness();
      }
    };

    // 3. Browser Back/Forward navigation (pageshow)
    const handlePageshow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        triggerRefresh();
      } else {
        checkFreshness();
      }
    };

    window.addEventListener("focus", checkFreshness);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pageshow", handlePageshow);

    return () => {
      unsubscribe();
      window.removeEventListener("focus", checkFreshness);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pageshow", handlePageshow);
    };
  }, [router]);

  return null;
}
