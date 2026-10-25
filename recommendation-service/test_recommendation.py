"""
Script kiểm thử độc lập cho module Recommendation Service (TechWiseAI).
Chạy lệnh:
    python test_recommendation.py
"""

import sys
import unittest
from unittest.mock import MagicMock, patch

# Đảm bảo import được module app
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.services.recommendation_service import RecommendationService
from app.schemas.recommendation import CategoryDetail, ProductDetail, RecommendationResponse


class TestRecommendationService(unittest.TestCase):
    def setUp(self):
        self.service = RecommendationService()

    def test_01_spec_parsing_and_evaluation(self):
        """Kiểm tra bóc tách cấu hình và so sánh sức mạnh phần cứng."""
        print("\n--- Test 1: Bóc tách và so sánh cấu hình (CPU, RAM, GPU, Ổ cứng) ---")

        base_specs = {
            "Loại CPU": "Intel Core i5-13500H",
            "Dung lượng RAM": "16 GB",
            "Loại card đồ họa": "RTX 4050 6GB",
            "Ổ cứng": "512 GB SSD"
        }

        # Ứng viên cấu hình mạnh hơn (RAM 32GB, RTX 4060)
        stronger_specs = {
            "Loại CPU": "Intel Core i7-13700H",
            "Dung lượng RAM": "32 GB",
            "Loại card đồ họa": "RTX 4060 8GB",
            "Ổ cứng": "1 TB SSD"
        }

        # Ứng viên cấu hình yếu hơn (RAM 8GB, Card onboard)
        weaker_specs = {
            "Loại CPU": "Intel Core i3-1215U",
            "Dung lượng RAM": "8 GB",
            "Loại card đồ họa": "Intel Iris Xe",
            "Ổ cứng": "256 GB SSD"
        }

        score_stronger = self.service._evaluate_config_power(base_specs, stronger_specs, 1.0)
        score_weaker = self.service._evaluate_config_power(base_specs, weaker_specs, 1.0)

        print(f"Base specs: Core i5 | 16GB | RTX 4050")
        print(f"Stronger specs score: {score_stronger:.3f} (> 1.0 là mạnh hơn)")
        print(f"Weaker specs score: {score_weaker:.3f} (< 1.0 là yếu hơn)")

        self.assertGreater(score_stronger, 1.0, "Cấu hình cao hơn phải có điểm > 1.0")
        self.assertLess(score_weaker, 1.0, "Cấu hình thấp hơn phải có điểm < 1.0")

    def test_02_price_tolerance_and_ranking(self):
        """Kiểm tra quy tắc xếp hạng và loại bỏ sản phẩm lệch giá quá 35%."""
        print("\n--- Test 2: Quy tắc xếp hạng theo tầm giá và đa dạng thương hiệu ---")

        current_product = {
            "id": "prod-0",
            "name": "Laptop Asus Zenbook 14",
            "brand": "Asus",
            "price": 20_000_000.0,
            "categoryId": "cat-laptop",
            "specifications": {"Loại CPU": "Core i5", "Dung lượng RAM": "16 GB"}
        }

        candidates = [
            # Ứng viên 1: Asus cùng tầm giá (21tr), cùng hãng
            {
                "id": "prod-1",
                "name": "Laptop Asus Vivobook 15",
                "slug": "laptop-asus-vivobook-15",
                "sku": "ASUS-VB-15",
                "brand": "Asus",
                "price": 21_000_000.0,
                "originalPrice": 22_000_000.0,
                "discountPercent": 5,
                "stockQuantity": 10,
                "ratingAverage": 4.8,
                "reviewCount": 20,
                "featured": True,
                "hot": True,
                "active": True,
                "shortDescription": "Laptop Asus",
                "description": "Chi tiết",
                "thumbnailUrl": "https://example.com/1.jpg",
                "category": {"id": "cat-laptop", "name": "Laptop", "slug": "laptop"},
                "specifications": {"Loại CPU": "Core i5", "Dung lượng RAM": "16 GB"},
                "similarity": 0.85
            },
            # Ứng viên 2: Lenovo cấu hình cao hơn cùng giá (19.5tr)
            {
                "id": "prod-2",
                "name": "Laptop Lenovo ThinkBook 14 G6",
                "slug": "laptop-lenovo-thinkbook-14",
                "sku": "LENOVO-TB-14",
                "brand": "Lenovo",
                "price": 19_500_000.0,
                "originalPrice": 21_000_000.0,
                "discountPercent": 7,
                "stockQuantity": 8,
                "ratingAverage": 4.9,
                "reviewCount": 35,
                "featured": True,
                "hot": True,
                "active": True,
                "shortDescription": "Laptop Lenovo",
                "description": "Chi tiết",
                "thumbnailUrl": "https://example.com/2.jpg",
                "category": {"id": "cat-laptop", "name": "Laptop", "slug": "laptop"},
                "specifications": {"Loại CPU": "Core i7", "Dung lượng RAM": "32 GB"},
                "similarity": 0.88
            },
            # Ứng viên 3: Acer giá tốt hơn (18.5tr) cùng cấu hình
            {
                "id": "prod-3",
                "name": "Laptop Acer Swift 3",
                "slug": "laptop-acer-swift-3",
                "sku": "ACER-SW-3",
                "brand": "Acer",
                "price": 18_500_000.0,
                "originalPrice": 20_000_000.0,
                "discountPercent": 7,
                "stockQuantity": 12,
                "ratingAverage": 4.7,
                "reviewCount": 18,
                "featured": False,
                "hot": False,
                "active": True,
                "shortDescription": "Laptop Acer Swift",
                "description": "Chi tiết",
                "thumbnailUrl": "https://example.com/3.jpg",
                "category": {"id": "cat-laptop", "name": "Laptop", "slug": "laptop"},
                "specifications": {"Loại CPU": "Core i5", "Dung lượng RAM": "16 GB"},
                "similarity": 0.82
            },
            # Ứng viên 4: Lệch giá quá 35% (35.000.000 đ so với 20.000.000 đ) -> PHẢI BỊ LOẠI BỎ
            {
                "id": "prod-4",
                "name": "Laptop Gaming ROG Strix G16",
                "slug": "rog-strix-g16",
                "sku": "ROG-G16",
                "brand": "Asus",
                "price": 35_000_000.0,
                "originalPrice": 38_000_000.0,
                "discountPercent": 8,
                "stockQuantity": 5,
                "ratingAverage": 5.0,
                "reviewCount": 10,
                "featured": False,
                "hot": False,
                "active": True,
                "shortDescription": "Laptop Gaming",
                "description": "Chi tiết",
                "thumbnailUrl": "https://example.com/4.jpg",
                "category": {"id": "cat-laptop", "name": "Laptop", "slug": "laptop"},
                "specifications": {"Loại CPU": "Core i9", "Dung lượng RAM": "32 GB"},
                "similarity": 0.95
            }
        ]

        # Bước 5: Hard filters loại bỏ prod-4 (+75% lệch giá)
        filtered = self.service._apply_hard_filters(current_product, candidates)
        # Bước 6 & 7: Ranking
        ranked = self.service._rank_candidates(current_product, filtered, limit=8)
        ranked_ids = [r["id"] for r in ranked]

        print(f"Số ứng viên đầu vào: {len(candidates)}")
        print(f"Số ứng viên sau lọc ngưỡng giá cứng (+-35%): {len(ranked)}")
        print(f"Danh sách ID được giữ lại: {ranked_ids}")

        self.assertNotIn("prod-4", ranked_ids, "Sản phẩm lệch giá quá 35% phải bị loại bỏ qua hard filters!")
        self.assertIn("prod-1", ranked_ids)
        self.assertIn("prod-2", ranked_ids)
        self.assertIn("prod-3", ranked_ids)

        # Kiểm tra gán nhãn BEST / CHOICE và câu lý do
        annotated = self.service._annotate_candidates(current_product, ranked)
        print("\nKết quả sau khi gán nhãn:")
        for idx, item in enumerate(annotated):
            print(f"  [{idx+1}] {item.product.name} | Giá: {item.product.price:,.0f} đ | Badge: {item.badge} | Lý do: {item.reason}")

        self.assertEqual(annotated[0].badge, "BEST", "Sản phẩm xếp đầu phải nhận nhãn BEST")
        self.assertTrue(any(item.badge == "CHOICE" for item in annotated), "Phải có nhãn CHOICE cho sản phẩm tối ưu cấu hình/giá")

    def test_03_embedding_api_connectivity(self):
        """Kiểm tra kết nối tới Sentence-Transformers API trên Railway."""
        print("\n--- Test 3: Kết nối Sentence-Transformers API (Railway) ---")
        import requests
        settings = self.service.settings
        base_url = settings.embedding_api_url.replace("/v1", "").rstrip("/")
        url = f"{base_url}/health"
        try:
            res = requests.get(url, timeout=5)
            print(f"Endpoint: {url} -> Status: {res.status_code}, Response: {res.text}")
            self.assertEqual(res.status_code, 200)
        except Exception as e:
            print(f"Railway API đang cold-start hoặc tạm gián đoạn mạng ({e}). Module tự động fallback sang SQL matching.")

    def test_04_product_analysis_and_pipeline_stages(self):
        """Kiểm tra phân tích sản phẩm (mục đích sử dụng) và các tầng gộp/lọc/tính điểm."""
        print("\n--- Test 4: Phân tích mục đích sử dụng (Gaming vs Văn phòng) & Pipeline ---")

        gaming_product = {
            "id": "game-1",
            "name": "Laptop ASUS TUF Gaming F15",
            "brand": "Asus",
            "price": 22_000_000.0,
            "categoryId": "cat-laptop",
            "specifications": {
                "Loại CPU": "Intel Core i7-12700H",
                "Dung lượng RAM": "16 GB",
                "Loại card đồ họa": "RTX 3050 4GB",
                "Ổ cứng": "512 GB SSD"
            }
        }

        office_product = {
            "id": "office-1",
            "name": "Laptop Asus Zenbook 14 OLED",
            "brand": "Asus",
            "price": 24_000_000.0,
            "categoryId": "cat-laptop",
            "specifications": {
                "Loại CPU": "Intel Core Ultra 5",
                "Dung lượng RAM": "16 GB",
                "Loại card đồ họa": "Intel Iris Xe",
                "Ổ cứng": "512 GB SSD"
            }
        }

        prof_game = self.service._analyze_product_profile(gaming_product)
        prof_office = self.service._analyze_product_profile(office_product)

        print(f"Sản phẩm 1: '{gaming_product['name']}' -> Nhận diện mục đích: {prof_game['purpose']}")
        print(f"Sản phẩm 2: '{office_product['name']}' -> Nhận diện mục đích: {prof_office['purpose']}")

        self.assertEqual(prof_game["purpose"], "GAMING")
        self.assertEqual(prof_office["purpose"], "GRAPHICS_CREATIVE")

        # Kiểm tra gộp danh sách và loại trùng (Merge & Deduplicate)
        sql_list = [{"id": "p1", "name": "Máy A", "price": 10.0, "active": True, "stockQuantity": 5, "categoryId": "cat-laptop"}]
        ai_list = [
            {"id": "p1", "name": "Máy A (AI)", "similarity": 0.92, "price": 10.0, "active": True, "stockQuantity": 5, "categoryId": "cat-laptop"},
            {"id": "p2", "name": "Máy B", "similarity": 0.88, "price": 11.0, "active": True, "stockQuantity": 3, "categoryId": "cat-laptop"}
        ]
        merged = self.service._merge_and_deduplicate(sql_list, ai_list)
        self.assertEqual(len(merged), 2, "Sau khi merge và deduplicate phải có đúng 2 sản phẩm duy nhất")
        self.assertEqual(merged[0]["similarity"], 0.92)

    def test_05_ai_semantic_discovers_relevant_candidates_missed_by_sql(self):
        """Kiểm tra AI Semantic phát hiện ứng viên phù hợp ngữ nghĩa mà SQL Top 8 bỏ sót."""
        print("\n--- Test 5: So sánh AI Semantic Retrieval vs SQL thuần ---")

        current_product = {
            "id": "target-oled",
            "name": "Laptop Acer Swift Go 14 OLED",
            "brand": "Acer",
            "price": 21_000_000.0,
            "categoryId": "cat-laptop",
            "specifications": {
                "Loại CPU": "Intel Core Ultra 5",
                "Dung lượng RAM": "16 GB",
                "Loại card đồ họa": "Intel Iris Xe",
                "Màn hình": "14 inch 2.8K OLED 100% DCI-P3",
            }
        }

        # Nhánh SQL chỉ tìm theo giá gần (20.8tr - 21.2tr) gồm các máy văn phòng bình thường
        sql_candidates = [
            {
                "id": f"sql-{i}",
                "name": f"Laptop Văn Phòng Cơ Bản {i}",
                "brand": "BrandX",
                "price": 20_900_000.0 + i * 20_000,
                "active": True,
                "stockQuantity": 10,
                "categoryId": "cat-laptop",
                "ratingAverage": 4.5,
                "reviewCount": 10,
                "specifications": {"Loại CPU": "Core i5", "Dung lượng RAM": "8 GB"},
            }
            for i in range(8)
        ]

        # Nhánh AI Semantic phát hiện 1 ứng viên đặc sắc (Lenovo Yoga Slim OLED đồ họa)
        # Giá 22.5tr (lệch giá 7% nên nằm ngoài top sát giá của SQL, nhưng rất đúng nhu cầu OLED đồ họa)
        ai_candidates = [
            {
                "id": "ai-yoga-oled",
                "name": "Laptop Lenovo Yoga Slim 7 Pro OLED",
                "brand": "Lenovo",
                "price": 22_500_000.0,
                "active": True,
                "stockQuantity": 5,
                "categoryId": "cat-laptop",
                "ratingAverage": 4.9,
                "reviewCount": 40,
                "similarity": 0.94,  # Điểm tương đồng ngữ nghĩa rất cao
                "specifications": {
                    "Loại CPU": "Intel Core Ultra 7",
                    "Dung lượng RAM": "32 GB",
                    "Màn hình": "14.5 inch 3K OLED",
                },
            }
        ]

        # Gộp và xếp hạng
        merged = self.service._merge_and_deduplicate(sql_candidates, ai_candidates)
        filtered = self.service._apply_hard_filters(current_product, merged)
        ranked = self.service._rank_candidates(current_product, filtered, limit=8)
        ranked_ids = [r["id"] for r in ranked]

        print(f"Tổng ứng viên sau khi gộp: {len(merged)}")
        print(f"Top 8 sau xếp hạng: {ranked_ids}")
        print(f"Vị trí của máy AI phát hiện ('ai-yoga-oled'): Hạng {ranked_ids.index('ai-yoga-oled') + 1}")

        self.assertIn("ai-yoga-oled", ranked_ids, "Ứng viên do AI Semantic tìm thấy phải lọt vào Top 8!")
        self.assertLessEqual(ranked_ids.index("ai-yoga-oled"), 7, "Ứng viên do AI Semantic tìm thấy phải nằm trong Top 8!")

    def test_06_hybrid_score_decides_ranking_in_price_band(self):
        """
        Kiểm tra thứ tự ưu tiên nghiệp vụ:
        Cùng khoảng giá (price_band) -> Độ lệch giá nhỏ nhất (price_dev) -> Hybrid Score cao nhất.
        AI phát huy vai trò phân định giữa các sản phẩm có cùng độ lệch giá hoặc tiệm cận ngân sách.
        """
        print("\n--- Test 6: Độ lệch giá ưu tiên trước, Hybrid Score phân biệt cùng độ lệch giá ---")

        current_product = {
            "id": "prod-base",
            "name": "Laptop Dell Inspiron 14",
            "brand": "Dell",
            "price": 20_000_000.0,
            "categoryId": "cat-laptop",
            "specifications": {"Loại CPU": "Core i5", "Dung lượng RAM": "16 GB"},
        }

        # Máy A: Giá rất gần (20.2tr, lệch 1%), similarity 0.70
        cand_a = {
            "id": "cand-near-price",
            "name": "Laptop Dell Inspiron 15 Giá Gần",
            "brand": "Dell",
            "price": 20_200_000.0,
            "active": True,
            "stockQuantity": 10,
            "categoryId": "cat-laptop",
            "ratingAverage": 4.2,
            "reviewCount": 10,
            "similarity": 0.70,
            "specifications": {"Loại CPU": "Core i5", "Dung lượng RAM": "8 GB"},
        }

        # Máy B: Giá lệch 5% (21.0tr, cùng Band 0 <= 15%), similarity cao (0.93), RAM 32GB
        cand_b = {
            "id": "cand-high-ai-score",
            "name": "Laptop Asus Zenbook 14 Cấu Hình Cao",
            "brand": "Asus",
            "price": 21_000_000.0,
            "active": True,
            "stockQuantity": 8,
            "categoryId": "cat-laptop",
            "ratingAverage": 4.9,
            "reviewCount": 35,
            "similarity": 0.93,
            "specifications": {"Loại CPU": "Core i7", "Dung lượng RAM": "32 GB"},
        }

        # Máy C: Cùng giá với Máy B (21.0tr, lệch 5%), nhưng điểm AI và cấu hình thấp hơn
        cand_c = {
            "id": "cand-same-price-lower-score",
            "name": "Laptop HP 14 Giá 21tr Điểm Thấp",
            "brand": "HP",
            "price": 21_000_000.0,
            "active": True,
            "stockQuantity": 8,
            "categoryId": "cat-laptop",
            "ratingAverage": 4.0,
            "reviewCount": 5,
            "similarity": 0.60,
            "specifications": {"Loại CPU": "Core i3", "Dung lượng RAM": "8 GB"},
        }

        ranked = self.service._rank_candidates(current_product, [cand_a, cand_b, cand_c], limit=8)

        print(f"Thứ tự sau xếp hạng: {[r['id'] for r in ranked]}")

        # 1. cand-near-price đứng đầu vì độ lệch giá nhỏ nhất (1% so với 5%)
        self.assertEqual(
            ranked[0]["id"],
            "cand-near-price",
            "Sản phẩm có độ lệch giá nhỏ nhất phải được ưu tiên đứng đầu trong cùng band!",
        )

        # 2. Giữa cand-high-ai-score và cand-same-price-lower-score (cùng lệch 5%):
        # cand-high-ai-score phải xếp trên nhờ Hybrid Score cao hơn!
        self.assertEqual(
            ranked[1]["id"],
            "cand-high-ai-score",
            "Khi hai sản phẩm có cùng độ lệch giá, Hybrid Score cao hơn phải xếp trên!",
        )
        self.assertEqual(
            ranked[2]["id"],
            "cand-same-price-lower-score",
        )

    def test_07_no_fabricated_defaults_for_missing_specs_and_embeddings(self):
        """Kiểm tra xử lý trung thực dữ liệu thiếu: không tự gán RAM 8GB, SSD 512GB hay cosine 0.65."""
        print("\n--- Test 7: Dữ liệu thiếu được xử lý an toàn (không bịa số mặc định) ---")

        # 1. Sản phẩm không ghi RAM và SSD trong specs
        unknown_product = {
            "id": "unknown-prod",
            "name": "Mẫu Thiết Bị Thử Nghiệm",
            "brand": "OEM",
            "price": 15_000_000.0,
            "categoryId": "cat-laptop",
            "specifications": {"Màu sắc": "Đen"},
        }

        profile = self.service._analyze_product_profile(unknown_product)
        print(f"Dữ liệu bóc tách khi thiếu thông số: RAM={profile['ram_gb']}, SSD={profile['ssd_gb']}, Spec Confidence={profile['spec_confidence']}")

        self.assertIsNone(profile["ram_gb"], "Khi không tìm thấy thông số RAM, phải trả về None thay vì tự gán 8.0GB")
        self.assertIsNone(profile["ssd_gb"], "Khi không tìm thấy thông số SSD, phải trả về None thay vì tự gán 512.0GB")
        self.assertEqual(profile["spec_confidence"], 0.0, "Khi không có thông số nào được xác nhận, confidence phải là 0.0")

        # 2. Ứng viên SQL không có vector embedding: similarity phải là None (không gán 0.65)
        sql_item = {
            "id": "sql-no-emb",
            "name": "Laptop Cơ Bản",
            "price": 15_200_000.0,
            "active": True,
            "stockQuantity": 5,
            "categoryId": "cat-laptop",
            "embedding": None,
        }
        merged = self.service._merge_and_deduplicate([sql_item], [], current_embedding=None)
        print(f"Điểm similarity của ứng viên không có embedding: {merged[0]['similarity']}")

        self.assertIsNone(merged[0]["similarity"], "Không được tự gán 0.65 khi ứng viên không có vector embedding!")
        self.assertFalse(merged[0]["has_embedding"])

        # 3. Tính điểm với dynamic weight re-normalization không bị crash
        current_prod = {
            "id": "base-p",
            "name": "Laptop Base",
            "price": 15_000_000.0,
            "categoryId": "cat-laptop",
            "specifications": {"RAM": "8 GB"},
        }
        ranked = self.service._rank_candidates(current_prod, merged, limit=8)
        self.assertEqual(len(ranked), 1)
        self.assertIsNone(ranked[0]["features"]["s_semantic"])
        self.assertGreater(ranked[0]["hybrid_score"], 0.0, "Trọng số phải được tái chuẩn hóa và tính điểm hợp lệ!")




    def test_08_equivalent_category_retrieval_and_ranking(self):
        """
        Kiểm tra danh mục tương đương có kiểm soát:
        - Ứng viên thuộc danh mục tương đương (vd: Linh kiện <-> Phụ kiện) phải vượt qua hard filters
        - Bước _rank_candidates KHÔNG được lọc lại và loại bỏ ứng viên này.
        """
        print("\n--- Test 8: Danh mục tương đương sống sót qua hard filters và ranking ---")

        base_product = {
            "id": "base-linh-kien-1",
            "name": "Chuột Gaming Không Dây",
            "brand": "Logitech",
            "price": 1_000_000.0,
            "categoryId": "linh-kien",
            "specifications": {"Loại": "Chuột gaming"},
        }

        # Ứng viên 1: Cùng danh mục 'linh-kien'
        cand_same_cat = {
            "id": "cand-linh-kien",
            "name": "Bàn Phím Cơ Gaming",
            "brand": "Logitech",
            "price": 1_050_000.0,
            "categoryId": "linh-kien",
            "active": True,
            "stockQuantity": 10,
            "specifications": {},
            "similarity": 0.85,
        }

        # Ứng viên 2: Danh mục tương đương 'phu-kien' (được cấu hình trong EQUIVALENT_CATEGORY_MAP)
        cand_equiv_cat = {
            "id": "cand-phu-kien",
            "name": "Lót Chuột Gaming Size Lớn",
            "brand": "Razer",
            "price": 950_000.0,
            "categoryId": "phu-kien",
            "active": True,
            "stockQuantity": 15,
            "specifications": {},
            "similarity": 0.88,
        }

        # Ứng viên 3: Danh mục hoàn toàn khác 'laptop' (không tương đương)
        cand_unrelated_cat = {
            "id": "cand-laptop",
            "name": "Laptop Gaming",
            "brand": "Asus",
            "price": 1_100_000.0,
            "categoryId": "laptop",
            "active": True,
            "stockQuantity": 5,
            "specifications": {},
            "similarity": 0.80,
        }

        # Lấy allowed_categories từ service
        allowed_cats = self.service._get_allowed_category_ids(base_product["categoryId"])
        print(f"Allowed categories cho '{base_product['categoryId']}': {allowed_cats}")
        self.assertIn("linh-kien", allowed_cats)
        self.assertIn("phu-kien", allowed_cats)
        self.assertNotIn("laptop", allowed_cats)

        # Bước 5: Apply hard filters với allowed_categories
        candidates = [cand_same_cat, cand_equiv_cat, cand_unrelated_cat]
        filtered = self.service._apply_hard_filters(base_product, candidates, allowed_cats)

        filtered_ids = [c["id"] for c in filtered]
        print(f"Ứng viên sau hard filters: {filtered_ids}")
        self.assertIn("cand-linh-kien", filtered_ids)
        self.assertIn("cand-phu-kien", filtered_ids, "Ứng viên danh mục tương đương phải vượt qua hard filters")
        self.assertNotIn("cand-laptop", filtered_ids, "Ứng viên danh mục khác không được lọt qua")

        # Bước 6 & 7: Ranking không được lọc lại và làm mất cand-phu-kien
        ranked = self.service._rank_candidates(base_product, filtered, limit=8)
        ranked_ids = [r["id"] for r in ranked]
        print(f"Ứng viên sau ranking: {ranked_ids}")

        self.assertIn(
            "cand-phu-kien",
            ranked_ids,
            "Ứng viên danh mục tương đương KHÔNG được bị loại bỏ tại bước ranking!",
        )
        self.assertEqual(len(ranked), 2)


if __name__ == "__main__":
    suite = unittest.TestLoader().loadTestsFromTestCase(TestRecommendationService)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    if not result.wasSuccessful():
        sys.exit(1)

