import argparse
import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path

import psycopg
import torch
import torch.nn.functional as F
from dotenv import load_dotenv
from pgvector.psycopg import register_vector
from PIL import Image
from tqdm import tqdm
from transformers import AutoModel, AutoProcessor


MODEL_NAME = "google/siglip-base-patch16-224"
REQUESTED_REVISION = "main"
EXPECTED_DIMENSION = 768

PROJECT_ROOT = Path(__file__).resolve().parents[2]
AI_DATA_DIRECTORY = PROJECT_ROOT / "ai-data"
MANIFEST_PATH = AI_DATA_DIRECTORY / "manifests" / "images.jsonl"
FAILURE_LOG_PATH = (
    AI_DATA_DIRECTORY / "logs" / "embedding_failures.jsonl"
)

load_dotenv(PROJECT_ROOT / ".env")


def parse_arguments():
    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--batch-size",
        type=int,
        default=4,
    )

    parser.add_argument(
        "--limit",
        type=int,
        default=None,
    )

    parser.add_argument(
        "--force",
        action="store_true",
        help="Tạo lại embedding kể cả khi checksum không đổi",
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


def read_manifest(limit=None):
    records = []
    seen_image_ids = set()

    with MANIFEST_PATH.open("r", encoding="utf-8") as file:
        for line in file:
            if not line.strip():
                continue

            record = json.loads(line)
            image_id = record["imageId"]

            if image_id in seen_image_ids:
                continue

            seen_image_ids.add(image_id)
            records.append(record)

            if limit is not None and len(records) >= limit:
                break

    return records


def calculate_sha256(path):
    digest = hashlib.sha256()

    with path.open("rb") as file:
        for chunk in iter(
            lambda: file.read(1024 * 1024),
            b"",
        ):
            digest.update(chunk)

    return digest.hexdigest()


def write_failure(record, error):
    FAILURE_LOG_PATH.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    failure = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "imageId": record.get("imageId"),
        "productId": record.get("productId"),
        "sku": record.get("sku"),
        "localPath": record.get("localPath"),
        "error": str(error),
    }

    with FAILURE_LOG_PATH.open(
        "a",
        encoding="utf-8",
    ) as file:
        file.write(
            json.dumps(
                failure,
                ensure_ascii=False,
            )
            + "\n"
        )


def extract_embedding(output):
    if isinstance(output, torch.Tensor):
        return output

    if getattr(output, "pooler_output", None) is not None:
        return output.pooler_output

    if getattr(output, "image_embeds", None) is not None:
        return output.image_embeds

    raise RuntimeError(
        f"Không đọc được embedding từ "
        f"{type(output).__name__}"
    )


