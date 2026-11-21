import re
import unicodedata
from typing import Any

CATEGORIES = {
    "laptop": ["laptop", "latop", "máy tính xách tay", "notebook"],
    "dien-thoai": ["điện thoại", "smartphone", "iphone"],
    "tai-nghe": ["tai nghe", "headphone", "earbuds"],
    "may-anh": ["máy ảnh", "camera", "máy chụp ảnh"],
    "linh-kien": ["linh kiện", "cpu", "ram", "ssd", "card đồ họa"],
    "phu-kien": ["phụ kiện", "chuột", "bàn phím", "sạc"],
}

BRANDS = [
    "ASUS", "Lenovo", "Dell", "HP", "Acer", "MSI", "Apple",
    "Samsung", "Xiaomi", "OPPO", "Vivo", "Sony", "Canon",
    "Nikon", "Logitech", "Razer",
]

STOP_WORDS = {
    "tôi", "mình", "em", "anh", "chị", "muốn", "cần", "tìm", "mua",
    "cho", "có", "loại", "nào", "giúp", "với", "được", "không", "giá",
    "khoảng", "tầm", "dưới", "trên", "hơn", "từ", "đến", "tới", "triệu",
    "tr", "nghìn", "ngàn", "k", "không quá", "tối đa", "tối thiểu", "là",
    "một", "chiếc", "cái",
}

MONEY_UNITS = {
    "triệu": 1_000_000, "tr": 1_000_000, "m": 1_000_000,
    "nghìn": 1_000, "ngàn": 1_000, "k": 1_000,
}


class QueryAnalyzer:
    """Phân tích câu hỏi tự nhiên để bóc tách ý định, danh mục, hãng và khoảng giá."""

    @staticmethod
    def normalize_text(text: str) -> str:
        return unicodedata.normalize("NFC", text).lower().strip()

    @classmethod
    def detect_category(cls, query: str) -> str | None:
        for slug, keywords in CATEGORIES.items():
            if any(kw in query for kw in keywords):
                return slug
        return None

    @classmethod
    def detect_brand(cls, query: str) -> str | None:
        for brand in BRANDS:
            if re.search(rf"(?<!\w){re.escape(brand.lower())}(?!\w)", query):
                return brand
        return None

    @staticmethod
    def parse_money(val: str, unit: str) -> int:
        return int(float(val.replace(",", ".")) * MONEY_UNITS.get(unit.lower(), 1))

    @classmethod
    def detect_price(cls, query: str) -> tuple[int | None, int | None]:
        m = r"(\d+(?:[.,]\d+)?)\s*(triệu|tr|m|nghìn|ngàn|k)"
        if match := re.search(rf"(?:từ|khoảng)\s*{m}\s*(?:đến|tới|-)\s*{m}", query):
            return cls.parse_money(match.group(1), match.group(2)), cls.parse_money(match.group(3), match.group(4))
        if match := re.search(rf"(?:dưới|không quá|tối đa|nhỏ hơn)\s*{m}", query):
            return None, cls.parse_money(match.group(1), match.group(2))
        if match := re.search(rf"(?:trên|hơn|tối thiểu|lớn hơn)\s*{m}", query):
            return cls.parse_money(match.group(1), match.group(2)), None
        return None, None

    @classmethod
    def extract_keywords(cls, query: str, filters: dict[str, Any]) -> str:
        text = cls.normalize_text(query)
        text = re.sub(r"\d+(?:[.,]\d+)?\s*(triệu|tr|nghìn|ngàn|k|m)\b", " ", text)
        if filters.get("brand"):
            text = re.sub(rf"(?<!\w){re.escape(filters['brand'].lower())}(?!\w)", " ", text)
        if cat := filters.get("category"):
            for kw in CATEGORIES.get(cat, []):
                text = re.sub(rf"(?<!\w){re.escape(kw)}(?!\w)", " ", text)
        tokens = re.findall(r"[\w]+(?:[-.][\w]+)*", text, flags=re.UNICODE)
        return " ".join([t for t in tokens if t not in STOP_WORDS and not t.isdigit()])

    @classmethod
    def analyze_query(cls, query: str) -> dict[str, Any]:
        norm = cls.normalize_text(query)
        min_p, max_p = cls.detect_price(norm)
        return {
            "original_query": query,
            "category": cls.detect_category(norm),
            "brand": cls.detect_brand(norm),
            "min_price": min_p,
            "max_price": max_p,
        }


# Hàm alias tương thích ngược
normalize_text = QueryAnalyzer.normalize_text
detect_category = QueryAnalyzer.detect_category
detect_brand = QueryAnalyzer.detect_brand
detect_price = QueryAnalyzer.detect_price
extract_keywords = QueryAnalyzer.extract_keywords
analyze_query = QueryAnalyzer.analyze_query
parse_money = QueryAnalyzer.parse_money
CATEGORY_TERMS = CATEGORIES
