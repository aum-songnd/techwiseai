
import os
import re
import json
import logging
import unicodedata
from pathlib import Path

import psycopg
from dotenv import load_dotenv

from query_analyzer import analyze_query


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

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)


# =====================================================
# 2. QUERY NORMALIZATION
# =====================================================

def normalize_text(text):
    text = unicodedata.normalize("NFC", text)
    return text.lower().strip()


STOP_WORDS = {
    "tôi", "mình", "em", "anh", "chị",
    "muốn", "cần", "tìm", "mua",
    "cho", "có", "loại", "nào",
    "giúp", "với", "được", "không",
    "giá", "khoảng", "tầm",
    "dưới", "trên", "hơn", "từ",
    "đến", "tới", "triệu", "tr",
    "nghìn", "ngàn", "k",
    "không quá", "tối đa", "tối thiểu",
    "là", "một", "chiếc", "cái",
}


# =====================================================
# 3. EXTRACT SEARCH KEYWORDS
# =====================================================

def extract_keywords(query, filters):
    """
    Loại bỏ:
    - Các cụm giá tiền
    - Stop words
    - Danh mục
    - Thương hiệu đã được SQL Filtering xử lý

    Giữ lại từ khóa về nhu cầu hoặc tên model.
    """

    text = normalize_text(query)

    # Xóa biểu thức giá
    text = re.sub(
        r"\d+(?:[.,]\d+)?\s*"
        r"(triệu|tr|nghìn|ngàn|k|m)\b",
        " ",
        text
    )

    # Xóa thương hiệu đã được lọc
    if filters.get("brand"):
        brand = re.escape(filters["brand"].lower())

        text = re.sub(
            rf"(?<!\w){brand}(?!\w)",
            " ",
            text
        )

    # Xóa từ danh mục thông dụng
    category_terms = {
        "laptop": ["laptop", "latop", "notebook"],
        "dien-thoai": ["điện thoại", "smartphone"],
        "tai-nghe": ["tai nghe", "headphone"],
        "may-anh": ["máy ảnh", "camera"],
        "linh-kien": ["linh kiện"],
        "phu-kien": ["phụ kiện"],
    }

    category = filters.get("category")

    if category:
        for term in category_terms.get(category, []):
            text = re.sub(
                rf"(?<!\w){re.escape(term)}(?!\w)",
                " ",
                text
            )

    # Giữ chữ, số và dấu nối của mã model/SKU
    tokens = re.findall(
        r"[\w]+(?:[-.][\w]+)*",
        text,
        flags=re.UNICODE
    )

    keywords = [
        token
        for token in tokens
        if token not in STOP_WORDS
        and not token.isdigit()
    ]

    return " ".join(keywords)


# =====================================================
# 4. KEYWORD SEARCH
# =====================================================

