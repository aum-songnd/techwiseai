
import re
import json
import unicodedata
from decimal import Decimal


CATEGORIES = {
    "laptop": ["laptop", "latop", "máy tính xách tay", "notebook"],
    "dien-thoai": ["điện thoại", "smartphone", "iphone"],
    "tai-nghe": ["tai nghe", "headphone", "earbuds"],
    "may-anh": ["máy ảnh", "camera", "máy chụp ảnh"],
    "linh-kien": ["linh kiện", "cpu", "ram", "ssd", "card đồ họa"],
    "phu-kien": ["phụ kiện", "chuột", "bàn phím", "sạc"],
}

BRANDS = [
    "ASUS", "Lenovo", "Dell", "HP", "Acer",
    "MSI", "Apple", "Samsung", "Xiaomi",
    "OPPO", "Vivo", "Sony", "Canon",
    "Nikon", "Logitech", "Razer"
]


def normalize_text(text):
    text = unicodedata.normalize("NFC", text)
    return text.lower().strip()


def detect_category(query):
    for slug, keywords in CATEGORIES.items():
        for keyword in keywords:
            if keyword in query:
                return slug
    return None


def detect_brand(query):
    for brand in BRANDS:
        if re.search(
            rf"(?<!\w){re.escape(brand.lower())}(?!\w)",
            query
        ):
            return brand
    return None


def parse_money(value, unit):
    number = Decimal(value.replace(",", "."))

    multipliers = {
        "triệu": 1_000_000,
        "tr": 1_000_000,
        "m": 1_000_000,
        "nghìn": 1_000,
        "ngàn": 1_000,
        "k": 1_000,
    }

    return int(number * multipliers[unit])


def detect_price(query):
    min_price = None
    max_price = None

    money = r"(\d+(?:[.,]\d+)?)\s*(triệu|tr|m|nghìn|ngàn|k)"

    range_pattern = rf"(?:từ|khoảng)\s*{money}\s*(?:đến|tới|-)\s*{money}"

    match = re.search(range_pattern, query)

    if match:
        min_price = parse_money(match.group(1), match.group(2))
        max_price = parse_money(match.group(3), match.group(4))
        return min_price, max_price

    match = re.search(
        rf"(?:dưới|không quá|tối đa|nhỏ hơn)\s*{money}",
        query
    )

    if match:
        max_price = parse_money(match.group(1), match.group(2))
        return min_price, max_price

    match = re.search(
        rf"(?:trên|hơn|tối thiểu|lớn hơn)\s*{money}",
        query
    )

    if match:
        min_price = parse_money(match.group(1), match.group(2))
        return min_price, max_price

    return min_price, max_price


def analyze_query(query):
    normalized = normalize_text(query)

    min_price, max_price = detect_price(normalized)

    return {
        "original_query": query,
        "category": detect_category(normalized),
        "brand": detect_brand(normalized),
        "min_price": min_price,
        "max_price": max_price,
    }


if __name__ == "__main__":
    while True:
        query = input("Bạn: ").strip()

        if query.lower() in ("exit", "quit"):
            break

        if not query:
            continue

        result = analyze_query(query)

        print(json.dumps(
            result,
            ensure_ascii=False,
            indent=2
        ))
