
import os
import json
import logging
from pathlib import Path

import psycopg
from dotenv import load_dotenv
from pgvector.psycopg import register_vector

from query_analyzer import analyze_query
from filtered_search import load_model, embed_query, filtered_search
from keyword_search import keyword_search, extract_keywords


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

TOP_K = int(os.environ["SEARCH_TOP_K"])
CANDIDATE_LIMIT = int(os.getenv("CANDIDATE_LIMIT", "20"))
RRF_K = int(os.getenv("RRF_K", "60"))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)


# =====================================================
# 2. RECIPROCAL RANK FUSION
# =====================================================

def reciprocal_rank_fusion(
    semantic_results,
    keyword_results,
    rrf_k=60,
    top_k=5
):
    """
    Kết hợp kết quả Semantic và Keyword bằng RRF.

    RRF Score = SUM(1 / (rrf_k + rank))

    rank bắt đầu từ 1.
    """

    if rrf_k < 0:
        raise ValueError("rrf_k không được âm")

    fused = {}

    def add_results(results, source):

        seen = set()

        for rank, product in enumerate(results, start=1):

            product_id = product["id"]

            # Tránh cộng điểm trùng trong cùng một nguồn
            if product_id in seen:
                continue

            seen.add(product_id)

            if product_id not in fused:
                fused[product_id] = {
                    **product,
                    "rrf_score": 0.0,
                    "semantic_rank": None,
                    "keyword_rank": None,
                    "similarity": None,
                    "keyword_score": None,
                }

            fused[product_id]["rrf_score"] += (
                1.0 / (rrf_k + rank)
            )

            if source == "semantic":
                fused[product_id]["semantic_rank"] = rank
                fused[product_id]["similarity"] = (
                    product.get("similarity")
                )

            elif source == "keyword":
                fused[product_id]["keyword_rank"] = rank
                fused[product_id]["keyword_score"] = (
                    product.get("keyword_score")
                )

    add_results(semantic_results, "semantic")
    add_results(keyword_results, "keyword")

    ranked_results = sorted(
        fused.values(),
        key=lambda product: (
            -product["rrf_score"],
            product["id"]
        )
    )

    return ranked_results[:top_k]


# =====================================================
# 3. HYBRID SEARCH
# =====================================================

def hybrid_search(
    conn,
    model,
    query,
    top_k=5,
    candidate_limit=20,
    rrf_k=60
):
    """
    Pipeline:
    1. Query Analyzer
    2. Query Embedding
    3. Filtered Semantic Search
    4. Filtered Keyword Search
    5. RRF Fusion
    """

    if top_k < 1 or candidate_limit < 1:
        raise ValueError(
            "top_k và candidate_limit phải lớn hơn 0"
        )

    # STEP 1: Analyze query
    filters = analyze_query(query)

    # STEP 2: Embed user query
    query_vector = embed_query(model, query)

    # STEP 3: Semantic Search
    semantic_results = filtered_search(
        conn=conn,
        query_vector=query_vector,
        filters=filters,
        top_k=max(candidate_limit, top_k)
    )

    # STEP 4: Extract keyword
    search_text = extract_keywords(query, filters)

    # STEP 5: Keyword Search
    if search_text:
        keyword_results = keyword_search(
            conn=conn,
            query=query,
            filters=filters,
            top_k=max(candidate_limit, top_k)
        )
    else:
        keyword_results = []

    # STEP 6: RRF
    results = reciprocal_rank_fusion(
        semantic_results=semantic_results,
        keyword_results=keyword_results,
        rrf_k=rrf_k,
        top_k=top_k
    )

    return {
        "query": query,
        "filters": filters,
        "search_keywords": search_text,
        "semantic_count": len(semantic_results),
        "keyword_count": len(keyword_results),
        "results": results,
    }


# =====================================================
# 4. DISPLAY RESULTS
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
        f"\nSemantic Candidates: "
        f"{data['semantic_count']}"
    )

    print(
        f"Keyword Candidates: "
        f"{data['keyword_count']}"
    )

    print(
        f"\nHybrid Search - "
        f"Top {len(data['results'])}:\n"
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

        price = product.get("price")

        if price is not None:
            print(f"Giá: {price:,.0f} ₫")

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
            f"{product['semantic_rank']}"
        )

        print(
            f"Keyword Rank: "
            f"{product['keyword_rank']}"
        )

        print("-" * 55)


# =====================================================
# 5. MAIN
# =====================================================

def main():

    if TOP_K < 1 or CANDIDATE_LIMIT < 1:
        raise ValueError(
            "SEARCH_TOP_K và CANDIDATE_LIMIT phải lớn hơn 0"
        )

    logger.info("Đang tải BGE-M3...")
    model = load_model()

    logger.info("Đã tải embedding model")

    with psycopg.connect(**DB_CONFIG) as conn:

        register_vector(conn)

        logger.info("Đã kết nối PostgreSQL")

        print("\nTECHWISEAI - HYBRID SEARCH")
        print("Nhập 'exit' để thoát.\n")

        while True:

            try:
                query = input("Bạn: ").strip()

                if query.lower() in ("exit", "quit"):
                    break

                if not query:
                    continue

                data = hybrid_search(
                    conn=conn,
                    model=model,
                    query=query,
                    top_k=TOP_K,
                    candidate_limit=CANDIDATE_LIMIT,
                    rrf_k=RRF_K
                )

                display_results(data)

            except KeyboardInterrupt:
                print("\nĐã thoát.")
                break

            except Exception:
                conn.rollback()
                logger.exception(
                    "Lỗi Hybrid Search"
                )


if __name__ == "__main__":
    main()
