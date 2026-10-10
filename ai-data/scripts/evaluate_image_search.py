#!/usr/bin/env python3
"""Đánh giá tìm kiếm ảnh sản phẩm bằng phép thử hold-one-image-out.

Mỗi sản phẩm đủ điều kiện đóng góp đúng một ảnh truy vấn. Ảnh truy vấn bị loại
khỏi tập ứng viên; hệ thống phải tìm lại đúng product_id thông qua những ảnh còn
lại của sản phẩm. Script tính Recall@K và MRR, đồng thời xuất báo cáo JSON/CSV.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import psycopg
from dotenv import load_dotenv
from pgvector.psycopg import register_vector
from psycopg.rows import dict_row
from tqdm import tqdm


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_MODEL_NAME = "google/siglip-base-patch16-224"
DEFAULT_OUTPUT_DIR = PROJECT_ROOT / "ai-data" / "evaluation"


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Đánh giá tìm kiếm ảnh sản phẩm bằng Recall@K và MRR."
    )
    parser.add_argument(
        "--ks",
        type=int,
        nargs="+",
        default=[1, 5, 10],
        help="Các mốc K cần đánh giá (mặc định: 1 5 10)",
    )
    parser.add_argument(
        "--max-products",
        type=int,
        default=0,
        help="Giới hạn số sản phẩm; 0 nghĩa là đánh giá toàn bộ",
    )
    parser.add_argument(
        "--candidate-limit",
        type=int,
        default=200,
        help="Số ảnh ứng viên lấy từ pgvector cho mỗi truy vấn",
    )
    parser.add_argument(
        "--ef-search",
        type=int,
        default=100,
        help="Độ rộng tìm kiếm HNSW (mặc định: 100)",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help="Thư mục lưu báo cáo JSON và CSV",
    )
    return parser.parse_args()


def validate_arguments(args: argparse.Namespace) -> list[int]:
    ks = sorted(set(args.ks))

    if not ks or any(k <= 0 for k in ks):
        raise ValueError("Mọi giá trị trong --ks phải lớn hơn 0.")
    if args.max_products < 0:
        raise ValueError("--max-products không được âm.")
    if args.candidate_limit < max(ks):
        raise ValueError("--candidate-limit phải lớn hơn hoặc bằng K lớn nhất.")
    if args.ef_search <= 0:
        raise ValueError("--ef-search phải lớn hơn 0.")

    return ks


def connect_database() -> psycopg.Connection:
    database_url = (
        os.getenv("AI_DATABASE_URL")
        or os.getenv("DATABASE_URL")
        or os.getenv("DB_URL")
    )
    username = os.getenv("DB_USERNAME") or os.getenv("POSTGRES_USER")
    password = os.getenv("DB_PASSWORD") or os.getenv("POSTGRES_PASSWORD")

    if database_url and database_url.startswith("jdbc:"):
        database_url = database_url.removeprefix("jdbc:")

    if database_url and "${" not in database_url:
        connection = psycopg.connect(
            database_url,
            user=username,
            password=password,
            row_factory=dict_row,
        )
    else:
        connection = psycopg.connect(
            host=os.getenv("DB_HOST") or os.getenv("POSTGRES_HOST", "localhost"),
            port=int(os.getenv("DB_PORT") or os.getenv("POSTGRES_PORT", "5433")),
            dbname=os.getenv("POSTGRES_DB", "regulation_db"),
            user=username or "regulation_user",
            password=password,
            row_factory=dict_row,
        )

    register_vector(connection)
    return connection


def resolve_model_revision(
    connection: psycopg.Connection,
    model_name: str,
) -> str:
    configured_revision = os.getenv("SIGLIP_MODEL_REVISION")
    if configured_revision:
        return configured_revision

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT model_revision, COUNT(*) AS embedding_count
            FROM product_image_embeddings
            WHERE model_name = %s
            GROUP BY model_revision
            ORDER BY embedding_count DESC, model_revision
            LIMIT 1
            """,
            (model_name,),
        )
        row = cursor.fetchone()

    if row is None:
        raise RuntimeError(
            f"Không tìm thấy embedding của model {model_name!r} trong database."
        )

    return row["model_revision"]


def load_evaluation_queries(
    connection: psycopg.Connection,
    model_name: str,
    model_revision: str,
    max_products: int,
) -> list[dict[str, Any]]:
    """Mỗi sản phẩm chọn một ảnh; chỉ lấy sản phẩm có ít nhất hai embedding."""
    sql = """
        WITH eligible_images AS (
            SELECT
                p.id AS product_id,
                p.sku,
                p.name AS product_name,
                p.brand,
                pi.id AS query_image_id,
                pi.image_url AS query_image_url,
                pie.embedding,
                COUNT(*) OVER (
                    PARTITION BY p.id
                ) AS embedding_count,
                ROW_NUMBER() OVER (
                    PARTITION BY p.id
                    ORDER BY
                        pi.primary_image DESC,
                        pi.display_order ASC,
                        pi.created_at ASC,
                        pi.id
                ) AS selection_rank
            FROM product_image_embeddings pie
            JOIN product_images pi
                ON pi.id = pie.product_image_id
            JOIN products p
                ON p.id = pi.product_id
            WHERE pie.model_name = %s
              AND pie.model_revision = %s
              AND p.active = TRUE
        )
        SELECT
            product_id,
            sku,
            product_name,
            brand,
            query_image_id,
            query_image_url,
            embedding,
            embedding_count
        FROM eligible_images
        WHERE embedding_count >= 2
          AND selection_rank = 1
        ORDER BY sku, product_id
    """

    with connection.cursor() as cursor:
        cursor.execute(sql, (model_name, model_revision))
        queries = list(cursor.fetchall())

    if max_products > 0:
        queries = queries[:max_products]

    return queries


