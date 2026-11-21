from __future__ import annotations

import argparse
import json
import os
from decimal import Decimal
from pathlib import Path
from typing import Any


DATA_DIR = Path(__file__).resolve().parent
RAG_SERVICE_DIR = DATA_DIR.parent
SOURCE_DATA_DIR = (
    RAG_SERVICE_DIR.parent / "backend" / "src" / "main" / "resources" / "data"
)
DATA_FILES = (
    "laptops_cleaned_for_import.json",
    "dien-thoai_cleaned_for_import.json",
    "tai-nghe_cleaned_for_import.json",
    "may-anh_cleaned_for_import.json",
    "linh-kien_cleaned_for_import.json",
    "phu-kien_cleaned_for_import.json",
)


def load_products() -> tuple[list[dict[str, Any]], int]:
    products: list[dict[str, Any]] = []
    seen_skus: set[str] = set()
    seen_slugs: set[str] = set()
    adjusted_slugs = 0

    for filename in DATA_FILES:
        file_path = SOURCE_DATA_DIR / filename
        if not file_path.is_file():
            raise FileNotFoundError(f"Không tìm thấy file dữ liệu: {file_path}")

        with file_path.open(encoding="utf-8") as file:
            data = json.load(file)

        if not isinstance(data, dict) or not isinstance(data.get("products"), list):
            raise ValueError(f"Cấu trúc JSON không hợp lệ: {file_path}")

        metadata_category = data.get("metadata", {}).get("category", {})
        expected_category_slug = metadata_category.get("slug")
        category_name = metadata_category.get("name")
        if not isinstance(expected_category_slug, str) or not expected_category_slug:
            raise ValueError(f"Thiếu metadata.category.slug trong {file_path}")
        if not isinstance(category_name, str) or not category_name:
            raise ValueError(f"Thiếu metadata.category.name trong {file_path}")

        for product in data["products"]:
            if not isinstance(product, dict):
                raise ValueError(f"Sản phẩm không hợp lệ trong {file_path}")

            sku = product.get("sku")
            slug = product.get("slug")
            category_slug = product.get("categorySlug")
            price = product.get("price")
            if not isinstance(sku, str) or not sku.strip():
                raise ValueError(f"{file_path}: sản phẩm thiếu SKU")
            if not isinstance(slug, str) or not slug.strip():
                raise ValueError(f"{file_path}: sản phẩm {sku} thiếu slug")
            if category_slug != expected_category_slug:
                raise ValueError(
                    f"{file_path}: categorySlug không khớp metadata cho SKU {sku}"
                )
            if price is None:
                raise ValueError(f"{file_path}: sản phẩm {sku} thiếu price")

            normalized_sku = sku.casefold()
            if normalized_sku in seen_skus:
                raise ValueError(f"SKU bị trùng trong JSON: {sku}")
            seen_skus.add(normalized_sku)

            unique_slug = slug
            suffix = sku.casefold()
            attempt = 0
            while unique_slug.casefold() in seen_slugs:
                tail = f"-{suffix}" if attempt == 0 else f"-{suffix}-{attempt}"
                unique_slug = f"{slug[: 300 - len(tail)]}{tail}"
                attempt += 1
                adjusted_slugs += 1
            product["slug"] = unique_slug
            normalized_slug = unique_slug.casefold()
            seen_slugs.add(normalized_slug)

            product["_category_name"] = category_name
            products.append(product)

    if not products:
        raise ValueError(f"Không tìm thấy sản phẩm trong {SOURCE_DATA_DIR}")
    return products, adjusted_slugs


def db_connect() -> psycopg.Connection:
    import psycopg

    required = ("DB_NAME", "DB_USER", "DB_PASSWORD")
    missing = [key for key in required if not os.getenv(key)]
    if missing:
        raise RuntimeError(
            "Thiếu cấu hình database trong rag-service/.env: "
            + ", ".join(missing)
        )

    return psycopg.connect(
        host=os.getenv("DB_HOST"),
        port=int(os.getenv("DB_PORT")),
        dbname=os.environ["DB_NAME"],
        user=os.environ["DB_USER"],
        password=os.environ["DB_PASSWORD"],
    )


def usable_image_url(value: Any) -> str | None:
    if not isinstance(value, str):
        return None

    url = value.strip()
    if (
        not url.startswith(("http://", "https://"))
        or "undefined" in url.casefold()
        or len(url) > 1000
    ):
        return None
    return url


def flatten_specifications(value: Any, prefix: str = "") -> list[str]:
    if isinstance(value, dict):
        lines: list[str] = []
        for key, nested_value in value.items():
            label = f"{prefix} / {key}" if prefix else str(key)
            lines.extend(flatten_specifications(nested_value, label))
        return lines
    if isinstance(value, list):
        return [
            f"{prefix}: {', '.join(str(item) for item in value)}"
        ] if value else []
    if value is None:
        return []
    return [f"{prefix}: {value}"]


