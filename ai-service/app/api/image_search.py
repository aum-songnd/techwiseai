from time import perf_counter

from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from starlette.concurrency import run_in_threadpool

from app.core.config import get_settings
from app.schemas.image_search import ImageSearchResponse
from app.services.embedding_service import get_embedding_service
from app.services.product_search_service import (
    get_product_search_service,
)


router = APIRouter(
    prefix="/api/v1/search",
    tags=["Image Search"],
)

ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}

MAX_FILE_SIZE = 10 * 1024 * 1024


@router.post(
    "/image",
    response_model=ImageSearchResponse,
)
async def search_products_by_image(
    file: UploadFile = File(...),
    top_k: int = Query(default=10, ge=1),
) -> ImageSearchResponse:
    settings = get_settings()

    if top_k > settings.max_top_k:
        raise HTTPException(
            status_code=400,
            detail=(
                f"top_k không được lớn hơn "
                f"{settings.max_top_k}"
            ),
        )

    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=415,
            detail=(
                "Chỉ hỗ trợ ảnh JPEG, PNG hoặc WEBP"
            ),
        )

    image_content = await file.read()

    if not image_content:
        raise HTTPException(
            status_code=400,
            detail="Tệp ảnh rỗng",
        )

    if len(image_content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Dung lượng ảnh không được vượt quá 10 MB",
        )

    started_at = perf_counter()

    try:
        embedding_service = await run_in_threadpool(
            get_embedding_service
        )

        query_embedding = await run_in_threadpool(
            embedding_service.generate_image_embedding,
            image_content,
        )

        search_service = get_product_search_service()

        results = await run_in_threadpool(
            search_service.search_similar_products,
            query_embedding,
            top_k,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        ) from error

    processing_time_ms = round(
        (perf_counter() - started_at) * 1000
    )

    return ImageSearchResponse(
        success=True,
        message="Tìm kiếm sản phẩm bằng hình ảnh thành công",
        data={
            "queryFileName": file.filename or "uploaded-image",
            "topK": top_k,
            "resultCount": len(results),
            "processingTimeMs": processing_time_ms,
            "results": results,
        },
    )