import argparse
import hashlib
import html
import json
import os
import re
from collections import defaultdict
from pathlib import Path

import numpy as np
import psycopg
import torch
import torch.nn.functional as F
from pgvector import Vector
from pgvector.psycopg import register_vector
from psycopg.rows import dict_row
from tqdm import tqdm
from transformers import AutoModel, AutoProcessor


PROJECT_ROOT = Path(__file__).resolve().parents[2]
ENV_PATH = PROJECT_ROOT / ".env"

DEFAULT_MODEL_NAME = "google/siglip-base-patch16-224"
DEFAULT_MODEL_REVISION = "main"
DEFAULT_PIPELINE_VERSION = "v1"

EXPECTED_DIMENSION = 768
MAX_TEXT_LENGTH = 64


def load_env_file(path: Path) -> None:
    if not path.exists():
        raise FileNotFoundError(f"Không tìm thấy file môi trường: {path}")

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()

        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()

        if (
            len(value) >= 2
            and value[0] == value[-1]
            and value[0] in {"'", '"'}
        ):
            value = value[1:-1]

        os.environ.setdefault(key, value)


def get_database_connection():
    return psycopg.connect(
        host="localhost",
        port=int(os.environ.get("POSTGRES_PORT", "5433")),
        dbname=os.environ["POSTGRES_DB"],
        user=os.environ["POSTGRES_USER"],
        password=os.environ["POSTGRES_PASSWORD"],
        row_factory=dict_row,
    )


def clean_text(value) -> str:
    if value is None:
        return ""

    text = html.unescape(str(value))
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text)

    return text.strip()


def flatten_specifications(value, prefix=""):
    items = []

    if value is None:
        return items

    if isinstance(value, str):
        try:
            value = json.loads(value)
        except json.JSONDecodeError:
            return [clean_text(value)]

    if isinstance(value, dict):
        for key in sorted(value.keys(), key=str):
            child_prefix = f"{prefix} {key}".strip()

            items.extend(
                flatten_specifications(
                    value[key],
                    child_prefix,
                )
            )

    elif isinstance(value, list):
        for item in value:
            items.extend(
                flatten_specifications(
                    item,
                    prefix,
                )
            )

    else:
        cleaned_value = clean_text(value)

        if cleaned_value:
            if prefix:
                items.append(f"{prefix}: {cleaned_value}")
            else:
                items.append(cleaned_value)

    return items


def build_text_content(product: dict) -> str:
    parts = []

    name = clean_text(product.get("name"))
    brand = clean_text(product.get("brand"))
    category = clean_text(product.get("category_name"))
    short_description = clean_text(
        product.get("short_description")
    )

    if name:
        parts.append(f"Product: {name}")

    if brand:
        parts.append(f"Brand: {brand}")

    if category:
        parts.append(f"Category: {category}")

    if short_description:
        parts.append(
            f"Description: {short_description[:1000]}"
        )

    specification_items = flatten_specifications(
        product.get("specifications")
    )

    if specification_items:
        parts.append(
            "Specifications: "
            + "; ".join(specification_items[:40])
        )

    return ". ".join(parts)


def vector_to_numpy(value) -> np.ndarray:
    if hasattr(value, "to_numpy"):
        array = value.to_numpy()

    elif hasattr(value, "to_list"):
        array = value.to_list()

    else:
        array = value

    result = np.asarray(
        array,
        dtype=np.float32,
    ).reshape(-1)

    if result.shape[0] != EXPECTED_DIMENSION:
        raise ValueError(
            "Embedding ảnh sai số chiều: "
            f"{result.shape[0]}"
        )

    return result


def normalize_numpy(vector: np.ndarray) -> np.ndarray:
    norm = np.linalg.norm(vector)

    if norm == 0:
        raise ValueError("Không thể chuẩn hóa vector có norm bằng 0")

    return (
        vector / norm
    ).astype(np.float32)


def aggregate_image_embeddings(image_rows):
    vectors = []
    weights = []

    for image_row in image_rows:
        vector = vector_to_numpy(
            image_row["embedding"]
        )

        # Ảnh chính có trọng số cao hơn ảnh phụ.
        weight = (
            2.0
            if image_row["primary_image"]
            else 1.0
        )

        vectors.append(vector)
        weights.append(weight)

    stacked_vectors = np.vstack(vectors)

    aggregated = np.average(
        stacked_vectors,
        axis=0,
        weights=np.asarray(weights, dtype=np.float32),
    )

    return normalize_numpy(aggregated)