def build_rag_document(product: dict[str, Any]) -> str:
    lines = [
        f"Tên sản phẩm: {product['name']}",
        f"Danh mục: {product['_category_name']}",
    ]
    brand = product.get("brand")
    if isinstance(brand, str) and brand.strip():
        lines.append(f"Thương hiệu: {brand.strip()}")

    price = product.get("price")
    if price is not None:
        lines.append(f"Giá: {price} VND")

    for label, key in (
        ("Mô tả ngắn", "shortDescription"),
        ("Mô tả", "description"),
        ("Bảo hành", "warranty"),
    ):
        value = product.get(key)
        if isinstance(value, str) and value.strip():
            lines.append(f"{label}: {value.strip()}")

    specifications = product.get("specifications") or {}
    if not isinstance(specifications, dict):
        raise ValueError(f"Thông số sản phẩm không hợp lệ: {product['sku']}")
    specification_lines = flatten_specifications(specifications)
    if specification_lines:
        lines.append("Thông số kỹ thuật:")
        lines.extend(specification_lines)

    return "\n".join(lines)


def unique_database_slug(cursor: Any, slug: str, sku: str) -> str:
    suffix = sku.casefold()
    candidate = slug
    attempt = 0
    while True:
        cursor.execute(
            """
            SELECT 1
            FROM products
            WHERE LOWER(slug) = LOWER(%s)
              AND sku <> %s
            """,
            (candidate, sku),
        )
        if cursor.fetchone() is None:
            return candidate

        tail = f"-{suffix}" if attempt == 0 else f"-{suffix}-{attempt}"
        candidate = f"{slug[: 300 - len(tail)]}{tail}"
        attempt += 1


