
import os
import logging
from pathlib import Path

import psycopg
from dotenv import load_dotenv
from pgvector.psycopg import register_vector
from sentence_transformers import SentenceTransformer


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
MAX_LENGTH = int(os.environ["EMBEDDING_MAX_LENGTH"])
DEVICE = os.environ["EMBEDDING_DEVICE"]
TOP_K = int(os.environ["SEARCH_TOP_K"])


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)


# =====================================================
# 2. LOAD MODEL
# =====================================================

def load_model():
    logger.info("Đang tải model: %s", MODEL_NAME)

    model = SentenceTransformer(
        MODEL_NAME,
        device=DEVICE
    )

    model.max_seq_length = MAX_LENGTH

    actual_dim = model.get_sentence_embedding_dimension()

    if actual_dim != VECTOR_DIM:
        raise ValueError(
            f"Model dimensions={actual_dim}, "
            f"expected={VECTOR_DIM}"
        )

    logger.info(
        "Đã tải model | device=%s | dimensions=%s",
        DEVICE,
        actual_dim
    )

    return model


# =====================================================
# 3. QUERY EMBEDDING
# =====================================================

def embed_query(model, query):
    """
    Chuyển câu hỏi thành vector 1024 chiều.
    Sử dụng cùng model và normalization với
    embedding của sản phẩm.
    """

    if not query or not query.strip():
        raise ValueError("Câu hỏi không được để trống")

    vector = model.encode(
        query.strip(),
        normalize_embeddings=True,
        convert_to_numpy=True,
        show_progress_bar=False
    )

    if len(vector) != VECTOR_DIM:
        raise ValueError(
            f"Query embedding có {len(vector)} chiều, "
            f"yêu cầu {VECTOR_DIM}"
        )

    return vector


# =====================================================
# 4. SEMANTIC SEARCH
# =====================================================

def semantic_search(conn, query_vector, top_k):
    """
    Tìm top K sản phẩm theo cosine similarity.

    pgvector:
        <=> : cosine distance

    similarity = 1 - cosine_distance
    """

    if top_k < 1:
        raise ValueError("top_k phải lớn hơn 0")

    with conn.cursor() as cursor:

        cursor.execute("""
            SELECT
                id,
                sku,
                rag_document,
                1 - (rag_embedding <=> %s) AS similarity
            FROM products
            WHERE rag_embedding IS NOT NULL
            ORDER BY rag_embedding <=> %s
            LIMIT %s
        """, (
            query_vector,
            query_vector,
            top_k
        ))

        rows = cursor.fetchall()

    return [
        {
            "id": str(row[0]),
            "sku": row[1],
            "rag_document": row[2],
            "similarity": float(row[3])
        }
        for row in rows
    ]


# =====================================================
# 5. DISPLAY RESULTS
# =====================================================

def display_results(results):

    if not results:
        print("\nKhông tìm thấy sản phẩm phù hợp.")
        return

    print("\n" + "=" * 70)
    print(f"TÌM THẤY {len(results)} SẢN PHẨM")
    print("=" * 70)

    for index, product in enumerate(results, start=1):

        print(f"\n[{index}] SKU: {product['sku']}")
        print(f"Similarity: {product['similarity']:.4f}")
        print("-" * 70)
        print(product["rag_document"])
        print("-" * 70)


# =====================================================
# 6. MAIN
# =====================================================

def main():

    if TOP_K < 1:
        raise ValueError("SEARCH_TOP_K phải lớn hơn 0")

    model = load_model()

    with psycopg.connect(**DB_CONFIG) as conn:
        register_vector(conn)

        logger.info("Đã kết nối PostgreSQL")

        print("\nSEMANTIC SEARCH - TECHWISEAI")
        print("Nhập 'exit' để thoát.\n")

        while True:

            try:
                query = input("Bạn: ").strip()

                if query.lower() in ("exit", "quit"):
                    break

                if not query:
                    continue

                query_vector = embed_query(
                    model,
                    query
                )

                results = semantic_search(
                    conn,
                    query_vector,
                    TOP_K
                )

                display_results(results)

            except KeyboardInterrupt:
                print("\nĐã thoát.")
                break

            except Exception:
                conn.rollback()
                logger.exception("Lỗi Semantic Search")


if __name__ == "__main__":
    main()
