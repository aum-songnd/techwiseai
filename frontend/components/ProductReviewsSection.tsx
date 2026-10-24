"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Star,
  ThumbsUp,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  PenLine,
  X,
  Sparkles,
  AlertCircle,
  Loader2,
  Filter,
  Lock,
  LogIn,
  ShoppingBag,
} from "lucide-react";
import { Review, ReviewSummary } from "@/app/data/types";
import { useAuth } from "@/context/AuthContext";
import {
  fetchProductReviews,
  submitProductReview,
  likeProductReview,
  checkReviewEligibility,
  type ProductReviewsData,
  type ReviewEligibility,
} from "@/lib/reviews-api";

interface ProductReviewsSectionProps {
  productId: string;
  productName: string;
  initialSummary?: {
    ratingAverage?: number;
    reviewCount?: number;
  };
}

const STAR_LABELS: Record<number, string> = {
  1: "Rất không hài lòng",
  2: "Không hài lòng",
  3: "Bình thường",
  4: "Hài lòng",
  5: "Cực kỳ tuyệt vời",
};

const QUICK_TAGS = [
  "Giao hàng nhanh 🚀",
  "Đóng gói cẩn thận 📦",
  "Chất lượng tuyệt vời ✨",
  "Đúng như mô tả 💯",
  "Đáng giá tiền 💰",
  "Tư vấn nhiệt tình 💬",
];