def import_products(products: list[dict[str, Any]]) -> tuple[int, int, int]:
    from psycopg.types.json import Jsonb

    created = 0
    updated = 0
    images_created = 0

    with db_connect() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'products'
                  AND column_name = 'rag_document'
                """
            )
            if cursor.fetchone() is None:
                raise RuntimeError(
                    "Database chưa có cột products.rag_document; "
                    "hãy chạy migration backend trước."
                )

            category_ids: dict[str, Any] = {}
            for product in products:
                category_slug = product["categorySlug"]
                if category_slug in category_ids:
                    continue
                cursor.execute(
                    "SELECT id FROM categories WHERE slug = %s",
                    (category_slug,),
                )
                category = cursor.fetchone()
                if category is None:
                    raise ValueError(
                        f"Không tìm thấy danh mục trong database: {category_slug}"
                    )
                category_ids[category_slug] = category[0]

            for product in products:
                sku = product["sku"]
                rag_document = build_rag_document(product)
                image_url = usable_image_url(product.get("thumbnailUrl"))
                short_description = product.get("shortDescription")
                specifications = product.get("specifications") or {}
                if not isinstance(specifications, dict):
                    raise ValueError(f"Thông số sản phẩm không hợp lệ: {sku}")
                slug = unique_database_slug(cursor, product["slug"], sku)

                cursor.execute(
                    """
                    SELECT id
                    FROM products
                    WHERE sku = %s
                    """,
                    (sku,),
                )
                existing = cursor.fetchone()

                if existing is not None:
                    product_id = existing[0]
                    cursor.execute(
                        """
                        UPDATE products
                        SET category_id = %s,
                            name = %s,
                            slug = %s,
                            short_description = %s,
                            description = %s,
                            price = %s,
                            original_price = %s,
                            stock_quantity = %s,
                            thumbnail_url = %s,
                            rating_average = %s,
                            featured = %s,
                            hot = %s,
                            active = %s,
                            brand = %s,
                            specifications = %s,
                            rag_document = %s
                        WHERE id = %s
                        """,
                        (
                            category_ids[product["categorySlug"]],
                            product["name"],
                            slug,
                            short_description,
                            product.get("description"),
                            Decimal(str(product["price"])),
                            (
                                Decimal(str(product["originalPrice"]))
                                if product.get("originalPrice") is not None
                                else None
                            ),
                            int(product.get("stockQuantity") or 0),
                            image_url,
                            Decimal(str(product.get("ratingAverage") or 0)),
                            bool(product.get("featured", False)),
                            bool(product.get("hot", False)),
                            bool(product.get("active", True)),
                            product.get("brand"),
                            Jsonb(specifications),
                            rag_document,
                            product_id,
                        ),
                    )
                    updated += 1
                else:
                    cursor.execute(
                        """
                        INSERT INTO products (
                            category_id,
                            name,
                            slug,
                            sku,
                            short_description,
                            description,
                            price,
                            original_price,
                            stock_quantity,
                            thumbnail_url,
                            rating_average,
                            featured,
                            hot,
                            active,
                            brand,
                            specifications,
                            rag_document
                        )
                        VALUES (
                            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                            %s, %s, %s, %s, %s, %s, %s
                        )
                        ON CONFLICT DO NOTHING
                        RETURNING id
                        """,
                        (
                            category_ids[product["categorySlug"]],
                            product["name"],
                            slug,
                            sku,
                            short_description,
                            product.get("description"),
                            Decimal(str(product["price"])),
                            (
                                Decimal(str(product["originalPrice"]))
                                if product.get("originalPrice") is not None
                                else None
                            ),
                            int(product.get("stockQuantity") or 0),
                            image_url,
                            Decimal(str(product.get("ratingAverage") or 0)),
                            bool(product.get("featured", False)),
                            bool(product.get("hot", False)),
                            bool(product.get("active", True)),
                            product.get("brand"),
                            Jsonb(specifications),
                            rag_document,
                        ),
                    )
                    inserted = cursor.fetchone()
                    if inserted is None:
                        cursor.execute(
                            """
                            SELECT id
                            FROM products
                            WHERE sku = %s
                            """,
                            (sku,),
                        )
                        existing = cursor.fetchone()
                        if existing is None:
                            raise RuntimeError(
                                f"Không thể nhập sản phẩm SKU {sku}; "
                                "slug vẫn bị trùng trong database."
                            )
                        product_id = existing[0]
                        cursor.execute(
                            """
                            UPDATE products
                            SET category_id = %s,
                                name = %s,
                                slug = %s,
                                short_description = %s,
                                description = %s,
                                price = %s,
                                original_price = %s,
                                stock_quantity = %s,
                                thumbnail_url = %s,
                                rating_average = %s,
                                featured = %s,
                                hot = %s,
                                active = %s,
                                brand = %s,
                                specifications = %s,
                                rag_document = %s
                            WHERE id = %s
                            """,
                            (
                                category_ids[product["categorySlug"]],
                                product["name"],
                                slug,
                                short_description,
                                product.get("description"),
                                Decimal(str(product["price"])),
                                (
                                    Decimal(str(product["originalPrice"]))
                                    if product.get("originalPrice") is not None
                                    else None
                                ),
                                int(product.get("stockQuantity") or 0),
                                image_url,
                                Decimal(str(product.get("ratingAverage") or 0)),
                                bool(product.get("featured", False)),
                                bool(product.get("hot", False)),
                                bool(product.get("active", True)),
                                product.get("brand"),
                                Jsonb(specifications),
                                rag_document,
                                product_id,
                            ),
                        )
                        updated += 1
                    else:
                        product_id = inserted[0]
                        created += 1

                for image in product.get("images") or []:
                    url = usable_image_url(
                        image.get("imageUrl") if isinstance(image, dict) else None
                    )
                    if url is None:
                        continue

                    cursor.execute(
                        """
                        SELECT EXISTS (
                            SELECT 1
                            FROM product_images
                            WHERE product_id = %s AND image_url = %s
                        )
                        """,
                        (product_id, url),
                    )
                    if cursor.fetchone()[0]:
                        continue

                    primary_image = bool(image.get("primaryImage"))
                    if primary_image:
                        cursor.execute(
                            """
                            SELECT EXISTS (
                                SELECT 1
                                FROM product_images
                                WHERE product_id = %s AND primary_image = TRUE
                            )
                            """,
                            (product_id,),
                        )
                        primary_image = not cursor.fetchone()[0]

                    cursor.execute(
                        """
                        INSERT INTO product_images (
                            product_id,
                            image_url,
                            public_id,
                            alt_text,
                            display_order,
                            primary_image
                        )
                        VALUES (%s, %s, NULL, %s, %s, %s)
                        """,
                        (
                            product_id,
                            url,
                            (image.get("altText") or product["name"])[:255],
                            max(0, int(image.get("displayOrder") or 0)),
                            primary_image,
                        ),
                    )
                    images_created += 1

    return created, updated, images_created


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Import sản phẩm từ sáu JSON ở backend/src/main/resources/data."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Kiểm tra JSON và số sản phẩm mà không kết nối database.",
    )
    args = parser.parse_args()

    products, duplicate_slugs = load_products()
    print(
        f"Đã đọc {len(products)} sản phẩm từ {SOURCE_DATA_DIR}; "
        f"điều chỉnh {duplicate_slugs} slug bị trùng."
    )
    if args.dry_run:
        return

    from dotenv import load_dotenv

    load_dotenv(RAG_SERVICE_DIR / ".env")
    created, updated, images_created = import_products(products)
    print(
        "Import hoàn tất: "
        f"{created} sản phẩm tạo mới, "
        f"{updated} sản phẩm cập nhật rag_document, "
        f"{images_created} ảnh được thêm."
    )


if __name__ == "__main__":
    main()
