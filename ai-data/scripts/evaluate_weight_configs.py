#!/usr/bin/env python3

import argparse
import json
import os
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import psycopg
from dotenv import load_dotenv
from pgvector.psycopg import register_vector
from tqdm import tqdm


MODEL_NAME = "google/siglip-base-patch16-224"
PIPELINE_VERSION = "v1"

# Các tỷ lệ cần thử nghiệm
WEIGHT_CONFIGS = [
    (1.0, 0.0),
    (0.9, 0.1),
    (0.8, 0.2),
    (0.7, 0.3),
    (0.6, 0.4),
]

PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(PROJECT_ROOT / ".env")


def parse_arguments():
    parser = argparse.ArgumentParser(
        description="Đánh giá các cấu hình trọng số multimodal"
    )

    parser.add_argument(
        "--ks",
        type=int,
        nargs="+",
        default=[1, 5, 10, 20, 50],
    )

    parser.add_argument(
        "--max-products",
        type=int,
        default=None,
    )

    parser.add_argument(
        "--output-dir",
        default="ai-data/evaluation",
    )

    return parser.parse_args()


def get_database_config():
    password = (
        os.getenv("POSTGRES_PASSWORD")
        or os.getenv("DB_PASSWORD")
    )

    if not password:
        raise RuntimeError(
            "Không tìm thấy mật khẩu database trong .env"
        )

    return {
        "host": os.getenv("POSTGRES_HOST", "localhost"),
        "port": int(os.getenv("POSTGRES_PORT", "5433")),
        "dbname": os.getenv("POSTGRES_DB", "regulation_db"),
        "user": (
            os.getenv("POSTGRES_USER")
            or os.getenv("DB_USERNAME")
            or "regulation_user"
        ),
        "password": password,
    }


def vector_to_numpy(vector):
    if vector is None:
        raise ValueError("Embedding không được phép null")

    if isinstance(vector, np.ndarray):
        return vector.astype(np.float32)

    if hasattr(vector, "to_list"):
        return np.asarray(
            vector.to_list(),
            dtype=np.float32,
        )

    if hasattr(vector, "to_numpy"):
        return np.asarray(
            vector.to_numpy(),
            dtype=np.float32,
        )

    return np.asarray(
        list(vector),
        dtype=np.float32,
    )


def normalize(vector):
    vector = np.asarray(vector, dtype=np.float32)
    norm = np.linalg.norm(vector)

    if norm == 0:
        raise ValueError("Không thể chuẩn hóa vector có norm bằng 0")

    return vector / norm


def load_products(cursor):
    cursor.execute(
        """
        SELECT
            pse.product_id,
            p.sku,
            p.name,
            p.brand,
            pse.image_embedding,
            pse.text_embedding,
            pse.model_revision
        FROM product_search_embeddings pse
        JOIN products p
            ON p.id = pse.product_id
        WHERE pse.model_name = %s
          AND pse.pipeline_version = %s
          AND p.active = TRUE
        ORDER BY p.id
        """,
        (
            MODEL_NAME,
            PIPELINE_VERSION,
        ),
    )

    products = []

    for row in cursor.fetchall():
        (
            product_id,
            sku,
            name,
            brand,
            image_embedding,
            text_embedding,
            model_revision,
        ) = row

        products.append(
            {
                "product_id": product_id,
                "sku": sku,
                "name": name,
                "brand": brand,
                "image_embedding": normalize(
                    vector_to_numpy(image_embedding)
                ),
                "text_embedding": normalize(
                    vector_to_numpy(text_embedding)
                ),
                "model_revision": model_revision,
            }
        )

    return products


def load_image_embeddings(cursor, model_revision):
    cursor.execute(
        """
        SELECT
            pi.product_id,
            pi.id,
            pi.primary_image,
            pi.display_order,
            pie.embedding
        FROM product_image_embeddings pie
        JOIN product_images pi
            ON pi.id = pie.product_image_id
        JOIN products p
            ON p.id = pi.product_id
        WHERE pie.model_name = %s
          AND pie.model_revision = %s
          AND p.active = TRUE
        ORDER BY
            pi.product_id,
            pi.primary_image DESC,
            pi.display_order,
            pi.id
        """,
        (
            MODEL_NAME,
            model_revision,
        ),
    )

    images_by_product = defaultdict(list)

    for row in cursor.fetchall():
        (
            product_id,
            image_id,
            primary_image,
            display_order,
            embedding,
        ) = row

        images_by_product[product_id].append(
            {
                "image_id": image_id,
                "primary_image": bool(primary_image),
                "display_order": display_order,
                "embedding": normalize(
                    vector_to_numpy(embedding)
                ),
            }
        )

    return images_by_product