def extract_feature_tensor(output):
    if isinstance(output, torch.Tensor):
        return output

    if getattr(output, "pooler_output", None) is not None:
        return output.pooler_output

    if getattr(output, "text_embeds", None) is not None:
        return output.text_embeds

    raise RuntimeError(
        "Không đọc được text embedding từ kiểu "
        f"{type(output).__name__}"
    )


def create_text_embeddings(
    texts,
    processor,
    model,
    device,
):
    inputs = processor(
        text=texts,
        padding="max_length",
        truncation=True,
        max_length=MAX_TEXT_LENGTH,
        return_tensors="pt",
    )

    inputs = {
        key: value.to(device)
        for key, value in inputs.items()
    }

    with torch.inference_mode():
        output = model.get_text_features(**inputs)
        features = extract_feature_tensor(output)

        normalized = F.normalize(
            features.float(),
            p=2,
            dim=-1,
        )

    result = normalized.cpu().numpy().astype(np.float32)

    if result.shape[1] != EXPECTED_DIMENSION:
        raise ValueError(
            "Text embedding sai số chiều: "
            f"{result.shape[1]}"
        )

    return result


def calculate_content_checksum(
    product,
    image_rows,
    text_content,
    model_name,
    model_revision,
    pipeline_version,
    image_weight,
    text_weight,
):
    payload = {
        "productId": str(product["product_id"]),
        "textContent": text_content,
        "images": [
            {
                "productImageId": str(
                    row["product_image_id"]
                ),
                "checksum": row["image_checksum"],
                "primary": row["primary_image"],
                "displayOrder": row["display_order"],
            }
            for row in image_rows
        ],
        "modelName": model_name,
        "modelRevision": model_revision,
        "pipelineVersion": pipeline_version,
        "imageWeight": image_weight,
        "textWeight": text_weight,
        "aggregationMethod": "weighted_mean",
    }

    serialized = json.dumps(
        payload,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )

    return hashlib.sha256(
        serialized.encode("utf-8")
    ).hexdigest()


def load_products_with_embeddings(
    connection,
    model_name,
    model_revision,
    limit,
):
    limit_clause = ""

    parameters = [
        model_name,
        model_revision,
    ]

    if limit is not None:
        limit_clause = "LIMIT %s"
        parameters.append(limit)

    product_query = f"""
        SELECT
            product.id AS product_id,
            product.name,
            product.brand,
            product.short_description,
            product.specifications,
            category.name AS category_name
        FROM products product
        JOIN categories category
            ON category.id = product.category_id
        WHERE product.active = TRUE
          AND category.active = TRUE
          AND EXISTS (
              SELECT 1
              FROM product_images product_image
              JOIN product_image_embeddings image_embedding
                ON image_embedding.product_image_id =
                   product_image.id
              WHERE product_image.product_id = product.id
                AND image_embedding.model_name = %s
                AND image_embedding.model_revision = %s
          )
        ORDER BY product.sku
        {limit_clause}
    """

    with connection.cursor() as cursor:
        cursor.execute(
            product_query,
            parameters,
        )

        products = cursor.fetchall()

    if not products:
        return []

    product_ids = [
        product["product_id"]
        for product in products
    ]

    image_query = """
        SELECT
            product_image.product_id,
            product_image.id AS product_image_id,
            product_image.primary_image,
            product_image.display_order,
            image_embedding.embedding,
            image_embedding.image_checksum
        FROM product_images product_image
        JOIN product_image_embeddings image_embedding
          ON image_embedding.product_image_id =
             product_image.id
        WHERE product_image.product_id = ANY(%s)
          AND image_embedding.model_name = %s
          AND image_embedding.model_revision = %s
        ORDER BY
            product_image.product_id,
            product_image.primary_image DESC,
            product_image.display_order,
            product_image.id
    """

    with connection.cursor() as cursor:
        cursor.execute(
            image_query,
            (
                product_ids,
                model_name,
                model_revision,
            ),
        )

        image_rows = cursor.fetchall()

    images_by_product = defaultdict(list)

    for image_row in image_rows:
        images_by_product[
            image_row["product_id"]
        ].append(image_row)

    result = []

    for product in products:
        product_images = images_by_product.get(
            product["product_id"],
            [],
        )

        if product_images:
            result.append(
                {
                    "product": product,
                    "images": product_images,
                }
            )

    return result


