"use client";

import type { User } from "./auth";
import type { CartData } from "@/lib/api/cart";

export type TabSyncEvent =
  | {
      type: "AUTH_LOGIN";
      payload: {
        user: User;
        token: string;
      };
      senderTabId: string;
      timestamp: number;
    }
  | {
      type: "AUTH_LOGOUT";
      payload?: Record<string, never>;
      senderTabId: string;
      timestamp: number;
    }
  | {
      type: "CART_UPDATED";
      payload?: {
        cart?: CartData;
        timestamp: number;
      };
      senderTabId: string;
      timestamp: number;
    }
  | {
      type: "FAVORITES_UPDATED";
      payload?: {
        timestamp: number;
      };
      senderTabId: string;
      timestamp: number;
    }
  | {
      type: "ADMIN_ORDERS_CHANGED";
      payload?: {
        timestamp: number;
      };
      senderTabId: string;
      timestamp: number;
    }
  | {
      type: "CATALOG_UPDATED";
      payload?: {
        scope?: "products" | "categories" | "all";
        timestamp?: number;
      };
      senderTabId: string;
      timestamp: number;
    }
  | {
      type: "BLOGS_STATUS_CHANGED";
      payload?: {
        blogId?: string;
        active?: boolean;
        timestamp?: number;
      };
      senderTabId: string;
      timestamp: number;
    }
  | {
      type: "USER_STATUS_CHANGED";
      payload?: {
        id?: string;
        username?: string;
        active?: boolean;
        timestamp?: number;
      };
      senderTabId: string;
      timestamp: number;
    }
  | {
      type: "TAB_PING";
      payload?: Record<string, never>;
      senderTabId: string;
      timestamp: number;
    }
  | {
      type: "TAB_PONG";
      payload: {
        activeTabId: string;
      };
      senderTabId: string;
      timestamp: number;
    }
  | {
      type: "TAB_CLAIM";
      payload: {
        newActiveTabId: string;
      };
      senderTabId: string;
      timestamp: number;
    };

const CHANNEL_NAME = "techwiseai_tab_sync";
const STORAGE_SYNC_KEY = "techwiseai_tab_sync_event";

// Unique ID for this tab instance to avoid self-echoing
export const CURRENT_TAB_ID =
  typeof window !== "undefined"
    ? `tab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    : "server";

let broadcastChannel: BroadcastChannel | null = null;
const listeners = new Set<(event: TabSyncEvent) => void>();
let lastProcessedKey = "";

function handleIncomingEvent(data: unknown): void {
  if (!data || typeof data !== "object") return;
  const event = data as TabSyncEvent;

  // Do not process messages originated from the same tab
  if (event.senderTabId === CURRENT_TAB_ID) return;

  // Deduplicate events that might arrive via both BroadcastChannel and storage
  const dedupKey = `${event.type}_${event.senderTabId}_${event.timestamp}`;
  if (dedupKey === lastProcessedKey) return;
  lastProcessedKey = dedupKey;

  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch (err) {
      console.error("[tab-sync] Listener error:", err);
    }
  });
}

function initChannel(): BroadcastChannel | null {
  if (typeof window === "undefined") return null;
  if (!broadcastChannel && typeof BroadcastChannel !== "undefined") {
    try {
      broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
      broadcastChannel.onmessage = (messageEvent) => {
        handleIncomingEvent(messageEvent.data);
      };
    } catch (err) {
      console.warn("[tab-sync] BroadcastChannel initialization failed:", err);
      broadcastChannel = null;
    }
  }
  return broadcastChannel;
}

// Storage event listener for cross-tab sync fallback
if (typeof window !== "undefined") {
  window.addEventListener("storage", (storageEvent) => {
    if (storageEvent.key === STORAGE_SYNC_KEY && storageEvent.newValue) {
      try {
        const parsed = JSON.parse(storageEvent.newValue);
        handleIncomingEvent(parsed);
      } catch {}
    }
  });
}

export function broadcastTabEvent(
  eventInput:
    | { type: "AUTH_LOGIN"; payload: { user: User; token: string } }
    | { type: "AUTH_LOGOUT"; payload?: Record<string, never> }
    | { type: "CART_UPDATED"; payload?: { cart?: CartData; timestamp?: number } }
    | { type: "FAVORITES_UPDATED"; payload?: { timestamp?: number } }
    | { type: "ADMIN_ORDERS_CHANGED"; payload?: { timestamp?: number } }
    | { type: "CATALOG_UPDATED"; payload?: { scope?: "products" | "categories" | "all"; timestamp?: number } }
    | { type: "BLOGS_STATUS_CHANGED"; payload?: { blogId?: string; active?: boolean; timestamp?: number } }
    | { type: "USER_STATUS_CHANGED"; payload?: { id?: string; username?: string; active?: boolean; timestamp?: number } }
    | { type: "TAB_PING"; payload?: Record<string, never> }
    | { type: "TAB_PONG"; payload: { activeTabId: string } }
    | { type: "TAB_CLAIM"; payload: { newActiveTabId: string } }
): void {
  if (typeof window === "undefined") return;

  const now = Date.now();
  const fullEvent: TabSyncEvent = {
    ...eventInput,
    senderTabId: CURRENT_TAB_ID,
    timestamp: now,
  } as TabSyncEvent;

  // 1. Post to BroadcastChannel (primary instant cross-tab communication)
  const channel = initChannel();
  if (channel) {
    try {
      channel.postMessage(fullEvent);
    } catch (err) {
      console.warn("[tab-sync] Failed to post message to BroadcastChannel:", err);
    }
  }

  // 2. Write to localStorage for storage-event fallback
  try {
    localStorage.setItem(STORAGE_SYNC_KEY, JSON.stringify(fullEvent));
  } catch {}
}

export function subscribeTabSync(
  listener: (event: TabSyncEvent) => void
): () => void {
  initChannel();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyCatalogUpdated(
  scope: "products" | "categories" | "all" = "all"
): void {
  if (typeof window === "undefined") return;
  const now = Date.now();
  try {
    localStorage.setItem("techwiseai_catalog_updated_at", String(now));
  } catch {}
  broadcastTabEvent({
    type: "CATALOG_UPDATED",
    payload: { scope, timestamp: now },
  });
}

