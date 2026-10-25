import {
  fetchEnvelopeUncached,
  mapProduct,
  type ApiProductRaw,
  API_BASE_URL,
} from "../core";
import { getToken } from "@/lib/auth/auth";
import type { Product } from "@/app/data/types";
import type { RecommendedProduct } from "../search/search";

export type RecommendationMode = "COLD_START" | "EXPLORING" | "PERSONALIZED";

export interface PersonalizedRecommendationData {
  mode: RecommendationMode;
  title: string;
  subtitle: string;
  interactionCount: number;
  preferredCategory: string | null;
  items: RecommendedProduct[];
}

export interface UserProfileData {
  userId: string | null;
  sessionId: string;
  interactionCount: number;
  mode: RecommendationMode;
  favoriteCategories: string[];
  preferredPriceMin: number;
  preferredPriceMax: number;
  lastActiveAt: string | null;
  hasProfileVector: boolean;
}

export interface InteractionEventPayload {
  productId: string;
  eventType: "VIEW" | "CLICK" | "FAVORITE" | "ADD_TO_CART";
  sessionId?: string;
  durationSeconds?: number;
  metadata?: string;
}

interface ApiRecommendedRaw {
  product: ApiProductRaw;
  badge: "BEST" | "HOT" | "CHOICE" | "FOR_YOU" | null;
  reason: string | null;
  keySpecs: Record<string, string> | null;
  score: number;
}

interface ApiPersonalizedResponseRaw {
  mode: RecommendationMode;
  title: string;
  subtitle: string;
  interactionCount: number;
  preferredCategory: string | null;
  items: ApiRecommendedRaw[];
}

const SESSION_STORAGE_KEY = "tw_session_id";

export function getSessionId(): string {
  if (typeof window === "undefined") {
    return "ssr_session";
  }
  let sid = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!sid) {
    sid = "s_" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    localStorage.setItem(SESSION_STORAGE_KEY, sid);
  }
  return sid;
}

export async function recordInteraction(payload: InteractionEventPayload): Promise<void> {
  const sid = payload.sessionId || getSessionId();
  try {
    const isBrowser = typeof window !== "undefined";
    const endpoint = isBrowser ? "/api/interactions" : `${API_BASE_URL}/interactions`;
    const token = isBrowser ? getToken() : null;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Session-Id": sid,
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...payload,
        sessionId: sid,
      }),
      keepalive: true,
    });
    if (res.ok && isBrowser) {
      const serverSid = res.headers.get("X-Session-Id");
      if (serverSid) {
        localStorage.setItem(SESSION_STORAGE_KEY, serverSid);
      }
    }
  } catch (err) {
    console.debug("Failed to record interaction event:", err);
  }
}

export async function getForYouRecommendations(
  sessionId?: string,
  limit = 8,
  refresh = false
): Promise<PersonalizedRecommendationData> {
  const isBrowser = typeof window !== "undefined";
  const sid = sessionId || (isBrowser ? getSessionId() : undefined);
  const token = isBrowser ? getToken() : null;
  const safeLimit = Math.max(1, Math.min(limit, 24));
  const query = new URLSearchParams({ limit: safeLimit.toString() });
  if (refresh) {
    query.set("refresh", "true");
  }

  let raw: ApiPersonalizedResponseRaw;

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (sid) {
    headers["X-Session-Id"] = sid;
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (isBrowser) {
    const res = await fetch(`/api/recommendations/for-you?${query.toString()}`, {
      cache: "no-store",
      headers,
    });
    if (!res.ok) {
      throw new Error("Lỗi khi tải gợi ý từ API");
    }
    const serverSid = res.headers.get("X-Session-Id");
    if (serverSid) {
      localStorage.setItem(SESSION_STORAGE_KEY, serverSid);
    }
    const json = await res.json();
    raw = json.data;
  } else {
    raw = await fetchEnvelopeUncached<ApiPersonalizedResponseRaw>(
      `/recommendations/for-you?${query.toString()}`,
      {
        headers,
      }
    );
  }

  return {
    mode: raw.mode,
    title: raw.title,
    subtitle: raw.subtitle,
    interactionCount: raw.interactionCount,
    preferredCategory: raw.preferredCategory,
    items: (raw.items ?? []).map((r) => ({
      product: mapProduct(r.product),
      badge: r.badge ?? null,
      reason: r.reason ?? null,
      keySpecs: r.keySpecs ?? {},
      score: r.score,
    })),
  };
}

export async function getUserRecommendationProfile(sessionId?: string): Promise<UserProfileData | null> {
  const isBrowser = typeof window !== "undefined";
  const sid = sessionId || (isBrowser ? getSessionId() : undefined);
  try {
    const token = isBrowser ? getToken() : null;
    const headers: Record<string, string> = {};
    if (sid) {
      headers["X-Session-Id"] = sid;
    }
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    if (isBrowser) {
      const res = await fetch(`/api/recommendations/profile`, {
        headers,
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.data;
    } else {
      return await fetchEnvelopeUncached<UserProfileData>(
        `/recommendations/profile`,
        {
          headers,
        }
      );
    }
  } catch {
    return null;
  }
}
