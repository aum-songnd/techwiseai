from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import chat_router
from app.core.database import check_database_connection
from app.schemas.chat import HealthResponse
from app.services.rag_service import get_rag_service


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    service = get_rag_service()
    service.warmup()
    try:
        yield
    finally:
        service.close()


app = FastAPI(
    title="TechWiseAI RAG Service",
    description="Dịch vụ AI RAG Tư vấn Sản phẩm thông minh (Retrieval-Augmented Generation)",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)


@app.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    db_status = None
    try:
        db_status = check_database_connection()
    except Exception:
        pass

    return HealthResponse(
        success=True,
        status="UP",
        message="Chat bot hỗ trợ tư vấn sản phẩm",
        service="techwiseai-rag-service",
        database=db_status,
    )
