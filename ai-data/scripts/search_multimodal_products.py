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
MODEL_REVISION = "main"
PIPELINE_VERSION = "v1"
EXPECTED_DIMENSION = 768

PROJECT_ROOT = Path(__file__).resolve().parents[2]

load_dotenv(PROJECT_ROOT / ".env")


def parse_arguments():
    parser = argparse.ArgumentParser(
        description=(
            "Tìm kiếm sản phẩm bằng multimodal "
            "product embedding"
        )
    )

    parser.add_argument(
        "image_path",
        help="Đường dẫn đến ảnh cần tìm kiếm",
    )

    parser.add_argument(
        "--top-k",
        type=int,
        default=10,
    )

    parser.add_argument(
        "--ef-search",
        type=int,
        default=100,
    )

    parser.add_argument(
        "--pipeline-version",
        default=PIPELINE_VERSION,
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
        "dbname": os.getenv(
            "POSTGRES_DB",
            "regulation_db",
        ),
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
        "Không đọc được embedding từ "
        f"{type(output).__name__}"
    )


def main():
    arguments = parse_arguments()

    if arguments.top_k <= 0:
        raise ValueError("top-k phải lớn hơn 0")

    if arguments.ef_search <= 0:
        raise ValueError("ef-search phải lớn hơn 0")

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
    print("Model:", MODEL_NAME)
    print("Revision:", MODEL_REVISION)
    print("Pipeline:", arguments.pipeline_version)
    print("Đang tải SigLIP...")

    processor = AutoProcessor.from_pretrained(
        MODEL_NAME,
        revision=MODEL_REVISION,
    )

    model = AutoModel.from_pretrained(
        MODEL_NAME,
        revision=MODEL_REVISION,
    )

    model.to(device)
    model.eval()

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

    print("Đang tìm multimodal product embedding...")

    with psycopg.connect(
        **get_database_config()
    ) as connection:
        register_vector(connection)

        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT set_config(
                    'hnsw.ef_search',
                    %s,
                    true
                )
                """,
                (str(arguments.ef_search),),
            )

            cursor.execute(
                """
                SELECT
                    product.id,
                    product.sku,
                    product.name,
                    product.brand,
                    category.name AS category_name,
                    product.price,
                    product.thumbnail_url,

                    search_embedding.image_count,
                    search_embedding.image_weight,
                    search_embedding.text_weight,

                    1 - (
                        search_embedding.image_embedding
                        <=> %s
                    ) AS image_similarity,

                    1 - (
                        search_embedding.text_embedding
                        <=> %s
                    ) AS text_similarity,

                    1 - (
                        search_embedding.multimodal_embedding
                        <=> %s
                    ) AS multimodal_similarity

                FROM product_search_embeddings
                    search_embedding

                JOIN products product
                    ON product.id =
                       search_embedding.product_id

                JOIN categories category
                    ON category.id =
                       product.category_id

                WHERE search_embedding.model_name = %s
                  AND search_embedding.model_revision = %s
                  AND search_embedding.pipeline_version = %s
                  AND product.active = TRUE
                  AND category.active = TRUE

                ORDER BY
                    search_embedding.multimodal_embedding
                    <=> %s

                LIMIT %s
                """,
                (
                    query_vector,
                    query_vector,
                    query_vector,
                    MODEL_NAME,
                    MODEL_REVISION,
                    arguments.pipeline_version,
                    query_vector,
                    arguments.top_k,
                ),
            )

            results = cursor.fetchall()

    print("\nKẾT QUẢ TOP-K MULTIMODAL")

    if not results:
        print("Không tìm thấy sản phẩm phù hợp.")
        return

    for index, result in enumerate(results, start=1):
        (
            product_id,
            sku,
            product_name,
            brand,
            category_name,
            price,
            thumbnail_url,
            image_count,
            image_weight,
            text_weight,
            image_similarity,
            text_similarity,
            multimodal_similarity,
        ) = result

        print(f"\n{index}. {product_name}")
        print("   SKU:", sku)
        print("   Brand:", brand)
        print("   Category:", category_name)
        print("   Product ID:", product_id)
        print("   Price:", price, "VND")
        print("   Số ảnh tổng hợp:", image_count)

        print(
            "   Image similarity:",
            f"{float(image_similarity):.4f}",
        )

        print(
            "   Text similarity:",
            f"{float(text_similarity):.4f}",
        )

        print(
            "   Multimodal similarity:",
            f"{float(multimodal_similarity):.4f}",
        )

        print(
            "   Trọng số:",
            f"image={image_weight}, text={text_weight}",
        )

        print("   Thumbnail:", thumbnail_url)


if __name__ == "__main__":
    main()