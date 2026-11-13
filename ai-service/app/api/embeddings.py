from typing import List, Optional, Union

from fastapi import APIRouter
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool

from app.services.text_embedding_service import get_text_embedding_service

router = APIRouter(tags=["Text Embeddings"])


class EmbeddingRequest(BaseModel):
    model: Optional[str] = "all-MiniLM-L6-v2"
    input: Union[str, List[str]]
    dimensions: Optional[int] = 384


class EmbeddingItem(BaseModel):
    object: str = "embedding"
    embedding: List[float]
    index: int


class EmbeddingResponse(BaseModel):
    object: str = "list"
    data: List[EmbeddingItem]
    model: str


@router.post("/v1/embeddings", response_model=EmbeddingResponse)
@router.post("/embeddings", response_model=EmbeddingResponse)
async def create_embeddings(payload: EmbeddingRequest) -> EmbeddingResponse:
    service = get_text_embedding_service()
    texts = [payload.input] if isinstance(payload.input, str) else payload.input
    vectors = await run_in_threadpool(service.encode, texts)

    data = [
        EmbeddingItem(object="embedding", embedding=vec, index=i)
        for i, vec in enumerate(vectors)
    ]

    return EmbeddingResponse(
        object="list",
        data=data,
        model=payload.model or "all-MiniLM-L6-v2",
    )

