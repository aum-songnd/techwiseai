from decimal import Decimal
from typing import Any

import numpy as np

from app.core.config import get_settings
from app.core.database import get_database_connection


class ProductSearchService:
    def search_similar_products(
        self,
        query_embedding: np.ndarray,
        top_k: int,
    ) -> list[dict[str, Any]]:
        settings = get_settings()

        if query_embedding.shape != (768,):
            raise ValueError(
                "Vector truy vấn phải có đúng 768 chiều"
            )

        if top_k <= 0 or top_k > settings.max_top_k:
            raise ValueError(
                f"top_k phải nằm trong khoảng "
                f"1 đến {settings.max_top_k}"
            )

        with get_database_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT set_config(
                        'hnsw.ef_search',
                        '100',
                        true
                    )
                    """
                )

                cursor.execute(
                    """
                    SELECT
                        p.id,
                        p.sku,
                        p.name,
                        p.brand,
                        p.price,
                        p.original_price,
                        p.thumbnail_url,
                        p.short_description,
                        p.rating_average,
                        p.review_count,
                        p.stock_quantity,
                        c.id AS category_id,
                        c.name AS category_name,
                        c.slug AS category_slug,
                        pse.image_count,
                        pse.image_weight,
                        pse.text_weight,
                        1 - (
                            pse.image_embedding <=> %s
                        ) AS image_similarity,
                        1 - (
                            pse.text_embedding <=> %s
                        ) AS text_similarity,
                        1 - (
                            pse.multimodal_embedding <=> %s
                        ) AS similarity
                    FROM product_search_embeddings pse
                    JOIN products p
                        ON p.id = pse.product_id
                    JOIN categories c
                        ON c.id = p.category_id
                    WHERE p.active = TRUE
                      AND c.active = TRUE
                      AND pse.model_name = %s
                      AND pse.model_revision = %s
                      AND pse.pipeline_version = %s
                    ORDER BY
                        pse.multimodal_embedding <=> %s
                    LIMIT %s
                    """,
                    (
                        query_embedding,
                        query_embedding,
                        query_embedding,
                        settings.model_name,
                        settings.model_revision,
                        settings.pipeline_version,
                        query_embedding,
                        top_k,
                    ),
                )

                rows = cursor.fetchall()

        return [
            self._map_result(row, rank)
            for rank, row in enumerate(rows, start=1)
        ]

    @staticmethod
    def _map_result(
        row: tuple,
        rank: int,
    ) -> dict[str, Any]:
        return {
            "rank": rank,
            "productId": str(row[0]),
            "sku": row[1],
            "name": row[2],
            "brand": row[3],
            "price": ProductSearchService._to_float(row[4]),
            "originalPrice": ProductSearchService._to_float(row[5]),
            "thumbnailUrl": row[6],
            "shortDescription": row[7],
            "ratingAverage": ProductSearchService._to_float(row[8]),
            "reviewCount": row[9],
            "stockQuantity": row[10],
            "category": {
                "id": str(row[11]),
                "name": row[12],
                "slug": row[13],
            },
            "imageCount": row[14],
            "imageWeight": ProductSearchService._to_float(row[15]),
            "textWeight": ProductSearchService._to_float(row[16]),
            "imageSimilarity": float(row[17]),
            "textSimilarity": float(row[18]),
            "similarity": float(row[19]),
        }

    @staticmethod
    def _to_float(value: Decimal | None) -> float | None:
        if value is None:
            return None

        return float(value)


def get_product_search_service() -> ProductSearchService:
    return ProductSearchService()