import argparse
import csv
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

PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(PROJECT_ROOT / ".env")


def parse_arguments():
    parser = argparse.ArgumentParser(
        description="Đánh giá tìm kiếm sản phẩm multimodal"
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
        "--pipeline-version",
        default=PIPELINE_VERSION,
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
    norm = np.linalg.norm(vector)

    if norm == 0:
        raise ValueError("Không thể chuẩn hóa vector có norm bằng 0")

    return vector / norm


def load_products(cursor, pipeline_version):
    cursor.execute(
        """
        SELECT
            pse.product_id,
            p.sku,
            p.name,
            p.brand,
            pse.text_embedding,
            pse.multimodal_embedding,
            pse.image_weight,
            pse.text_weight,
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
            pipeline_version,
        ),
    )

    products = []

    for row in cursor.fetchall():
        (
            product_id,
            sku,
            name,
            brand,
            text_embedding,
            multimodal_embedding,
            image_weight,
            text_weight,
            model_revision,
        ) = row

        products.append(
            {
                "product_id": product_id,
                "sku": sku,
                "name": name,
                "brand": brand,
                "text_embedding": normalize(
                    vector_to_numpy(text_embedding)
                ),
                "multimodal_embedding": normalize(
                    vector_to_numpy(multimodal_embedding)
                ),
                "image_weight": float(image_weight),
                "text_weight": float(text_weight),
                "model_revision": model_revision,
            }
        )

    return products


def load_image_embeddings(cursor, model_revision):
    cursor.execute(
        """
        SELECT
            pi.product_id,
            pi.id AS image_id,
            pi.primary_image,
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
        product_id, image_id, primary_image, embedding = row

        images_by_product[product_id].append(
            {
                "image_id": image_id,
                "primary_image": bool(primary_image),
                "embedding": normalize(
                    vector_to_numpy(embedding)
                ),
            }
        )

    return images_by_product


def choose_queries(products, images_by_product, max_products):
    queries = []

    for product in products:
        product_id = product["product_id"]
        images = images_by_product.get(product_id, [])

        # Phải có ít nhất 2 ảnh để sau khi giữ lại một ảnh
        # sản phẩm vẫn còn ảnh dùng xây dựng vector.
        if len(images) < 2:
            continue

        query_image = next(
            (
                image
                for image in images
                if image["primary_image"]
            ),
            images[0],
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


def rebuild_product_embedding(
    product,
    product_images,
    excluded_image_id,
):
    remaining_images = [
        image
        for image in product_images
        if image["image_id"] != excluded_image_id
    ]

    if not remaining_images:
        raise RuntimeError(
            f"Sản phẩm {product['product_id']} không còn ảnh"
        )

    weighted_vectors = []
    total_weight = 0.0

    for image in remaining_images:
        image_weight = (
            2.0
            if image["primary_image"]
            else 1.0
        )

        weighted_vectors.append(
            image["embedding"] * image_weight
        )

        total_weight += image_weight

    image_embedding = normalize(
        np.sum(weighted_vectors, axis=0) / total_weight
    )

    multimodal_embedding = normalize(
        product["image_weight"] * image_embedding
        + product["text_weight"] * product["text_embedding"]
    )

    return multimodal_embedding


def evaluate(products, images_by_product, queries, ks):
    product_index = {
        product["product_id"]: index
        for index, product in enumerate(products)
    }

    product_matrix = np.stack(
        [
            product["multimodal_embedding"]
            for product in products
        ]
    )

    hits = {
        k: 0
        for k in ks
    }

    reciprocal_rank_sum = 0.0
    details = []

    max_k = max(ks)

    for query in tqdm(
        queries,
        desc="Đang đánh giá multimodal",
        unit="sản phẩm",
    ):
        expected_product = query["product"]
        query_image = query["query_image"]
        expected_product_id = expected_product["product_id"]

        query_vector = query_image["embedding"]

        similarities = product_matrix @ query_vector

        # Thay vector sản phẩm đúng bằng vector đã loại ảnh truy vấn,
        # tránh rò rỉ dữ liệu khi đánh giá.
        rebuilt_embedding = rebuild_product_embedding(
            expected_product,
            images_by_product[expected_product_id],
            query_image["image_id"],
        )

        expected_index = product_index[expected_product_id]

        similarities[expected_index] = float(
            rebuilt_embedding @ query_vector
        )

        ranked_indices = np.argsort(-similarities)

        expected_position = np.where(
            ranked_indices == expected_index
        )[0]

        rank = (
            int(expected_position[0]) + 1
            if len(expected_position) > 0
            else None
        )

        if rank is not None:
            for k in ks:
                if rank <= k:
                    hits[k] += 1

            if rank <= max_k:
                reciprocal_rank_sum += 1.0 / rank

        top_indices = ranked_indices[:max_k]

        top_products = [
            {
                "rank": index + 1,
                "productId": str(
                    products[product_position]["product_id"]
                ),
                "sku": products[product_position]["sku"],
                "name": products[product_position]["name"],
                "similarity": float(
                    similarities[product_position]
                ),
            }
            for index, product_position in enumerate(top_indices)
        ]

        details.append(
            {
                "expectedProductId": str(expected_product_id),
                "expectedSku": expected_product["sku"],
                "expectedName": expected_product["name"],
                "queryImageId": str(query_image["image_id"]),
                "expectedRank": rank,
                "expectedSimilarity": float(
                    similarities[expected_index]
                ),
                "topProducts": top_products,
            }
        )

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
        for detail in details
        if (
            detail["expectedRank"] is None
            or detail["expectedRank"] > max_k
        )
    )

    return metrics, not_found, details


def save_reports(
    output_dir,
    pipeline_version,
    model_revision,
    query_count,
    metrics,
    not_found,
    details,
):
    output_path = PROJECT_ROOT / output_dir
    output_path.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now(
        timezone.utc
    ).strftime("%Y%m%dT%H%M%SZ")

    json_path = output_path / (
        f"multimodal_search_evaluation_{timestamp}.json"
    )

    csv_path = output_path / (
        f"multimodal_search_evaluation_{timestamp}.csv"
    )

    report = {
        "model": MODEL_NAME,
        "modelRevision": model_revision,
        "pipelineVersion": pipeline_version,
        "evaluatedProducts": query_count,
        "metrics": metrics,
        "notFoundInTopK": not_found,
        "evaluationMethod": (
            "leave-one-image-out with leakage prevention"
        ),
        "details": details,
    }

    with json_path.open(
        "w",
        encoding="utf-8",
    ) as file:
        json.dump(
            report,
            file,
            ensure_ascii=False,
            indent=2,
        )

    with csv_path.open(
        "w",
        encoding="utf-8",
        newline="",
    ) as file:
        writer = csv.writer(file)

        writer.writerow(
            [
                "expected_product_id",
                "expected_sku",
                "expected_name",
                "query_image_id",
                "expected_rank",
                "expected_similarity",
                "top_1_product_id",
                "top_1_sku",
                "top_1_name",
                "top_1_similarity",
            ]
        )

        for detail in details:
            top_1 = (
                detail["topProducts"][0]
                if detail["topProducts"]
                else {}
            )

            writer.writerow(
                [
                    detail["expectedProductId"],
                    detail["expectedSku"],
                    detail["expectedName"],
                    detail["queryImageId"],
                    detail["expectedRank"],
                    detail["expectedSimilarity"],
                    top_1.get("productId"),
                    top_1.get("sku"),
                    top_1.get("name"),
                    top_1.get("similarity"),
                ]
            )

    return json_path, csv_path


def main():
    arguments = parse_arguments()

    ks = sorted(set(arguments.ks))

    if not ks or any(k <= 0 for k in ks):
        raise ValueError("Các giá trị K phải lớn hơn 0")

    with psycopg.connect(
        **get_database_config()
    ) as connection:
        register_vector(connection)

        with connection.cursor() as cursor:
            products = load_products(
                cursor,
                arguments.pipeline_version,
            )

            if not products:
                raise RuntimeError(
                    "Không tìm thấy product embedding"
                )

            model_revisions = {
                product["model_revision"]
                for product in products
            }

            if len(model_revisions) != 1:
                raise RuntimeError(
                    "Dữ liệu có nhiều model revision khác nhau"
                )

            model_revision = next(iter(model_revisions))

            images_by_product = load_image_embeddings(
                cursor,
                model_revision,
            )

    queries = choose_queries(
        products,
        images_by_product,
        arguments.max_products,
    )

    print("Model:", MODEL_NAME)
    print("Revision:", model_revision)
    print("Pipeline:", arguments.pipeline_version)
    print("Số product embedding:", len(products))
    print("Số sản phẩm đánh giá:", len(queries))
    print(
        "Phương pháp: leave-one-image-out, "
        "đã loại rò rỉ ảnh truy vấn"
    )

    metrics, not_found, details = evaluate(
        products,
        images_by_product,
        queries,
        ks,
    )

    json_path, csv_path = save_reports(
        arguments.output_dir,
        arguments.pipeline_version,
        model_revision,
        len(queries),
        metrics,
        not_found,
        details,
    )

    print("\nKẾT QUẢ ĐÁNH GIÁ MULTIMODAL")

    for metric_name, value in metrics.items():
        print(f"- {metric_name}: {value:.4f}")

    print(
        f"- Không tìm thấy trong Top-{max(ks)}:",
        not_found,
    )

    print("- Báo cáo JSON:", json_path)
    print("- Chi tiết CSV:", csv_path)

    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exception:
        print(f"\nLỖI: {exception}")
        raise SystemExit(1)