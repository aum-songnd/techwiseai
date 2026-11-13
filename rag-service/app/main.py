import logging
import sys
from contextlib import asynccontextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import Any, AsyncIterator

from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel, Field, field_validator
from fastapi.responses import StreamingResponse


BASE_DIR = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = BASE_DIR / "scripts"
logger = logging.getLogger(__name__)


@dataclass
class RagRuntime:
    pipeline: Any
    embedding_model: Any
    reranker: Any
    gemini_client: Any


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)

    @field_validator("message")
    @classmethod
    def message_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("message không được để trống")
        return value


class ChatResponse(BaseModel):
    answer: str


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    if str(SCRIPTS_DIR) not in sys.path:
        sys.path.insert(0, str(SCRIPTS_DIR))

    import generator as rag_pipeline
    from filtered_search import load_model
    from reranker import load_reranker

    logger.info("Đang khởi tạo các model của RAG service")
    app.state.rag = RagRuntime(
        pipeline=rag_pipeline,
        embedding_model=load_model(),
        reranker=load_reranker(),
        gemini_client=rag_pipeline.genai.Client(
            api_key=rag_pipeline.GEMINI_API_KEY
        ),
    )
    try:
        yield
    finally:
        app.state.rag.gemini_client.close()


app = FastAPI(
    title="TechWiseAI RAG Service",
    description="Dịch vụ AI RAG cho sản phẩm",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health")
def health_check():
    return {
        "success": True,
        "status": "UP",
        "message": "Chat bot hỗ trợ tư vấn sản phẩm",
        "service": "techwiseai-rag-service",
    }


@app.post("/api/v1/chat", response_model=ChatResponse)
def chat(body: ChatRequest, request: Request) -> ChatResponse:
    rag: RagRuntime = request.app.state.rag

    try:
        with rag.pipeline.create_db_connection() as conn:
            answer = "".join(
                rag.pipeline.rag_chat_stream(
                    conn=conn,
                    embedding_model=rag.embedding_model,
                    reranker=rag.reranker,
                    gemini_client=rag.gemini_client,
                    query=body.message,
                )
            ).replace("*", "").strip()
    except Exception as exception:
        logger.exception("RAG pipeline failed")
        raise HTTPException(
            status_code=503,
            detail="Dịch vụ tư vấn sản phẩm hiện không khả dụng",
        ) from exception

    if not answer:
        raise HTTPException(
            status_code=502,
            detail="RAG service không nhận được câu trả lời",
        )

    return ChatResponse(answer=answer)


@app.post("/api/v1/chat/stream")
def chat_stream(body: ChatRequest, request: Request) -> StreamingResponse:
    rag: RagRuntime = request.app.state.rag
    conn = None

    try:
        conn = rag.pipeline.create_db_connection()
        answer = iter(
            rag.pipeline.rag_chat_stream(
                conn=conn,
                embedding_model=rag.embedding_model,
                reranker=rag.reranker,
                gemini_client=rag.gemini_client,
                query=body.message,
            )
        )
        first_chunk = next(answer, None)
    except Exception as exception:
        if conn is not None:
            conn.close()
        logger.exception("RAG pipeline failed before streaming")
        raise HTTPException(
            status_code=503,
            detail="Dịch vụ tư vấn sản phẩm hiện không khả dụng",
        ) from exception

    if first_chunk is None:
        conn.close()
        raise HTTPException(
            status_code=502,
            detail="RAG service không nhận được câu trả lời",
        )

    def generate():
        try:
            yield first_chunk.replace("*", "")
            for chunk in answer:
                if chunk:
                    yield chunk.replace("*", "")
        except Exception:
            logger.exception("RAG response streaming failed")
            yield "\n\nXin lỗi, câu trả lời bị gián đoạn. Vui lòng thử lại."
        finally:
            conn.close()

    return StreamingResponse(
        generate(),
        media_type="text/plain",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
