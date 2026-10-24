import json
import re
import unicodedata
from decimal import Decimal
from typing import Any
import requests

from app.core.config import get_settings
from app.core.database import get_database_connection
from app.schemas.recommendation import (
    CategoryDetail,
    ProductDetail,
    RecommendationItem,
)

AMOUNT_REGEX = re.compile(r"(\d+(?:[.,]\d+)?)\s*(tb|gb)", re.IGNORECASE)
NUMBER_REGEX = re.compile(r"(\d+(?:[.,]\d+)?)")

KEY_SPEC_LABELS = [
    "Loại CPU",
    "Dung lượng RAM",
    "Loại card đồ họa",
    "Kích thước màn hình",
    "Ổ cứng",
]


class RecommendationService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.http_session = requests.Session()

    def get_recommendations(
        self,
        product_id: str,
        limit: int = 8,
    ) -> list[RecommendationItem]:
        safe_limit = max(1, min(limit, self.settings.rec_max_limit))

        with get_database_connection() as connection:
            with connection.cursor() as cursor:
                # 1. Lấy thông tin sản phẩm mục tiêu
                current = self._get_product_by_id(cursor, product_id)
                if not current:
                    return []

                # 2. Đảm bảo sản phẩm có vector embedding (nếu thiếu, gọi Railway API để sinh)
                current_embedding = current.get("embedding")
                if current_embedding is None:
                    current_embedding = self._ensure_product_embedding(
                        cursor, connection, current
                    )

                # 3. Tìm ứng viên (Tầng 1: Vector search + Fallback)
                candidates = self._find_candidates(
                    cursor, current, current_embedding, safe_limit
                )
                if not candidates:
                    return []

                # 4. Đánh giá cấu hình & Xếp hạng đa tiêu chí (Tầng 2)
                ranked = self._rank_candidates(current, candidates, safe_limit)

                # 5. Gán nhãn & Viết lý do đề xuất (Tầng 3)
                return self._annotate_candidates(current, ranked)

    def _get_product_by_id(self, cursor, product_id: str) -> dict[str, Any] | None:
        cursor.execute(
            """
            SELECT
                p.id, p.category_id, p.name, p.slug, p.sku, p.brand,
                p.short_description, p.description, p.thumbnail_url,
                p.price, p.original_price, p.stock_quantity,
                p.rating_average, p.review_count, p.featured, p.hot,
                p.active, p.specifications, p.embedding,
                c.id AS category_id_ref, c.name AS category_name, c.slug AS category_slug,
                c.description AS category_description, c.image_url AS category_image_url, c.display_order AS category_display_order
            FROM products p
            JOIN categories c ON c.id = p.category_id
            WHERE p.id = %s AND p.active = TRUE AND c.active = TRUE
            """,
            (product_id,),
        )
        row = cursor.fetchone()
        if not row:
            return None
        return self._map_product_row(row)

    def _map_product_row(self, row: tuple) -> dict[str, Any]:
        specs = row[17]
        if isinstance(specs, str):
            try:
                specs = json.loads(specs)
            except Exception:
                specs = {}
        elif not isinstance(specs, dict):
            specs = {}

        price = float(row[9]) if row[9] is not None else 0.0
        original_price = float(row[10]) if row[10] is not None else None
        discount_percent = 0
        if original_price and original_price > price:
            discount_percent = round((original_price - price) / original_price * 100)

        desc = row[22] if len(row) > 22 and row[22] is not None else None
        img = row[23] if len(row) > 23 and row[23] is not None else None
        disp_order = int(row[24]) if len(row) > 24 and row[24] is not None else 0

        return {
            "id": str(row[0]),
            "categoryId": str(row[1]),
            "name": row[2],
            "slug": row[3],
            "sku": row[4],
            "brand": row[5],
            "shortDescription": row[6],
            "description": row[7],
            "thumbnailUrl": row[8],
            "price": price,
            "originalPrice": original_price,
            "discountPercent": discount_percent,
            "stockQuantity": int(row[11]),
            "ratingAverage": float(row[12]) if row[12] is not None else 0.0,
            "reviewCount": int(row[13]),
            "featured": bool(row[14]),
            "hot": bool(row[15]),
            "active": bool(row[16]),
            "specifications": specs,
            "embedding": row[18],
            "category": {
                "id": str(row[19]),
                "name": row[20],
                "slug": row[21],
                "description": desc,
                "imageUrl": img,
                "displayOrder": disp_order,
            },
        }

    def _ensure_product_embedding(
        self, cursor, connection, product: dict[str, Any]
    ) -> list[float] | None:
        try:
            text = self._build_product_text(product)
            url = f"{self.settings.embedding_api_url.rstrip('/')}/embeddings"
            headers = {"Content-Type": "application/json"}
            if self.settings.embedding_api_key:
                headers["Authorization"] = f"Bearer {self.settings.embedding_api_key}"

            payload = {
                "model": self.settings.embedding_model,
                "input": text,
            }
            resp = self.http_session.post(url, json=payload, headers=headers, timeout=15)
            if resp.status_code == 200:
                data = resp.json()
                embedding = data["data"][0]["embedding"]
                cursor.execute(
                    "UPDATE products SET embedding = %s::vector WHERE id = %s",
                    (embedding, product["id"]),
                )
                connection.commit()
                return embedding
        except Exception as e:
            print(f"[RecommendationService] Không tạo được embedding từ Railway API: {e}")
        return None

    def _build_product_text(self, product: dict[str, Any]) -> str:
        parts = [f"Tên: {product.get('name', '')}"]
        if product.get("brand"):
            parts.append(f"Thương hiệu: {product['brand']}")
        if product.get("category", {}).get("name"):
            parts.append(f"Danh mục: {product['category']['name']}")
        if product.get("shortDescription"):
            desc = product["shortDescription"].strip()
            parts.append(f"Mô tả: {desc[:500]}")

        flat_specs = self._flatten_specs(product.get("specifications", {}))
        if flat_specs:
            specs_str = "; ".join(f"{k}: {v}" for k, v in flat_specs.items())
            parts.append(f"Thông số: {specs_str}")
        return "\n".join(parts)

    def _find_candidates(
        self,
        cursor,
        current: dict[str, Any],
        current_embedding: list[float] | None,
        limit: int,
    ) -> list[dict[str, Any]]:
        candidates_map: dict[str, dict[str, Any]] = {}
        curr_price = current["price"]
        category_id = current["categoryId"]
        product_id = current["id"]

        # Thử tìm bằng pgvector nếu có vector embedding
        if current_embedding is not None and curr_price > 0:
            for band in [self.settings.rec_price_tolerance, self.settings.rec_price_hard_limit]:
                min_price = curr_price * (1.0 - band)
                max_price = curr_price * (1.0 + band)
                cursor.execute(
                    """
                    SELECT
                        p.id, p.category_id, p.name, p.slug, p.sku, p.brand,
                        p.short_description, p.description, p.thumbnail_url,
                        p.price, p.original_price, p.stock_quantity,
                        p.rating_average, p.review_count, p.featured, p.hot,
                        p.active, p.specifications, p.embedding,
                        c.id AS category_id_ref, c.name AS category_name, c.slug AS category_slug,
                        c.description AS category_description, c.image_url AS category_image_url, c.display_order AS category_display_order,
                        1 - (p.embedding <=> %s::vector) AS similarity
                    FROM products p
                    JOIN categories c ON c.id = p.category_id
                    WHERE p.id <> %s
                      AND p.active = TRUE
                      AND c.active = TRUE
                      AND p.stock_quantity > 0
                      AND p.embedding IS NOT NULL
                      AND p.category_id = %s
                      AND p.price BETWEEN %s AND %s
                    ORDER BY p.embedding <=> %s::vector
                    LIMIT %s
                    """,
                    (
                        current_embedding,
                        product_id,
                        category_id,
                        min_price,
                        max_price,
                        current_embedding,
                        min(limit * 3, 30),
                    ),
                )
                for row in cursor.fetchall():
                    item = self._map_product_row(row[:25])
                    item["similarity"] = float(row[25])
                    if item["id"] not in candidates_map:
                        candidates_map[item["id"]] = item
                if len(candidates_map) >= limit:
                    break

        # Fallback SQL nếu vector search không đủ ứng viên
        if len(candidates_map) < limit:
            min_price = curr_price * (1.0 - self.settings.rec_price_hard_limit) if curr_price > 0 else 0
            max_price = curr_price * (1.0 + self.settings.rec_price_hard_limit) if curr_price > 0 else 999999999
            cursor.execute(
                """
                SELECT
                    p.id, p.category_id, p.name, p.slug, p.sku, p.brand,
                    p.short_description, p.description, p.thumbnail_url,
                    p.price, p.original_price, p.stock_quantity,
                    p.rating_average, p.review_count, p.featured, p.hot,
                    p.active, p.specifications, p.embedding,
                    c.id AS category_id_ref, c.name AS category_name, c.slug AS category_slug,
                    c.description AS category_description, c.image_url AS category_image_url, c.display_order AS category_display_order
                FROM products p
                JOIN categories c ON c.id = p.category_id
                WHERE p.id <> %s
                  AND p.category_id = %s
                  AND p.active = TRUE
                  AND c.active = TRUE
                  AND p.stock_quantity > 0
                  AND p.price BETWEEN %s AND %s
                ORDER BY ABS(p.price - %s) ASC, p.rating_average DESC, p.review_count DESC
                LIMIT %s
                """,
                (product_id, category_id, min_price, max_price, curr_price, max(limit * 10, 50)),
            )
            for row in cursor.fetchall():
                item = self._map_product_row(row)
                item.setdefault("similarity", 0.0)
                if item["id"] not in candidates_map:
                    candidates_map[item["id"]] = item

        return list(candidates_map.values())

    def _rank_candidates(
        self,
        current: dict[str, Any],
        candidates: list[dict[str, Any]],
        limit: int,
    ) -> list[dict[str, Any]]:
        curr_price = current["price"]
        curr_specs = self._flatten_specs(current.get("specifications", {}))
        curr_brand = (current.get("brand") or "").strip().lower()

        scored = []
        for cand in candidates:
            # Loại bỏ nếu lệch giá quá ngưỡng cứng 35%
            cand_price = cand["price"]
            if curr_price > 0:
                dev = abs(cand_price - curr_price) / curr_price
                if dev > self.settings.rec_price_hard_limit:
                    continue
            else:
                dev = 0.0

            cand_specs = self._flatten_specs(cand.get("specifications", {}))
            sim = cand.get("similarity", 0.0)
            config_score = self._evaluate_config_power(curr_specs, cand_specs, sim if sim > 0 else 1.0)
            key_specs = self._extract_key_specs(cand_specs)

            cand["config_score"] = config_score
            cand["key_specs"] = key_specs
            cand["price_dev"] = dev
            scored.append(cand)

        # Sắp xếp đa tiêu chí
        scored.sort(key=self._create_comparator(curr_price, curr_brand))

        # Đảm bảo tính đa dạng thương hiệu (tối đa 3 sp/hãng)
        max_per_brand = max(3, limit // 2)
        result = []
        leftover = []
        brand_counts: dict[str, int] = {}

        for item in scored:
            b = (item.get("brand") or "").strip().lower()
            if brand_counts.get(b, 0) < max_per_brand:
                result.append(item)
                brand_counts[b] = brand_counts.get(b, 0) + 1
            else:
                leftover.append(item)
            if len(result) >= limit:
                break

        for item in leftover:
            if len(result) >= limit:
                break
            result.append(item)

        return result[:limit]

    def _create_comparator(self, curr_price: float, curr_brand: str):
        class CompareWrapper:
            def __init__(self, item):
                self.item = item

            def __lt__(self, other):
                dev_a = self.item["price_dev"]
                dev_b = other.item["price_dev"]

                # 1. Chênh lệch giá >= 1.5% -> ưu tiên giá gần nhất
                if abs(dev_a - dev_b) >= 0.015:
                    return dev_a < dev_b

                # 2. Cấu hình mạnh hơn nếu chênh lệch score > 0.05
                score_diff = self.item["config_score"] - other.item["config_score"]
                if abs(score_diff) > 0.05:
                    return score_diff > 0

                # 3. Cùng hãng
                same_a = (self.item.get("brand") or "").strip().lower() == curr_brand
                same_b = (other.item.get("brand") or "").strip().lower() == curr_brand
                if same_a != same_b:
                    return same_a

                # 4. Giá gần nhất tuyệt đối
                if dev_a != dev_b:
                    return dev_a < dev_b

                # 5. Rating & Reviews
                if self.item["ratingAverage"] != other.item["ratingAverage"]:
                    return self.item["ratingAverage"] > other.item["ratingAverage"]
                return self.item["reviewCount"] > other.item["reviewCount"]

        def key_func(item):
            return CompareWrapper(item)

        return key_func

    def _annotate_candidates(
        self, current: dict[str, Any], ranked: list[dict[str, Any]]
    ) -> list[RecommendationItem]:
        if not ranked:
            return []

        curr_price = current["price"]
        best_id = ranked[0]["id"]

        # CHOICE: Trong các sản phẩm còn lại, sản phẩm có cấu hình cao nhất mà giá <= giá sp đang xem
        choice_id = None
        other_candidates = [
            cand for cand in ranked[1:] if cand["price"] <= curr_price and curr_price > 0
        ]
        if other_candidates:
            other_candidates.sort(key=lambda x: x["config_score"], reverse=True)
            choice_id = other_candidates[0]["id"]

        results = []
        for cand in ranked:
            cid = cand["id"]
            badge = "BEST" if cid == best_id else ("CHOICE" if cid == choice_id else None)
            reason = self._build_reason(curr_price, cand["price"], cand["config_score"])

            prod_detail = ProductDetail(
                id=cand["id"],
                name=cand["name"],
                slug=cand["slug"],
                sku=cand["sku"],
                brand=cand["brand"],
                shortDescription=cand["shortDescription"],
                description=cand["description"],
                thumbnailUrl=cand["thumbnailUrl"],
                category=CategoryDetail(**cand["category"]),
                price=cand["price"],
                originalPrice=cand["originalPrice"],
                discountPercent=cand["discountPercent"],
                stockQuantity=cand["stockQuantity"],
                ratingAverage=cand["ratingAverage"],
                reviewCount=cand["reviewCount"],
                featured=cand["featured"],
                hot=cand["hot"],
                onSale=cand["originalPrice"] is not None and cand["originalPrice"] > cand["price"],
                inStock=cand["stockQuantity"] > 0,
                active=cand["active"],
                specifications=cand.get("key_specs", {}),
            )

            results.append(
                RecommendationItem(
                    product=prod_detail,
                    badge=badge,
                    reason=reason,
                    keySpecs=cand.get("key_specs", {}),
                    score=round(cand.get("config_score", 1.0), 3),
                )
            )
        return results

    def _build_reason(self, curr_price: float, cand_price: float, score: float) -> str:
        if curr_price <= 0 or cand_price <= 0:
            price_text = "Cùng tầm giá"
        else:
            diff = abs(cand_price - curr_price)
            if diff < 10000:
                price_text = "Cùng tầm giá"
            elif cand_price < curr_price:
                price_text = f"Rẻ hơn {diff:,.0f}".replace(",", ".") + " đ"
            else:
                price_text = f"Đắt hơn {diff:,.0f}".replace(",", ".") + " đ"

        if score > 1.05:
            config_text = "cấu hình mạnh hơn"
        elif score < 0.95:
            config_text = "cấu hình cơ bản"
        else:
            config_text = "cấu hình tương đương"

        return f"{price_text}, {config_text}"

    # ---------------- Helper bóc tách cấu hình ----------------
    def _flatten_specs(self, specs: Any) -> dict[str, str]:
        out: dict[str, str] = {}
        if not specs:
            return out
        if isinstance(specs, str):
            try:
                specs = json.loads(specs)
            except Exception:
                return {"Thông số": specs}

        if isinstance(specs, dict):
            for k, v in specs.items():
                if isinstance(v, (str, int, float, bool)):
                    out[str(k)] = str(v)
                elif isinstance(v, list):
                    out[str(k)] = ", ".join(str(x) for x in v)
                elif isinstance(v, dict):
                    out.update(self._flatten_specs(v))
        elif isinstance(specs, list):
            for item in specs:
                if isinstance(item, dict):
                    name = item.get("name") or item.get("label") or item.get("key")
                    val = item.get("value")
                    if name and val:
                        out[str(name)] = str(val)
        return out

    def _extract_key_specs(self, all_specs: dict[str, str]) -> dict[str, str]:
        out = {}
        for wanted in KEY_SPEC_LABELS:
            norm_wanted = self._normalize(wanted)
            for k, v in all_specs.items():
                if self._normalize(k) == norm_wanted:
                    out[wanted] = v
                    break
        if not out:
            for k, v in list(all_specs.items())[:5]:
                out[k] = v
        return out

    def _evaluate_config_power(
        self, cur: dict[str, str], cand: dict[str, str], fallback: float = 1.0
    ) -> float:
        total = 0.0
        weight_sum = 0.0

        # CPU (0.35)
        cpu = self._evaluate_cpu(
            self._find_spec(cur, "cpu", "bo vi xu ly", "chip"),
            self._find_spec(cand, "cpu", "bo vi xu ly", "chip"),
        )
        if cpu is not None:
            total += cpu * 0.35
            weight_sum += 0.35

        # RAM (0.30)
        ram = self._evaluate_ram(
            self._find_spec(cur, "ram", "dung luong ram"),
            self._find_spec(cand, "ram", "dung luong ram"),
        )
        if ram is not None:
            total += ram * 0.30
            weight_sum += 0.30

        # GPU (0.20)
        gpu = self._evaluate_gpu(
            self._find_spec(cur, "vga", "card", "do hoa", "gpu"),
            self._find_spec(cand, "vga", "card", "do hoa", "gpu"),
        )
        if gpu is not None:
            total += gpu * 0.20
            weight_sum += 0.20

        # Disk (0.15)
        disk = self._evaluate_disk(
            self._find_spec(cur, "o cung", "ssd", "hdd", "bo nho trong", "rom"),
            self._find_spec(cand, "o cung", "ssd", "hdd", "bo nho trong", "rom"),
        )
        if disk is not None:
            total += disk * 0.15
            weight_sum += 0.15

        return (total / weight_sum) if weight_sum > 0 else fallback

    def _evaluate_cpu(self, a: str | None, b: str | None) -> float | None:
        if not a or not b:
            return None
        la = self._cpu_level(a)
        lb = self._cpu_level(b)
        if la <= 0 or lb <= 0:
            na, nb = self._normalize(a), self._normalize(b)
            return 1.0 if na == nb else (0.95 if (na in nb or nb in na) else 0.85)
        if lb > la:
            return 1.0 + 0.10 * min(3, lb - la)
        elif lb == la:
            return 1.0
        return max(0.3, 1.0 - 0.15 * (la - lb))

    def _cpu_level(self, text: str) -> int:
        t = text.lower()
        if any(x in t for x in ["ultra 9", "i9", "ryzen 9", "ryzen ai 9", "m4 max", "m3 max"]):
            return 9
        if any(x in t for x in ["ultra 7", "i7", "ryzen 7", "ryzen ai 7", "m4 pro", "m3 pro", "x elite"]):
            return 7
        if any(x in t for x in ["ultra 5", "i5", "ryzen 5", "m4", "m3", "m2", "x plus"]):
            return 5
        if any(x in t for x in ["core 3", "i3", "ryzen 3", "m1"]):
            return 3
        if "celeron" in t or "pentium" in t:
            return 1
        return -1

    def _evaluate_ram(self, a: str | None, b: str | None) -> float | None:
        ra = self._amount_gb(a)
        rb = self._amount_gb(b)
        if not ra or not rb or ra <= 0 or rb <= 0:
            return None
        if rb > ra:
            return 1.0 + 0.15 * min(2.0, (rb - ra) / ra)
        elif abs(rb - ra) < 0.1:
            return 1.0
        return max(0.4, rb / ra)

    def _evaluate_gpu(self, a: str | None, b: str | None) -> float | None:
        if not a or not b:
            return None
        ga = self._gpu_level(a)
        gb = self._gpu_level(b)
        if ga <= 0 or gb <= 0:
            return None
        if gb > ga:
            return 1.0 + 0.10 * min(3, gb - ga)
        elif gb == ga:
            return 1.0
        return max(0.4, 1.0 - 0.15 * (ga - gb))

    def _gpu_level(self, text: str) -> int:
        t = text.lower()
        if "4090" in t or "4080" in t:
            return 9
        if any(x in t for x in ["4070", "3080", "rx 7800", "rx 7700"]):
            return 8
        if any(x in t for x in ["4060", "3070", "rx 7600"]):
            return 7
        if any(x in t for x in ["4050", "3060", "3050", "2050", "gtx 1650"]):
            return 6
        if any(x in t for x in ["iris", "intel graphics", "radeon", "uhd"]):
            return 3
        return -1

    def _evaluate_disk(self, a: str | None, b: str | None) -> float | None:
        da = self._amount_gb(a)
        db = self._amount_gb(b)
        if not da or not db or da <= 0 or db <= 0:
            return None
        if db > da:
            return 1.0 + 0.10 * min(1.0, (db - da) / da)
        elif abs(db - da) < 0.1:
            return 1.0
        return max(0.5, db / da)

    def _amount_gb(self, value: str | None) -> float | None:
        if not value:
            return None
        m = AMOUNT_REGEX.search(value)
        if m:
            num = float(m.group(1).replace(",", "."))
            return num * 1024 if m.group(2).lower() == "tb" else num
        num_m = NUMBER_REGEX.search(value)
        return float(num_m.group(1).replace(",", ".")) if num_m else None

    def _find_spec(self, specs: dict[str, str], *needles: str) -> str | None:
        for k, v in specs.items():
            ascii_k = self._ascii(k)
            for needle in needles:
                if needle in ascii_k:
                    return v
        return None

    def _ascii(self, value: str | None) -> str:
        if not value:
            return ""
        nfkd = unicodedata.normalize("NFD", value)
        return (
            "".join(c for c in nfkd if not unicodedata.combining(c))
            .replace("đ", "d")
            .replace("Đ", "d")
            .lower()
        )

    def _normalize(self, value: str | None) -> str:
        if not value:
            return ""
        ascii_val = self._ascii(value)
        return re.sub(r"[^a-z0-9]", "", ascii_val)


_service_instance = None

def get_recommendation_service() -> RecommendationService:
    global _service_instance
    if _service_instance is None:
        _service_instance = RecommendationService()
    return _service_instance
