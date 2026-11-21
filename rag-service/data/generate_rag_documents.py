import argparse
import logging
import os
from pathlib import Path
from typing import Any

import psycopg
from dotenv import load_dotenv


RAG_SERVICE_DIR = Path(__file__).resolve().parents[1]
BATCH_SIZE = 200

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger(__name__)


def flatten_specifications(value: Any, prefix: str = "") -> list[str]:
    if isinstance(value, dict):
        lines: list[str] = []
        for key, nested_value in value.items():
            label = f"{prefix} / {key}" if prefix else str(key)
            lines.extend(flatten_specifications(nested_value, label))
        return lines
    if isinstance(value, list):
        if not value:
            return []
        return [f"{prefix}: {', '.join(str(item) for item in value)}"]
    if value is None:
        return []
    return [f"{prefix}: {value}"]


def build_rag_document(product: dict[str, Any]) -> str:
    lines = [
        f"Tên sản phẩm: {product['name']}",
        f"Danh mục: {product['category_name']}",
        f"SKU: {product['sku']}",
    ]

    if product.get("brand"):
        lines.append(f"Thương hiệu: {product['brand']}")
    if product.get("price") is not None:
        lines.append(f"Giá bán: {product['price']} VND")
    if product.get("original_price") is not None:
        lines.append(f"Giá gốc: {product['original_price']} VND")

    lines.append(f"Tồn kho: {product['stock_quantity']}")
    lines.append(
        "Trạng thái: "
        + ("đang kinh doanh" if product["active"] else "ngừng kinh doanh")
    )

    for label, field in (
        ("Mô tả ngắn", "short_description"),
        ("Mô tả", "description"),
    ):
        value = product.get(field)
        if isinstance(value, str) and value.strip():
            lines.append(f"{label}: {value.strip()}")

    specifications = product.get("specifications") or {}
    if not isinstance(specifications, dict):
        raise ValueError(f"Thông số không hợp lệ cho SKU {product['sku']}")

    specification_lines = flatten_specifications(specifications)
    if specification_lines:
        lines.append("Thông số kỹ thuật:")
        lines.extend(specification_lines)

    return "\n".join(lines)


def connect_database() -> psycopg.Connection:
    required = ("DB_NAME", "DB_USER", "DB_PASSWORD")
    missing = [key for key in required if not os.getenv(key)]
    if missing:
        raise RuntimeError(
            "Thiếu biến môi trường database trong rag-service/.env: "
            + ", ".join(missing)
        )

    return psycopg.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "5432")),
        dbname=os.environ["DB_NAME"],
        user=os.environ["DB_USER"],
        password=os.environ["DB_PASSWORD"],
    )


def generate_rag_documents(limit: int | None, dry_run: bool) -> int:
    with connect_database() as connection:
        with connection.cursor() as read_cursor, connection.cursor() as write_cursor:
            read_cursor.execute(
                """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = current_schema()
                  AND table_name = 'products'
                  AND column_name = 'rag_document'
                """
            )
            if read_cursor.fetchone() is None:
                raise RuntimeError(
                    "Không tìm thấy products.rag_document. "
                    "Hãy chạy migration V22 trước."
                )

            read_cursor.execute(
                """
                SELECT
                    p.id,
                    p.name,
                    p.sku,
                    p.brand,
                    p.short_description,
                    p.description,
                    p.price,
                    p.original_price,
                    p.stock_quantity,
                    p.active,
                    p.specifications,
                    c.name
                FROM products p
                JOIN categories c ON c.id = p.category_id
                ORDER BY p.sku
                """
            )

            processed = 0
            while True:
                rows = read_cursor.fetchmany(BATCH_SIZE)
                if not rows:
                    break

                if limit is not None:
                    rows = rows[: max(0, limit - processed)]
                    if not rows:
                        break

                updates = []
                for row in rows:
                    product = {
                        "name": row[1],
                        "sku": row[2],
                        "brand": row[3],
                        "short_description": row[4],
                        "description": row[5],
                        "price": row[6],
                        "original_price": row[7],
                        "stock_quantity": row[8],
                        "active": row[9],
                        "specifications": row[10],
                        "category_name": row[11],
                    }
                    updates.append((build_rag_document(product), row[0]))

                if not dry_run:
                    write_cursor.executemany(
                        """
                        UPDATE products
                        SET rag_document = %s
                        WHERE id = %s
                        """,
                        updates,
                    )

                processed += len(updates)
                logger.info(
                    "%s %s/%s sản phẩm",
                    "Đã dựng" if dry_run else "Đã cập nhật",
                    processed,
                    limit if limit is not None else "tất cả",
                )

                if limit is not None and processed >= limit:
                    break

    return processed


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Tạo và lưu rag_document từ dữ liệu products trong PostgreSQL."
    )
    parser.add_argument(
        "--limit",
        type=int,
        help="Chỉ xử lý tối đa số sản phẩm được chỉ định.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Chỉ dựng và đếm tài liệu, không cập nhật database.",
    )
    args = parser.parse_args()

    if args.limit is not None and args.limit < 0:
        parser.error("--limit phải lớn hơn hoặc bằng 0")

    load_dotenv(RAG_SERVICE_DIR / ".env")
    count = generate_rag_documents(args.limit, args.dry_run)
    logger.info(
        "Hoàn tất: %s %s rag_document.",
        "đã dựng thử" if args.dry_run else "đã cập nhật",
        count,
    )


if __name__ == "__main__":
    main()