def select_queries(
    products,
    images_by_product,
    max_products,
):
    queries = []

    for product in products:
        product_images = images_by_product.get(
            product["product_id"],
            [],
        )

        # Cần ít nhất hai ảnh để có thể giữ một ảnh
        # làm truy vấn và dùng các ảnh còn lại để tìm kiếm.
        if len(product_images) < 2:
            continue

        query_image = next(
            (
                image
                for image in product_images
                if image["primary_image"]
            ),
            product_images[0],
        )

        queries.append(
            {
                "product": product,
                "query_image": query_image,
            }
        )

    if max_products is not None:
        queries = queries[:max_products]

    return queries


def aggregate_images(
    product_images,
    excluded_image_id=None,
):
    weighted_sum = None
    total_weight = 0.0

    for image in product_images:
        if image["image_id"] == excluded_image_id:
            continue

        weight = (
            2.0
            if image["primary_image"]
            else 1.0
        )

        if weighted_sum is None:
            weighted_sum = (
                image["embedding"] * weight
            )
        else:
            weighted_sum += (
                image["embedding"] * weight
            )

        total_weight += weight

    if weighted_sum is None or total_weight == 0:
        raise RuntimeError(
            "Không còn ảnh để tổng hợp embedding"
        )

    return normalize(
        weighted_sum / total_weight
    )


def build_multimodal_vector(
    image_embedding,
    text_embedding,
    image_weight,
    text_weight,
):
    combined = (
        image_weight * image_embedding
        + text_weight * text_embedding
    )

    return normalize(combined)


def build_product_matrix(
    products,
    image_weight,
    text_weight,
):
    vectors = []

    for product in products:
        vector = build_multimodal_vector(
            product["image_embedding"],
            product["text_embedding"],
            image_weight,
            text_weight,
        )

        vectors.append(vector)

    return np.stack(vectors)


def evaluate_configuration(
    products,
    product_index,
    images_by_product,
    queries,
    ks,
    image_weight,
    text_weight,
):
    product_matrix = build_product_matrix(
        products,
        image_weight,
        text_weight,
    )

    hits = {
        k: 0
        for k in ks
    }

    reciprocal_rank_sum = 0.0
    ranks = []
    max_k = max(ks)

    for query in tqdm(
        queries,
        desc=(
            f"image={image_weight:.1f}, "
            f"text={text_weight:.1f}"
        ),
        unit="sản phẩm",
    ):
        expected_product = query["product"]
        query_image = query["query_image"]

        expected_product_id = (
            expected_product["product_id"]
        )

        expected_index = product_index[
            expected_product_id
        ]

        query_vector = query_image["embedding"]

        # Tính điểm của toàn bộ sản phẩm.
        similarities = product_matrix @ query_vector

        # Loại ảnh truy vấn khỏi sản phẩm đúng.
        held_out_image_embedding = aggregate_images(
            images_by_product[expected_product_id],
            excluded_image_id=query_image["image_id"],
        )

        held_out_multimodal_embedding = (
            build_multimodal_vector(
                held_out_image_embedding,
                expected_product["text_embedding"],
                image_weight,
                text_weight,
            )
        )

        # Thay điểm của sản phẩm đúng bằng điểm không rò rỉ.
        similarities[expected_index] = float(
            held_out_multimodal_embedding
            @ query_vector
        )

        ranked_indices = np.argsort(-similarities)

        positions = np.where(
            ranked_indices == expected_index
        )[0]

        if len(positions) == 0:
            rank = None
        else:
            rank = int(positions[0]) + 1

        ranks.append(rank)

        if rank is not None:
            for k in ks:
                if rank <= k:
                    hits[k] += 1

            if rank <= max_k:
                reciprocal_rank_sum += 1.0 / rank

    total = len(queries)

    metrics = {
        f"recall@{k}": (
            hits[k] / total
            if total > 0
            else 0.0
        )
        for k in ks
    }

    metrics[f"mrr@{max_k}"] = (
        reciprocal_rank_sum / total
        if total > 0
        else 0.0
    )

    not_found = sum(
        1
        for rank in ranks
        if rank is None or rank > max_k
    )

    return {
        "imageWeight": image_weight,
        "textWeight": text_weight,
        "metrics": metrics,
        "notFoundInTopK": not_found,
    }


