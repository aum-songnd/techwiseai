
import os
import json
from pathlib import Path

import psycopg
from dotenv import load_dotenv
from pgvector.psycopg import register_vector
from sentence_transformers import SentenceTransformer

from query_analyzer import analyze_query


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
DEVICE = os.environ["EMBEDDING_DEVICE"]
VECTOR_DIM = int(os.environ["EMBEDDING_DIMENSIONS"])
MAX_LENGTH = int(os.environ["EMBEDDING_MAX_LENGTH"])
TOP_K = int(os.environ["SEARCH_TOP_K"])


def load_model():
    model = SentenceTransformer(
        MODEL_NAME,
        device=DEVICE
    )
    model.max_seq_length = MAX_LENGTH

    if model.get_sentence_embedding_dimension() != VECTOR_DIM:
        raise ValueError("Embedding dimension không khớp")

    return model


def embed_query(model, query):
    return model.encode(
        query,
        normalize_embeddings=True,
        convert_to_numpy=True,
        show_progress_bar=False
    )


def filtered_search(conn, query_vector, filters, top_k=5):

    conditions = [
        "p.rag_embedding IS NOT NULL",
        "p.active = TRUE",
        "c.active = TRUE"
    ]

    params = {
        "query_vector": query_vector,
        "top_k": top_k
    }

    if filters["category"]:
        conditions.append("c.slug = %(category)s")
        params["category"] = filters["category"]

    if filters["brand"]:
        conditions.append("LOWER(p.brand) = LOWER(%(brand)s)")
        params["brand"] = filters["brand"]

    if filters["min_price"] is not None:
        conditions.append("p.price > %(min_price)s")
        params["min_price"] = filters["min_price"]

    if filters["max_price"] is not None:
        conditions.append("p.price <= %(max_price)s")
        params["max_price"] = filters["max_price"]

    where_clause = " AND ".join(conditions)

    sql_query = f"""
        SELECT
            p.id,
            p.name,
            p.sku,
            p.brand,
            p.price,
            c.name AS category,
            p.rag_document,
            1 - (
                p.rag_embedding <=> %(query_vector)s
            ) AS similarity
        FROM products p
        JOIN categories c
            ON p.category_id = c.id
        WHERE {where_clause}
        ORDER BY
            p.rag_embedding <=> %(query_vector)s
        LIMIT %(top_k)s
    """

    with conn.cursor() as cursor:
        cursor.execute(sql_query, params)
        rows = cursor.fetchall()

    return [
        {
            "id": str(row[0]),
            "name": row[1],
            "sku": row[2],
            "brand": row[3],
            "price": float(row[4]),
            "category": row[5],
            "rag_document": row[6],
            "similarity": float(row[7])
        }
        for row in rows
    ]


def main():

    model = load_model()

    with psycopg.connect(**DB_CONFIG) as conn:
        register_vector(conn)

        print("\nTECHWISEAI - FILTERED SEMANTIC SEARCH")
        print("Nhập 'exit' để thoát.\n")

        while True:
            query = input("Bạn: ").strip()

            if query.lower() in ("exit", "quit"):
                break

            if not query:
                continue

            try:
                filters = analyze_query(query)

                print("\nQuery Analyzer:")
                print(json.dumps(
                    filters,
                    ensure_ascii=False,
                    indent=2
                ))

                query_vector = embed_query(model, query)

                results = filtered_search(
                    conn,
                    query_vector,
                    filters,
                    TOP_K
                )

                print(f"\nTìm thấy {len(results)} sản phẩm:")

                for i, product in enumerate(results, 1):
                    print(f"\n[{i}] {product['name']}")
                    print(f"SKU: {product['sku']}")
                    print(f"Thương hiệu: {product['brand']}")
                    print(f"Giá: {product['price']:,.0f} ₫")
                    print(f"Similarity: {product['similarity']:.4f}")

            except Exception as exc:
                conn.rollback()
                print(f"Lỗi: {exc}")


if __name__ == "__main__":
    main()
