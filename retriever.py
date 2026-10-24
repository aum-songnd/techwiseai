import os
import re
import unicodedata
from decimal import Decimal
from pathlib import Path

import psycopg
from dotenv import load_dotenv
from pgvector.psycopg import register_vector
from sentence_transformers import SentenceTransformer

from query_analyzer import analyze_query

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

MODEL_NAME = "intfloat/multilingual-e5-small"
model = SentenceTransformer(MODEL_NAME, device="cpu")


def explicit_price_limit(question):
    """Kiểm tra bổ sung cho một số mẫu giới hạn giá rõ ràng."""
    text = unicodedata.normalize("NFD", question.casefold())
    text = "".join(
        char for char in text
        if unicodedata.category(char) != "Mn"
    ).replace("đ", "d")

    matches = list(re.finditer(
        r"\b(khong vuot qua|khong qua|toi da|duoi)"
        r"\s+(\d+(?:[.,]\d+)?)\s*(trieu|ty|nghin)\b",
        text,
    ))

    if not matches:
        return None

    if len(matches) != 1 or re.search(
        r"\b(khong duoi|khong phai|hoac)\b", text
    ):
        raise ValueError("Điều kiện giá cần được làm rõ")

    match = matches[0]

    multiplier = {
        "nghin": 1_000,
        "trieu": 1_000_000,
        "ty": 1_000_000_000,
    }[match.group(3)]

    amount = int(
        Decimal(match.group(2).replace(",", ".")) * multiplier
    )

    operator = "lt" if match.group(1) == "duoi" else "lte"
    return amount, operator


def build_filters(analysis):
    conditions = ["embedding_model = %s"]
    params = [MODEL_NAME]

    if analysis.brand:
        conditions.append("metadata ->> 'brand' = %s")
        params.append(analysis.brand)

    if analysis.product_line:
        line = (
            analysis.product_line.strip()
            .replace("!", "!!")
            .replace("%", "!%")
            .replace("_", "!_")
        )

        if not line:
            raise ValueError("Tên dòng máy không hợp lệ")

        conditions.append(
            "metadata ->> 'name' ILIKE %s ESCAPE '!'"
        )
        params.append(f"%{line}%")

    if analysis.price_limit is not None:
        operator = {
            "lt": "<",
            "lte": "<=",
        }[analysis.price_operator]

        conditions.append(
            f"(metadata ->> 'current_price')::numeric {operator} %s"
        )
        params.append(analysis.price_limit)

    if analysis.min_ram_gb is not None:
        conditions.append(
            "(metadata ->> 'ram_gb')::numeric >= %s"
        )
        params.append(analysis.min_ram_gb)

    return " AND ".join(conditions), params


def make_item(row):
    chunk_id, content, metadata = row

    return {
        "id": chunk_id,
        "text": content,
        "metadata": metadata,
        "rrf_score": 0.0,
        "semantic_rank": None,
        "keyword_rank": None,
        "light_rank": None,
    }


def hybrid_search(
    question,
    candidate_limit=50,
    top_k=5,
    analysis=None,
):
    if not question.strip():
        return []

    if analysis is None:
        analysis = analyze_query(question)

    # Kiểm tra lại những mẫu giá đơn giản đã hỗ trợ.
    explicit_price = explicit_price_limit(question)

    if explicit_price is not None:
        amount, operator = explicit_price

        analysis = analysis.model_copy(update={
            "price_limit": amount,
            "price_operator": operator,
        })

    print("Analyzer:", analysis.model_dump())

    where_clause, params = build_filters(analysis)

    with psycopg.connect(
        host=os.getenv("PGHOST", "localhost"),
        port=int(os.getenv("PGPORT", "5432")),
        dbname=os.environ["PGDATABASE"],
        user=os.environ["PGUSER"],
        password=os.environ["PGPASSWORD"],
    ) as conn:
        register_vector(conn)

        with conn.cursor() as cursor:
            # Hỏi thông số một mã máy: chỉ tìm đúng mã.
            if (
                analysis.intent == "specifications"
                and analysis.model_code
            ):
                pattern = (
                    r"(^|[^[:alnum:]])"
                    + re.escape(analysis.model_code.strip())
                    + r"([^[:alnum:]]|$)"
                )

                cursor.execute(
                    f"""
                    SELECT id, content, metadata
                    FROM product_chunks
                    WHERE {where_clause}
                      AND (
                          metadata ->> 'name' ~* %s
                          OR metadata ->> 'sku' ~* %s
                      )
                    ORDER BY id
                    """,
                    [*params, pattern, pattern],
                )

                results = []

                for row in cursor.fetchall():
                    item = make_item(row)
                    item["request_intent"] = "specifications"
                    results.append(item)

                return results

            # Semantic search.
            query_vector = model.encode(
                "query: " + question,
                normalize_embeddings=True,
                convert_to_numpy=True,
            )

            cursor.execute(
                f"""
                SELECT id, content, metadata
                FROM product_chunks
                WHERE {where_clause}
                ORDER BY embedding <=> %s, id
                LIMIT %s
                """,
                [*params, query_vector, candidate_limit],
            )

            semantic_results = cursor.fetchall()

            # Keyword search.
            keyword_results = []
            keywords = []

            for word in analysis.keywords:
                word = word.strip()

                if not word:
                    continue

                # Bỏ cụm giá khỏi keyword search.
                # Giữ các cấu hình như 32GB và mã máy.
                if re.fullmatch(
                    r"\d+(?:[.,]\d+)?\s*"
                    r"(?:triệu|trieu|tr|tỷ|ty|nghìn|nghin|vnđ|vnd|đ)",
                    word,
                    flags=re.IGNORECASE,
                ):
                    continue

                if word not in keywords:
                    keywords.append(word)

            print("Keyword sau kiểm tra:", keywords)

            if keywords:
                expression = " || ".join(
                    "plainto_tsquery('simple', %s)"
                    for _ in keywords
                )

                cursor.execute(
                    f"""
                    WITH keyword_query AS (
                        SELECT ({expression}) AS query
                    )
                    SELECT p.id, p.content, p.metadata
                    FROM product_chunks AS p
                    CROSS JOIN keyword_query AS q
                    WHERE {where_clause}
                      AND p.search_vector @@ q.query
                    ORDER BY
                        ts_rank_cd(p.search_vector, q.query) DESC,
                        p.id
                    LIMIT %s
                    """,
                    [*keywords, *params, candidate_limit],
                )

                keyword_results = cursor.fetchall()

            # Bổ sung ứng viên nhẹ nếu người dùng ưu tiên trọng lượng.
            light_results = []

            if analysis.prefer_light:
                cursor.execute(
                    f"""
                    SELECT id, content, metadata
                    FROM product_chunks
                    WHERE {where_clause}
                      AND (metadata ->> 'weight_kg')::numeric > 0
                    ORDER BY
                        (metadata ->> 'weight_kg')::numeric ASC,
                        id
                    LIMIT %s
                    """,
                    [*params, candidate_limit],
                )

                light_results = cursor.fetchall()

    # Gộp thứ hạng.
    combined = {}

    for source, rows in [
        ("semantic", semantic_results),
        ("keyword", keyword_results),
        ("light", light_results),
    ]:
        for rank, row in enumerate(rows, start=1):
            item = combined.setdefault(row[0], make_item(row))
            item["rrf_score"] += 1 / (60 + rank)
            item[f"{source}_rank"] = rank

    return sorted(
        combined.values(),
        key=lambda item: (-item["rrf_score"], item["id"]),
    )[:top_k]