import { Review, ReviewSummary } from "@/app/data/types";
import { getToken } from "./auth";

export interface ProductReviewsData {
  summary: ReviewSummary;
  reviews: {
    items: Review[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
  };
}

export interface SubmitReviewPayload {
  productName?: string;
  rating: number;
  title?: string;
  comment: string;
  userFullName?: string;
  userEmail?: string;
  userId?: string;
  userAvatarUrl?: string;
  isVerifiedPurchase?: boolean;
}

export async function fetchProductReviews(
  productId: string,
  rating?: number,
  page = 0,
  size = 10
): Promise<ProductReviewsData> {
  const query = new URLSearchParams();
  if (rating) query.set("rating", String(rating));
  query.set("page", String(page));
  query.set("size", String(size));

  const res = await fetch(`/api/products/${encodeURIComponent(productId)}/reviews?${query.toString()}`, {
    cache: "no-store",
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) {
    throw new Error(body.message || "Không thể tải đánh giá sản phẩm");
  }

  return body.data;
}

export async function submitProductReview(
  productId: string,
  payload: SubmitReviewPayload
): Promise<Review> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`/api/products/${encodeURIComponent(productId)}/reviews`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) {
    throw new Error(body.message || "Không thể gửi đánh giá");
  }

  return body.data;
}

export async function likeProductReview(reviewId: string): Promise<Review> {
  const res = await fetch(`/api/reviews/${encodeURIComponent(reviewId)}/like`, {
    method: "POST",
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) {
    throw new Error(body.message || "Không thể bình chọn hữu ích");
  }

  return body.data;
}

export interface AdminReviewsQuery {
  keyword?: string;
  status?: string;
  rating?: number;
  productId?: string;
  page?: number;
  size?: number;
}

export interface AdminReviewsResult {
  items: Review[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export async function fetchAdminReviews(
  params: AdminReviewsQuery = {}
): Promise<AdminReviewsResult> {
  const token = getToken();
  const query = new URLSearchParams();
  if (params.keyword) query.set("keyword", params.keyword);
  if (params.status) query.set("status", params.status);
  if (params.rating) query.set("rating", String(params.rating));
  if (params.productId) query.set("productId", params.productId);
  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.size !== undefined) query.set("size", String(params.size));

  const res = await fetch(`/api/admin/reviews?${query.toString()}`, {
    cache: "no-store",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) {
    throw new Error(body.message || "Không thể tải danh sách đánh giá quản trị");
  }

  return body.data;
}

export async function adminReplyToReview(
  reviewId: string,
  reply: string
): Promise<Review> {
  const token = getToken();
  const res = await fetch(`/api/admin/reviews/${encodeURIComponent(reviewId)}/reply`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ reply }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) {
    throw new Error(body.message || "Lỗi khi gửi phản hồi");
  }

  return body.data;
}

export async function adminChangeReviewStatus(
  reviewId: string,
  status: "APPROVED" | "HIDDEN"
): Promise<Review> {
  const token = getToken();
  const res = await fetch(`/api/admin/reviews/${encodeURIComponent(reviewId)}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ status }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) {
    throw new Error(body.message || "Lỗi cập nhật trạng thái");
  }

  return body.data;
}

export async function adminRemoveReview(reviewId: string): Promise<void> {
  const token = getToken();
  const res = await fetch(`/api/admin/reviews/${encodeURIComponent(reviewId)}`, {
    method: "DELETE",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) {
    throw new Error(body.message || "Lỗi xóa đánh giá");
  }
}
