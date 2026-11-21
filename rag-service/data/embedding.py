import logging
import sys
from pathlib import Path

from psycopg import sql
from tqdm import tqdm

DATA_DIR = Path(__file__).resolve().parent
RAG_SERVICE_DIR = DATA_DIR.parent
if str(RAG_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(RAG_SERVICE_DIR))

from app.core.config import get_settings
from app.core.database import get_database_connection
from app.services.retrieval_service import RetrievalService

logger = logging.getLogger(__name__)
settings = get_settings()
_retrieval_service = RetrievalService()


def prepare_database(conn):
    with conn.cursor() as cursor:
        cursor.execute("""
            SELECT EXISTS (
                SELECT 1
                FROM pg_extension
                WHERE extname = 'vector'
            )
        """)
        if not cursor.fetchone()[0]:
            raise RuntimeError(
                "Extension pgvector chưa được cài đặt. "
                "Hãy chạy CREATE EXTENSION vector bằng tài khoản có quyền phù hợp."
            )

        cursor.execute(
            sql.SQL("""
                ALTER TABLE products
                ADD COLUMN IF NOT EXISTS {}
                vector({})
            """).format(
                sql.Identifier("rag_embedding"),
                sql.SQL(str(settings.embedding_dimensions)),
            )
        )
    conn.commit()


def load_products(conn):
    with conn.cursor() as cursor:
        cursor.execute("""
            SELECT id, sku, rag_document
            FROM products
            WHERE rag_document IS NOT NULL
              AND BTRIM(rag_document) <> ''
              AND rag_embedding IS NULL
            ORDER BY sku, id
        """)
        return cursor.fetchall()


def run_embedding():
    logger.info("Bắt đầu embedding sản phẩm...")
    with get_database_connection() as conn:
        prepare_database(conn)
        products = load_products(conn)
        total = len(products)
        if total == 0:
            logger.info("Không có sản phẩm nào cần tính embedding.")
            return

        logger.info("Tổng số sản phẩm cần embedding: %s", total)
        model = _retrieval_service.embedding_model
        batch_size = settings.batch_size
        total_updated = 0

        for start in tqdm(range(0, total, batch_size), desc="Embedding BGE-M3"):
            batch = products[start : start + batch_size]
            documents = [p[2] for p in batch]
            vectors = model.encode(
                documents,
                batch_size=batch_size,
                normalize_embeddings=True,
                convert_to_numpy=True,
                show_progress_bar=False,
            )

            with conn.cursor() as cursor:
                for product, vector in zip(batch, vectors):
                    product_id, sku, document = product
                    cursor.execute("""
                        UPDATE products
                        SET rag_embedding = %s
                        WHERE id = %s
                          AND rag_document = %s
                          AND rag_embedding IS NULL
                    """, (vector, product_id, document))
                    if cursor.rowcount == 1:
                        total_updated += 1
            conn.commit()

        logger.info("Hoàn thành! Đã embedding %s/%s sản phẩm", total_updated, total)


if __name__ == "__main__":
    run_embedding()