def calculate_score(result, ks):
    metrics = result["metrics"]
    max_k = max(ks)

    # Ưu tiên Recall@5, Recall@10 và MRR.
    recall_5 = metrics.get("recall@5", 0.0)
    recall_10 = metrics.get("recall@10", 0.0)
    mrr = metrics.get(f"mrr@{max_k}", 0.0)

    return (
        0.4 * recall_5
        + 0.3 * recall_10
        + 0.3 * mrr
    )


def print_results(results, ks):
    metric_names = [
        f"recall@{k}"
        for k in ks
    ]

    metric_names.append(
        f"mrr@{max(ks)}"
    )

    print("\nKẾT QUẢ SO SÁNH TRỌNG SỐ")

    header = (
        f"{'Image':>7} "
        f"{'Text':>7} "
    )

    for metric_name in metric_names:
        header += f"{metric_name:>12} "

    header += f"{'Missing':>9}"

    print(header)
    print("-" * len(header))

    for result in results:
        line = (
            f"{result['imageWeight']:>7.1f} "
            f"{result['textWeight']:>7.1f} "
        )

        for metric_name in metric_names:
            value = result["metrics"][metric_name]
            line += f"{value:>12.4f} "

        line += (
            f"{result['notFoundInTopK']:>9}"
        )

        print(line)


def save_report(
    output_dir,
    model_revision,
    query_count,
    ks,
    results,
    best_result,
):
    destination = PROJECT_ROOT / output_dir
    destination.mkdir(
        parents=True,
        exist_ok=True,
    )

    timestamp = datetime.now(
        timezone.utc
    ).strftime("%Y%m%dT%H%M%SZ")

    report_path = destination / (
        f"weight_config_evaluation_{timestamp}.json"
    )

    report = {
        "model": MODEL_NAME,
        "modelRevision": model_revision,
        "pipelineVersion": PIPELINE_VERSION,
        "evaluationMethod": (
            "exact cosine search with "
            "leave-one-image-out"
        ),
        "evaluatedProducts": query_count,
        "ks": ks,
        "configurations": results,
        "recommendedConfiguration": best_result,
    }

    with report_path.open(
        "w",
        encoding="utf-8",
    ) as file:
        json.dump(
            report,
            file,
            ensure_ascii=False,
            indent=2,
        )

    return report_path


def main():
    arguments = parse_arguments()

    ks = sorted(set(arguments.ks))

    if not ks or any(k <= 0 for k in ks):
        raise ValueError(
            "Các giá trị K phải lớn hơn 0"
        )

    with psycopg.connect(
        **get_database_config()
    ) as connection:
        register_vector(connection)

        with connection.cursor() as cursor:
            products = load_products(cursor)

            if not products:
                raise RuntimeError(
                    "Không tìm thấy product embedding"
                )

            revisions = {
                product["model_revision"]
                for product in products
            }

            if len(revisions) != 1:
                raise RuntimeError(
                    "Có nhiều model revision khác nhau"
                )

            model_revision = next(iter(revisions))

            images_by_product = load_image_embeddings(
                cursor,
                model_revision,
            )

    queries = select_queries(
        products,
        images_by_product,
        arguments.max_products,
    )

    product_index = {
        product["product_id"]: index
        for index, product in enumerate(products)
    }

    print("Model:", MODEL_NAME)
    print("Revision:", model_revision)
    print("Pipeline:", PIPELINE_VERSION)
    print("Số product embedding:", len(products))
    print("Số sản phẩm đánh giá:", len(queries))
    print(
        "Phương pháp: exact cosine + "
        "leave-one-image-out"
    )

    results = []

    for image_weight, text_weight in WEIGHT_CONFIGS:
        result = evaluate_configuration(
            products=products,
            product_index=product_index,
            images_by_product=images_by_product,
            queries=queries,
            ks=ks,
            image_weight=image_weight,
            text_weight=text_weight,
        )

        result["selectionScore"] = calculate_score(
            result,
            ks,
        )

        results.append(result)

    best_result = max(
        results,
        key=lambda result: result["selectionScore"],
    )

    print_results(results, ks)

    print("\nCẤU HÌNH ĐỀ XUẤT")
    print(
        "- Image weight:",
        best_result["imageWeight"],
    )
    print(
        "- Text weight:",
        best_result["textWeight"],
    )
    print(
        "- Selection score:",
        f"{best_result['selectionScore']:.4f}",
    )

    report_path = save_report(
        arguments.output_dir,
        model_revision,
        len(queries),
        ks,
        results,
        best_result,
    )

    print("- Báo cáo:", report_path)

    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exception:
        print(f"\nLỖI: {exception}")
        raise SystemExit(1)