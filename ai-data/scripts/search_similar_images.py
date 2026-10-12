import argparse
import os
from pathlib import Path

import psycopg
import torch
import torch.nn.functional as F
from dotenv import load_dotenv
from pgvector.psycopg import register_vector
from PIL import Image
from transformers import AutoModel, AutoProcessor


MODEL_NAME = "google/siglip-base-patch16-224"
REQUESTED_REVISION = "main"
EXPECTED_DIMENSION = 768

PROJECT_ROOT = Path(__file__).resolve().parents[2]

load_dotenv(PROJECT_ROOT / ".env")


def parse_arguments():
    parser = argparse.ArgumentParser()

    parser.add_argument(
        "image_path",
        help="Đường dẫn đến ảnh cần tìm kiếm",
    )

    parser.add_argument(
        "--top-k",
        type=int,
        default=10,
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


def main():
    arguments = parse_arguments()

    if arguments.top_k <= 0:
        raise ValueError("top-k phải lớn hơn 0")

    image_path = Path(arguments.image_path)

    if not image_path.is_file():
        raise FileNotFoundError(
            f"Không tìm thấy ảnh: {image_path}"
        )

    device = torch.device(
        "cuda"
        if torch.cuda.is_available()
        else "cpu"
    )

    print("Thiết bị:", device)
    print("Ảnh truy vấn:", image_path)
    print("Đang tải SigLIP...")

    processor = AutoProcessor.from_pretrained(
        MODEL_NAME,
        revision=REQUESTED_REVISION,
    )

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

    print("Model revision:", resolved_revision)
    print("Đang tạo vector truy vấn...")

    with Image.open(image_path) as source_image:
        image = source_image.convert("RGB")

        inputs = processor(
            images=image,
            return_tensors="pt",
        )

    inputs = {
        key: value.to(device)
        for key, value in inputs.items()
        if isinstance(value, torch.Tensor)
    }

    with torch.inference_mode():
        output = model.get_image_features(**inputs)

    embedding = extract_embedding(output).float()

    normalized_embedding = F.normalize(
        embedding,
        p=2,
        dim=-1,
    )

    if normalized_embedding.shape[-1] != EXPECTED_DIMENSION:
        raise RuntimeError(
            "Vector truy vấn không đúng 768 chiều"
        )

    query_vector = (
        normalized_embedding[0]
        .cpu()
        .numpy()
    )

    print("Đang tìm kiếm trong pgvector...")

    with psycopg.connect(
        **get_database_config()
    ) as connection:
        register_vector(connection)

        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT set_config('hnsw.ef_search', '100', true)"
            )

            cursor.execute(
                """
                SELECT
                    p.id,
                    p.sku,
                    p.name,
                    p.brand,
                    pi.id AS product_image_id,
                    pi.image_url,
                    pi.primary_image,
                    1 - (pie.embedding <=> %s)
                        AS similarity
                FROM product_image_embeddings pie
                JOIN product_images pi
                    ON pi.id = pie.product_image_id
                JOIN products p
                    ON p.id = pi.product_id
                WHERE pie.model_name = %s
                  AND pie.model_revision = %s
                  AND p.active = TRUE
                ORDER BY pie.embedding <=> %s
                LIMIT %s
                """,
                (
                    query_vector,
                    MODEL_NAME,
                    resolved_revision,
                    query_vector,
                    arguments.top_k,
                ),
            )

            results = cursor.fetchall()

    print("\nKẾT QUẢ TOP-K")

    for index, result in enumerate(results, start=1):
        (
            product_id,
            sku,
            product_name,
            brand,
            product_image_id,
            image_url,
            primary_image,
            similarity,
        ) = result

        print(f"\n{index}. {product_name}")
        print("   SKU:", sku)
        print("   Brand:", brand)
        print("   Product ID:", product_id)
        print("   Image ID:", product_image_id)
        print("   Primary:", primary_image)
        print(
            "   Similarity:",
            f"{float(similarity):.4f}",
        )
        print("   Image URL:", image_url)


if __name__ == "__main__":
    main()