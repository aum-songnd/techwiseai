
import os
import logging
from pathlib import Path

import psycopg
from psycopg import sql
from dotenv import load_dotenv
from pgvector.psycopg import register_vector
from sentence_transformers import SentenceTransformer
from tqdm import tqdm


# =====================================================
# 1. CONFIGURATION
# =====================================================

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env", override=True)

DB_CONFIG = {
    "host": os.environ["DB_HOST"],
    "port": int(os.environ["DB_PORT"]),
    "dbname": os.environ["DB_NAME"],
    "user": os.environ["DB_USER"],
    "password": os.environ["DB_PASSWORD"],
}

MODEL_NAME = os.environ["EMBEDDING_MODEL"]
VECTOR_DIM = int(os.environ["EMBEDDING_DIMENSIONS"])
BATCH_SIZE = int(os.environ["BATCH_SIZE"])
MAX_LENGTH = int(os.environ["EMBEDDING_MAX_LENGTH"])
DEVICE = os.environ["EMBEDDING_DEVICE"]


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)


# =====================================================
# 2. PREPARE DATABASE
# =====================================================

def prepare_database(conn):
    """
    Kiểm tra pgvector và tự tạo cột rag_embedding
    nếu chưa tồn tại.
    """

    with conn.cursor() as cursor:

        # Kiểm tra extension pgvector
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
                "Hãy chạy CREATE EXTENSION vector "
                "bằng tài khoản có quyền phù hợp."
            )

        # Tạo cột rag_embedding nếu chưa tồn tại
        cursor.execute(
            sql.SQL("""
                ALTER TABLE products
                ADD COLUMN IF NOT EXISTS {}
                vector({})
            """).format(
                sql.Identifier("rag_embedding"),
                sql.SQL(str(VECTOR_DIM))
            )
        )

        # Kiểm tra kiểu dữ liệu và số chiều
        cursor.execute("""
            SELECT format_type(a.atttypid, a.atttypmod)
            FROM pg_attribute a
            WHERE a.attrelid = 'products'::regclass
              AND a.attname = 'rag_embedding'
              AND NOT a.attisdropped
        """)

        row = cursor.fetchone()

        if row is None:
            raise RuntimeError(
                "Không tìm thấy cột rag_embedding"
            )

        actual_type = row[0]
        expected_type = f"vector({VECTOR_DIM})"

        if actual_type != expected_type:
            raise ValueError(
                f"Cột rag_embedding có kiểu {actual_type}, "
                f"nhưng model yêu cầu {expected_type}. "
                "Hãy kiểm tra dữ liệu embedding cũ."
            )

    conn.commit()

    logger.info(
        "Database sẵn sàng | rag_embedding=vector(%s)",
        VECTOR_DIM
    )


# =====================================================
# 3. LOAD PRODUCTS
# =====================================================

def load_products(conn):
    """
    Chỉ lấy các sản phẩm có rag_document
    nhưng chưa có rag_embedding.
    """

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


# =====================================================
# 4. LOAD EMBEDDING MODEL
# =====================================================

def load_model():
    """
    Tải SentenceTransformer BGE-M3.
    """

    logger.info("Đang tải model: %s", MODEL_NAME)

    model = SentenceTransformer(
        MODEL_NAME,
        device=DEVICE
    )

    model.max_seq_length = MAX_LENGTH

    actual_dim = model.get_sentence_embedding_dimension()

    if actual_dim != VECTOR_DIM:
        raise ValueError(
            f"Model tạo vector {actual_dim} chiều, "
            f"nhưng cấu hình yêu cầu {VECTOR_DIM}"
        )

    logger.info(
        "Đã tải model | device=%s | "
        "dimensions=%s | max_length=%s",
        DEVICE,
        actual_dim,
        model.max_seq_length
    )

    return model


# =====================================================
# 5. GENERATE EMBEDDINGS
# =====================================================

def generate_embeddings(model, documents):
    """
    Chuyển danh sách rag_document thành
    dense embedding 1024 chiều.
    """

    vectors = model.encode(
        documents,
        batch_size=BATCH_SIZE,
        normalize_embeddings=True,
        convert_to_numpy=True,
        show_progress_bar=False
    )

    if len(vectors) != len(documents):
        raise ValueError(
            "Số embedding không khớp số tài liệu"
        )

    for vector in vectors:
        if len(vector) != VECTOR_DIM:
            raise ValueError(
                f"Embedding có {len(vector)} chiều, "
                f"yêu cầu {VECTOR_DIM}"
            )

    return vectors


# =====================================================
# 6. SAVE EMBEDDINGS
# =====================================================

def save_embeddings(conn, products, embeddings):
    """
    Lưu embedding vào products.rag_embedding.

    Không ghi đè embedding đã tồn tại.
    Chỉ cập nhật khi rag_document chưa thay đổi.
    """

    updated = 0

    with conn.cursor() as cursor:

        for product, vector in zip(products, embeddings):

            product_id, sku, document = product

            cursor.execute("""
                UPDATE products
                SET rag_embedding = %s
                WHERE id = %s
                  AND rag_document = %s
                  AND rag_embedding IS NULL
            """, (
                vector,
                product_id,
                document
            ))

            if cursor.rowcount == 1:
                updated += 1
            else:
                logger.warning(
                    "Bỏ qua sản phẩm: %s", sku
                )

    conn.commit()

    return updated


# =====================================================
# 7. MAIN
# =====================================================

def run_embedding():

    # Validate configuration
    if BATCH_SIZE < 1:
        raise ValueError(
            "BATCH_SIZE phải lớn hơn 0"
        )

    if not 1 <= MAX_LENGTH <= 8192:
        raise ValueError(
            "EMBEDDING_MAX_LENGTH phải từ 1 đến 8192"
        )

    if VECTOR_DIM != 1024:
        raise ValueError(
            "BGE-M3 sử dụng embedding 1024 chiều"
        )

    logger.info("Bắt đầu embedding sản phẩm")

    # Kết nối PostgreSQL
    with psycopg.connect(**DB_CONFIG) as conn:

        # Tạo cột nếu chưa có
        prepare_database(conn)

        # Đăng ký pgvector adapter
        register_vector(conn)

        # Lấy sản phẩm cần embedding
        products = load_products(conn)

        total = len(products)

        if total == 0:
            logger.info(
                "Không có sản phẩm cần embedding"
            )
            return

        logger.info(
            "Tổng số sản phẩm cần embedding: %s",
            total
        )

        # Chỉ tải model khi có dữ liệu cần xử lý
        model = load_model()

        total_updated = 0

        # Xử lý theo batch
        for start in tqdm(
            range(0, total, BATCH_SIZE),
            desc="Embedding BGE-M3"
        ):

            batch = products[
                start:start + BATCH_SIZE
            ]

            documents = [
                product[2]
                for product in batch
            ]

            try:
                embeddings = generate_embeddings(
                    model,
                    documents
                )

                updated = save_embeddings(
                    conn,
                    batch,
                    embeddings
                )

                total_updated += updated

            except Exception:
                conn.rollback()

                logger.exception(
                    "Lỗi batch bắt đầu tại %s",
                    start
                )

                raise

        logger.info(
            "Hoàn thành! Đã embedding %s/%s sản phẩm",
            total_updated,
            total
        )


if __name__ == "__main__":
    run_embedding()