def load_existing_checksums(
    connection,
    model_name,
    model_revision,
    pipeline_version,
):
    query = """
        SELECT
            product_id,
            content_checksum
        FROM product_search_embeddings
        WHERE model_name = %s
          AND model_revision = %s
          AND pipeline_version = %s
    """

    with connection.cursor() as cursor:
        cursor.execute(
            query,
            (
                model_name,
                model_revision,
                pipeline_version,
            ),
        )

        rows = cursor.fetchall()

    return {
        row["product_id"]: row["content_checksum"]
        for row in rows
    }


def save_product_embedding(
    connection,
    product_id,
    model_name,
    model_revision,
    pipeline_version,
    image_embedding,
    text_embedding,
    multimodal_embedding,
    text_content,
    image_count,
    image_weight,
    text_weight,
    content_checksum,
):
    query = """
        INSERT INTO product_search_embeddings (
            product_id,
            model_name,
            model_revision,
            pipeline_version,
            image_embedding,
            text_embedding,
            multimodal_embedding,
            text_content,
            image_count,
            image_weight,
            text_weight,
            aggregation_method,
            content_checksum
        )
        VALUES (
            %s, %s, %s, %s,
            %s, %s, %s,
            %s, %s, %s, %s,
            'weighted_mean',
            %s
        )
        ON CONFLICT (
            product_id,
            model_name,
            model_revision,
            pipeline_version
        )
        DO UPDATE SET
            image_embedding =
                EXCLUDED.image_embedding,
            text_embedding =
                EXCLUDED.text_embedding,
            multimodal_embedding =
                EXCLUDED.multimodal_embedding,
            text_content =
                EXCLUDED.text_content,
            image_count =
                EXCLUDED.image_count,
            image_weight =
                EXCLUDED.image_weight,
            text_weight =
                EXCLUDED.text_weight,
            aggregation_method =
                EXCLUDED.aggregation_method,
            content_checksum =
                EXCLUDED.content_checksum,
            updated_at =
                CURRENT_TIMESTAMP
    """

    with connection.cursor() as cursor:
        cursor.execute(
            query,
            (
                product_id,
                model_name,
                model_revision,
                pipeline_version,
                Vector(image_embedding),
                Vector(text_embedding),
                Vector(multimodal_embedding),
                text_content,
                image_count,
                image_weight,
                text_weight,
                content_checksum,
            ),
        )


def parse_arguments():
    parser = argparse.ArgumentParser(
        description=(
            "Tạo multimodal product embedding "
            "từ ảnh và nội dung sản phẩm."
        )
    )

    parser.add_argument(
        "--model",
        default=DEFAULT_MODEL_NAME,
    )

    parser.add_argument(
        "--revision",
        default=DEFAULT_MODEL_REVISION,
    )

    parser.add_argument(
        "--pipeline-version",
        default=DEFAULT_PIPELINE_VERSION,
    )

    parser.add_argument(
        "--image-weight",
        type=float,
        default=0.8,
    )

    parser.add_argument(
        "--text-weight",
        type=float,
        default=0.2,
    )

    parser.add_argument(
        "--batch-size",
        type=int,
        default=16,
    )

    parser.add_argument(
        "--limit",
        type=int,
        default=None,
    )

    parser.add_argument(
        "--force",
        action="store_true",
    )

    return parser.parse_args()


