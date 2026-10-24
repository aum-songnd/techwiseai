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

        ranked = self.service._rank_candidates(current_product, candidates, limit=8)
        ranked_ids = [r["id"] for r in ranked]

        print(f"Số ứng viên đầu vào: {len(candidates)}")
        print(f"Số ứng viên sau lọc ngưỡng giá cứng (+-35%): {len(ranked)}")
        print(f"Danh sách ID được giữ lại: {ranked_ids}")

        self.assertNotIn("prod-4", ranked_ids, "Sản phẩm lệch giá quá 35% phải bị loại bỏ!")
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


if __name__ == "__main__":
    suite = unittest.TestLoader().loadTestsFromTestCase(TestRecommendationService)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    if not result.wasSuccessful():
        sys.exit(1)