def get_database_state(connection, model_revision):
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT id::text
            FROM product_images
            """
        )

        valid_image_ids = {
            row[0]
            for row in cursor.fetchall()
        }

        cursor.execute(
            """
            SELECT
                product_image_id::text,
                image_checksum
            FROM product_image_embeddings
            WHERE model_name = %s
              AND model_revision = %s
            """,
            (
                MODEL_NAME,
                model_revision,
            ),
        )

        existing_embeddings = {
            row[0]: row[1].strip()
            for row in cursor.fetchall()
        }

    return valid_image_ids, existing_embeddings


def save_embeddings(
    connection,
    prepared_records,
    vectors,
    model_revision,
):
    values = []

    for index, prepared in enumerate(prepared_records):
        values.append(
            (
                prepared["imageId"],
                MODEL_NAME,
                model_revision,
                vectors[index],
                prepared["checksum"],
            )
        )

    with connection.cursor() as cursor:
        cursor.executemany(
            """
            INSERT INTO product_image_embeddings (
                product_image_id,
                model_name,
                model_revision,
                embedding,
                image_checksum
            )
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (
                product_image_id,
                model_name,
                model_revision
            )
            DO UPDATE SET
                embedding = EXCLUDED.embedding,
                image_checksum = EXCLUDED.image_checksum,
                updated_at = CURRENT_TIMESTAMP
            """,
            values,
        )

    connection.commit()


def main():
    arguments = parse_arguments()

    if arguments.batch_size <= 0:
        raise ValueError("batch-size phải lớn hơn 0")

    records = read_manifest(arguments.limit)

    print("Tổng số bản ghi sẽ kiểm tra:", len(records))

    device = torch.device(
        "cuda"
        if torch.cuda.is_available()
        else "cpu"
    )

    print("Thiết bị:", device)
    print("Đang tải processor...")

    processor = AutoProcessor.from_pretrained(
        MODEL_NAME,
        revision=REQUESTED_REVISION,
    )

    print("Đang tải SigLIP...")

    model = AutoModel.from_pretrained(
        MODEL_NAME,
        revision=REQUESTED_REVISION,
    )

    model.to(device)
    model.eval()

    resolved_revision = (
        getattr(model.config, "_commit_hash", None)
        or REQUESTED_REVISION
    )

    print("Model:", MODEL_NAME)
    print("Revision:", resolved_revision)

    statistics = {
        "created": 0,
        "updated": 0,
        "skipped": 0,
        "failed": 0,
    }

    database_config = get_database_config()

    with psycopg.connect(**database_config) as connection:
        register_vector(connection)

        valid_image_ids, existing_embeddings = (
            get_database_state(
                connection,
                resolved_revision,
            )
        )

        with tqdm(
            total=len(records),
            desc="Đang tạo embedding",
            unit="ảnh",
        ) as progress:
            for start in range(
                0,
                len(records),
                arguments.batch_size,
            ):
                batch = records[
                    start:start + arguments.batch_size
                ]

                prepared_records = []
                images = []

                for record in batch:
                    try:
                        image_id = record["imageId"]

                        if image_id not in valid_image_ids:
                            raise RuntimeError(
                                "Ảnh không tồn tại trong "
                                "bảng product_images"
                            )

                        image_path = (
                            AI_DATA_DIRECTORY
                            / record["localPath"]
                        )

                        if not image_path.is_file():
                            raise FileNotFoundError(image_path)

                        checksum = calculate_sha256(image_path)

                        if checksum != record["sha256"]:
                            raise RuntimeError(
                                "Checksum không khớp manifest"
                            )

                        existing_checksum = (
                            existing_embeddings.get(image_id)
                        )

                        if (
                            not arguments.force
                            and existing_checksum == checksum
                        ):
                            statistics["skipped"] += 1
                            progress.update(1)
                            continue

                        with Image.open(image_path) as source:
                            image = source.convert("RGB")

                        images.append(image)

                        prepared_records.append(
                            {
                                "record": record,
                                "imageId": image_id,
                                "checksum": checksum,
                                "existed": (
                                    image_id
                                    in existing_embeddings
                                ),
                            }
                        )

                    except Exception as error:
                        statistics["failed"] += 1
                        write_failure(record, error)
                        progress.update(1)

                if not prepared_records:
                    continue

                try:
                    inputs = processor(
                        images=images,
                        return_tensors="pt",
                    )

                    inputs = {
                        key: value.to(device)
                        for key, value in inputs.items()
                        if isinstance(value, torch.Tensor)
                    }

                    with torch.inference_mode():
                        output = model.get_image_features(
                            **inputs
                        )

                    embeddings = extract_embedding(output)
                    embeddings = embeddings.float()

                    normalized_embeddings = F.normalize(
                        embeddings,
                        p=2,
                        dim=-1,
                    )

                    if (
                        normalized_embeddings.shape[-1]
                        != EXPECTED_DIMENSION
                    ):
                        raise RuntimeError(
                            "Embedding không đúng 768 chiều"
                        )

                    vectors = (
                        normalized_embeddings
                        .cpu()
                        .numpy()
                    )

                    save_embeddings(
                        connection,
                        prepared_records,
                        vectors,
                        resolved_revision,
                    )

                    for prepared in prepared_records:
                        image_id = prepared["imageId"]
                        checksum = prepared["checksum"]

                        if prepared["existed"]:
                            statistics["updated"] += 1
                        else:
                            statistics["created"] += 1

                        existing_embeddings[image_id] = checksum

                except Exception as error:
                    connection.rollback()

                    for prepared in prepared_records:
                        statistics["failed"] += 1
                        write_failure(
                            prepared["record"],
                            error,
                        )

                finally:
                    for image in images:
                        image.close()

                    progress.update(
                        len(prepared_records)
                    )

        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT COUNT(*)
                FROM product_image_embeddings
                WHERE model_name = %s
                  AND model_revision = %s
                """,
                (
                    MODEL_NAME,
                    resolved_revision,
                ),
            )

            total_saved = cursor.fetchone()[0]

    print("\nHOÀN THÀNH")
    print("- Tạo mới:", statistics["created"])
    print("- Cập nhật:", statistics["updated"])
    print("- Bỏ qua:", statistics["skipped"])
    print("- Thất bại:", statistics["failed"])
    print("- Tổng embedding trong DB:", total_saved)

    if statistics["failed"] > 0:
        print("- File lỗi:", FAILURE_LOG_PATH)


if __name__ == "__main__":
    main()