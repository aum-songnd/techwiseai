import logging
import time
from contextlib import nullcontext
from functools import lru_cache
from typing import Any, Iterator

from psycopg import Connection

from app.core.config import get_settings
from app.core.database import get_database_connection
from app.services.generator_service import GeneratorService
from app.services.reranker_service import RerankerService
from app.services.retrieval_service import RetrievalService

logger = logging.getLogger("uvicorn.error")


class RagService:
    """
    Facade Service điều phối toàn bộ chu trình RAG:
    Query Analyzer -> Hybrid Search (Vector + FTS) -> RRF Fusion -> Cross-Encoder Rerank -> Qwen 2 Stream.
    """

    def __init__(
        self,
        retrieval_service: RetrievalService | None = None,
        reranker_service: RerankerService | None = None,
        generator_service: GeneratorService | None = None,
    ) -> None:
        self.settings = get_settings()
        self.retrieval_service = retrieval_service or RetrievalService()
        self.reranker_service = reranker_service or RerankerService()
        self.generator_service = generator_service or GeneratorService()

    def warmup(self) -> None:
        """Nạp trước các model vào RAM/VRAM khi ứng dụng khởi động."""
        logger.info("Nạp trước tài nguyên RAG Service (Embedding & Reranker)...")
        _ = self.retrieval_service.embedding_model
        _ = self.reranker_service.reranker_model
        logger.info(
            "RAG Service sử dụng mô hình Gemini (Model: %s)",
            self.settings.gemini_model,
        )

    def search_and_rerank(self, conn: Connection, query: str) -> dict[str, Any]:
        """Truy xuất ứng viên và tái xếp hạng ngữ cảnh sâu."""
        hybrid_data = self.retrieval_service.hybrid_search(
            conn=conn,
            query=query,
            top_k=self.settings.reranker_candidate_limit,
            candidate_limit=max(self.settings.candidate_limit, self.settings.reranker_candidate_limit),
            rrf_k=self.settings.rrf_k,
        )

        results = self.reranker_service.rerank(
            query=query,
            products=hybrid_data["results"],
            top_k=self.settings.reranker_top_k,
            batch_size=self.settings.reranker_batch_size,
        )

        return {**hybrid_data, "results": results}

    def chat_stream(self, query: str, conn: Connection | None = None) -> Iterator[str]:
        """Luồng tư vấn dạng stream: Tìm kiếm -> Rerank -> Stream phản hồi Qwen 2."""
        connection_context = (
            nullcontext(conn)
            if conn is not None
            else get_database_connection()
        )

        with connection_context as active_conn:
            start_time = time.perf_counter()
            retrieval_data = self.search_and_rerank(
                conn=active_conn,
                query=query,
            )
            products = retrieval_data.get("results", [])
            logger.info(
                "Tìm thấy %d sản phẩm sau Rerank (%.0f ms)",
                len(products),
                (time.perf_counter() - start_time) * 1000,
            )

            yield from self.generator_service.generate_answer_stream(
                query=query,
                products=products,
            )

    def chat(self, query: str) -> str:
        """Tư vấn đồng bộ: Thu thập toàn bộ luồng stream và loại bỏ ký tự rác."""
        return "".join(chunk.replace("*", "") for chunk in self.chat_stream(query) if chunk).strip()

    def close(self) -> None:
        self.generator_service.close()


@lru_cache
def get_rag_service() -> RagService:
    return RagService()
