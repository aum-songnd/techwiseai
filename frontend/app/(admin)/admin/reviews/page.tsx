"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Star,
  Search,
  MessageSquare,
  Trash2,
  Reply,
  ShieldCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  X,
  Loader2,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { Review } from "@/app/data/types";
import {
  fetchAdminReviews,
  adminReplyToReview,
  adminChangeReviewStatus,
  adminRemoveReview,
} from "@/lib/reviews-api";

const formatDateTime = (isoString?: string) => {
  if (!isoString) return "";
  try {
    return new Date(isoString).toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "";
  }
};

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedRating, setSelectedRating] = useState<number | undefined>(undefined);

  // Reply Modal State
  const [replyTarget, setReplyTarget] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  // Load reviews
  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAdminReviews({
        keyword: keyword.trim() || undefined,
        status: selectedStatus,
        rating: selectedRating,
        page: 0,
        size: 100,
      });
      setReviews(data.items || []);
    } catch (err) {
      console.error("Lỗi tải đánh giá admin:", err);
    } finally {
      setLoading(false);
    }
  }, [keyword, selectedStatus, selectedRating]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  // Metric stats
  const metrics = useMemo(() => {
    const total = reviews.length;
    let sum = 0;
    let fiveStar = 0;
    let unreplied = 0;

    for (const r of reviews) {
      sum += r.rating || 5;
      if (r.rating === 5) fiveStar++;
      if (!r.adminReply) unreplied++;
    }

    const avg = total > 0 ? (sum / total).toFixed(1) : "0.0";
    return { total, avg, fiveStar, unreplied };
  }, [reviews]);

  // Reply action
  const handleOpenReply = (rev: Review) => {
    setReplyTarget(rev);
    setReplyText(rev.adminReply || "");
  };

  const handleSendReply = async () => {
    if (!replyTarget || !replyText.trim()) return;
    setSubmittingReply(true);
    try {
      const updated = await adminReplyToReview(replyTarget.id, replyText);
      setReviews((prev) =>
        prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r))
      );
      setReplyTarget(null);
      setReplyText("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gửi phản hồi thất bại";
      alert(msg);
    } finally {
      setSubmittingReply(false);
    }
  };

  // Toggle status action
  const handleToggleStatus = async (rev: Review) => {
    const nextStatus: "APPROVED" | "HIDDEN" =
      rev.status === "APPROVED" ? "HIDDEN" : "APPROVED";
    try {
      const updated = await adminChangeReviewStatus(rev.id, nextStatus);
      setReviews((prev) =>
        prev.map((r) => (r.id === updated.id ? { ...r, status: nextStatus } : r))
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Cập nhật trạng thái thất bại";
      alert(msg);
    }
  };

  // Delete review
  const handleDeleteReview = async (rev: Review) => {
    if (
      !confirm(
        `Bạn có chắc chắn muốn xóa đánh giá của "${rev.userFullName}" không?`
      )
    ) {
      return;
    }

    try {
      await adminRemoveReview(rev.id);
      setReviews((prev) => prev.filter((r) => r.id !== rev.id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Xóa đánh giá thất bại";
      alert(msg);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border border-neutral-200 bg-white p-4 space-y-1">
          <p className="text-[11px] font-mono font-semibold uppercase tracking-wider text-neutral-400">
            Tổng đánh giá
          </p>
          <p className="text-2xl font-bold font-mono text-neutral-900">
            {metrics.total}
          </p>
        </div>

        <div className="border border-neutral-200 bg-white p-4 space-y-1">
          <p className="text-[11px] font-mono font-semibold uppercase tracking-wider text-neutral-400">
            Điểm trung bình
          </p>
          <div className="flex items-center gap-1.5">
            <span className="text-2xl font-bold font-mono text-neutral-900">
              {metrics.avg}
            </span>
            <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
          </div>
        </div>

        <div className="border border-neutral-200 bg-white p-4 space-y-1">
          <p className="text-[11px] font-mono font-semibold uppercase tracking-wider text-neutral-400">
            Đánh giá 5 sao
          </p>
          <p className="text-2xl font-bold font-mono text-emerald-600">
            {metrics.fiveStar}{" "}
            <span className="text-xs text-neutral-400 font-normal">
              ({metrics.total > 0 ? Math.round((metrics.fiveStar / metrics.total) * 100) : 0}%)
            </span>
          </p>
        </div>

        <div className="border border-neutral-200 bg-white p-4 space-y-1">
          <p className="text-[11px] font-mono font-semibold uppercase tracking-wider text-neutral-400">
            Chưa phản hồi
          </p>
          <p className="text-2xl font-bold font-mono text-amber-600">
            {metrics.unreplied}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="border border-neutral-200 bg-white p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Keyword Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm theo tên khách, sản phẩm, nội dung..."
              className="w-full pl-9 pr-3 py-2 border border-neutral-300 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-shop_dark_green focus:outline-none"
            />
          </div>

          {/* Quick Rating Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedRating(undefined)}
              className={`px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider border transition-colors ${
                selectedRating === undefined
                  ? "bg-shop_dark_green text-white border-shop_dark_green"
                  : "bg-white text-neutral-600 border-neutral-300 hover:border-neutral-400"
              }`}
            >
              Tất cả sao
            </button>
            {[5, 4, 3, 2, 1].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSelectedRating((prev) => (prev === s ? undefined : s))}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold border transition-colors ${
                  selectedRating === s
                    ? "bg-shop_dark_green text-white border-shop_dark_green"
                    : "bg-white text-neutral-600 border-neutral-300 hover:border-neutral-400"
                }`}
              >
                <span>{s}</span>
                <Star
                  className={`w-3 h-3 ${
                    selectedRating === s ? "fill-white text-white" : "fill-amber-400 text-amber-400"
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 border border-neutral-300 text-xs font-medium text-neutral-700 focus:border-shop_dark_green focus:outline-none bg-white"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="APPROVED">Đang hiển thị (Approved)</option>
            <option value="HIDDEN">Đã ẩn (Hidden)</option>
          </select>
        </div>
      </div>

      {/* Reviews Table */}
      <div className="border border-neutral-200 bg-white overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-neutral-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-shop_dark_green" />
            <span className="text-xs uppercase tracking-wider">Đang tải danh sách đánh giá...</span>
          </div>
        ) : reviews.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <MessageSquare className="w-8 h-8 text-neutral-300 mx-auto" />
            <p className="text-sm font-bold uppercase tracking-wider text-neutral-600">
              Không tìm thấy đánh giá nào
            </p>
            <p className="text-xs text-neutral-400">
              Thử thay đổi từ khóa tìm kiếm hoặc điều kiện lọc.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50/70 font-mono text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                  <th className="px-4 py-3">Sản phẩm</th>
                  <th className="px-4 py-3">Khách hàng</th>
                  <th className="px-4 py-3">Đánh giá</th>
                  <th className="px-4 py-3 min-w-[280px]">Nội dung nhận xét & Phản hồi</th>
                  <th className="px-4 py-3">Thời gian</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {reviews.map((rev) => (
                  <tr key={rev.id} className="hover:bg-neutral-50/50 transition-colors">
                    {/* Product */}
                    <td className="px-4 py-3 align-top font-medium text-neutral-900 max-w-[180px]">
                      <div className="space-y-0.5">
                        <Link
                          href={`/product/${rev.productId}`}
                          target="_blank"
                          className="font-bold text-xs hover:text-shop_dark_green transition-colors inline-flex items-center gap-1 line-clamp-2"
                          title="Xem sản phẩm ngoài trang chủ"
                        >
                          <span>{rev.productName || "Sản phẩm"}</span>
                          <ExternalLink className="w-3 h-3 text-neutral-400 shrink-0" />
                        </Link>
                        <span className="font-mono text-[10px] text-neutral-400 block truncate">
                          ID: {rev.productId}
                        </span>
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="px-4 py-3 align-top">
                      <div className="space-y-1">
                        <div className="font-bold text-neutral-900">
                          {rev.userFullName}
                        </div>
                        {rev.isVerifiedPurchase && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 py-0.2 rounded">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                            Đã mua
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Rating */}
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3 h-3 ${
                              s <= rev.rating
                                ? "fill-amber-400 text-amber-400"
                                : "fill-neutral-200 text-neutral-200"
                            }`}
                          />
                        ))}
                        <span className="font-mono font-bold text-neutral-700 ml-1">
                          {rev.rating}★
                        </span>
                      </div>
                    </td>

                    {/* Comment & Reply */}
                    <td className="px-4 py-3 align-top space-y-2">
                      {rev.title && (
                        <p className="font-bold text-neutral-900 text-xs">
                          {rev.title}
                        </p>
                      )}
                      <p className="text-neutral-700 leading-relaxed whitespace-pre-line text-xs">
                        {rev.comment}
                      </p>

                      {rev.adminReply ? (
                        <div className="bg-emerald-50/70 border border-emerald-200 p-2.5 rounded text-[11px] space-y-1">
                          <div className="flex items-center gap-1 text-shop_dark_green font-bold">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Techwise AI đã phản hồi:</span>
                          </div>
                          <p className="text-neutral-700 italic leading-relaxed">
                            {rev.adminReply}
                          </p>
                        </div>
                      ) : (
                        <span className="inline-block text-[10px] text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 border border-amber-200">
                          Chưa phản hồi
                        </span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 align-top font-mono text-[11px] text-neutral-500 whitespace-nowrap">
                      {formatDateTime(rev.createdAt)}
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3 align-top">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(rev)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded transition-colors ${
                          rev.status === "APPROVED"
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                            : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                        }`}
                        title="Click để thay đổi hiển thị"
                      >
                        {rev.status === "APPROVED" ? (
                          <>
                            <Eye className="w-3 h-3 text-emerald-600" />
                            <span>Hiển thị</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3 text-neutral-400" />
                            <span>Đã ẩn</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 align-top text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenReply(rev)}
                          className="p-1.5 text-neutral-600 hover:text-shop_dark_green hover:bg-neutral-100 transition-colors"
                          title="Phản hồi khách hàng"
                        >
                          <Reply className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteReview(rev)}
                          className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Xóa đánh giá"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reply Modal */}
      {replyTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150"
          onClick={() => !submittingReply && setReplyTarget(null)}
        >
          <div
            className="w-full max-w-lg bg-white border border-neutral-300 shadow-2xl p-6 relative space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setReplyTarget(null)}
              disabled={submittingReply}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-shop_dark_green bg-emerald-50 px-2 py-0.5 border border-emerald-200">
                Phản hồi khách hàng
              </span>
              <h3 className="text-base font-bold uppercase tracking-tight text-neutral-900 mt-2">
                Trả lời đánh giá của {replyTarget.userFullName}
              </h3>
              <p className="text-xs text-neutral-500 mt-1 line-clamp-1">
                Sản phẩm: {replyTarget.productName}
              </p>
            </div>

            {/* Target comment preview */}
            <div className="bg-neutral-50 border border-neutral-200 p-3 text-xs text-neutral-700 space-y-1">
              <div className="flex items-center gap-1 text-amber-500 font-bold">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-3 h-3 ${
                      s <= replyTarget.rating
                        ? "fill-amber-400 text-amber-400"
                        : "fill-neutral-200 text-neutral-200"
                    }`}
                  />
                ))}
                <span className="ml-1 text-[11px] text-neutral-700 font-mono">
                  {replyTarget.rating}/5 sao
                </span>
              </div>
              <p className="italic">&quot;{replyTarget.comment}&quot;</p>
            </div>

            {/* Textarea */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                Nội dung phản hồi đại diện Techwise AI:
              </label>
              <textarea
                rows={4}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Ví dụ: Cảm ơn bạn đã tin tưởng Techwise AI! Chúng mình rất vui vì sản phẩm đáp ứng tốt nhu cầu của bạn..."
                className="w-full px-3 py-2 border border-neutral-300 text-xs focus:border-shop_dark_green focus:outline-none leading-relaxed"
              />
            </div>

            {/* Quick response templates */}
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Mẫu trả lời nhanh:
              </span>
              <div className="flex flex-wrap gap-1">
                {[
                  "Cảm ơn bạn đã tin dùng sản phẩm của Techwise AI! Chúc bạn có những trải nghiệm tuyệt vời.",
                  "Dạ Techwise AI chân thành cảm ơn đánh giá quý báu của bạn ạ. Nếu cần hỗ trợ kỹ thuật, bạn liên hệ hotline 24/7 nhé!",
                  "Chào bạn, Techwise AI rất tiếc về sự bất tiện này. Bộ phận chăm sóc khách hàng sẽ liên hệ hỗ trợ bạn ngay lập tức ạ.",
                ].map((tpl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setReplyText(tpl)}
                    className="text-[10px] bg-neutral-100 hover:bg-neutral-200 px-2 py-0.5 border border-neutral-200 text-neutral-600 rounded text-left truncate max-w-full"
                  >
                    Mẫu {i + 1}: {tpl.slice(0, 45)}...
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200">
              <button
                type="button"
                onClick={() => setReplyTarget(null)}
                disabled={submittingReply}
                className="px-4 py-2 border border-neutral-300 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSendReply}
                disabled={submittingReply || !replyText.trim()}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-shop_dark_green text-white text-xs font-bold uppercase tracking-wider hover:bg-shop_dark_green/90 transition-colors shadow-sm disabled:opacity-50"
              >
                {submittingReply ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang gửi...</span>
                  </>
                ) : (
                  <span>Gửi phản hồi</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
