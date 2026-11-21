import logging
from typing import Any

import numpy as np
from sentence_transformers import CrossEncoder

from app.core.config import get_settings

logger = logging.getLogger("uvicorn.error")


class RerankerService:
    """Tái xếp hạng ứng viên bằng Cross-Encoder (BAAI/bge-reranker-base)."""

    def __init__(self, reranker_model: CrossEncoder | None = None) -> None:
        self.settings = get_settings()
        self._reranker_model = reranker_model

    @property
    def reranker_model(self) -> CrossEncoder:
        if self._reranker_model is None:
            logger.info("Nạp Reranker: %s", self.settings.reranker_model)
            self._reranker_model = CrossEncoder(
                self.settings.reranker_model,
                device=self.settings.reranker_device,
                max_length=self.settings.reranker_max_length,
            )
        return self._reranker_model

    @staticmethod
    def build_product_document(p: dict[str, Any]) -> str:
        """Định dạng thông tin sản phẩm thành ngữ cảnh văn bản cho Cross-Encoder."""
        lines = [
            f"Tên sản phẩm: {p['name']}" if p.get("name") else "",
            f"SKU: {p['sku']}" if p.get("sku") else "",
            f"Thương hiệu: {p['brand']}" if p.get("brand") else "",
            f"Danh mục: {p['category']}" if p.get("category") else "",
            f"Giá: {p['price']:,.0f} VNĐ" if p.get("price") is not None else "",
            p.get("rag_document") or "",
        ]
        return "\n".join([line for line in lines if line])

    def rerank(
        self,
        query: str,
        products: list[dict[str, Any]],
        top_k: int | None = None,
        batch_size: int | None = None,
    ) -> list[dict[str, Any]]:
        """Chấm điểm cặp (query, document) và sắp xếp lại danh sách sản phẩm."""
        if not products:
            return []

        top_k = top_k or self.settings.reranker_top_k
        batch_size = batch_size or self.settings.reranker_batch_size
        pairs = [(query, self.build_product_document(p)) for p in products]

        scores = self.reranker_model.predict(
            pairs,
            batch_size=batch_size,
            show_progress_bar=False,
            convert_to_numpy=True,
        )
        scores = np.asarray(scores).reshape(-1)

        reranked = [{**p, "reranker_score": float(s)} for p, s in zip(products, scores)]
        reranked.sort(key=lambda x: (-x["reranker_score"], -x.get("rrf_score", 0.0), x["id"]))
        return reranked[:top_k]
