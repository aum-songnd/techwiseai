import logging
from typing import Any
from fastapi import APIRouter, HTTPException, Query, Header
from starlette.concurrency import run_in_threadpool

from app.schemas.recommendation import (
    ForYouResponse,
    InteractionCreateRequest,
)
from app.services.personalized_service import get_personalized_service

logger = logging.getLogger("uvicorn.error")

router = APIRouter(
    prefix="/api/v1/recommendations",
    tags=["Personalized User Recommendations"],
)


@router.get(
    "/for-you",
    response_model=ForYouResponse,
    summary="Gợi ý sản phẩm dành riêng cho bạn dựa trên lịch sử tương tác",
)
async def get_for_you_recommendations(
    session_id: str | None = Query(default=None, description="Session ID định danh khách vãng lai"),
    user_id: str | None = Query(default=None, description="User ID người dùng đã đăng nhập"),
    limit: int = Query(default=8, ge=1, le=24, description="Số lượng sản phẩm gợi ý"),
    x_session_id: str | None = Header(default=None, description="Session ID truyền qua HTTP Header"),
) -> ForYouResponse:
    """
    Truy vấn danh sách sản phẩm gợi ý cá nhân hóa dựa trên:
    - Hồ sơ vector sở thích người dùng (User Profile Vector 384 chiều trong pgvector).
    - Chuỗi hành vi tương tác gần đây (click, xem, thời lượng dwell time, giỏ hàng, yêu thích).
    - Các chế độ thích ứng động: COLD_START, EXPLORING, PERSONALIZED.
    """
    try:
        service = get_personalized_service()
        effective_session = session_id or x_session_id
        res = await run_in_threadpool(
            service.get_for_you_recommendations,
            effective_session,
            user_id,
            limit,
        )
        return res
    except Exception as e:
        logger.exception("Lỗi khi xử lý gợi ý 'Dành riêng cho bạn': %s", e)
        raise HTTPException(
            status_code=500,
            detail="Đã xảy ra lỗi khi xử lý đề xuất 'Dành riêng cho bạn'.",
        ) from e


@router.post(
    "/interactions",
    summary="Ghi nhận sự kiện tương tác của người dùng",
)
async def record_user_interaction(
    payload: InteractionCreateRequest,
    x_session_id: str | None = Header(default=None, description="Session ID truyền qua HTTP Header"),
) -> dict[str, Any]:
    """
    Tiếp nhận và ghi nhận sự kiện tương tác:
    - Các loại sự kiện: VIEW (kèm durationSeconds), CLICK, FAVORITE, ADD_TO_CART.
    - Chống spam trùng lặp trong 15s.
    - Tự động kích hoạt tính toán cập nhật lại Vector hồ sơ sở thích người dùng.
    """
    try:
        service = get_personalized_service()
        effective_session = payload.sessionId or x_session_id
        result = await run_in_threadpool(
            service.record_interaction,
            payload.productId,
            payload.eventType,
            effective_session,
            payload.userId,
            payload.durationSeconds,
            payload.metadata,
        )
        return {"success": True, "data": result}
    except Exception as e:
        logger.exception("Lỗi khi ghi nhận tương tác người dùng: %s", e)
        raise HTTPException(
            status_code=500,
            detail="Đã xảy ra lỗi khi ghi nhận tương tác người dùng.",
        ) from e

