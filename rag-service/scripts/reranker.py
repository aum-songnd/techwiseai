
import os
import json
import logging
from pathlib import Path

import numpy as np
import psycopg

from dotenv import load_dotenv
from pgvector.psycopg import register_vector
from sentence_transformers import CrossEncoder

from filtered_search import load_model
from hybrid_search import hybrid_search


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

RERANKER_MODEL = os.environ["RERANKER_MODEL"]
RERANKER_DEVICE = os.environ["RERANKER_DEVICE"]

RERANKER_BATCH_SIZE = int(
    os.environ["RERANKER_BATCH_SIZE"]
)

RERANKER_MAX_LENGTH = int(
    os.environ["RERANKER_MAX_LENGTH"]
)

RERANKER_TOP_K = int(
    os.environ["RERANKER_TOP_K"]
)

RERANKER_CANDIDATE_LIMIT = int(
    os.environ["RERANKER_CANDIDATE_LIMIT"]
)

CANDIDATE_LIMIT = int(
    os.environ["CANDIDATE_LIMIT"]
)

RRF_K = int(os.environ["RRF_K"])


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)


# =====================================================
# 2. LOAD RERANKER
# =====================================================

def load_reranker():
    logger.info(
        "Đang tải Reranker: %s",
        RERANKER_MODEL
    )

    model = CrossEncoder(
        RERANKER_MODEL,
        device=RERANKER_DEVICE,
        max_length=RERANKER_MAX_LENGTH
    )

    logger.info("Đã tải Reranker")

    return model


# =====================================================
# 3. BUILD PRODUCT DOCUMENT
# =====================================================

def build_product_document(product):
    """
    Sử dụng rag_document làm nội dung chính.

    Bổ sung tên, SKU, thương hiệu và giá
    để Reranker có thêm ngữ cảnh.
    """

    parts = []

    if product.get("name"):
        parts.append(
            f"Tên sản phẩm: {product['name']}"
        )

    if product.get("sku"):
        parts.append(
            f"SKU: {product['sku']}"
        )

    if product.get("brand"):
        parts.append(
            f"Thương hiệu: {product['brand']}"
        )

    if product.get("category"):
        parts.append(
            f"Danh mục: {product['category']}"
        )

    if product.get("price") is not None:
        parts.append(
            f"Giá: {product['price']:,.0f} VNĐ"
        )

    if product.get("rag_document"):
        parts.append(product["rag_document"])

    return "\n".join(parts)


# =====================================================
# 4. RERANK PRODUCTS
# =====================================================

def rerank_products(
    reranker,
    query,
    products,
    top_k=5,
    batch_size=4
):
    """
    Input:
        query: Câu hỏi người dùng
        products: Danh sách từ Hybrid Search

    Output:
        Top K sản phẩm theo Reranker Score
    """

    if top_k < 1:
        raise ValueError("top_k phải lớn hơn 0")

    if batch_size < 1:
        raise ValueError("batch_size phải lớn hơn 0")

    if not products:
        return []

    # Tạo cặp (query, product_document)
    pairs = []

    for product in products:
        document = build_product_document(product)

        pairs.append((query, document))

    # Cross-Encoder inference
    scores = reranker.predict(
        pairs,
        batch_size=batch_size,
        show_progress_bar=False,
        convert_to_numpy=True
    )

    scores = np.asarray(scores).reshape(-1)

    if len(scores) != len(products):
        raise ValueError(
            "Số lượng Reranker Score không khớp"
        )

    reranked_results = []

    for product, score in zip(products, scores):

        item = product.copy()

        # Raw score, không phải xác suất
        item["reranker_score"] = float(score)

        reranked_results.append(item)

    # Điểm cao hơn được ưu tiên
    reranked_results.sort(
        key=lambda product: (
            -product["reranker_score"],
            -product.get("rrf_score", 0.0),
            product["id"]
        )
    )

    return reranked_results[:top_k]


# =====================================================
# 5. FULL RETRIEVAL PIPELINE
# =====================================================

