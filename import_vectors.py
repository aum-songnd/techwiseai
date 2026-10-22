import json
import getpass
from pathlib import Path

import psycopg
from psycopg.types.json import Jsonb

DATA_FILE = Path.home() / "techwiseai" / "laptop_embedded.jsonl"
BATCH_SIZE = 100

if not DATA_FILE.is_file():
    raise FileNotFoundError(f"Không tìm thấy file: {DATA_FILE}")

password = getpass.getpass("PostgreSQL password: ")

conn = psycopg.connect(
    host="127.0.0.1",
    port=5432,
    dbname="techwise",
    user="toihoang",
    password=password,
)

sql = """
INSERT INTO public.laptop_chunks (
    chunk_id,
    product_id,
    product_name,
    chunk_type,
    content,
    metadata,
    embedding,
    embedding_model,
    embedding_dimension
)
VALUES (
    %s, %s, %s, %s, %s, %s,
    %s::vector, %s, %s
)
ON CONFLICT (chunk_id) DO UPDATE SET
    product_id = EXCLUDED.product_id,
    product_name = EXCLUDED.product_name,
    chunk_type = EXCLUDED.chunk_type,
    content = EXCLUDED.content,
    metadata = EXCLUDED.metadata,
    embedding = EXCLUDED.embedding,
    embedding_model = EXCLUDED.embedding_model,
    embedding_dimension = EXCLUDED.embedding_dimension;
"""

def make_row(obj):
    vector = obj["embedding"]

    if len(vector) != 1024:
        raise ValueError(
            f"Chunk {obj.get('chunk_id')} có vector "
            f"{len(vector)} chiều, yêu cầu 1024"
        )

    if obj.get("embedding_dimension") != 1024:
        raise ValueError(
            f"Sai embedding_dimension tại {obj.get('chunk_id')}"
        )

    if not all(isinstance(x, (int, float)) for x in vector):
        raise ValueError(
            f"Vector không hợp lệ tại {obj.get('chunk_id')}"
        )

    vector_literal = "[" + ",".join(
        format(float(x), ".9g") for x in vector
    ) + "]"

    return (
        obj["chunk_id"],
        obj["product_id"],
        obj["product_name"],
        obj["chunk_type"],
        obj["text"],
        Jsonb(obj["metadata"]),
        vector_literal,
        obj["embedding_model"],
        obj["embedding_dimension"],
    )

total = 0
batch = []

try:
    with conn:
        with conn.cursor() as cur:
            with DATA_FILE.open(encoding="utf-8") as f:
                for line_number, line in enumerate(f, 1):
                    if not line.strip():
                        continue

                    obj = json.loads(line)
                    batch.append(make_row(obj))

                    if len(batch) >= BATCH_SIZE:
                        cur.executemany(sql, batch)
                        total += len(batch)
                        print(f"Đã xử lý {total} chunk...")
                        batch.clear()

                if batch:
                    cur.executemany(sql, batch)
                    total += len(batch)

    print(f"Hoàn tất! Đã xử lý {total} chunk.")

finally:
    conn.close()