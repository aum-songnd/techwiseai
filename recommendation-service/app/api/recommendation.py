from fastapi import APIRouter, HTTPException, Query
from starlette.concurrency import run_in_threadpool

from app.schemas.recommendation import RecommendationResponse
from app.services.recommendation_service import get_recommendation_service

router = APIRouter(
    prefix="/api/v1/recommendations",
    tags=["Product Recommendations"],
)


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
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi xử lý gợi ý sản phẩm: {str(e)}",
        ) from e