def search_and_rerank(
    conn,
    embedding_model,
    reranker,
    query
):
    """
    Query Analyzer
        ↓
    Hybrid Search + RRF
        ↓
    Cross-Encoder Reranker
        ↓
    Top K
    """

    # Hybrid Search trả về nhiều ứng viên
    hybrid_data = hybrid_search(
        conn=conn,
        model=embedding_model,
        query=query,
        top_k=RERANKER_CANDIDATE_LIMIT,
        candidate_limit=max(
            CANDIDATE_LIMIT,
            RERANKER_CANDIDATE_LIMIT
        ),
        rrf_k=RRF_K
    )

    # Rerank danh sách ứng viên
    results = rerank_products(
        reranker=reranker,
        query=query,
        products=hybrid_data["results"],
        top_k=RERANKER_TOP_K,
        batch_size=RERANKER_BATCH_SIZE
    )

    return {
        "query": query,
        "filters": hybrid_data["filters"],
        "search_keywords": hybrid_data["search_keywords"],
        "semantic_count": hybrid_data["semantic_count"],
        "keyword_count": hybrid_data["keyword_count"],
        "hybrid_candidate_count": len(
            hybrid_data["results"]
        ),
        "results": results
    }


# =====================================================
# 6. DISPLAY RESULTS
# =====================================================

def display_results(data):

    print("\nQuery Analyzer:")
    print(json.dumps(
        data["filters"],
        ensure_ascii=False,
        indent=2
    ))

    print(
        "\nSearch Keywords:",
        data["search_keywords"] or "(không có)"
    )

    print(
        "\nSemantic Candidates:",
        data["semantic_count"]
    )

    print(
        "Keyword Candidates:",
        data["keyword_count"]
    )

    print(
        "Hybrid Candidates:",
        data["hybrid_candidate_count"]
    )

    print(
        f"\nReranked Top {len(data['results'])}:\n"
    )

    if not data["results"]:
        print("Không tìm thấy sản phẩm phù hợp.")
        return

    for index, product in enumerate(
        data["results"], start=1
    ):

        print(f"[{index}] {product['name']}")
        print(f"SKU: {product['sku']}")
        print(f"Thương hiệu: {product['brand']}")

        if product.get("price") is not None:
            print(
                f"Giá: {product['price']:,.0f} ₫"
            )

        print(
            f"Reranker Score: "
            f"{product['reranker_score']:.4f}"
        )

        print(
            f"RRF Score: "
            f"{product['rrf_score']:.6f}"
        )

        similarity = product.get("similarity")

        if similarity is not None:
            print(
                f"Semantic Similarity: "
                f"{similarity:.4f}"
            )

        keyword_score = product.get("keyword_score")

        if keyword_score is not None:
            print(
                f"Keyword Score: "
                f"{keyword_score:.4f}"
            )

        print(
            f"Semantic Rank: "
            f"{product.get('semantic_rank')}"
        )

        print(
            f"Keyword Rank: "
            f"{product.get('keyword_rank')}"
        )

        print("-" * 55)


# =====================================================
# 7. MAIN
# =====================================================

def main():

    if RERANKER_TOP_K < 1:
        raise ValueError(
            "RERANKER_TOP_K phải lớn hơn 0"
        )

    if RERANKER_CANDIDATE_LIMIT < 1:
        raise ValueError(
            "RERANKER_CANDIDATE_LIMIT phải lớn hơn 0"
        )

    # Load một lần khi khởi động
    logger.info("Đang tải Embedding Model...")
    embedding_model = load_model()

    reranker = load_reranker()

    with psycopg.connect(**DB_CONFIG) as conn:

        register_vector(conn)

        logger.info("Đã kết nối PostgreSQL")

        print("\nTECHWISEAI - HYBRID + RERANKER")
        print("Nhập 'exit' để thoát.\n")

        while True:

            try:
                query = input("Bạn: ").strip()

                if query.lower() in ("exit", "quit"):
                    break

                if not query:
                    continue

                data = search_and_rerank(
                    conn=conn,
                    embedding_model=embedding_model,
                    reranker=reranker,
                    query=query
                )

                display_results(data)

            except KeyboardInterrupt:
                print("\nĐã thoát.")
                break

            except Exception:
                conn.rollback()
                logger.exception("Lỗi Reranker")


if __name__ == "__main__":
    main()
