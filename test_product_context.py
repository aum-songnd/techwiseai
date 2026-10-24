"""Run: python -m unittest -v test_product_context.py
Mocked Ollama responses test reference handling, not LLM interpretation accuracy.
"""
import json
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from product_context import ProductContext, verified_reference_answer


def product(product_id, name, text):
    return {"id": product_id, "metadata": {"name": name}, "text": text}


PRODUCTS = [
    product("laptop_45094", "ASUS Zenbook UX425EA BM069T", "Trọng lượng: 1.17 kg\nPin: 67Wh"),
    product("laptop_106270", "ASUS Vivobook S14 S3407VA-LY053W", "RAM: 16GB DDR5 SO-DIMM Onboard\nTrọng lượng: 1.4 kg"),
    product("laptop_108986", "ASUS Vivobook Go 14 E1404FA-EB482W", "RAM: 16GB LPDDR5 Onboard"),
]


def decision(action, ids=None, question=None, clarification=None):
    return SimpleNamespace(done_reason="stop", message=SimpleNamespace(
        content=json.dumps({"action": action, "product_ids": ids or [],
                            "question": question, "clarification": clarification},
                           ensure_ascii=False)))


class ProductContextTests(unittest.TestCase):
    def setUp(self):
        self.context = ProductContext()
        self.context.remember(PRODUCTS)

    def resolve(self, response, question="Câu hỏi thử"):
        with patch("product_context.chat", return_value=response):
            return self.context.resolve(question)

    def test_second_product_selection(self):
        result = self.resolve(decision("product_question", ["laptop_106270"], "Vivobook S14 có nâng cấp RAM được không?"))
        self.assertEqual([x["id"] for x in result["results"]], ["laptop_106270"])
        self.assertEqual(self.context.selected_ids, ["laptop_106270"])

    def test_comparison_uses_original_display_order(self):
        self.resolve(decision("product_question", ["laptop_106270"], "Thông số Vivobook S14"))
        result = self.resolve(decision("comparison", ["laptop_106270", "laptop_45094"], "So sánh Zenbook và Vivobook S14"))
        self.assertEqual([x["id"] for x in result["results"]], ["laptop_45094", "laptop_106270"])
        self.assertEqual([x["id"] for x in self.context.items], [x["id"] for x in PRODUCTS])

    def test_ambiguous_reference_asks_and_preserves_selection(self):
        self.context.selected_ids = ["laptop_45094", "laptop_106270"]
        result = self.resolve(decision("clarify", clarification="Bạn muốn hỏi máy nào?"))
        self.assertEqual(result["action"], "clarify")
        self.assertEqual(result["results"], [])
        self.assertEqual(self.context.selected_ids, ["laptop_45094", "laptop_106270"])

    def test_unknown_id_rejected(self):
        result = self.resolve(decision("product_question", ["invented_id"], "Thông số máy"))
        self.assertEqual(result["action"], "clarify")
        self.assertEqual(self.context.selected_ids, [])

    def test_comparison_requires_two_products(self):
        result = self.resolve(decision("comparison", ["laptop_45094"], "So sánh"))
        self.assertEqual(result["action"], "clarify")

    def test_new_list_clears_selection(self):
        self.context.selected_ids = ["laptop_45094"]
        self.context.remember([PRODUCTS[2]])
        self.assertEqual(self.context.selected_ids, [])
        self.assertEqual(self.context.items, [PRODUCTS[2]])

    def test_reset(self):
        self.context.reset()
        self.assertEqual(self.context.items, [])
        self.assertEqual(self.context.selected_ids, [])
        with patch("product_context.chat") as mocked:
            result = self.context.resolve("Tìm ASUS")
            mocked.assert_not_called()
        self.assertEqual(result["action"], "search")

    def test_filters_return_search_without_selecting_product(self):
        result = self.resolve(decision("search", question="Đổi ngân sách thành 20 triệu"))
        self.assertEqual(result["action"], "search")
        self.assertEqual(result["results"], [])

    def test_unfinished_model_response_rejected(self):
        response = decision("search")
        response.done_reason = "length"
        with self.assertRaises(RuntimeError):
            self.resolve(response)

    def test_fabricated_evidence_not_displayed(self):
        def fake_evidence(question, results):
            return [{"id": "laptop_45094", "quotes": ["Pin dùng 8 giờ"]}]
        answer = verified_reference_answer("Pin bao lâu?", PRODUCTS[:1], lambda _: "TABLE", fake_evidence)
        self.assertNotIn("Pin dùng 8 giờ", answer)
        self.assertIn("Chưa", answer)

    def test_exact_source_evidence_displayed(self):
        def evidence(question, results):
            return [{"id": "laptop_45094", "quotes": ["Trọng lượng: 1.17 kg"]}]
        answer = verified_reference_answer("Nặng bao nhiêu?", PRODUCTS[:1], lambda _: "TABLE", evidence)
        self.assertIn("Trọng lượng: 1.17 kg", answer)


if __name__ == "__main__":
    unittest.main(verbosity=2)