def retrieve_product_candidates(
    connection: psycopg.Connection,
    query_embedding: np.ndarray,
    excluded_image_id: Any,
    model_name: str,
    model_revision: str,
    candidate_limit: int,
    max_k: int,
) -> list[dict[str, Any]]:
    """Lấy ảnh gần nhất rồi giữ kết quả đầu tiên của mỗi product_id."""
    sql = """
        SELECT
            p.id AS product_id,
            p.sku,
            p.name AS product_name,
            p.brand,
            pi.id AS matched_image_id,
            pi.image_url AS matched_image_url,
            1 - (pie.embedding <=> %s) AS similarity
        FROM product_image_embeddings pie
        JOIN product_images pi
            ON pi.id = pie.product_image_id
        JOIN products p
            ON p.id = pi.product_id
        WHERE pie.model_name = %s
          AND pie.model_revision = %s
          AND pie.product_image_id <> %s
          AND p.active = TRUE
        ORDER BY pie.embedding <=> %s
        LIMIT %s
    """

    with connection.cursor() as cursor:
        cursor.execute(
            sql,
            (
                query_embedding,
                model_name,
                model_revision,
                excluded_image_id,
                query_embedding,
                candidate_limit,
            ),
        )
        image_candidates = cursor.fetchall()

    products: list[dict[str, Any]] = []
    seen_product_ids: set[str] = set()

    for candidate in image_candidates:
        product_id = str(candidate["product_id"])
        if product_id in seen_product_ids:
            continue

        seen_product_ids.add(product_id)
        products.append(candidate)

        if len(products) >= max_k:
            break

    return products


def vector_to_numpy(value: Any) -> np.ndarray:
    """Chuyển kiểu vector của nhiều phiên bản pgvector-python sang NumPy."""
    if isinstance(value, np.ndarray):
        return value.astype(np.float32, copy=False).reshape(-1)

    for method_name in ("to_numpy", "to_list"):
        method = getattr(value, method_name, None)
        if callable(method):
            return np.asarray(method(), dtype=np.float32).reshape(-1)

    for attribute_name in ("value", "_value"):
        raw_value = getattr(value, attribute_name, None)
        if raw_value is not None:
            return np.asarray(raw_value, dtype=np.float32).reshape(-1)

    try:
        return np.asarray(list(value), dtype=np.float32).reshape(-1)
    except TypeError as exception:
        raise TypeError(
            "Không thể chuyển embedding từ pgvector sang NumPy; "
            f"kiểu nhận được: {type(value).__name__}"
        ) from exception


