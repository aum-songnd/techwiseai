import logging
from typing import Any
from fastapi import APIRouter, HTTPException, Query, Header
from starlette.concurrency import run_in_threadpool

from app.schemas.recommendation import (
    RecommendationResponse,
    ForYouResponse,
    InteractionCreateRequest,
)
from app.services.recommendation_service import get_recommendation_service
from app.services.personalized_service import get_personalized_service

logger = logging.getLogger("uvicorn.error")

router = APIRouter(
    prefix="/api/v1/recommendations",
    tags=["Product Recommendations"],
)


@router.get(
    "/for-you",
    response_model=ForYouResponse,
)
async def get_for_you_recommendations(
    session_id: str | None = Query(default=None),
    user_id: str | None = Query(default=None),
    limit: int = Query(default=8, ge=1, le=24),
    x_session_id: str | None = Header(default=None),
) -> ForYouResponse:
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
)
async def record_user_interaction(
    payload: InteractionCreateRequest,
    x_session_id: str | None = Header(default=None),
) -> dict[str, Any]:
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


@router.get(
    "/{product_id}",
    response_model=RecommendationResponse,
)
async def get_product_recommendations(
    product_id: str,
    limit: int = Query(default=8, ge=1, le=20),
) -> RecommendationResponse:
    try:
        service = get_recommendation_service()
        items = await run_in_threadpool(
            service.get_recommendations,
            product_id,
            limit,
        )
        return RecommendationResponse(
            success=True,
            message="Lấy danh sách sản phẩm gợi ý thành công",
            data=items,
        )
    except Exception as e:
        logger.exception("Lỗi khi xử lý gợi ý sản phẩm cho ID '%s': %s", product_id, e)
        raise HTTPException(
            status_code=500,
            detail="Đã xảy ra lỗi khi xử lý đề xuất sản phẩm. Vui lòng thử lại sau.",
        ) from e
