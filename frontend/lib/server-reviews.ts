import fs from "fs";
import path from "path";
import type { Review, ReviewSummary } from "@/app/data/types";

const CACHE_FILE = path.join(process.cwd(), ".reviews-cache.json");

let memoryReviews: Review[] = [];

export function readServerReviews(): Review[] {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, "utf-8");
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        memoryReviews = list;
        return list;
      }
    }
  } catch {}
  return memoryReviews;
}

export function saveServerReviews(reviews: Review[]): void {
  memoryReviews = reviews;
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(reviews, null, 2), "utf-8");
  } catch {}
}

const normalizeId = (id: string) => id.trim().toLowerCase();

export function getReviewsForProduct(
  productIdOrSlug: string,
  ratingFilter?: number
): { summary: ReviewSummary; reviews: Review[] } {
  const all = readServerReviews();
  const target = normalizeId(productIdOrSlug);

  // Match reviews by productId or slug
  const matched = all.filter(
    (r) =>
      (normalizeId(r.productId) === target ||
        (r.productName && normalizeId(r.productName).includes(target)) ||
        target.includes(normalizeId(r.productId))) &&
      r.status !== "HIDDEN"
  );

  const totalReviews = matched.length;
  const ratingDistribution: Record<number, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  let sumRating = 0;
  for (const r of matched) {
    const star = Math.max(1, Math.min(5, Math.round(r.rating || 5)));
    ratingDistribution[star] = (ratingDistribution[star] || 0) + 1;
    sumRating += star;
  }

  const averageRating =
    totalReviews > 0 ? Math.round((sumRating / totalReviews) * 10) / 10 : 0;

  const filtered =
    ratingFilter && ratingFilter >= 1 && ratingFilter <= 5
      ? matched.filter((r) => Math.round(r.rating) === ratingFilter)
      : matched;

  // Sort newest first
  filtered.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return {
    summary: {
      averageRating,
      totalReviews,
      ratingDistribution,
    },
    reviews: filtered,
  };
}

export function addReviewToProduct(
  productId: string,
  reviewInput: {
    productName?: string;
    userId?: string;
    userFullName: string;
    userAvatarUrl?: string;
    rating: number;
    title?: string;
    comment: string;
    isVerifiedPurchase?: boolean;
  }
): Review {
  const all = readServerReviews();

  const newReview: Review = {
    id: `rev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    productId: productId,
    productName: reviewInput.productName || "Sản phẩm Techwise AI",
    userId: reviewInput.userId,
    userFullName: reviewInput.userFullName.trim() || "Khách hàng Techwise",
    userAvatarUrl: reviewInput.userAvatarUrl || "",
    rating: Math.max(1, Math.min(5, Number(reviewInput.rating) || 5)),
    title: reviewInput.title?.trim() || "",
    comment: reviewInput.comment.trim(),
    isVerifiedPurchase: !!reviewInput.isVerifiedPurchase,
    likesCount: 0,
    status: "APPROVED",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  all.unshift(newReview);
  saveServerReviews(all);

  return newReview;
}

export function likeServerReview(reviewId: string): Review | null {
  const all = readServerReviews();
  const idx = all.findIndex((r) => r.id === reviewId);
  if (idx === -1) return null;

  all[idx] = {
    ...all[idx],
    likesCount: (all[idx].likesCount || 0) + 1,
    updatedAt: new Date().toISOString(),
  };

  saveServerReviews(all);
  return all[idx];
}

export function deleteServerReview(reviewId: string): boolean {
  const all = readServerReviews();
  const next = all.filter((r) => r.id !== reviewId);
  if (next.length === all.length) return false;
  saveServerReviews(next);
  return true;
}

export function replyServerReview(reviewId: string, reply: string): Review | null {
  const all = readServerReviews();
  const idx = all.findIndex((r) => r.id === reviewId);
  if (idx === -1) return null;

  all[idx] = {
    ...all[idx],
    adminReply: reply.trim(),
    adminReplyAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  saveServerReviews(all);
  return all[idx];
}

export function updateServerReviewStatus(
  reviewId: string,
  status: "APPROVED" | "HIDDEN"
): Review | null {
  const all = readServerReviews();
  const idx = all.findIndex((r) => r.id === reviewId);
  if (idx === -1) return null;

  all[idx] = {
    ...all[idx],
    status,
    updatedAt: new Date().toISOString(),
  };

  saveServerReviews(all);
  return all[idx];
}

export function searchAllServerReviews(params: {
  keyword?: string;
  status?: string;
  rating?: number;
  productId?: string;
  page?: number;
  size?: number;
}): { items: Review[]; totalElements: number; totalPages: number; page: number; size: number } {
  let list = readServerReviews();

  if (params.productId) {
    const pid = normalizeId(params.productId);
    list = list.filter((r) => normalizeId(r.productId) === pid);
  }

  if (params.status && params.status !== "ALL") {
    list = list.filter((r) => r.status === params.status);
  }

  if (params.rating && params.rating >= 1 && params.rating <= 5) {
    list = list.filter((r) => Math.round(r.rating) === params.rating);
  }

  if (params.keyword && params.keyword.trim()) {
    const kw = params.keyword.trim().toLowerCase();
    list = list.filter(
      (r) =>
        r.userFullName.toLowerCase().includes(kw) ||
        r.comment.toLowerCase().includes(kw) ||
        (r.title && r.title.toLowerCase().includes(kw)) ||
        (r.productName && r.productName.toLowerCase().includes(kw))
    );
  }

  // Sort by createdAt desc
  list.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const page = Math.max(0, params.page || 0);
  const size = Math.max(1, params.size || 15);
  const totalElements = list.length;
  const totalPages = Math.ceil(totalElements / size);
  const items = list.slice(page * size, (page + 1) * size);

  return { items, totalElements, totalPages, page, size };
}
