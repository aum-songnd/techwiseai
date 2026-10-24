import json
import re
from html import unescape



def clean_text(value):
    """Dọn HTML, xuống dòng và khoảng trắng."""
    if value is None:
        return ""

    text = str(value)
    text = re.sub(r"<br\s*/?>", "; ", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)
    text = unescape(text)
    text = re.sub(r"\s*\n\s*", "; ", text)
    return re.sub(r"\s+", " ", text).strip()


def format_price(value):
    return f"{value:,.0f}".replace(",", ".") + " VNĐ"


def build_chunk(product):
    product_id = product["product_id"]
    name = clean_text(product.get("name"))

    lines = []

    def add(label, value):
        text = clean_text(value)
        if text:
            lines.append(f"{label}: {text}")

    add("Mã sản phẩm", product_id)
    add("Tên sản phẩm", name)
    add("Thương hiệu", product.get("brand"))

    if product.get("current_price") is not None:
        add("Giá hiện tại", format_price(product["current_price"]))

    if product.get("price_original") is not None:
        add("Giá gốc", format_price(product["price_original"]))

    if product.get("discount_percent") is not None:
        add("Giảm giá", f"{product['discount_percent']}%")

    add("Phân khúc giá", product.get("price_segment"))
    add("CPU", product.get("cpu"))

    # Giữ chi tiết như SO-DIMM nếu dữ liệu có.
    ram_capacity = clean_text(product.get("ram"))
    if not ram_capacity and product.get("ram_gb") is not None:
        ram_capacity = f"{product['ram_gb']}GB"

    ram_type = clean_text(
        product.get("ram_type_raw") or product.get("ram_type")
    )

    ram = ram_capacity
    if ram_type and ram_type.casefold() not in ram.casefold():
        ram = f"{ram} {ram_type}".strip()

    add("RAM", ram)
    add("Lưu trữ", product.get("storage"))

    if product.get("storage_max_gb") is not None:
        add("Dung lượng lưu trữ tối đa", f"{product['storage_max_gb']}GB")

    add("GPU", product.get("gpu"))
    add("Loại GPU", product.get("gpu_type"))

    if product.get("screen_size_inch") is not None:
        add("Kích thước màn hình", f"{product['screen_size_inch']:g} inch")

    add("Độ phân giải", product.get("screen_resolution"))
    add("Đặc điểm màn hình", product.get("screen_type"))

    if product.get("weight_kg") is not None:
        add("Trọng lượng", f"{product['weight_kg']:g} kg")

    add("Pin", product.get("battery"))
    add("Hệ điều hành", product.get("os"))
    add("Cổng kết nối", product.get("ports"))
    add("Bảo hành", product.get("warranty"))

    metadata_fields = [
        "product_id",
        "name",
        "sku",
        "brand",
        "current_price",
        "price_original",
        "discount_percent",
        "price_segment",
        "ram_gb",
        "ram_type",
        "storage_gb",
        "storage_max_gb",
        "screen_size_inch",
        "weight_kg",
        "gpu_type",
    ]

    metadata = {
        key: product[key]
        for key in metadata_fields
        if product.get(key) is not None and product[key] != ""
    }

    return {
        "id": f"laptop_{product_id}",
        "text": "\n".join(lines),
        "metadata": metadata,
    }


def main():
    with open("laptops_cleaned.json", "r", encoding="utf-8") as file:
        products = json.load(file)

    chunks = []
    seen_ids = set()

    for product in products:
        chunk = build_chunk(product)

        if chunk["id"] in seen_ids:
            raise ValueError(f"Trùng ID: {chunk['id']}")

        seen_ids.add(chunk["id"])
        chunks.append(chunk)

    with open("laptop_chunks.json", "w", encoding="utf-8") as file:
        json.dump(chunks, file, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()