import glob
import json
import os
from pathlib import Path

import psycopg
from dotenv import load_dotenv
from pgvector.psycopg import register_vector
from sentence_transformers import SentenceTransformer
import torch
from tqdm import tqdm


BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")

MODEL_NAME = "BAAI/bge-m3"
VECTOR_DIM = 1024
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
BATCH_SIZE = int(os.getenv("EMBEDDING_BATCH_SIZE", "8"))

embedding_model = SentenceTransformer(MODEL_NAME, device=DEVICE)


def connect_db() -> psycopg.Connection:
    connection = psycopg.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "5432")),
        dbname=os.getenv("DB_NAME", "regulation_db"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD"),
    )
    register_vector(connection)
    return connection


def load_documents() -> list[dict[str, str]]:
    documents = []
    pattern = str(BASE_DIR / "data" / "*_cleaned_for_import.json")

    for file_path in sorted(glob.glob(pattern)):
        with open(file_path, encoding="utf-8") as file:
            data = json.load(file)

        documents.extend(
            {"sku": product["sku"], "text": product["rag_document"]}
            for product in data.get("products", [])
        )

    return documents


def ensure_embedding_columns(connection: psycopg.Connection) -> None:
    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            ALTER TABLE products
                ADD COLUMN IF NOT EXISTS rag_document TEXT,
                ADD COLUMN IF NOT EXISTS rag_embedding VECTOR({VECTOR_DIM})
            """
        )
        cursor.execute(
            """
            SELECT format_type(attribute.atttypid, attribute.atttypmod)
            FROM pg_attribute AS attribute
            JOIN pg_class AS relation ON relation.oid = attribute.attrelid
            JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
            WHERE namespace.nspname = current_schema()
              AND relation.relname = 'products'
              AND attribute.attname = 'rag_embedding'
              AND NOT attribute.attisdropped
            """
        )
        column_type = cursor.fetchone()
        expected_type = f"vector({VECTOR_DIM})"
        if column_type and column_type[0] != expected_type:
            cursor.execute(
                f"""
                ALTER TABLE products
                ALTER COLUMN rag_embedding TYPE VECTOR({VECTOR_DIM})
                USING NULL
                """
            )
    connection.commit()


def generate_embeddings(documents: list[str]) -> list[list[float]]:
    vectors = embedding_model.encode(
        documents,
        batch_size=BATCH_SIZE,
        normalize_embeddings=True,
        convert_to_numpy=True,
        show_progress_bar=False,
    )
    if vectors.shape != (len(documents), VECTOR_DIM):
        raise ValueError(
            f"Kích thước vector không hợp lệ: {vectors.shape}; "
            f"mong đợi ({len(documents)}, {VECTOR_DIM})"
        )
    return vectors.tolist()


def update_product(
    connection: psycopg.Connection,
    sku: str,
    document: str,
    vector: list[float],
) -> int:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            UPDATE products
            SET rag_document = %s, rag_embedding = %s
            WHERE sku = %s
            """,
            (document, vector, sku),
        )
        return cursor.rowcount


def main() -> None:
    success = 0
    not_found = []
    failed = []
    documents = load_documents()

    with connect_db() as connection:
        ensure_embedding_columns(connection)

        for start in tqdm(
            range(0, len(documents), BATCH_SIZE),
            desc=f"Embedding products ({DEVICE})",
        ):
            batch = documents[start : start + BATCH_SIZE]
            valid_items = [
                item for item in batch if item["text"].strip()
            ]
            failed.extend(
                (item["sku"], "Tài liệu rỗng")
                for item in batch
                if not item["text"].strip()
            )
            if not valid_items:
                continue

            try:
                vectors = generate_embeddings(
                    [item["text"].strip() for item in valid_items]
                )
                for item, vector in zip(valid_items, vectors):
                    updated = update_product(
                        connection,
                        item["sku"],
                        item["text"].strip(),
                        vector,
                    )
                    if updated == 1:
                        success += 1
                    elif updated == 0:
                        not_found.append(item["sku"])
                    else:
                        failed.append(
                            (item["sku"], f"Đã cập nhật {updated} dòng")
                        )
                connection.commit()
            except Exception as error:
                connection.rollback()
                failed.extend((item["sku"], str(error)) for item in valid_items)

    print(
        f"Hoàn tất: thành công={success}, "
        f"không tồn tại={len(not_found)}, thất bại={len(failed)}"
    )
    if not_found:
        print(f"SKU không tồn tại: {', '.join(not_found)}")
    if failed:
        print(f"Sản phẩm thất bại: {failed}")


if __name__ == "__main__":
    main()
