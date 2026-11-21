from typing import Any
from pydantic import BaseModel, Field, field_validator


class ChatRequest(BaseModel):
    message: str = Field(
        min_length=1,
        max_length=2000,
        description="Nội dung câu hỏi hoặc yêu cầu tư vấn của khách hàng",
    )

    @field_validator("message")
    @classmethod
    def message_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("message không được để trống")
        return value


class ChatResponse(BaseModel):
    answer: str
    success: bool = True


class HealthResponse(BaseModel):
    success: bool = True
    status: str = "UP"
    message: str = "Chat bot hỗ trợ tư vấn sản phẩm"
    service: str = "techwiseai-rag-service"
    database: dict[str, Any] | None = None


class QueryFilters(BaseModel):
    original_query: str
    category: str | None = None
    brand: str | None = None
    min_price: int | None = None
    max_price: int | None = None


class ProductCandidate(BaseModel):
    id: str
    name: str
    sku: str
    brand: str | None = None
    category: str | None = None
    price: float | None = None
    rag_document: str | None = None
    similarity: float | None = None
    keyword_score: float | None = None
    rrf_score: float | None = None
    reranker_score: float | None = None
    semantic_rank: int | None = None
    keyword_rank: int | None = None