const formatRelativeTime = (isoString?: string) => {
  if (!isoString) return "";
  try {
    const diff = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Vừa xong";
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} ngày trước`;
    return new Date(isoString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "";
  }
};

const ProductReviewsSection = ({
  productId,
  productName,
  initialSummary,
}: ProductReviewsSectionProps) => {
  const { user, isSignedIn } = useAuth();

  const [reviewsData, setReviewsData] = useState<ProductReviewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRatingFilter, setSelectedRatingFilter] = useState<number | undefined>(undefined);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});

  // Review Eligibility State
  const [eligibility, setEligibility] = useState<ReviewEligibility | null>(null);
  const [checkingEligibility, setCheckingEligibility] = useState<boolean>(true);

  // Review Form Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ratingInput, setRatingInput] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [titleInput, setTitleInput] = useState("");
  const [commentInput, setCommentInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Load reviews
  const loadReviews = useCallback(
    async (rating?: number) => {
      setLoading(true);
      try {
        const data = await fetchProductReviews(productId, rating);
        setReviewsData(data);
      } catch (err) {
        console.error("Lỗi tải đánh giá:", err);
      } finally {
        setLoading(false);
      }
    },
    [productId]
  );

  useEffect(() => {
    loadReviews(selectedRatingFilter);
  }, [loadReviews, selectedRatingFilter]);

  // Load eligibility
  const loadEligibility = useCallback(async () => {
    if (!productId) return;
    setCheckingEligibility(true);
    try {
      const data = await checkReviewEligibility(productId);
      setEligibility(data);
    } catch (err) {
      console.error("Lỗi kiểm tra quyền đánh giá:", err);
    } finally {
      setCheckingEligibility(false);
    }
  }, [productId, isSignedIn]);

  useEffect(() => {
    loadEligibility();
  }, [loadEligibility]);

  // Set user profile to input if available
  useEffect(() => {
    if (user) {
      if (user.fullName) setNameInput(user.fullName);
      else if (user.username) setNameInput(user.username);
      if (user.email) setEmailInput(user.email);
    }
  }, [user]);

  // Handle Like
  const handleLike = async (reviewId: string) => {
    if (likedMap[reviewId]) return;
    setLikedMap((prev) => ({ ...prev, [reviewId]: true }));

    // Optimistic UI update
    setReviewsData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        reviews: {
          ...prev.reviews,
          items: prev.reviews.items.map((r) =>
            r.id === reviewId ? { ...r, likesCount: (r.likesCount || 0) + 1 } : r
          ),
        },
      };
    });

    try {
      await likeProductReview(reviewId);
    } catch {
      // Revert if failed
      setLikedMap((prev) => {
        const copy = { ...prev };
        delete copy[reviewId];
        return copy;
      });
      setReviewsData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          reviews: {
            ...prev.reviews,
            items: prev.reviews.items.map((r) =>
              r.id === reviewId ? { ...r, likesCount: Math.max(0, (r.likesCount || 0) - 1) } : r
            ),
          },
        };
      });
    }
  };

  // Add quick tag to comment
  const handleAddQuickTag = (tag: string) => {
    const textWithoutEmoji = tag.split(" ")[0] || tag;
    setCommentInput((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return tag;
      if (trimmed.includes(textWithoutEmoji)) return prev;
      return `${trimmed}. ${tag}`;
    });
  };

  // Submit Review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!isSignedIn) {
      setFormError("Vui lòng đăng nhập để đánh giá sản phẩm.");
      return;
    }

    if (eligibility && !eligibility.hasPurchased) {
      setFormError("Chỉ khách hàng đã mua sản phẩm này mới có thể gửi đánh giá.");
      return;
    }

    const displayName = nameInput.trim() || user?.fullName || user?.username || "Khách hàng";
    const comment = commentInput.trim();

    if (!comment || comment.length < 5) {
      setFormError("Vui lòng nhập nhận xét chi tiết ít nhất 5 ký tự.");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitProductReview(productId, {
        productName,
        rating: ratingInput,
        title: titleInput.trim() || undefined,
        comment,
        userFullName: displayName,
        userEmail: emailInput.trim() || user?.email || undefined,
        userId: user?.id,
        userAvatarUrl: user?.avatarUrl,
        isVerifiedPurchase: true,
      });

      setSubmitSuccess(true);
      setTimeout(() => {
        setIsModalOpen(false);
        setSubmitSuccess(false);
        setTitleInput("");
        setCommentInput("");
        loadReviews(selectedRatingFilter);
        loadEligibility();
      }, 1400);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đăng đánh giá thất bại";
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculations
  const summary: ReviewSummary = useMemo(() => {
    if (reviewsData?.summary) return reviewsData.summary;
    return {
      averageRating: initialSummary?.ratingAverage || 0,
      totalReviews: initialSummary?.reviewCount || 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }, [reviewsData, initialSummary]);

  const reviewsList = reviewsData?.reviews?.items ?? [];

  return (
    <section id="reviews" className="mt-14 border-t border-neutral-200 pt-10 scroll-mt-20">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-neutral-900">
              Đánh giá & Bình luận
            </h2>
            <span className="font-mono text-xs px-2 py-0.5 bg-neutral-100 text-neutral-600 font-bold border border-neutral-200">
              {summary.totalReviews}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Khách hàng chia sẻ trải nghiệm thực tế về{" "}
            <span className="font-semibold text-neutral-800">{productName}</span>
          </p>
        </div>

        <div>
          {!isSignedIn ? (
            <Link
              href={`/sign-in?redirect=/product/${encodeURIComponent(productId)}#reviews`}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-neutral-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition-all shadow-sm shrink-0"
            >
              <LogIn className="w-4 h-4 text-emerald-400" />
              <span>Đăng nhập để đánh giá</span>
            </Link>
          ) : checkingEligibility ? (
            <div className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-100 text-neutral-500 text-xs font-semibold uppercase tracking-wider border border-neutral-200">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-shop_dark_green" />
              <span>Kiểm tra quyền...</span>
            </div>
          ) : eligibility?.alreadyReviewed ? (
            <div className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold tracking-wider">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Bạn đã gửi đánh giá</span>
            </div>
          ) : !eligibility?.hasPurchased ? (
            <button
              type="button"
              onClick={() => {
                alert("Chỉ khách hàng đã mua sản phẩm này tại Techwise AI mới có thể gửi đánh giá & bình luận.");
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-100 border border-neutral-300 text-neutral-500 text-xs font-bold uppercase tracking-wider cursor-not-allowed transition-all"
              title="Bạn cần mua sản phẩm này để có thể đánh giá"
            >
              <Lock className="w-3.5 h-3.5 text-neutral-400" />
              <span>Chưa mua sản phẩm</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-shop_dark_green text-white text-xs font-bold uppercase tracking-wider hover:bg-shop_dark_green/90 transition-all shadow-sm shrink-0 hover:shadow"
            >
              <PenLine className="w-4 h-4" />
              <span>Viết đánh giá & bình luận</span>
            </button>
          )}
        </div>
      </div>

      {/* Buyer verification info note */}
      {isSignedIn && !checkingEligibility && eligibility && !eligibility.hasPurchased && (
        <div className="mb-6 p-4 bg-amber-50/90 border border-amber-200 text-amber-900 rounded-sm flex items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start sm:items-center gap-2.5">
            <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            <p>
              <strong className="font-bold">Chỉ khách hàng đã mua sản phẩm mới được đánh giá:</strong> Bạn chưa có đơn hàng cho sản phẩm này. Hãy đặt mua để trải nghiệm và để lại nhận xét chân thực nhé!
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              const buyBtn = document.querySelector("#add-to-cart-section") || document.querySelector("button[type='submit']");
              if (buyBtn) buyBtn.scrollIntoView({ behavior: "smooth" });
            }}
            className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-amber-800 underline hover:text-amber-900 shrink-0"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Mua ngay</span>
          </button>
        </div>
      )}

      {!isSignedIn && (
        <div className="mb-6 p-3.5 bg-neutral-50 border border-neutral-200 text-neutral-600 rounded-sm flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-shop_dark_green shrink-0" />
            <p>
              <strong className="text-neutral-800">Đánh giá xác thực:</strong> Tất cả đánh giá đều đến từ khách hàng đã mua sản phẩm thực tế tại Techwise AI.
            </p>
          </div>
          <Link
            href={`/sign-in?redirect=/product/${encodeURIComponent(productId)}#reviews`}
            className="text-xs font-bold text-shop_dark_green hover:underline shrink-0"
          >
            Đăng nhập
          </Link>
        </div>
      )}

      {/* Overview Score Card */}
      <div className="border border-neutral-200 bg-neutral-50/70 p-6 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-8 items-center mb-8">
        {/* Left: Big Score */}
        <div className="md:col-span-4 flex flex-col items-center justify-center text-center md:border-r md:border-neutral-200 pr-0 md:pr-6">
          <span className="text-5xl sm:text-6xl font-black text-neutral-900 tracking-tight">
            {summary.averageRating > 0 ? summary.averageRating.toFixed(1) : "0.0"}
          </span>
          <div className="flex items-center gap-1 mt-2 text-amber-400">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-5 h-5 ${
                  star <= Math.round(summary.averageRating)
                    ? "fill-amber-400 text-amber-400"
                    : "fill-neutral-200 text-neutral-200"
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-neutral-500 mt-2 font-medium">
            {summary.totalReviews > 0
              ? `Dựa trên ${summary.totalReviews} đánh giá thực tế`
              : "Chưa có đánh giá nào"}
          </p>
        </div>

        {/* Right: Star breakdown progress bars */}
        <div className="md:col-span-8 flex flex-col gap-2.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = summary.ratingDistribution[star] || 0;
            const percent =
              summary.totalReviews > 0
                ? Math.round((count / summary.totalReviews) * 100)
                : 0;

            const isSelected = selectedRatingFilter === star;

            return (
              <button
                key={star}
                type="button"
                onClick={() =>
                  setSelectedRatingFilter((prev) => (prev === star ? undefined : star))
                }
                className={`w-full flex items-center gap-3 text-left py-1 px-2 rounded transition-colors group ${
                  isSelected ? "bg-amber-50/80" : "hover:bg-neutral-100/60"
                }`}
                title={`Lọc đánh giá ${star} sao (${count})`}
              >
                <div className="flex items-center gap-1 w-14 shrink-0 text-xs font-semibold text-neutral-700">
                  <span>{star}</span>
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                </div>

                <div className="flex-1 h-2.5 bg-neutral-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      star >= 4
                        ? "bg-amber-400 group-hover:bg-amber-500"
                        : star === 3
                        ? "bg-amber-300 group-hover:bg-amber-400"
                        : "bg-neutral-400 group-hover:bg-neutral-500"
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>

                <span className="w-12 text-right text-xs font-mono text-neutral-500 shrink-0">
                  {count} ({percent}%)
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 pb-4 mb-6">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-700 mr-2">
          <Filter className="w-3.5 h-3.5 text-shop_dark_green" />
          <span>Lọc theo:</span>
        </div>

        <button
          type="button"
          onClick={() => setSelectedRatingFilter(undefined)}
          className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all border ${
            selectedRatingFilter === undefined
              ? "bg-shop_dark_green text-white border-shop_dark_green shadow-sm"
              : "bg-white text-neutral-700 border-neutral-300 hover:border-neutral-400"
          }`}
        >
          Tất cả ({summary.totalReviews})
        </button>

        {[5, 4, 3, 2, 1].map((star) => {
          const count = summary.ratingDistribution[star] || 0;
          const active = selectedRatingFilter === star;

          return (
            <button
              key={star}
              type="button"
              onClick={() =>
                setSelectedRatingFilter((prev) => (prev === star ? undefined : star))
              }
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold tracking-wider transition-all border ${
                active
                  ? "bg-shop_dark_green text-white border-shop_dark_green shadow-sm"
                  : "bg-white text-neutral-700 border-neutral-300 hover:border-neutral-400"
              }`}
            >
              <span>{star}</span>
              <Star className={`w-3 h-3 ${active ? "fill-white text-white" : "fill-amber-400 text-amber-400"}`} />
              <span className="font-mono text-[11px] opacity-80">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-neutral-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-shop_dark_green" />
            <span className="text-xs uppercase tracking-wider">Đang tải đánh giá...</span>
          </div>
        ) : reviewsList.length === 0 ? (
          <div className="border border-dashed border-neutral-300 p-10 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400 mb-3">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-800">
              {selectedRatingFilter
                ? `Không có đánh giá ${selectedRatingFilter} sao nào`
                : "Chưa có đánh giá nào cho sản phẩm này"}
            </h3>
            <p className="text-xs text-neutral-500 mt-1 max-w-md">
              Hãy là người đầu tiên trải nghiệm và để lại đánh giá để giúp những người mua khác có lựa chọn tốt nhất!
            </p>
            {!isSignedIn ? (
              <Link
                href={`/sign-in?redirect=/product/${encodeURIComponent(productId)}#reviews`}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors"
              >
                <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                <span>Đăng nhập để đánh giá</span>
              </Link>
            ) : eligibility?.alreadyReviewed ? (
              <div className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Bạn đã gửi đánh giá cho sản phẩm này</span>
              </div>
            ) : !eligibility?.hasPurchased ? (
              <div className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-100 border border-neutral-300 text-neutral-500 text-xs font-semibold">
                <Lock className="w-3.5 h-3.5 text-neutral-400" />
                <span>Chỉ khách hàng đã mua sản phẩm mới có thể đánh giá</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="mt-4 px-4 py-2 bg-shop_dark_green text-white text-xs font-bold uppercase tracking-wider hover:bg-shop_dark_green/90 transition-colors"
              >
                Viết đánh giá ngay
              </button>
            )}
          </div>
        ) : (
          reviewsList.map((review) => {
            const isLiked = likedMap[review.id];

            return (
              <article
                key={review.id}
                className="border border-neutral-200 bg-white p-5 sm:p-6 transition-all hover:border-neutral-300 space-y-3"
              >
                {/* Header User + Rating */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {/* User Avatar */}
                    <div className="w-9 h-9 rounded-full bg-shop_dark_green/10 text-shop_dark_green border border-shop_dark_green/20 flex items-center justify-center font-bold text-sm overflow-hidden shrink-0">
                      {review.userAvatarUrl ? (
                        <img
                          src={review.userAvatarUrl}
                          alt={review.userFullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        review.userFullName.charAt(0).toUpperCase()
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-neutral-900">
                          {review.userFullName}
                        </span>
                        {review.isVerifiedPurchase && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Đã mua hàng
                          </span>
                        )}
                      </div>

                      {/* Stars */}
                      <div className="flex items-center gap-1 mt-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${
                              s <= review.rating
                                ? "fill-amber-400 text-amber-400"
                                : "fill-neutral-200 text-neutral-200"
                            }`}
                          />
                        ))}
                        <span className="ml-1 text-[11px] font-medium text-neutral-500">
                          {STAR_LABELS[review.rating]}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className="font-mono text-[11px] text-neutral-400">
                    {formatRelativeTime(review.createdAt)}
                  </span>
                </div>

                {/* Review Title */}
                {review.title && (
                  <h4 className="text-sm font-bold text-neutral-900 pt-1">
                    {review.title}
                  </h4>
                )}

                {/* Comment Body */}
                <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed whitespace-pre-line">
                  {review.comment}
                </p>

                {/* Admin/Shop Reply Box */}
                {review.adminReply && (
                  <div className="mt-3 bg-neutral-50 border-l-2 border-shop_dark_green p-3.5 sm:p-4 text-xs space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-shop_dark_green font-bold uppercase tracking-wider text-[11px]">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Phản hồi từ Techwise AI</span>
                      </div>
                      {review.adminReplyAt && (
                        <span className="font-mono text-[10px] text-neutral-400">
                          {formatRelativeTime(review.adminReplyAt)}
                        </span>
                      )}
                    </div>
                    <p className="text-neutral-700 leading-relaxed">
                      {review.adminReply}
                    </p>
                  </div>
                )}

                {/* Footer Actions (Like) */}
                <div className="flex items-center justify-between border-t border-neutral-100 pt-3 text-xs">
                  <button
                    type="button"
                    onClick={() => handleLike(review.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      isLiked
                        ? "text-shop_dark_green bg-emerald-50 border border-emerald-200 font-bold"
                        : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 border border-transparent"
                    }`}
                    title="Đánh giá nhận xét này hữu ích"
                  >
                    <ThumbsUp
                      className={`w-3.5 h-3.5 ${
                        isLiked ? "fill-shop_dark_green text-shop_dark_green" : ""
                      }`}
                    />
                    <span>
                      Hữu ích {review.likesCount ? `(${review.likesCount})` : ""}
                    </span>
                  </button>

                  <span className="text-[11px] text-neutral-400 font-mono">
                    Mã: {review.id.slice(0, 12)}
                  </span>
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* Review Submission Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150"
          onClick={() => !isSubmitting && setIsModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white border border-neutral-300 shadow-2xl p-6 sm:p-7 relative max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
              className="absolute top-5 right-5 p-1 text-neutral-400 hover:text-neutral-700 transition-colors"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="border-b border-neutral-200 pb-4 mb-5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-shop_dark_green bg-emerald-50 px-2 py-0.5 border border-emerald-200">
                Nhận xét sản phẩm
              </span>
              <h3 className="text-lg font-bold uppercase tracking-tight text-neutral-900 mt-2">
                Đánh giá & Bình luận
              </h3>
              <p className="text-xs text-neutral-600 line-clamp-1 mt-0.5">
                {productName}
              </p>
            </div>

            {submitSuccess ? (
              <div className="py-10 text-center space-y-3">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-neutral-900">
                  Cảm ơn bạn đã gửi đánh giá!
                </h4>
                <p className="text-xs text-neutral-500">
                  Ý kiến của bạn giúp cộng đồng Techwise AI có trải nghiệm mua sắm tốt hơn.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-4 text-xs">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 flex items-start gap-2 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Star Picker */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">
                    Mức độ hài lòng của bạn: <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isFilled =
                        star <= (hoverRating > 0 ? hoverRating : ratingInput);

                      return (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setRatingInput(star)}
                          className="p-1 text-amber-400 focus:outline-none transition-transform hover:scale-110"
                          aria-label={`${star} sao`}
                        >
                          <Star
                            className={`w-7 h-7 ${
                              isFilled
                                ? "fill-amber-400 text-amber-400"
                                : "fill-neutral-200 text-neutral-200"
                            }`}
                          />
                        </button>
                      );
                    })}
                    <span className="ml-3 font-semibold text-xs text-neutral-800">
                      {STAR_LABELS[hoverRating > 0 ? hoverRating : ratingInput]}
                    </span>
                  </div>
                </div>

                {/* Quick Tags */}
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-500 mb-1.5 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>Gợi ý nhận xét nhanh:</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_TAGS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleAddQuickTag(tag)}
                        className="px-2.5 py-1 text-[11px] bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-neutral-700 rounded transition-colors"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Tiêu đề (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    placeholder="Tóm tắt nhận xét của bạn (ví dụ: Rất ưng ý, máy mượt)"
                    maxLength={100}
                    className="w-full px-3 py-2 border border-neutral-300 text-xs focus:border-shop_dark_green focus:outline-none"
                  />
                </div>

                {/* Comment Textarea */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                      Nội dung nhận xét: <span className="text-red-500">*</span>
                    </label>
                    <span className="font-mono text-[10px] text-neutral-400">
                      {commentInput.length}/2000
                    </span>
                  </div>
                  <textarea
                    required
                    rows={4}
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    placeholder="Hãy chia sẻ cảm nhận về thiết kế, hiệu năng, đóng gói, giao hàng..."
                    maxLength={2000}
                    className="w-full px-3 py-2 border border-neutral-300 text-xs focus:border-shop_dark_green focus:outline-none leading-relaxed"
                  />
                </div>

                {/* User info */}
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-shop_dark_green/10 text-shop_dark_green border border-shop_dark_green/20 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                      {user?.avatarUrl ? (
                        <img src={user.avatarUrl} alt={nameInput || "User"} className="w-full h-full object-cover" />
                      ) : (
                        (nameInput || user?.fullName || user?.username || "K").charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-neutral-900 text-xs">
                        <span>{nameInput || user?.fullName || user?.username}</span>
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 bg-white border border-emerald-300 px-1.5 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Đã mua hàng
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 font-mono">
                        {user?.email || emailInput}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded">
                    Xác thực chính hãng
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-200">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    disabled={isSubmitting}
                    className="px-4 py-2 border border-neutral-300 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1.5 px-5 py-2 bg-shop_dark_green text-white text-xs font-bold uppercase tracking-wider hover:bg-shop_dark_green/90 transition-colors shadow-sm disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang gửi...</span>
                      </>
                    ) : (
                      <span>Gửi đánh giá</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default ProductReviewsSection;
