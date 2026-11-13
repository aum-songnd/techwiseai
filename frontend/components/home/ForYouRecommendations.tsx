"use client";

import React, { useEffect, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import {
  getForYouRecommendations,
  type PersonalizedRecommendationData,
} from "@/lib/api/recommendation/personalized";
import AiRecommendedCard from "@/components/product/AiRecommendedCard";

interface ForYouRecommendationsProps {
  initialData?: PersonalizedRecommendationData | null;
}

export default function ForYouRecommendations({ initialData = null }: ForYouRecommendationsProps) {
  const [data, setData] = useState<PersonalizedRecommendationData | null>(initialData);
  const [loading, setLoading] = useState<boolean>(!initialData);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await getForYouRecommendations(undefined, 8, isRefresh);
      if (res && res.items && res.items.length > 0) {
        setData(res);
      }
    } catch (err) {
      console.debug("Failed to fetch for-you recommendations:", err);
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <section className="my-10 font-sans">
        <div className="flex items-center justify-between mb-6 pb-2 border-b border-neutral-200/80">
          <div className="h-7 w-64 bg-neutral-200 animate-pulse rounded-lg" />
          <div className="h-6 w-28 bg-neutral-200 animate-pulse rounded-full" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-96 rounded-2xl bg-neutral-100 border border-neutral-200/60 p-4 animate-pulse flex flex-col justify-between"
            >
              <div className="w-full h-48 bg-neutral-200 rounded-xl" />
              <div className="space-y-2">
                <div className="h-4 bg-neutral-200 rounded w-3/4" />
                <div className="h-4 bg-neutral-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!data || !data.items || data.items.length === 0) {
    return null;
  }

  return (
    <section className="my-10 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-3 border-b border-neutral-200/80">
        <div className="space-y-1">
          <h2 className="text-xl font-bold uppercase tracking-tight text-shop_dark_green">
            DÀNH RIÊNG CHO BẠN
          </h2>
          {/* <p className="text-xs text-neutral-500">
            {data.subtitle}
            {data.interactionCount > 0 && (
              <span className="ml-1 text-neutral-400 font-normal">
                (Dựa trên {data.interactionCount} tương tác gần đây)
              </span>
            )}
          </p> */}
        </div>

        <button
          type="button"
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-emerald-700 bg-neutral-50 hover:bg-emerald-50/60 border border-neutral-200/70 hover:border-emerald-200 px-3 py-1.5 rounded-lg transition-all cursor-pointer disabled:opacity-50"
          title="Làm mới đề xuất"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-emerald-600" : ""}`}
          />
          <span>Cập nhật đề xuất</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {data.items.slice(0, 8).map((item) => (
          <div
            key={`for-you-${item.product.id}`}
            className="group relative transition-all duration-300 hover:-translate-y-1"
          >
            <AiRecommendedCard item={item} />
          </div>
        ))}
      </div>
    </section>
  );
}