def keyword_search(conn, query, filters, top_k=5):
    """
    Keyword Search gồm:
    - PostgreSQL Full-Text Search
    - Exact SKU matching
    - Name matching
    - SQL Filtering

    Không yêu cầu rag_embedding.
    """

    if top_k < 1:
        raise ValueError("top_k phải lớn hơn 0")

    search_text = extract_keywords(query, filters)

    conditions = [
        "p.active = TRUE",
        "c.active = TRUE"
    ]

    params = {
        "top_k": top_k
    }

    # Category filtering
    if filters.get("category"):
        conditions.append(
            "c.slug = %(category)s"
        )
        params["category"] = filters["category"]

    # Brand filtering
    if filters.get("brand"):
        conditions.append(
            "LOWER(p.brand) = LOWER(%(brand)s)"
        )
        params["brand"] = filters["brand"]

    # Minimum price
    if filters.get("min_price") is not None:
        conditions.append(
            "p.price > %(min_price)s"
        )
        params["min_price"] = filters["min_price"]

    # Maximum price
    if filters.get("max_price") is not None:
        conditions.append(
            "p.price <= %(max_price)s"
        )
        params["max_price"] = filters["max_price"]

    where_clause = " AND ".join(conditions)

    # Nếu chỉ có bộ lọc, không có keyword:
    # Trả về sản phẩm hợp lệ theo thứ tự ổn định.
    if not search_text:

        sql_query = f"""
            SELECT
                p.id,
                p.name,
                p.sku,
                p.brand,
                p.price,
                c.name,
                p.rag_document,
                0.0 AS keyword_score
            FROM products p
            JOIN categories c
                ON p.category_id = c.id
            WHERE {where_clause}
            ORDER BY p.name, p.id
            LIMIT %(top_k)s
        """

    else:

        params["search_text"] = search_text
        params["name_pattern"] = f"%{search_text}%"
        params["sku_pattern"] = f"%{search_text}%"

        sql_query = f"""
            WITH ranked AS (
                SELECT
                    p.id,
                    p.name,
                    p.sku,
                    p.brand,
                    p.price,
                    c.name AS category,
                    p.rag_document,

                    (
                        CASE
                            WHEN LOWER(p.sku) =
                                 LOWER(%(search_text)s)
                            THEN 10.0
                            ELSE 0.0
                        END
                        +
                        CASE
                            WHEN p.name ILIKE
                                 %(name_pattern)s
                            THEN 5.0
                            ELSE 0.0
                        END
                        +
                        CASE
                            WHEN p.sku ILIKE
                                 %(sku_pattern)s
                            THEN 5.0
                            ELSE 0.0
                        END
                        +
                        ts_rank_cd(
                            to_tsvector(
                                'simple',
                                COALESCE(p.name, '') || ' ' ||
                                COALESCE(p.brand, '') || ' ' ||
                                COALESCE(p.rag_document, '')
                            ),
                            plainto_tsquery(
                                'simple',
                                %(search_text)s
                            )
                        )
                    ) AS keyword_score

                FROM products p
                JOIN categories c
                    ON p.category_id = c.id
                WHERE {where_clause}
            )
            SELECT *
            FROM ranked
            WHERE keyword_score > 0
            ORDER BY keyword_score DESC, name, id
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
            "price": float(row[4]) if row[4] is not None else None,
            "category": row[5],
            "rag_document": row[6],
            "keyword_score": float(row[7])
        }
        for row in rows
    ]


# =====================================================
# 5. DISPLAY RESULTS
# =====================================================

def display_results(results):

    print(f"\nTìm thấy {len(results)} sản phẩm:")

    if not results:
        print("Không có sản phẩm phù hợp.")
        return

    for index, product in enumerate(results, 1):

        print(f"\n[{index}] {product['name']}")
        print(f"SKU: {product['sku']}")
        print(f"Thương hiệu: {product['brand']}")

        if product["price"] is not None:
            print(f"Giá: {product['price']:,.0f} ₫")

        print(
            f"Keyword Score: "
            f"{product['keyword_score']:.4f}"
        )


# =====================================================
# 6. MAIN
# =====================================================

def main():

    if TOP_K < 1:
        raise ValueError("SEARCH_TOP_K phải lớn hơn 0")

    with psycopg.connect(**DB_CONFIG) as conn:

        logger.info("Đã kết nối PostgreSQL")

        print("\nTECHWISEAI - KEYWORD SEARCH")
        print("Nhập 'exit' để thoát.\n")

        while True:

            try:
                query = input("Bạn: ").strip()

                if query.lower() in ("exit", "quit"):
                    break

                if not query:
                    continue

                filters = analyze_query(query)

                search_text = extract_keywords(
                    query,
                    filters
                )

                print("\nQuery Analyzer:")
                print(json.dumps(
                    filters,
                    ensure_ascii=False,
                    indent=2
                ))

                print(
                    f"\nSearch Keywords: "
                    f"{search_text or '(không có)'}"
                )

                results = keyword_search(
                    conn,
                    query,
                    filters,
                    TOP_K
                )

                display_results(results)

            except KeyboardInterrupt:
                print("\nĐã thoát.")
                break

            except Exception:
                conn.rollback()
                logger.exception("Lỗi Keyword Search")


if __name__ == "__main__":
    main()