def evaluate_queries(
    connection: psycopg.Connection,
    queries: list[dict[str, Any]],
    model_name: str,
    model_revision: str,
    ks: list[int],
    candidate_limit: int,
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    max_k = max(ks)
    hit_counts = {k: 0 for k in ks}
    reciprocal_rank_sum = 0.0
    details: list[dict[str, Any]] = []

    for query in tqdm(queries, desc="Đang đánh giá sản phẩm", unit="sản phẩm"):
        query_embedding = vector_to_numpy(query["embedding"])
        candidates = retrieve_product_candidates(
            connection=connection,
            query_embedding=query_embedding,
            excluded_image_id=query["query_image_id"],
            model_name=model_name,
            model_revision=model_revision,
            candidate_limit=candidate_limit,
            max_k=max_k,
        )

        expected_product_id = str(query["product_id"])
        expected_rank: int | None = None

        for rank, candidate in enumerate(candidates, start=1):
            if str(candidate["product_id"]) == expected_product_id:
                expected_rank = rank
                break

        for k in ks:
            if expected_rank is not None and expected_rank <= k:
                hit_counts[k] += 1

        reciprocal_rank = 0.0 if expected_rank is None else 1.0 / expected_rank
        reciprocal_rank_sum += reciprocal_rank

        top1 = candidates[0] if candidates else None
        expected_candidate = (
            candidates[expected_rank - 1] if expected_rank is not None else None
        )

        detail: dict[str, Any] = {
            "expected_product_id": expected_product_id,
            "expected_sku": query["sku"],
            "expected_product_name": query["product_name"],
            "expected_brand": query["brand"],
            "query_image_id": str(query["query_image_id"]),
            "query_image_url": query["query_image_url"],
            "product_embedding_count": int(query["embedding_count"]),
            "expected_rank": expected_rank,
            "reciprocal_rank": reciprocal_rank,
            "expected_similarity": (
                float(expected_candidate["similarity"])
                if expected_candidate is not None
                else None
            ),
            "top1_product_id": (
                str(top1["product_id"]) if top1 is not None else None
            ),
            "top1_sku": top1["sku"] if top1 is not None else None,
            "top1_product_name": (
                top1["product_name"] if top1 is not None else None
            ),
            "top1_brand": top1["brand"] if top1 is not None else None,
            "top1_similarity": (
                float(top1["similarity"]) if top1 is not None else None
            ),
        }

        for k in ks:
            detail[f"hit_at_{k}"] = (
                expected_rank is not None and expected_rank <= k
            )

        details.append(detail)

    total = len(queries)
    metrics = {
        "evaluated_products": total,
        "recall": {
            f"recall_at_{k}": hit_counts[k] / total if total else 0.0
            for k in ks
        },
        f"mrr_at_{max_k}": reciprocal_rank_sum / total if total else 0.0,
        "not_found_in_top_k": sum(
            detail["expected_rank"] is None for detail in details
        ),
    }

    return metrics, details


def save_reports(
    output_dir: Path,
    model_name: str,
    model_revision: str,
    ks: list[int],
    candidate_limit: int,
    ef_search: int,
    metrics: dict[str, Any],
    details: list[dict[str, Any]],
) -> tuple[Path, Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    json_path = output_dir / f"image_search_evaluation_{timestamp}.json"
    csv_path = output_dir / f"image_search_evaluation_{timestamp}.csv"

    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "evaluation_method": "hold-one-image-out, one query per product",
        "model_name": model_name,
        "model_revision": model_revision,
        "ks": ks,
        "candidate_limit": candidate_limit,
        "hnsw_ef_search": ef_search,
        "metrics": metrics,
        "queries": details,
    }

    with json_path.open("w", encoding="utf-8") as file:
        json.dump(report, file, ensure_ascii=False, indent=2)

    if details:
        with csv_path.open("w", encoding="utf-8", newline="") as file:
            writer = csv.DictWriter(file, fieldnames=list(details[0].keys()))
            writer.writeheader()
            writer.writerows(details)
    else:
        csv_path.touch()

    return json_path, csv_path


def print_summary(
    model_name: str,
    model_revision: str,
    metrics: dict[str, Any],
    json_path: Path,
    csv_path: Path,
) -> None:
    print("\nKẾT QUẢ ĐÁNH GIÁ")
    print(f"- Model: {model_name}")
    print(f"- Revision: {model_revision}")
    print(f"- Số sản phẩm đánh giá: {metrics['evaluated_products']}")

    for metric_name, value in metrics["recall"].items():
        print(f"- {metric_name.replace('_at_', '@')}: {value:.4f}")

    mrr_name = next(key for key in metrics if key.startswith("mrr_at_"))
    print(f"- {mrr_name.replace('_at_', '@')}: {metrics[mrr_name]:.4f}")
    print(f"- Không tìm thấy trong Top-K: {metrics['not_found_in_top_k']}")
    print(f"- Báo cáo JSON: {json_path}")
    print(f"- Chi tiết CSV: {csv_path}")


def main() -> int:
    args = parse_arguments()
    ks = validate_arguments(args)

    load_dotenv(PROJECT_ROOT / ".env")
    model_name = os.getenv("SIGLIP_MODEL_NAME", DEFAULT_MODEL_NAME)

    with connect_database() as connection:
        model_revision = resolve_model_revision(connection, model_name)

        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT set_config('hnsw.ef_search', %s, true)",
                (str(args.ef_search),),
            )

        queries = load_evaluation_queries(
            connection=connection,
            model_name=model_name,
            model_revision=model_revision,
            max_products=args.max_products,
        )

        if not queries:
            raise RuntimeError(
                "Không có sản phẩm nào có ít nhất hai embedding để đánh giá."
            )

        print(f"Model: {model_name}")
        print(f"Revision: {model_revision}")
        print(f"Số sản phẩm sẽ đánh giá: {len(queries)}")

        metrics, details = evaluate_queries(
            connection=connection,
            queries=queries,
            model_name=model_name,
            model_revision=model_revision,
            ks=ks,
            candidate_limit=args.candidate_limit,
        )

    json_path, csv_path = save_reports(
        output_dir=args.output_dir,
        model_name=model_name,
        model_revision=model_revision,
        ks=ks,
        candidate_limit=args.candidate_limit,
        ef_search=args.ef_search,
        metrics=metrics,
        details=details,
    )
    print_summary(
        model_name=model_name,
        model_revision=model_revision,
        metrics=metrics,
        json_path=json_path,
        csv_path=csv_path,
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        print("\nĐã dừng đánh giá theo yêu cầu người dùng.", file=sys.stderr)
        raise SystemExit(130)
    except Exception as exception:
        print(f"\nLỖI: {exception}", file=sys.stderr)
        raise SystemExit(1)