def main():
    args = parse_arguments()

    if args.batch_size <= 0:
        raise ValueError("--batch-size phải lớn hơn 0")

    if args.limit is not None and args.limit <= 0:
        raise ValueError("--limit phải lớn hơn 0")

    if args.image_weight < 0 or args.text_weight < 0:
        raise ValueError("Trọng số không được âm")

    total_weight = (
        args.image_weight
        + args.text_weight
    )

    if abs(total_weight - 1.0) > 1e-6:
        raise ValueError(
            "--image-weight + --text-weight phải bằng 1"
        )

    load_env_file(ENV_PATH)

    device = torch.device(
        "cuda"
        if torch.cuda.is_available()
        else "cpu"
    )

    print(f"Thiết bị xử lý: {device}")
    print(f"Model: {args.model}")
    print(f"Revision: {args.revision}")
    print(f"Pipeline: {args.pipeline_version}")
    print(
        "Trọng số: "
        f"image={args.image_weight}, "
        f"text={args.text_weight}"
    )

    with get_database_connection() as connection:
        register_vector(connection)

        product_entries = load_products_with_embeddings(
            connection,
            args.model,
            args.revision,
            args.limit,
        )

        existing_checksums = load_existing_checksums(
            connection,
            args.model,
            args.revision,
            args.pipeline_version,
        )

        print(
            "Số sản phẩm có embedding ảnh:",
            len(product_entries),
        )

        if not product_entries:
            print("Không có sản phẩm để xử lý.")
            return

        prepared_entries = []

        for entry in product_entries:
            product = entry["product"]
            image_rows = entry["images"]

            text_content = build_text_content(product)

            if not text_content:
                print(
                    "Bỏ qua sản phẩm không có nội dung:",
                    product["product_id"],
                )
                continue

            image_embedding = aggregate_image_embeddings(
                image_rows
            )

            checksum = calculate_content_checksum(
                product=product,
                image_rows=image_rows,
                text_content=text_content,
                model_name=args.model,
                model_revision=args.revision,
                pipeline_version=args.pipeline_version,
                image_weight=args.image_weight,
                text_weight=args.text_weight,
            )

            prepared_entries.append(
                {
                    "product": product,
                    "images": image_rows,
                    "text_content": text_content,
                    "image_embedding": image_embedding,
                    "checksum": checksum,
                }
            )

        print("Đang tải processor...")
        processor = AutoProcessor.from_pretrained(
            args.model,
            revision=args.revision,
        )

        print("Đang tải mô hình SigLIP...")
        model = AutoModel.from_pretrained(
            args.model,
            revision=args.revision,
        )

        model.to(device)
        model.eval()

        created_count = 0
        updated_count = 0
        skipped_count = 0
        failed_count = 0

        progress = tqdm(
            total=len(prepared_entries),
            desc="Đang tạo product embedding",
            unit="sản phẩm",
        )

        for batch_start in range(
            0,
            len(prepared_entries),
            args.batch_size,
        ):
            batch_entries = prepared_entries[
                batch_start:
                batch_start + args.batch_size
            ]

            entries_to_process = []

            for entry in batch_entries:
                product_id = entry["product"]["product_id"]

                if (
                    not args.force
                    and existing_checksums.get(product_id)
                    == entry["checksum"]
                ):
                    skipped_count += 1
                    progress.update(1)
                    continue

                entries_to_process.append(entry)

            if not entries_to_process:
                continue

            texts = [
                entry["text_content"]
                for entry in entries_to_process
            ]

            try:
                text_embeddings = create_text_embeddings(
                    texts=texts,
                    processor=processor,
                    model=model,
                    device=device,
                )

                for index, entry in enumerate(
                    entries_to_process
                ):
                    product = entry["product"]
                    product_id = product["product_id"]

                    text_embedding = text_embeddings[index]
                    image_embedding = entry["image_embedding"]

                    multimodal_embedding = (
                        args.image_weight * image_embedding
                        + args.text_weight * text_embedding
                    )

                    multimodal_embedding = normalize_numpy(
                        multimodal_embedding
                    )

                    existed_before = (
                        product_id in existing_checksums
                    )

                    save_product_embedding(
                        connection=connection,
                        product_id=product_id,
                        model_name=args.model,
                        model_revision=args.revision,
                        pipeline_version=args.pipeline_version,
                        image_embedding=image_embedding,
                        text_embedding=text_embedding,
                        multimodal_embedding=multimodal_embedding,
                        text_content=entry["text_content"],
                        image_count=len(entry["images"]),
                        image_weight=args.image_weight,
                        text_weight=args.text_weight,
                        content_checksum=entry["checksum"],
                    )

                    if existed_before:
                        updated_count += 1
                    else:
                        created_count += 1

                    progress.update(1)

                connection.commit()

            except Exception as error:
                connection.rollback()

                failed_count += len(entries_to_process)
                progress.update(len(entries_to_process))

                print(
                    "\nLỗi batch bắt đầu tại",
                    batch_start,
                    ":",
                    error,
                )

        progress.close()

        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT COUNT(*) AS total
                FROM product_search_embeddings
                WHERE model_name = %s
                  AND model_revision = %s
                  AND pipeline_version = %s
                """,
                (
                    args.model,
                    args.revision,
                    args.pipeline_version,
                ),
            )

            total_in_database = cursor.fetchone()["total"]

    print("\nHOÀN THÀNH")
    print("- Tạo mới:", created_count)
    print("- Cập nhật:", updated_count)
    print("- Bỏ qua:", skipped_count)
    print("- Thất bại:", failed_count)
    print(
        "- Tổng product embedding trong DB:",
        total_in_database,
    )


if __name__ == "__main__":
    main()