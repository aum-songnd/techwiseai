import { NextRequest, NextResponse } from "next/server";
import {
  getReviewsForProduct,
  addReviewToProduct,
} from "@/lib/server/reviews";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://techwiseai-prod.up.railway.app/api/v1";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const ratingParam = searchParams.get("rating");
  const ratingFilter = ratingParam ? parseInt(ratingParam, 10) : undefined;

  try {
    // Attempt backend fetch first
    const backendUrl = `${API_BASE_URL}/products/${encodeURIComponent(id)}/reviews?${searchParams.toString()}`;
    const res = await fetch(backendUrl, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.data) {
        return NextResponse.json(data);
      }
    }
  } catch {
    // Backend fetch failed, continue to fallback
  }

  // Fallback to local server reviews cache
  const localData = getReviewsForProduct(id, ratingFilter);
  return NextResponse.json({
    success: true,
    message: "Lấy danh sách đánh giá thành công",
    data: {
      summary: localData.summary,
      reviews: {
        items: localData.reviews,
        page: 0,
        size: localData.reviews.length,
        totalElements: localData.reviews.length,
        totalPages: 1,
        first: true,
        last: true,
      },
    },
  });
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const authHeader = req.headers.get("authorization");

  if (!authHeader) {
    return NextResponse.json(
      { success: false, message: "Vui lòng đăng nhập để đánh giá sản phẩm." },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();

    // Validation
    if (!body.rating || body.rating < 1 || body.rating > 5) {
      return NextResponse.json(
        { success: false, message: "Vui lòng chọn số sao từ 1 đến 5" },
        { status: 400 }
      );
    }

    if (!body.comment || !body.comment.trim() || body.comment.trim().length < 5) {
      return NextResponse.json(
        { success: false, message: "Nội dung nhận xét tối thiểu 5 ký tự" },
        { status: 400 }
      );
    }

    // Try posting to backend
    try {
      const res = await fetch(`${API_BASE_URL}/products/${encodeURIComponent(id)}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify(body),
      });

      const backendResult = await res.json().catch(() => ({}));

      if (!res.ok || backendResult?.success === false) {
        return NextResponse.json(
          {
            success: false,
            message:
              backendResult?.message ||
              "Chỉ khách hàng đã mua sản phẩm này mới có thể gửi đánh giá & bình luận.",
          },
          { status: res.status || 403 }
        );
      }

      // Backend succeeded - sync to local cache
      try {
        addReviewToProduct(id, {
          productName: body.productName,
          userId: body.userId,
          userFullName: body.userFullName || "Khách hàng Techwise",
          userAvatarUrl: body.userAvatarUrl,
          rating: body.rating,
          title: body.title,
          comment: body.comment,
          isVerifiedPurchase: true,
        });
      } catch {}

      return NextResponse.json(backendResult);
    } catch {
      // Backend request network error, will check offline fallback
    }

    // Fallback mode validation
    if (!body.isVerifiedPurchase) {
      return NextResponse.json(
        {
          success: false,
          message: "Chỉ khách hàng đã mua sản phẩm này mới có thể gửi đánh giá & bình luận.",
        },
        { status: 403 }
      );
    }

    const saved = addReviewToProduct(id, {
      productName: body.productName,
      userId: body.userId,
      userFullName: body.userFullName || "Khách hàng Techwise",
      userAvatarUrl: body.userAvatarUrl,
      rating: body.rating,
      title: body.title,
      comment: body.comment,
      isVerifiedPurchase: true,
    });

    return NextResponse.json({
      success: true,
      message: "Đăng đánh giá và bình luận thành công",
      data: saved,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Đăng đánh giá thất bại",
      },
      { status: 500 }
    );
  }
}
