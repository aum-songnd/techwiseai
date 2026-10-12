from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

import numpy as np
import psycopg
import torch
import torch.nn.functional as F
from dotenv import load_dotenv
from pgvector.psycopg import register_vector
from PIL import Image, UnidentifiedImageError
from psycopg.rows import dict_row
from transformers import AutoModel, AutoProcessor


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_MODEL_NAME = "google/siglip-base-patch16-224"
EXPECTED_DIMENSION = 768


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Tìm các sản phẩm tương đồng với một ảnh bằng SigLIP."
    )
    parser.add_argument("image_path", type=Path, help="Đường dẫn ảnh truy vấn")
    parser.add_argument(
        "--top-k",
        type=int,
        default=10,
        help="Số sản phẩm cần trả về (mặc định: 10)",
    )
    parser.add_argument(
        "--candidate-limit",
        type=int,
        default=None,
        help="Số ảnh ứng viên lấy từ pgvector trước khi gom sản phẩm",
    )
    parser.add_argument(
        "--ef-search",
        type=int,
        default=100,
        help="Độ rộng tìm kiếm HNSW (mặc định: 100)",
    )
    return parser.parse_args()


def connect_database() -> psycopg.Connection:
    """Kết nối được với cả DB_URL kiểu JDBC và bộ biến PostgreSQL local."""
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


def extract_image_embedding(model_output: object) -> torch.Tensor:
    if isinstance(model_output, torch.Tensor):
        return model_output

    pooler_output = getattr(model_output, "pooler_output", None)
    if pooler_output is not None:
        return pooler_output

    image_embeds = getattr(model_output, "image_embeds", None)
    if image_embeds is not None:
        return image_embeds

    raise RuntimeError(
        f"Không đọc được image embedding từ {type(model_output).__name__}."
    )


def create_query_embedding(
    image_path: Path,
    model_name: str,
    model_revision: str,
) -> np.ndarray:
    if not image_path.is_file():
        raise FileNotFoundError(f"Không tìm thấy ảnh: {image_path}")

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Thiết bị xử lý: {device}")
    print(f"Model: {model_name}")
    print(f"Revision: {model_revision}")

    processor = AutoProcessor.from_pretrained(
        model_name,
        revision=model_revision,
    )
    model = AutoModel.from_pretrained(
        model_name,
        revision=model_revision,
    ).to(device)
    model.eval()

    try:
        with Image.open(image_path) as source_image:
            image = source_image.convert("RGB")
            inputs = processor(images=image, return_tensors="pt")
    except UnidentifiedImageError as exception:
        raise ValueError(f"File không phải ảnh hợp lệ: {image_path}") from exception

    inputs = {
        key: value.to(device) if isinstance(value, torch.Tensor) else value
        for key, value in inputs.items()
    }

    with torch.inference_mode():
        output = model.get_image_features(**inputs)
        embedding = extract_image_embedding(output).float()
        embedding = F.normalize(embedding, p=2, dim=-1)

    if embedding.shape != (1, EXPECTED_DIMENSION):
        raise RuntimeError(
            "Sai kích thước embedding: "
            f"mong đợi (1, {EXPECTED_DIMENSION}), nhận được {tuple(embedding.shape)}"
        )

    return embedding[0].cpu().numpy().astype(np.float32)


def search_similar_products(
    connection: psycopg.Connection,
    query_embedding: np.ndarray,
    model_name: str,
    model_revision: str,
    top_k: int,
    candidate_limit: int,
    ef_search: int,
) -> list[dict]:
    sql = """
        WITH image_candidates AS MATERIALIZED (
            SELECT
                pie.product_image_id,
                pie.embedding <=> %s AS distance
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
        ),
        ranked_products AS (
            SELECT
                p.id AS product_id,
                p.sku,
                p.name,
                p.brand,
                p.price,
                p.original_price,
                p.thumbnail_url,
                c.id AS category_id,
                c.name AS category_name,
                c.slug AS category_slug,
                pi.id AS matched_image_id,
                pi.image_url AS matched_image_url,
                pi.primary_image,
                pi.display_order,
                image_candidates.distance,
                ROW_NUMBER() OVER (
                    PARTITION BY p.id
                    ORDER BY
                        image_candidates.distance ASC,
                        pi.primary_image DESC,
                        pi.display_order ASC,
                        pi.id
                ) AS product_image_rank
            FROM image_candidates
            JOIN product_images pi
                ON pi.id = image_candidates.product_image_id
            JOIN products p
                ON p.id = pi.product_id
            JOIN categories c
                ON c.id = p.category_id
            WHERE p.active = TRUE
        )
        SELECT
            product_id,
            sku,
            name,
            brand,
            price,
            original_price,
            thumbnail_url,
            category_id,
            category_name,
            category_slug,
            matched_image_id,
            matched_image_url,
            primary_image,
            display_order,
            1 - distance AS similarity
        FROM ranked_products
        WHERE product_image_rank = 1
        ORDER BY distance ASC
        LIMIT %s
    """

    with connection.transaction():
        with connection.cursor() as cursor:
            cursor.execute(
    "SELECT set_config('hnsw.ef_search', %s, true)",
    (str(ef_search),),
)
            cursor.execute(
                sql,
                (
                    query_embedding,
                    model_name,
                    model_revision,
                    query_embedding,
                    candidate_limit,
                    top_k,
                ),
            )
            return list(cursor.fetchall())


def print_results(results: list[dict], candidate_limit: int) -> None:
    print("\nKẾT QUẢ TOP-K SẢN PHẨM")
    print(f"Số ảnh ứng viên đã xét: {candidate_limit}")

    if not results:
        print("Không tìm thấy sản phẩm phù hợp.")
        return

    for index, result in enumerate(results, start=1):
        print(f"\n{index}. {result['name']}")
        print(f"   SKU: {result['sku']}")
        print(f"   Brand: {result['brand'] or 'Chưa xác định'}")
        print(f"   Category: {result['category_name']}")
        print(f"   Product ID: {result['product_id']}")
        print(f"   Matched Image ID: {result['matched_image_id']}")
        print(f"   Primary: {result['primary_image']}")
        print(f"   Similarity: {float(result['similarity']):.4f}")
        print(f"   Price: {result['price']} VND")
        print(f"   Matched Image URL: {result['matched_image_url']}")


def main() -> int:
    args = parse_arguments()

    if args.top_k <= 0:
        raise ValueError("--top-k phải lớn hơn 0.")
    if args.ef_search <= 0:
        raise ValueError("--ef-search phải lớn hơn 0.")

    candidate_limit = args.candidate_limit or max(100, args.top_k * 20)
    if candidate_limit < args.top_k:
        raise ValueError("--candidate-limit phải lớn hơn hoặc bằng --top-k.")

    load_dotenv(PROJECT_ROOT / ".env")
    model_name = os.getenv("SIGLIP_MODEL_NAME", DEFAULT_MODEL_NAME)

    with connect_database() as connection:
        model_revision = resolve_model_revision(connection, model_name)
        query_embedding = create_query_embedding(
            args.image_path,
            model_name,
            model_revision,
        )
        results = search_similar_products(
            connection=connection,
            query_embedding=query_embedding,
            model_name=model_name,
            model_revision=model_revision,
            top_k=args.top_k,
            candidate_limit=candidate_limit,
            ef_search=args.ef_search,
        )

    print_results(results, candidate_limit)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        print("\nĐã dừng theo yêu cầu người dùng.", file=sys.stderr)
        raise SystemExit(130)
    except Exception as exception:
        print(f"\nLỖI: {exception}", file=sys.stderr)
        raise SystemExit(1)
