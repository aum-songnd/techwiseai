import json
import logging
import re
import time
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

logger = logging.getLogger("uvicorn.error")

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
    """
    Dịch vụ AI Đề xuất sản phẩm thông minh (TechWiseAI Recommendation Service)
    Kiến trúc quy chuẩn và tối ưu hóa giải quyết 4 vấn đề kỹ thuật chuyên sâu:
    1. Input: product_id, limit
    2. Product Service: Lấy sản phẩm gốc từ PostgreSQL (Products + Specs + Embeddings)
    3. Phân tích sản phẩm: Tên, giá, cấu hình định lượng, mục đích sử dụng (Use case)
    4. Hai nhánh truy vấn độc lập (Dual Independent Retrieval):
       - SQL Candidate Retrieval: Cùng danh mục, còn hàng, giá phù hợp
       - AI Semantic Retrieval: Tìm theo embedding bằng pgvector (danh mục tương đương có kiểm soát)
    5. Gộp danh sách và loại trùng (Merge & Deduplicate) kèm tính Cosine Similarity toán học
    6. Hard Filters: Danh mục hợp lệ, trạng thái active, tồn kho > 0, ngưỡng giá cứng (<= 35%)
    7. Feature Scoring: Chấm điểm dựa trên thông số có xác nhận, phạt theo spec_confidence
    8. Hybrid Ranking: Sắp xếp nhất quán (Strict Weak Ordering bằng Tuple Key)
    9. Diversity & Explainability: Đa dạng hãng (max 3/brand), gán nhãn BEST/CHOICE, sinh lý do trực quan
    10. Output: Top sản phẩm + điểm + lý do
    """

    # Bảng ánh xạ danh mục tương đương có kiểm soát (Admin-controlled Equivalent Categories)
    # Ngăn chặn việc gợi ý chéo loại sản phẩm (ví dụ laptop không bao giờ gợi ý linh kiện/phụ kiện)
    EQUIVALENT_CATEGORY_MAP: dict[str, list[str]] = {
        # Linh kiện <-> Phụ kiện
        "6682d46a-9adb-4296-9fe7-753004f84c4e": [
            "6682d46a-9adb-4296-9fe7-753004f84c4e",
            "800219f6-6f32-4e72-a761-f8c9e74fc603",
        ],
        "800219f6-6f32-4e72-a761-f8c9e74fc603": [
            "800219f6-6f32-4e72-a761-f8c9e74fc603",
            "6682d46a-9adb-4296-9fe7-753004f84c4e",
            "ef4e95e4-e77a-4c0d-b27c-bc99b53952b2",
        ],
        "ef4e95e4-e77a-4c0d-b27c-bc99b53952b2": [
            "ef4e95e4-e77a-4c0d-b27c-bc99b53952b2",
            "800219f6-6f32-4e72-a761-f8c9e74fc603",
        ],
        "linh-kien": ["linh-kien", "phu-kien"],
        "phu-kien": ["phu-kien", "linh-kien", "tai-nghe"],
        "tai-nghe": ["tai-nghe", "phu-kien"],
    }


    def __init__(self) -> None:
        self.settings = get_settings()
        self.http_session = requests.Session()

    # -------------------------------------------------------------------------
    # PIPELINE CHÍNH (Kèm xử lý Transaction an toàn)
    # -------------------------------------------------------------------------
    def get_recommendations(
        self,
        product_id: str,
        limit: int = 8,
    ) -> list[RecommendationItem]:
        safe_limit = max(1, min(limit, self.settings.rec_max_limit))

        with get_database_connection() as connection:
            try:
                with connection.cursor() as cursor:
                    # 1. Product Service: Lấy sản phẩm gốc từ PostgreSQL
                    current = self._get_product_by_id(cursor, product_id)
                    if not current:
                        return []

                    # Đảm bảo sản phẩm có vector embedding (nếu thiếu, gọi embedding API để sinh)
                    current_embedding = current.get("embedding")
                    if current_embedding is None:
                        current_embedding = self._ensure_product_embedding(
                            cursor, connection, current
                        )
                        current["embedding"] = current_embedding

                    # 2. Phân tích sản phẩm: Tên, giá, cấu hình thực tế, mục đích sử dụng
                    current_profile = self._analyze_product_profile(current)

                    # Xác định danh mục tương đương có kiểm soát
                    allowed_categories = self._get_allowed_category_ids(
                        current.get("categoryId")
                    )

                    # 3. Hai nhánh truy vấn độc lập (Đo lường thời gian thực thi)
                    t_sql = time.perf_counter()
                    sql_candidates = self._sql_candidate_retrieval(
                        cursor, current, safe_limit, allowed_categories
                    )
                    sql_duration_ms = (time.perf_counter() - t_sql) * 1000

                    t_ai = time.perf_counter()
                    ai_candidates = self._ai_semantic_retrieval(
                        cursor, current, current_embedding, safe_limit, allowed_categories
                    )
                    ai_duration_ms = (time.perf_counter() - t_ai) * 1000

                    logger.info(
                        "Dual Retrieval [SP: %s]: SQL=%d mục (%.1f ms) | AI Semantic=%d mục (%.1f ms)",
                        product_id,
                        len(sql_candidates),
                        sql_duration_ms,
                        len(ai_candidates),
                        ai_duration_ms,
                    )

                    # 4. Gộp danh sách và loại trùng (Merge & Deduplicate)
                    merged = self._merge_and_deduplicate(
                        sql_candidates, ai_candidates, current_embedding
                    )
                    if not merged:
                        return []

                    # 5. Hard Filters (Danh mục hợp lệ, trạng thái, tồn kho, giá)
                    filtered = self._apply_hard_filters(
                        current, merged, allowed_categories
                    )
                    if not filtered:
                        return []

                    # 6. Feature Scoring & 7. Hybrid Ranking (Sắp xếp nhất quán)
                    ranked = self._rank_candidates(
                        current,
                        filtered,
                        safe_limit,
                        current_profile=current_profile,
                    )


                    # 8. Diversity & Explainability (Đa dạng hãng, lý do gợi ý)
                    # 9. OUTPUT: Top sản phẩm + điểm + lý do
                    return self._annotate_candidates(
                        current, ranked, current_profile=current_profile
                    )
            except Exception as e:
                # Đảm bảo rollback khi có lỗi truy vấn để không làm hỏng transaction PostgreSQL
                connection.rollback()
                logger.exception("Lỗi khi xử lý gợi ý sản phẩm %s: %s", product_id, e)
                raise

    # -------------------------------------------------------------------------
    # 1. TRUY VẤN DỮ LIỆU SẢN PHẨM GỐC TỪ POSTGRESQL
    # -------------------------------------------------------------------------
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

        # Vector embedding (chuyển sang list float nếu là Vector, chuỗi hoặc memoryview)
        emb = row[18]
        if hasattr(emb, "to_list"):
            try:
                emb = [float(x) for x in emb.to_list()]
            except Exception:
                emb = None
        elif isinstance(emb, str):
            try:
                emb = [float(x.strip()) for x in emb.strip("[]").split(",") if x.strip()]
            except Exception:
                emb = None


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
            "embedding": emb,
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
            print(f"[RecommendationService] Không tạo được embedding từ API: {e}")
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

    # -------------------------------------------------------------------------
    # 2. PHÂN TÍCH SẢN PHẨM (Dữ liệu xác nhận, tránh giả định sai)
    # -------------------------------------------------------------------------
    def _analyze_product_profile(self, product: dict[str, Any]) -> dict[str, Any]:
        specs = self._flatten_specs(product.get("specifications", {}))
        name = product.get("name") or ""
        brand = product.get("brand") or ""
        price = float(product.get("price") or 0.0)

        cpu_str = self._find_spec(specs, "cpu", "bo vi xu ly", "chip") or ""
        ram_str = self._find_spec(specs, "ram", "dung luong ram") or ""
        gpu_str = self._find_spec(specs, "vga", "card", "do hoa", "gpu") or ""
        ssd_str = self._find_spec(specs, "o cung", "ssd", "hdd", "bo nho trong", "rom") or ""

        cpu_tier = self._cpu_level(cpu_str) if cpu_str else self._infer_cpu_level_from_text(name)
        if cpu_tier is not None and cpu_tier <= 0:
            cpu_tier = None

        ram_gb = self._amount_gb(ram_str) or self._infer_ram_from_text(name)
        # Giữ None nếu thiếu RAM, không tự gán mặc định 8.0GB

        gpu_tier = self._gpu_level(gpu_str) if gpu_str else self._infer_gpu_level_from_text(name)
        if gpu_tier is not None and gpu_tier <= 0:
            gpu_tier = None

        ssd_gb = self._amount_gb(ssd_str) or self._infer_ssd_from_text(name)
        # Giữ None nếu thiếu SSD, không tự gán mặc định 512.0GB

        # Chỉ số tin cậy thông số xác nhận (spec_confidence)
        verified_count = sum(x is not None for x in [cpu_tier, ram_gb, gpu_tier, ssd_gb])
        spec_confidence = verified_count / 4.0

        purpose = self._detect_purpose(name, brand, specs, gpu_tier or 0, ram_gb or 0.0)

        return {
            "name": name,
            "brand": brand,
            "price": price,
            "specs": specs,
            "cpu_str": cpu_str,
            "cpu_tier": cpu_tier,
            "ram_str": ram_str,
            "ram_gb": ram_gb,
            "gpu_str": gpu_str,
            "gpu_tier": gpu_tier,
            "ssd_str": ssd_str,
            "ssd_gb": ssd_gb,
            "spec_confidence": spec_confidence,
            "purpose": purpose,
        }

    def _detect_purpose(
        self, name: str, brand: str, specs: dict[str, str], gpu_tier: int, ram_gb: float
    ) -> str:
        text = f"{name} {brand} " + " ".join(specs.values())
        t = self._ascii(text).lower()

        # Gaming detection
        gaming_keywords = [
            "gaming", "tuf", "rog", "nitro", "legion", "loq", "predator",
            "victus", "omen", "alienware", "katana", "sword", "cyborg", "bravo"
        ]
        if any(k in t for k in gaming_keywords) or (gpu_tier >= 6 and ("hz" in t or "rtx" in t or "gtx" in t)):
            return "GAMING"

        # Graphics / Creative detection
        creative_keywords = [
            "proart", "creator", "studio", "oled", "100% srgb", "dci-p3",
            "retina", "macbook pro", "yoga pro"
        ]
        if any(k in t for k in creative_keywords) or (gpu_tier >= 6 and ram_gb >= 16 and "oled" in t):
            return "GRAPHICS_CREATIVE"

        # Ultrabook / Business
        business_keywords = [
            "thinkpad", "zenbook", "xps", "envy", "spectre", "macbook air",
            "gram", "expertbook", "latitude", "elitebook"
        ]
        if any(k in t for k in business_keywords):
            return "ULTRABOOK_BUSINESS"

        # Office / Student
        office_keywords = [
            "vivobook", "ideapad", "aspire", "swift", "inspiron", "vostro", "pavilion", "modern"
        ]
        if any(k in t for k in office_keywords) or (gpu_tier > 0 and gpu_tier <= 3):
            return "OFFICE_STUDENT"

        return "GENERAL"

    def _purpose_compatibility(self, purp1: str, purp2: str) -> float:
        if purp1 == purp2:
            return 1.0
        if {purp1, purp2} == {"GAMING", "GRAPHICS_CREATIVE"}:
            return 0.85
        if {purp1, purp2} == {"OFFICE_STUDENT", "ULTRABOOK_BUSINESS"}:
            return 0.90
        if "GENERAL" in (purp1, purp2):
            return 0.80
        return 0.55

    # -------------------------------------------------------------------------
    # 3. QUẢN LÝ DANH MỤC TƯƠNG ĐƯƠNG & HAI NHÁNH TRUY VẤN ĐỘC LẬP
    # -------------------------------------------------------------------------
    def _get_allowed_category_ids(self, category_id: str | None) -> list[str]:
        """
        Lấy danh sách các danh mục được phép mở rộng:
        - Mặc định: Chính danh mục của sản phẩm.
        - Mở rộng: Chỉ những danh mục được cấu hình tường minh trong EQUIVALENT_CATEGORY_MAP.
        - Tuyệt đối không tự động gom tất cả danh mục cùng cha để tránh gợi ý sai loại sản phẩm.
        """
        if not category_id:
            return []
        cid = str(category_id)
        allowed = [cid]
        mapped = self.EQUIVALENT_CATEGORY_MAP.get(cid, [])
        for item in mapped:
            item_str = str(item)
            if item_str not in allowed:
                allowed.append(item_str)
        return allowed

    def _sql_candidate_retrieval(
        self,
        cursor,
        current: dict[str, Any],
        limit: int,
        allowed_categories: list[str] | None = None,
    ) -> list[dict[str, Any]]:
        """Nhánh A: Truy vấn SQL chuẩn tập trung danh mục cho phép và tiệm cận giá."""
        curr_price = current["price"]
        cat_ids = allowed_categories or ([current["categoryId"]] if current.get("categoryId") else [])
        product_id = current["id"]

        min_price = curr_price * (1.0 - self.settings.rec_price_hard_limit) if curr_price > 0 else 0
        max_price = curr_price * (1.0 + self.settings.rec_price_hard_limit) if curr_price > 0 else 999999999

        query = """
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
          AND p.category_id = ANY(%s)
          AND p.active = TRUE
          AND c.active = TRUE
          AND p.stock_quantity > 0
          AND p.price BETWEEN %s AND %s
        ORDER BY ABS(p.price - %s) ASC, p.rating_average DESC, p.review_count DESC
        LIMIT %s
        """
        cursor.execute(
            query,
            (product_id, cat_ids, min_price, max_price, curr_price, max(limit * 5, 40)),
        )
        candidates = []
        for row in cursor.fetchall():
            item = self._map_product_row(row)
            item["retrieval_source"] = "sql"
            item.setdefault("similarity", None)
            candidates.append(item)
        return candidates

    def _ai_semantic_retrieval(
        self,
        cursor,
        current: dict[str, Any],
        current_embedding: list[float] | None,
        limit: int,
        allowed_categories: list[str] | None = None,
    ) -> list[dict[str, Any]]:
        """Nhánh B: Tìm kiếm ngữ nghĩa bằng vector cosine similarity qua pgvector."""
        if current_embedding is None:
            return []

        curr_price = current["price"]
        product_id = current["id"]
        cat_ids = allowed_categories or [current["categoryId"]]

        min_price = curr_price * (1.0 - self.settings.rec_price_hard_limit) if curr_price > 0 else 0
        max_price = curr_price * (1.0 + self.settings.rec_price_hard_limit) if curr_price > 0 else 999999999

        query = """
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
          AND p.category_id = ANY(%s)
          AND p.active = TRUE
          AND c.active = TRUE
          AND p.stock_quantity > 0
          AND p.embedding IS NOT NULL
          AND p.price BETWEEN %s AND %s
        ORDER BY p.embedding <=> %s::vector
        LIMIT %s
        """
        cursor.execute(
            query,
            (
                current_embedding,
                product_id,
                cat_ids,
                min_price,
                max_price,
                current_embedding,
                max(limit * 5, 40),
            ),
        )
        candidates = []
        for row in cursor.fetchall():
            item = self._map_product_row(row[:25])
            item["similarity"] = float(row[25])
            item["retrieval_source"] = "semantic"
            candidates.append(item)
        return candidates

    # -------------------------------------------------------------------------
    # 4. GỘP DANH SÁCH VÀ LOẠI TRÙNG (Tính Cosine thật, không gán 0.65)
    # -------------------------------------------------------------------------
    def _calculate_cosine_similarity(
        self, a: Any, b: Any
    ) -> float | None:
        """Tính Cosine Similarity toán học chính xác giữa 2 vector."""
        if a is None or b is None:
            return None
        if hasattr(a, "to_list"):
            a = a.to_list()
        if hasattr(b, "to_list"):
            b = b.to_list()
        if not isinstance(a, (list, tuple)) or not isinstance(b, (list, tuple)):
            return None
        if len(a) != len(b) or len(a) == 0:
            return None
        try:
            dot = sum(x * y for x, y in zip(a, b))
            norm_a = sum(x * x for x in a) ** 0.5
            norm_b = sum(y * y for y in b) ** 0.5
            if norm_a == 0 or norm_b == 0:
                return 0.0
            return max(0.0, min(1.0, dot / (norm_a * norm_b)))
        except Exception:
            return None


    def _merge_and_deduplicate(
        self,
        sql_candidates: list[dict[str, Any]],
        ai_candidates: list[dict[str, Any]],
        current_embedding: list[float] | None = None,
    ) -> list[dict[str, Any]]:
        merged_map: dict[str, dict[str, Any]] = {}

        # Nạp các ứng viên từ nhánh AI Semantic (đã có similarity thực tế)
        for item in ai_candidates:
            item["retrieval_source"] = "semantic"
            item["has_embedding"] = item.get("similarity") is not None
            merged_map[item["id"]] = item

        # Gộp các ứng viên từ nhánh SQL
        for item in sql_candidates:
            cid = item["id"]
            if cid in merged_map:
                merged_map[cid]["retrieval_source"] = "dual_both"
            else:
                cand_emb = item.get("embedding")
                if current_embedding is not None and cand_emb is not None:
                    # Tính cosine similarity thực tế nếu có vector
                    sim = self._calculate_cosine_similarity(current_embedding, cand_emb)
                    item["similarity"] = sim
                    item["has_embedding"] = sim is not None
                else:
                    # KHÔNG tự gán 0.65! Đánh dấu None để xử lý bằng dynamic weight re-normalization
                    item["similarity"] = None
                    item["has_embedding"] = False
                item["retrieval_source"] = "sql"
                merged_map[cid] = item

        return list(merged_map.values())

    # -------------------------------------------------------------------------
    # 5. HARD FILTERS (Cổng lọc cứng)
    # -------------------------------------------------------------------------
    def _apply_hard_filters(
        self,
        current: dict[str, Any],
        candidates: list[dict[str, Any]],
        allowed_categories: list[str] | None = None,
    ) -> list[dict[str, Any]]:
        curr_price = current.get("price", 0.0)
        curr_cat_id = current.get("categoryId")
        curr_id = current.get("id")
        hard_limit = self.settings.rec_price_hard_limit  # Mặc định 0.35 (35%)

        allowed_set = set(allowed_categories or ([curr_cat_id] if curr_cat_id else []))

        filtered = []
        for cand in candidates:
            # 1. Tránh tự đề xuất chính nó
            if cand.get("id") == curr_id:
                continue

            # 2. Trạng thái active & còn hàng
            if not cand.get("active", True) or cand.get("stockQuantity", 0) <= 0:
                continue

            # 3. Phải nằm trong danh mục cho phép (cùng danh mục hoặc tương đương)
            cand_cat_id = cand.get("categoryId")
            if allowed_set and cand_cat_id and cand_cat_id not in allowed_set:
                continue

            # 4. Cổng giá cứng: không lệch quá hard_limit
            cand_price = cand.get("price", 0.0)
            if curr_price > 0 and cand_price > 0:
                dev = abs(cand_price - curr_price) / curr_price
                if dev > hard_limit:
                    continue
            elif cand_price <= 0:
                continue

            filtered.append(cand)

        return filtered

    # -------------------------------------------------------------------------
    # 6. FEATURE SCORING & 7. HYBRID RANKING (Sắp xếp nhất quán bằng Tuple Key)
    # -------------------------------------------------------------------------
    def _get_price_band(self, dev: float) -> int:
        """
        Phân nhóm khoảng giá:
        - Band 0 (Core Budget): Lệch giá <= 15% (vùng ngân sách trọng tâm).
        - Band 1 (Extended Budget): Lệch giá 15% - 35% (vùng ngân sách mở rộng).
        """
        return 0 if dev <= self.settings.rec_price_tolerance else 1

    def _rank_candidates(
        self,
        current: dict[str, Any],
        candidates: list[dict[str, Any]],
        limit: int,
        current_profile: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        # Không lọc lại ở đây vì đầu vào candidates đã được lọc qua bước _apply_hard_filters tại pipeline chính
        valid_candidates = candidates
        if not valid_candidates:
            return []

        if current_profile is None:
            current_profile = self._analyze_product_profile(current)

        curr_price = current_profile["price"]
        curr_brand = (current_profile["brand"] or "").strip().lower()

        scored = []
        for cand in valid_candidates:
            cand_profile = self._analyze_product_profile(cand)
            cand_price = cand_profile["price"]

            # 1. Price deviation và Phân nhóm giá (Price Band)
            dev = abs(cand_price - curr_price) / curr_price if curr_price > 0 else 0.0
            price_band = self._get_price_band(dev)
            price_proximity = max(0.0, 1.0 - (dev / self.settings.rec_price_hard_limit))
            value_bonus = 0.15 * max(0.0, (curr_price - cand_price) / curr_price) if curr_price > 0 else 0.0
            s_price = min(1.0, 0.85 * price_proximity + value_bonus)

            # 2. Điểm cấu hình phần cứng (Điều chỉnh theo spec_confidence, tránh lạc quan quá mức)
            config_score = self._evaluate_config_power(current_profile, cand_profile, fallback=0.85)

            # 3. Điểm phù hợp mục đích sử dụng (Purpose Match)
            s_purpose = self._purpose_compatibility(
                current_profile["purpose"], cand_profile["purpose"]
            )

            # 4. Điểm đánh giá (Rating)
            rating = cand.get("ratingAverage", 0.0) or 0.0
            s_rating = min(1.0, max(0.0, rating / 5.0))

            # 5. Điểm tương đồng AI & Tái chuẩn hóa trọng số khi thiếu dữ liệu (Dynamic Weight Re-normalization)
            sim = cand.get("similarity")
            brand_bonus = 0.02 if (cand.get("brand") or "").strip().lower() == curr_brand else 0.0

            if sim is not None and sim > 0:
                s_semantic = max(0.0, min(1.0, float(sim)))
                w_sem, w_cfg, w_prc, w_purp, w_rat = 0.30, 0.30, 0.20, 0.15, 0.05
                hybrid_score = (
                    w_sem * s_semantic
                    + w_cfg * min(1.3, config_score)
                    + w_prc * s_price
                    + w_purp * s_purpose
                    + w_rat * s_rating
                    + brand_bonus
                )
            else:
                # Ứng viên không có vector embedding: KHÔNG tự gán 0.65!
                w_cfg = 0.30 / 0.70    # ~0.428
                w_prc = 0.20 / 0.70    # ~0.286
                w_purp = 0.15 / 0.70   # ~0.214
                w_rat = 0.05 / 0.70    # ~0.071
                hybrid_score = (
                    w_cfg * min(1.3, config_score)
                    + w_prc * s_price
                    + w_purp * s_purpose
                    + w_rat * s_rating
                    + brand_bonus
                )
                s_semantic = None

            cand["config_score"] = round(config_score, 4)
            cand["hybrid_score"] = round(hybrid_score, 4)
            cand["price_dev"] = round(dev, 4)
            cand["price_band"] = price_band
            cand["key_specs"] = self._extract_key_specs(cand_profile["specs"])
            cand["profile"] = cand_profile
            cand["spec_confidence"] = cand_profile.get("spec_confidence", 0.0)
            cand["features"] = {
                "s_price": round(s_price, 3),
                "s_config": round(config_score, 3),
                "s_semantic": round(s_semantic, 3) if s_semantic is not None else None,
                "s_purpose": round(s_purpose, 3),
                "s_rating": round(s_rating, 3),
                "price_band": price_band,
            }
            scored.append(cand)

        # ---------------------------------------------------------------------
        # SẮP XẾP NHẤT QUÁN BẰNG TUPLE KEY (Strict Weak Ordering):
        # 1. price_band: Nhóm ngân sách (Band 0 <= 15% trước Band 1: 15-35%)
        # 2. price_dev: Giá chênh lệch ít nhất (ưu tiên tiệm cận ngân sách)
        # 3. -hybrid_score: Hybrid Score cao nhất (AI phân biệt sản phẩm cùng tầm giá)
        # 4. same_brand: Ưu tiên cùng thương hiệu
        # 5. -ratingAverage: Đánh giá người dùng
        # 6. -reviewCount: Lượt đánh giá
        # 7. str(id): Tính tất định 100%
        # ---------------------------------------------------------------------
        scored.sort(
            key=lambda x: (
                x["price_band"],
                x["price_dev"],
                -x["hybrid_score"],
                0 if (x.get("brand") or "").strip().lower() == curr_brand else 1,
                -(x.get("ratingAverage") or 0.0),
                -(x.get("reviewCount") or 0),
                str(x["id"]),
            )
        )


        # ---------------------------------------------------------------------
        # 8a. DIVERSITY: Đa dạng hóa thương hiệu (Tối đa 3 sản phẩm / hãng)
        # ---------------------------------------------------------------------
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

    # -------------------------------------------------------------------------
    # 8b. EXPLAINABILITY: Gán nhãn BEST/CHOICE và Viết lý do gợi ý trực quan
    # -------------------------------------------------------------------------
    def _annotate_candidates(
        self,
        current: dict[str, Any],
        ranked: list[dict[str, Any]],
        current_profile: dict[str, Any] | None = None,
    ) -> list[RecommendationItem]:
        if not ranked:
            return []

        if current_profile is None:
            current_profile = self._analyze_product_profile(current)

        curr_price = current_profile["price"]
        best_id = ranked[0]["id"]

        # CHOICE: Sản phẩm có cấu hình cao nhất trong phân khúc giá <= giá sản phẩm đang xem
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
            cand_prof = cand.get("profile") or self._analyze_product_profile(cand)

            reason = self._build_smart_reason(
                curr_price,
                cand["price"],
                current_profile,
                cand_prof,
                cand.get("config_score", 1.0),
            )

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

            display_score = cand.get("hybrid_score") or cand.get("config_score", 1.0)

            results.append(
                RecommendationItem(
                    product=prod_detail,
                    badge=badge,
                    reason=reason,
                    keySpecs=cand.get("key_specs", {}),
                    score=round(display_score, 3),
                )
            )
        return results

    def _build_smart_reason(
        self,
        curr_price: float,
        cand_price: float,
        curr_prof: dict[str, Any],
        cand_prof: dict[str, Any],
        score: float,
    ) -> str:
        # 1. So sánh giá
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

        # 2. Tìm điểm nhấn phần cứng nổi trội nhất (chỉ xét khi có dữ liệu thật của cả 2)
        standout_spec = None
        cand_ram = cand_prof.get("ram_gb")
        curr_ram = curr_prof.get("ram_gb")
        if cand_ram and curr_ram and cand_ram > curr_ram:
            ratio = cand_ram / curr_ram
            if ratio >= 2.0:
                standout_spec = f"RAM {int(cand_ram)}GB gấp đôi"
            else:
                standout_spec = f"RAM {int(cand_ram)}GB lớn hơn"

        cand_cpu = cand_prof.get("cpu_tier")
        curr_cpu = curr_prof.get("cpu_tier")
        if not standout_spec and cand_cpu and curr_cpu and cand_cpu > curr_cpu:
            standout_spec = "CPU thế hệ mạnh hơn"

        cand_gpu = cand_prof.get("gpu_tier")
        curr_gpu = curr_prof.get("gpu_tier")
        if not standout_spec and cand_gpu and curr_gpu and cand_gpu > curr_gpu and cand_gpu >= 6:
            standout_spec = "Card đồ họa chuyên dụng mạnh hơn"

        # 3. Tổng kết sức mạnh cấu hình (Kiểm soát theo spec_confidence để tránh lạc quan sai)
        cand_conf = cand_prof.get("spec_confidence", 1.0)
        if cand_conf < 0.5:
            config_text = "thông số cơ bản"
        elif score > 1.05:
            config_text = standout_spec if standout_spec else "cấu hình mạnh hơn"
        elif score < 0.95:
            config_text = "cấu hình cơ bản"
        else:
            config_text = "cấu hình tương đương"

        return f"{price_text}, {config_text}"

    # -------------------------------------------------------------------------
    # HELPER ĐÁNH GIÁ THÔNG SỐ KỸ THUẬT (Chỉ so sánh dữ liệu có xác nhận)
    # -------------------------------------------------------------------------
    def _evaluate_config_power(
        self, cur: dict[str, Any], cand: dict[str, Any], fallback: float = 0.85
    ) -> float:
        """
        Đánh giá sức mạnh cấu hình:
        Chỉ tính toán và so sánh trên các thông số mà CẢ HAI sản phẩm đều có dữ liệu thật.
        Trọng số sẽ tự động tái chuẩn hóa trên các thông số hợp lệ.
        Điều chỉnh điểm dựa trên spec_confidence để tránh quá lạc quan khi sản phẩm thiếu thông tin.
        """
        if "cpu_tier" in cur and "cpu_tier" in cand:
            cur_cpu, cand_cpu = cur.get("cpu_tier"), cand.get("cpu_tier")
            cur_ram, cand_ram = cur.get("ram_gb"), cand.get("ram_gb")
            cur_gpu, cand_gpu = cur.get("gpu_tier"), cand.get("gpu_tier")
            cur_ssd, cand_ssd = cur.get("ssd_gb"), cand.get("ssd_gb")
        else:
            cur_specs = self._flatten_specs(cur.get("specifications", cur))
            cand_specs = self._flatten_specs(cand.get("specifications", cand))

            c_cpu = self._find_spec(cur_specs, "cpu", "bo vi xu ly", "chip")
            cd_cpu = self._find_spec(cand_specs, "cpu", "bo vi xu ly", "chip")
            cur_cpu = self._cpu_level(c_cpu) if c_cpu else None
            if cur_cpu is not None and cur_cpu <= 0:
                cur_cpu = None
            cand_cpu = self._cpu_level(cd_cpu) if cd_cpu else None
            if cand_cpu is not None and cand_cpu <= 0:
                cand_cpu = None

            cur_ram = self._amount_gb(self._find_spec(cur_specs, "ram", "dung luong ram"))
            cand_ram = self._amount_gb(self._find_spec(cand_specs, "ram", "dung luong ram"))

            c_gpu = self._find_spec(cur_specs, "vga", "card", "do hoa", "gpu")
            cd_gpu = self._find_spec(cand_specs, "vga", "card", "do hoa", "gpu")
            cur_gpu = self._gpu_level(c_gpu) if c_gpu else None
            if cur_gpu is not None and cur_gpu <= 0:
                cur_gpu = None
            cand_gpu = self._gpu_level(cd_gpu) if cd_gpu else None
            if cand_gpu is not None and cand_gpu <= 0:
                cand_gpu = None

            cur_ssd = self._amount_gb(self._find_spec(cur_specs, "o cung", "ssd", "hdd", "bo nho trong", "rom"))
            cand_ssd = self._amount_gb(self._find_spec(cand_specs, "o cung", "ssd", "hdd", "bo nho trong", "rom"))

        total_score = 0.0
        weight_sum = 0.0

        if cur_cpu is not None and cand_cpu is not None:
            total_score += self._evaluate_cpu_score(cur_cpu, cand_cpu) * 0.35
            weight_sum += 0.35

        if cur_ram is not None and cand_ram is not None:
            total_score += self._evaluate_ram_score(cur_ram, cand_ram) * 0.30
            weight_sum += 0.30

        if cur_gpu is not None and cand_gpu is not None:
            total_score += self._evaluate_gpu_score(cur_gpu, cand_gpu) * 0.20
            weight_sum += 0.20

        if cur_ssd is not None and cand_ssd is not None:
            total_score += self._evaluate_ssd_score(cur_ssd, cand_ssd) * 0.15
            weight_sum += 0.15

        raw_score = (total_score / weight_sum) if weight_sum > 0 else fallback

        # Điều chỉnh theo độ tin cậy thông số (spec_confidence)
        cand_conf = cand.get("spec_confidence") if isinstance(cand, dict) else None
        if cand_conf is None:
            cand_conf = (weight_sum / 1.0) if weight_sum > 0 else 0.0

        conservative_baseline = 0.85
        effective_score = cand_conf * raw_score + (1.0 - cand_conf) * conservative_baseline
        return effective_score

    def _evaluate_cpu_score(self, la: int, lb: int) -> float:
        if la <= 0 or lb <= 0:
            return 1.0
        if lb > la:
            return 1.0 + 0.10 * min(3, lb - la)
        elif lb == la:
            return 1.0
        return max(0.4, 1.0 - 0.15 * (la - lb))

    def _evaluate_ram_score(self, ra: float | None, rb: float | None) -> float:
        if not ra or not rb or ra <= 0 or rb <= 0:
            return 1.0
        if rb > ra:
            return 1.0 + 0.15 * min(2.0, (rb - ra) / ra)
        elif abs(rb - ra) < 0.1:
            return 1.0
        return max(0.4, rb / ra)

    def _evaluate_gpu_score(self, ga: int, gb: int) -> float:
        if ga <= 0 or gb <= 0:
            return 1.0
        if gb > ga:
            return 1.0 + 0.10 * min(3, gb - ga)
        elif gb == ga:
            return 1.0
        return max(0.4, 1.0 - 0.15 * (ga - gb))

    def _evaluate_ssd_score(self, da: float | None, db: float | None) -> float:
        if not da or not db or da <= 0 or db <= 0:
            return 1.0
        if db > da:
            return 1.0 + 0.10 * min(1.0, (db - da) / da)
        elif abs(db - da) < 0.1:
            return 1.0
        return max(0.5, db / da)

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

    def _infer_cpu_level_from_text(self, text: str) -> int | None:
        lvl = self._cpu_level(text)
        return lvl if lvl > 0 else None

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

    def _infer_gpu_level_from_text(self, text: str) -> int | None:
        lvl = self._gpu_level(text)
        return lvl if lvl > 0 else None

    def _infer_ram_from_text(self, text: str) -> float | None:
        m = re.search(r"(\d+)\s*(?:gb|g)\s*(?:ram|ddr)?", text, re.IGNORECASE)
        if m:
            val = float(m.group(1))
            if val in [4, 8, 16, 24, 32, 64, 128]:
                return val
        return None

    def _infer_ssd_from_text(self, text: str) -> float | None:
        m = re.search(r"(\d+)\s*(tb|gb)\s*(?:ssd|hdd|nvme)?", text, re.IGNORECASE)
        if m:
            num = float(m.group(1))
            return num * 1024 if m.group(2).lower() == "tb" else num
        return None

    def _amount_gb(self, value: str | None) -> float | None:
        if not value:
            return None
        m = AMOUNT_REGEX.search(value)
        if m:
            num = float(m.group(1).replace(",", "."))
            return num * 1024 if m.group(2).lower() == "tb" else num
        num_m = NUMBER_REGEX.search(value)
        return float(num_m.group(1).replace(",", ".")) if num_m else None

    # -------------------------------------------------------------------------
    # UTILITIES
    # -------------------------------------------------------------------------
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
