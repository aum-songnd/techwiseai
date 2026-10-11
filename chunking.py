import json
import re
from pathlib import Path
from urllib.parse import urlparse

INPUT_FILE = Path("laptop_clean.json")
OUTPUT_FILE = Path("laptop_chunks.jsonl")

# Phân loại theo đúng tên trường trong specifications.
FIELD_GROUPS = {
    "performance": {
        "Loại CPU",
        "Loại card đồ họa",
        "Dung lượng RAM",
        "Loại RAM",
        "Số khe ram",
        "Ổ cứng",
    },
    "display": {
        "Kích thước màn hình",
        "Độ phân giải màn hình",
        "Chất liệu tấm nền",
        "Công nghệ màn hình",
        "Tần số quét",
    },
    "connectivity": {
        "Wi-Fi",
        "Bluetooth",
        "Cổng giao tiếp",
        "Khe đọc thẻ nhớ",
        "Công nghệ âm thanh",
    },
    "design_features": {
        "Chất liệu",
        "Chất liệu vỏ màn hình",
        "Chất liệu vỏ trên",
        "Chất liệu vỏ dưới",
        "Kích thước",
        "Trọng lượng",
        "Tính năng đặc biệt",
        "Loại đèn bàn phím",
        "Bảo mật",
        "Webcam",
        "Pin",
        "Hệ điều hành",
        "Hệ điều hành khi ra mắt",
    },
}

MAX_DESCRIPTION_CHARS = 1200


def load_products():
    with INPUT_FILE.open("r", encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, list):
        raise ValueError("JSON phải chứa một danh sách sản phẩm.")

    return data


def clean_value(value):
    if value is None:
        return ""

    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False)

    return str(value).strip()


def get_product_id(product, index):
    # URL giúp ID ổn định giữa các lần chạy.
    url = product.get("url", "")
    slug = urlparse(url).path.rstrip("/").split("/")[-1]

    if slug:
        return slug

    # Chỉ là phương án dự phòng.
    return f"laptop-{index:04d}"


def get_spec_group(field):
    for group, fields in FIELD_GROUPS.items():
        if field in fields:
            return group

    # Không bỏ trường chưa được phân loại.
    return "other"


def make_chunk(product, product_id, chunk_type, text, number):
    price = product.get("price") or {}

    return {
        "chunk_id": f"{product_id}-{chunk_type}-{number:02d}",
        "product_id": product_id,
        "product_name": product["name"],
        "chunk_type": chunk_type,
        "text": text,
        "metadata": {
            "product_id": product_id,
            "product_name": product["name"],
            "url": product.get("url", ""),
            "chunk_type": chunk_type,
            "sale_price": price.get("sale"),
            "original_price": price.get("original"),
        },
    }


def build_spec_chunks(product, product_id):
    specs = product.get("specifications") or {}
    grouped = {}

    for field, value in specs.items():
        value = clean_value(value)

        # Không tạo nội dung từ giá trị trống.
        if not value:
            continue

        group = get_spec_group(field)
        grouped.setdefault(group, []).append(
            f"{field}: {value}"
        )

    chunks = []

    for group, fields in grouped.items():
        text = (
            f"Sản phẩm: {product['name']}\n"
            + "\n".join(fields)
        )

        chunks.append(
            make_chunk(product, product_id, group, text, 1)
        )

    return chunks


def build_overview_chunk(product, product_id):
    price = product.get("price") or {}
    sale = price.get("sale")
    original = price.get("original")

    lines = [
        f"Tên sản phẩm: {product['name']}",
    ]

    if sale is not None:
        lines.append(f"Giá bán: {sale} VND")

    if original is not None:
        lines.append(f"Giá gốc: {original} VND")

    if product.get("url"):
        lines.append(f"URL sản phẩm: {product['url']}")

    return make_chunk(
        product,
        product_id,
        "overview",
        "\n".join(lines),
        1,
    )


def build_description_chunks(product, product_id):
    highlights = product.get("highlights") or []

    # Giữ thứ tự và nội dung các mục highlights.
    # Gom nhiều mục thành chunk có kích thước vừa phải.
    chunks = []
    current = []
    current_length = 0

    def emit():
        if not current:
            return

        number = len(chunks) + 1
        text = (
            f"Sản phẩm: {product['name']}\n"
            + "\n".join(current)
        )

        chunks.append(
            make_chunk(
                product,
                product_id,
                "description",
                text,
                number,
            )
        )

    for item in highlights:
        item = clean_value(item)

        if not item:
            continue

        # Không cắt bỏ một mục chỉ vì mục đó dài.
        if current and (
            current_length + len(item) + 1
            > MAX_DESCRIPTION_CHARS
        ):
            emit()
            current = []
            current_length = 0

        current.append(item)
        current_length += len(item) + 1

    emit()
    return chunks


def main():
    products = load_products()
    total_chunks = 0
    total_specs = 0
    unknown_fields = set()

    with OUTPUT_FILE.open("w", encoding="utf-8") as out:
        for index, product in enumerate(products, start=1):
            if not isinstance(product, dict):
                continue

            if not product.get("name"):
                print(f"Bỏ qua sản phẩm {index}: thiếu name")
                continue

            product_id = get_product_id(product, index)

            chunks = [build_overview_chunk(product, product_id)]
            chunks.extend(build_spec_chunks(product, product_id))
            chunks.extend(
                build_description_chunks(product, product_id)
            )

            for field in (product.get("specifications") or {}):
                total_specs += 1

                if get_spec_group(field) == "other":
                    unknown_fields.add(field)

            for chunk in chunks:
                out.write(
                    json.dumps(chunk, ensure_ascii=False) + "\n"
                )

            total_chunks += len(chunks)

    print(f"Số sản phẩm: {len(products)}")
    print(f"Số trường thông số đã duyệt: {total_specs}")
    print(f"Tổng số chunk: {total_chunks}")
    print(f"Đã ghi: {OUTPUT_FILE.resolve()}")


if __name__ == "__main__":
    main()
