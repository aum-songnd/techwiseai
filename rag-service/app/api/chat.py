import logging
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse

from app.schemas.chat import ChatRequest, ChatResponse
from app.services.rag_service import get_rag_service

logger = logging.getLogger("uvicorn.error")

router = APIRouter(
    prefix="/api/v1/chat",
    tags=["RAG Product Chat"],
)


@router.post(
    "",
    response_model=ChatResponse,
    summary="Tư vấn sản phẩm đồng bộ",
)
@router.post(
    "/",
    response_model=ChatResponse,
    include_in_schema=False,
)
def chat(body: ChatRequest) -> ChatResponse:
    rag_service = get_rag_service()
    try:
        answer = rag_service.chat(body.message)
    except Exception as exception:
        logger.exception("RAG pipeline failed during synchronous chat")
        raise HTTPException(
            status_code=503,
            detail="Dịch vụ tư vấn sản phẩm hiện không khả dụng",
        ) from exception

    if not answer:
        raise HTTPException(
            status_code=502,
            detail="RAG service không nhận được câu trả lời",
        )

    return ChatResponse(answer=answer, success=True)


@router.post(
    "/stream",
    summary="Tư vấn sản phẩm dạng stream trực tiếp (Realtime Streaming)",
)
def chat_stream(body: ChatRequest) -> StreamingResponse:
    rag_service = get_rag_service()

    try:
        stream_iter = iter(rag_service.chat_stream(body.message))
        first_chunk = next(stream_iter, None)
    except Exception as exception:
        logger.exception("RAG pipeline failed before streaming")
        raise HTTPException(
            status_code=503,
            detail="Dịch vụ tư vấn sản phẩm hiện không khả dụng",
        ) from exception

    if first_chunk is None:
        raise HTTPException(
            status_code=502,
            detail="RAG service không nhận được câu trả lời",
        )

    def generate():
        try:
            yield first_chunk.replace("*", "")
            for chunk in stream_iter:
                if chunk:
                    yield chunk.replace("*", "")
        except Exception:
            logger.exception("RAG response streaming failed mid-flight")
            yield "\n\nXin lỗi, câu trả lời bị gián đoạn. Vui lòng thử lại."

    return StreamingResponse(
        generate(),
        media_type="text/plain",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
