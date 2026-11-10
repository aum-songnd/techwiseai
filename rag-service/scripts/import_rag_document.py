import json
import os
from pathlib import Path

import psycopg
from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"


def db_connect() -> psycopg.Connection:
    return psycopg.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "5432")),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
    )


def load_rag_documents() -> list[tuple[str, str]]:
    file_paths = sorted(DATA_DIR.glob("*_cleaned_for_import.json"))
    if not file_paths:
        raise FileNotFoundError(f"Không tìm thấy file dữ liệu trong {DATA_DIR}")

    documents = []
    seen_skus = set()
    for file_path in file_paths:
        with file_path.open(encoding="utf-8") as file:
            data = json.load(file)

        if isinstance(data, list):
            products = data
        elif isinstance(data, dict):
            products = data.get("products")
        else:
            products = None
        if not isinstance(products, list):
            raise ValueError(f"Cấu trúc JSON không hợp lệ: {file_path}")

        for product in products:
            if not isinstance(product, dict):
                raise ValueError(f"Sản phẩm không hợp lệ trong file {file_path}")
            sku = product.get("sku")
            rag_document = product.get("rag_document")
            if not isinstance(sku, str) or not sku or not isinstance(
                rag_document, str
            ) or not rag_document.strip():
                raise ValueError(
                    f"{file_path}: sản phẩm thiếu sku hoặc rag_document"
                )
            if sku in seen_skus:
                raise ValueError(f"SKU bị trùng trong dữ liệu RAG: {sku}")
            seen_skus.add(sku)
            documents.append((rag_document, sku))

    if not documents:
        raise ValueError(f"Không tìm thấy sản phẩm trong {DATA_DIR}")
    return documents


def import_rag_documents(documents: list[tuple[str, str]]) -> None:
    with db_connect() as connection:
        with connection.cursor() as cursor:
            cursor.execute("CREATE EXTENSION IF NOT EXISTS vector")
            cursor.execute(
                """
                ALTER TABLE products
                ADD COLUMN IF NOT EXISTS rag_document TEXT
                """
            )

            for rag_document, sku in documents:
                cursor.execute(
                    """
                    UPDATE products
                    SET rag_document = %s
                    WHERE sku = %s
                    """,
                    (rag_document, sku),
                )
                if cursor.rowcount != 1:
                    raise ValueError(
                        f"Không tìm thấy đúng một sản phẩm trong database "
                        f"cho SKU {sku}"
                    )

    print(f"Đã import rag_document cho {len(documents)} sản phẩm.")


def main() -> None:
    load_dotenv(BASE_DIR / ".env")
    documents = load_rag_documents()
    import_rag_documents(documents)


if __name__ == "__main__":
    main()
