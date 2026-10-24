import json
import os
from pathlib import Path

import numpy as np
import psycopg
from dotenv import load_dotenv
from pgvector.psycopg import register_vector
from psycopg.types.json import Jsonb

BASE_DIR = Path(__file__).resolve().parent
INPUT_FILE = BASE_DIR / "laptop_embeddings.json"

MODEL_NAME = "intfloat/multilingual-e5-small"
DIMENSION = 384

load_dotenv(BASE_DIR / ".env")


def main():
    # 1. Đọc file embedding.
    with INPUT_FILE.open("r", encoding="utf-8") as file:
        data = json.load(file)

    if data.get("model_name") != MODEL_NAME:
        raise ValueError("File embedding sử dụng mô hình khác E5-small")

    if data.get("dimension") != DIMENSION:
        raise ValueError("Vector phải có 384 chiều")

    items = data.get("items")
    if not isinstance(items, list) or not items:
        raise ValueError("File không có danh sách items hợp lệ")

    # 2. Kiểm tra toàn bộ dữ liệu trước khi ghi database.
    rows = []
    seen_ids = set()

    for item in items:
        chunk_id = str(item["id"])

        if chunk_id in seen_ids:
            raise ValueError(f"Trùng ID: {chunk_id}")
        seen_ids.add(chunk_id)

        content = item.get("text")
        if not isinstance(content, str) or not content.strip():
            raise ValueError(f"Chunk {chunk_id} thiếu nội dung")

        metadata = item.get("metadata")
        if not isinstance(metadata, dict):
            raise ValueError(f"Chunk {chunk_id} thiếu metadata hợp lệ")

        product_id = metadata.get("product_id")
        if (
            isinstance(product_id, bool)
            or not isinstance(product_id, int)
        ):
            raise ValueError(f"Chunk {chunk_id} thiếu product_id dạng số nguyên")

        vector = np.asarray(item["embedding"], dtype=np.float32)

        if vector.shape != (DIMENSION,):
            raise ValueError(f"Chunk {chunk_id} không có vector 384 chiều")

        if not np.isfinite(vector).all():
            raise ValueError(f"Chunk {chunk_id} có vector không hợp lệ")

        if not np.any(vector):
            raise ValueError(f"Chunk {chunk_id} có vector toàn số 0")

        rows.append((
            chunk_id,
            product_id,
            content,
            Jsonb(metadata),
            vector,
            MODEL_NAME,
        ))

    # 3. Kết nối PostgreSQL.
    with psycopg.connect(
        host=os.getenv("PGHOST", "localhost"),
        port=int(os.getenv("PGPORT", "5432")),
        dbname=os.environ["PGDATABASE"],
        user=os.environ["PGUSER"],
        password=os.environ["PGPASSWORD"],
    ) as conn:
        register_vector(conn)

        # 4. Import; cập nhật nếu ID đã tồn tại.
        with conn.cursor() as cursor:
            cursor.executemany(
                """
                INSERT INTO product_chunks (
                    id,
                    product_id,
                    content,
                    metadata,
                    embedding,
                    embedding_model
                )
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    product_id = EXCLUDED.product_id,
                    content = EXCLUDED.content,
                    metadata = EXCLUDED.metadata,
                    embedding = EXCLUDED.embedding,
                    embedding_model = EXCLUDED.embedding_model,
                    updated_at = NOW()
                """,
                rows,
            )

    # Khối kết nối tự commit khi thành công,
    # rollback nếu xảy ra lỗi.
    print(f"Đã import hoặc cập nhật {len(rows)} chunk")


if __name__ == "__main__":
    main()