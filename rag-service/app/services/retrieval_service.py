import logging
from typing import Any

import numpy as np
from psycopg import Connection
from sentence_transformers import SentenceTransformer

from app.core.config import get_settings
from app.services.query_analyzer import QueryAnalyzer

logger = logging.getLogger("uvicorn.error")


def _build_filter_clause(filters: dict[str, Any], extra: list[str] | None = None) -> tuple[str, dict[str, Any]]:
    """Tạo mệnh đề WHERE dùng chung cho cả Semantic và Keyword Search (DRY)."""
    conds = ["p.active = TRUE", "c.active = TRUE"] + (extra or [])
    params: dict[str, Any] = {}

    if filters.get("category"):
        conds.append("c.slug = %(category)s")
        params["category"] = filters["category"]
    if filters.get("brand"):
        conds.append("LOWER(p.brand) = LOWER(%(brand)s)")
        params["brand"] = filters["brand"]
    if filters.get("min_price") is not None:
        conds.append("p.price > %(min_price)s")
        params["min_price"] = filters["min_price"]
    if filters.get("max_price") is not None:
        conds.append("p.price <= %(max_price)s")
        params["max_price"] = filters["max_price"]

    return " AND ".join(conds), params


def _map_row(r: tuple, score_key: str) -> dict[str, Any]:
    """Chuyển đổi row từ database thành dict sản phẩm."""
    return {
        "id": str(r[0]),
        "name": r[1],
        "sku": r[2],
        "brand": r[3],
        "price": float(r[4]) if r[4] is not None else None,
        "category": r[5],
        "rag_document": r[6],
        score_key: float(r[7]),
    }


