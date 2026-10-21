"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { verifyBrowserSession } from "@/lib/auth";
import {
  CURRENT_TAB_ID,
  subscribeTabSync,
  broadcastTabEvent,
} from "@/lib/tab-sync";
import { AlertTriangle, ShieldAlert, ArrowRight, RefreshCw, XCircle } from "lucide-react";

const ACTIVE_TAB_STORAGE_KEY = "techwiseai_active_tab_leader";
const HEARTBEAT_INTERVAL_MS = 1500;
const HEARTBEAT_TIMEOUT_MS = 4000;

export default function TabSessionGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();

  // State 1: Duplicate tab conflict
  const [isDuplicateTab, setIsDuplicateTab] = useState(false);
  const [isCheckingTab, setIsCheckingTab] = useState(true);

  // State 2: Another browser session conflict
  const [sessionConflictReason, setSessionConflictReason] = useState<string | null>(null);

  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionCheckTimerRef = useRef<NodeJS.Timeout | null>(null);

  // --- 1. SINGLE TAB ENFORCEMENT ---

  const claimTabLeadership = useCallback(() => {
    if (typeof window === "undefined") return;
    const now = Date.now();
    localStorage.setItem(
      ACTIVE_TAB_STORAGE_KEY,
      JSON.stringify({ tabId: CURRENT_TAB_ID, lastHeartbeat: now })
    );
    broadcastTabEvent({
      type: "TAB_CLAIM",
      payload: { newActiveTabId: CURRENT_TAB_ID },
    });
    setIsDuplicateTab(false);
  }, []);

  const sendHeartbeat = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.tabId === CURRENT_TAB_ID) {
          localStorage.setItem(
            ACTIVE_TAB_STORAGE_KEY,
            JSON.stringify({ tabId: CURRENT_TAB_ID, lastHeartbeat: Date.now() })
          );
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // A. Check initial tab ownership
    let hasResponded = false;
    broadcastTabEvent({ type: "TAB_PING" });

    const checkTimer = setTimeout(() => {
      if (!hasResponded) {
        // No other active tab responded to ping
        try {
          const raw = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            const isFresh = Date.now() - parsed.lastHeartbeat < HEARTBEAT_TIMEOUT_MS;
            if (isFresh && parsed.tabId !== CURRENT_TAB_ID) {
              setIsDuplicateTab(true);
              setIsCheckingTab(false);
              return;
            }
          }
        } catch {}

        claimTabLeadership();
        setIsCheckingTab(false);
      }
    }, 350);

    // B. Subscribe to tab sync messages
    const unsubscribe = subscribeTabSync((event) => {
      if (event.type === "TAB_PING") {
        // If this tab is currently the leader, reply with PONG
        try {
          const raw = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.tabId === CURRENT_TAB_ID && !isDuplicateTab) {
              broadcastTabEvent({
                type: "TAB_PONG",
                payload: { activeTabId: CURRENT_TAB_ID },
              });
            }
          }
        } catch {}
      } else if (event.type === "TAB_PONG") {
        if (event.senderTabId !== CURRENT_TAB_ID) {
          hasResponded = true;
          setIsDuplicateTab(true);
          setIsCheckingTab(false);
        }
      } else if (event.type === "TAB_CLAIM") {
        if (event.payload.newActiveTabId !== CURRENT_TAB_ID) {
          // Another tab has taken leadership
          setIsDuplicateTab(true);
        }
      }
    });

    // C. Setup periodic heartbeat
    heartbeatTimerRef.current = setInterval(() => {
      if (!isDuplicateTab) {
        sendHeartbeat();
      }
    }, HEARTBEAT_INTERVAL_MS);

    // Clean up on unload
    const handleUnload = () => {
      try {
        const raw = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.tabId === CURRENT_TAB_ID) {
            localStorage.removeItem(ACTIVE_TAB_STORAGE_KEY);
          }
        }
      } catch {}
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      clearTimeout(checkTimer);
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
      unsubscribe();
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [claimTabLeadership, isDuplicateTab, sendHeartbeat]);

  // --- 2. SINGLE BROWSER / SESSION ENFORCEMENT (Khác trình duyệt) ---

  const checkBrowserSession = useCallback(async () => {
    if (!user?.username) return;
    try {
      const result = await verifyBrowserSession(user.username);
      if (!result.valid) {
        setSessionConflictReason(
          result.reason ||
            "Tài khoản của bạn vừa đăng nhập ở một trình duyệt hoặc thiết bị khác."
        );
      }
    } catch {}
  }, [user?.username]);

  useEffect(() => {
    if (!user?.username) {
      setSessionConflictReason(null);
      return;
    }

    // Check on mount and focus
    checkBrowserSession();

    const handleFocus = () => {
      checkBrowserSession();
    };
    window.addEventListener("focus", handleFocus);

    // Periodic check every 6 seconds
    sessionCheckTimerRef.current = setInterval(() => {
      checkBrowserSession();
    }, 6000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      if (sessionCheckTimerRef.current) clearInterval(sessionCheckTimerRef.current);
    };
  }, [user?.username, checkBrowserSession]);

  const handleSessionConflictLogout = () => {
    logout();
    window.location.href = "/sign-in?conflict=1";
  };

  return (
    <>
      {children}

      {/* MODAL 1: Bị chặn do mở 2 trình duyệt cùng 1 tài khoản */}
      {sessionConflictReason && (
        <aside
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
        >
          <div className="w-full max-w-md border border-red-500/30 bg-neutral-900 p-6 sm:p-8 text-white shadow-2xl space-y-5">
            <div className="flex items-center gap-3 border-b border-neutral-800 pb-4">
              <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-400">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-red-400">
                  Phát hiện đăng nhập nơi khác
                </h3>
                <p className="text-xs text-neutral-400 font-mono mt-0.5">
                  Tài khoản: {user?.username}
                </p>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              {sessionConflictReason}
            </p>
            <p className="text-[11px] text-neutral-400 bg-neutral-950 p-3 border border-neutral-800 leading-relaxed">
              💡 Để đảm bảo bảo mật dữ liệu và tránh tình trạng thao tác không đồng bộ giữa 2 trình duyệt, hệ thống đã ngắt kết nối phiên làm việc trên trình duyệt này.
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleSessionConflictLogout}
                className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors shadow-md"
              >
                <span>Đăng xuất & Đăng nhập lại</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* MODAL 2: Bị chặn do mở 2 tab cùng lúc */}
      {isDuplicateTab && !sessionConflictReason && !isCheckingTab && (
        <aside
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[99998] flex items-center justify-center bg-neutral-950/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
        >
          <div className="w-full max-w-lg border border-amber-500/30 bg-neutral-900 p-6 sm:p-8 text-white shadow-2xl space-y-5">
            <div className="flex items-center gap-3 border-b border-neutral-800 pb-4">
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400">
                  Cảnh báo: Trùng lặp tab trình duyệt
                </h3>
                <p className="text-xs text-neutral-400 font-mono mt-0.5">
                  Hệ thống bảo vệ đồng bộ dữ liệu
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-neutral-300 leading-relaxed">
              <p>
                Trang web hiện đang được mở ở một <strong>thẻ (tab) khác</strong> trên trình duyệt của bạn.
              </p>
              <div className="bg-neutral-950 p-3.5 border border-neutral-800 space-y-1.5 text-neutral-400 text-[11px]">
                <p className="font-semibold text-neutral-200">
                  Vì sao hệ thống chặn mở nhiều tab cùng lúc?
                </p>
                <p>
                  • Tránh tình trạng ẩn/hiện blog, chỉnh sửa sản phẩm hoặc đặt hàng ở tab này nhưng tab kia không cập nhật kịp thời.
                </p>
                <p>
                  • Đảm bảo toàn bộ thao tác của bạn luôn có hiệu lực chính xác và tức thì 100%.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={claimTabLeadership}
                className="flex-1 flex items-center justify-center gap-2 bg-shop_dark_green hover:bg-shop_dark_green/90 text-white px-5 py-3 text-xs font-semibold uppercase tracking-wider transition-colors shadow-md"
              >
                <span>Tiếp tục làm việc ở tab này</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-3 text-xs font-semibold uppercase tracking-wider border border-neutral-700 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors flex items-center justify-center gap-1.5"
                title="Tải lại trang"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Tải lại</span>
              </button>
            </div>
          </div>
        </aside>
      )}
    </>
  );
}