class RetrievalService:
    """Truy xuất ứng viên kết hợp: Dense Semantic Search (pgvector) + Keyword Search (FTS & SKU)."""

    def __init__(self, embedding_model: SentenceTransformer | None = None) -> None:
        self.settings = get_settings()
        self._embedding_model = embedding_model

    @property
    def embedding_model(self) -> SentenceTransformer:
        if self._embedding_model is None:
            logger.info("Nạp mô hình Embedding: %s", self.settings.embedding_model)
            model = SentenceTransformer(
                self.settings.embedding_model,
                device=self.settings.embedding_device,
            )
            model.max_seq_length = self.settings.embedding_max_length
            if model.get_sentence_embedding_dimension() != self.settings.embedding_dimensions:
                raise ValueError("Embedding dimension không khớp cấu hình")
            self._embedding_model = model
        return self._embedding_model

    def embed_query(self, query: str) -> np.ndarray:
        return self.embedding_model.encode(
            query,
            normalize_embeddings=True,
            convert_to_numpy=True,
            show_progress_bar=False,
        )

    def semantic_search(
        self,
        conn: Connection,
        query_vector: np.ndarray,
        filters: dict[str, Any],
        top_k: int = 5,
    ) -> list[dict[str, Any]]:
        where_sql, params = _build_filter_clause(filters, ["p.rag_embedding IS NOT NULL"])
        params.update({"query_vector": query_vector, "top_k": top_k})

        sql = f"""
            SELECT p.id, p.name, p.sku, p.brand, p.price, c.name, p.rag_document,
                   1 - (p.rag_embedding <=> %(query_vector)s) AS similarity
            FROM products p
            JOIN categories c ON p.category_id = c.id
            WHERE {where_sql}
            ORDER BY p.rag_embedding <=> %(query_vector)s
            LIMIT %(top_k)s
        """
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return [_map_row(r, "similarity") for r in cur.fetchall()]

    def keyword_search(
        self,
        conn: Connection,
        query: str,
        filters: dict[str, Any],
        top_k: int = 5,
    ) -> list[dict[str, Any]]:
        search_text = QueryAnalyzer.extract_keywords(query, filters)
        where_sql, params = _build_filter_clause(filters)
        params["top_k"] = top_k

        if not search_text:
            sql = f"""
                SELECT p.id, p.name, p.sku, p.brand, p.price,
                       c.name AS category_name, p.rag_document,
                       1.0 AS keyword_score
                FROM products p JOIN categories c ON p.category_id = c.id
                WHERE {where_sql}
                ORDER BY p.price ASC, p.name ASC LIMIT %(top_k)s
            """
        else:
            params.update({"search_text": search_text, "pattern": f"%{search_text}%"})
            sql = f"""
                WITH ranked AS (
                    SELECT p.id, p.name, p.sku, p.brand, p.price,
                           c.name AS category_name, p.rag_document,
                           (CASE WHEN LOWER(p.sku) = LOWER(%(search_text)s) THEN 10.0 ELSE 0.0 END +
                            CASE WHEN p.name ILIKE %(pattern)s THEN 5.0 ELSE 0.0 END +
                            CASE WHEN p.sku ILIKE %(pattern)s THEN 5.0 ELSE 0.0 END +
                            ts_rank_cd(
                                to_tsvector('simple', COALESCE(p.name, '') || ' ' || COALESCE(p.brand, '') || ' ' || COALESCE(p.rag_document, '')),
                                plainto_tsquery('simple', %(search_text)s)
                            )) AS keyword_score
                    FROM products p JOIN categories c ON p.category_id = c.id
                    WHERE {where_sql}
                )
                SELECT * FROM ranked WHERE keyword_score > 0
                ORDER BY keyword_score DESC, name LIMIT %(top_k)s
            """

        with conn.cursor() as cur:
            cur.execute(sql, params)
            return [_map_row(r, "keyword_score") for r in cur.fetchall()]

    @staticmethod
    def reciprocal_rank_fusion(
        semantic_results: list[dict[str, Any]],
        keyword_results: list[dict[str, Any]],
        rrf_k: int = 60,
    ) -> list[dict[str, Any]]:
        """Hợp nhất ứng viên từ hai nhánh tìm kiếm bằng giải thuật RRF."""
        scores: dict[str, float] = {}
        merged: dict[str, dict[str, Any]] = {}

        for rank, p in enumerate(semantic_results, 1):
            pid = p["id"]
            scores[pid] = scores.get(pid, 0.0) + (1.0 / (rrf_k + rank))
            merged[pid] = {**p, "semantic_rank": rank}

        for rank, p in enumerate(keyword_results, 1):
            pid = p["id"]
            scores[pid] = scores.get(pid, 0.0) + (1.0 / (rrf_k + rank))
            item = merged.setdefault(pid, {**p})
            item["keyword_rank"] = rank
            item["keyword_score"] = p.get("keyword_score")

        ranked = [{**merged[pid], "rrf_score": score} for pid, score in scores.items()]
        ranked.sort(key=lambda x: (-x["rrf_score"], -x.get("similarity", 0.0), x["id"]))
        return ranked

    def hybrid_search(
        self,
        conn: Connection,
        query: str,
        top_k: int | None = None,
        candidate_limit: int | None = None,
        rrf_k: int | None = None,
    ) -> dict[str, Any]:
        """Thực hiện tìm kiếm hybrid hoàn chỉnh: Vector + Keyword + RRF."""
        top_k = top_k or self.settings.search_top_k
        cand_limit = candidate_limit or self.settings.candidate_limit
        rrf_k = rrf_k or self.settings.rrf_k

        filters = QueryAnalyzer.analyze_query(query)
        keywords = QueryAnalyzer.extract_keywords(query, filters)
        query_vector = self.embed_query(query)

        sem_candidates = self.semantic_search(conn, query_vector, filters, top_k=cand_limit)
        kw_candidates = self.keyword_search(conn, query, filters, top_k=cand_limit)
        fused = self.reciprocal_rank_fusion(sem_candidates, kw_candidates, rrf_k=rrf_k)

        return {
            "query": query,
            "filters": filters,
            "search_keywords": keywords,
            "semantic_count": len(sem_candidates),
            "keyword_count": len(kw_candidates),
            "results": fused[:top_k],
        }
