"""Run: python -m unittest -v test_conversation_state.py

These tests mock Ollama. They check state merging, not model accuracy,
PostgreSQL filtering, retrieval quality, or answer generation.
"""
import json
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from conversation_state import (
    ConversationState,
    QueryPatch,
    build_search_question,
    explicit_price_limit,
)


def mock_response(changes=None, clear_fields=None, new_search=False):
    fields = {name: None for name in QueryPatch.model_fields}
    fields.update(changes or {})
    return SimpleNamespace(
        done_reason="stop",
        message=SimpleNamespace(content=json.dumps({
            "new_search": new_search,
            "patch": fields,
            "clear_fields": clear_fields or [],
        }, ensure_ascii=False)),
    )


class ConversationStateTests(unittest.TestCase):
    def setUp(self):
        self.session = ConversationState()

    def turn(self, question, changes=None, clear_fields=None, new_search=False):
        with patch("conversation_state.chat", return_value=mock_response(
            changes, clear_fields, new_search
        )) as chat_mock:
            state = self.session.update(question)
            chat_mock.assert_called_once()
            return state

    def test_complete_conversation(self):
        steps = [
            ("ASUS không quá 25 triệu", {"brand": "ASUS"}, [],
             {"brand": "ASUS", "price_limit": 25000000,
              "price_operator": "lte", "prefer_light": False}),
            ("Để học tập, ưu tiên nhẹ",
             {"usage": "học tập", "prefer_light": True}, [],
             {"brand": "ASUS", "price_limit": 25000000,
              "usage": "học tập", "prefer_light": True}),
            ("Đổi ngân sách thành không quá 20 triệu", {}, [],
             {"brand": "ASUS", "price_limit": 20000000,
              "price_operator": "lte", "usage": "học tập",
              "prefer_light": True}),
            ("Đổi sang Lenovo", {"brand": "Lenovo"}, [],
             {"brand": "Lenovo", "price_limit": 20000000,
              "usage": "học tập", "prefer_light": True,
              "keywords": ["Lenovo"]}),
            ("Thêm RAM ít nhất 32GB", {"min_ram_gb": 32}, [],
             {"brand": "Lenovo", "price_limit": 20000000,
              "min_ram_gb": 32, "usage": "học tập",
              "prefer_light": True}),
            ("Bỏ yêu cầu máy nhẹ", {"prefer_light": False}, [],
             {"brand": "Lenovo", "price_limit": 20000000,
              "min_ram_gb": 32, "prefer_light": False}),
            ("Bỏ giới hạn ngân sách", {}, ["price"],
             {"brand": "Lenovo", "price_limit": None,
              "price_operator": None, "min_ram_gb": 32,
              "prefer_light": False, "usage": "học tập"}),
        ]
        for question, changes, clear_fields, expected in steps:
            with self.subTest(question=question):
                state = self.turn(question, changes, clear_fields)
                actual = state.model_dump()
                for key, value in expected.items():
                    self.assertEqual(actual[key], value, key)

    def test_null_preserves_existing_state(self):
        self.turn("ASUS", {"brand": "ASUS", "prefer_light": True})
        before = self.session.data.copy()
        state = self.turn("Tiếp tục", {})
        self.assertEqual(state.model_dump(), before)

    def test_changing_brand_clears_old_product_identity(self):
        self.turn("ASUS ExpertBook", {
            "brand": "ASUS", "product_line": "ExpertBook",
            "model_code": "P1403CVA-C5H16-63WS",
        })
        state = self.turn("Đổi sang Lenovo", {"brand": "Lenovo"})
        self.assertIsNone(state.product_line)
        self.assertIsNone(state.model_code)
        self.assertEqual(state.keywords, ["Lenovo"])

    def test_invalid_price_patch_does_not_commit(self):
        self.turn("ASUS", {"brand": "ASUS"})
        before = self.session.data.copy()
        with self.assertRaises(ValueError):
            self.turn("Đổi ngân sách", {"price_limit": 20000000})
        self.assertEqual(self.session.data, before)

    def test_invalid_ram_does_not_commit(self):
        self.turn("ASUS", {"brand": "ASUS"})
        before = self.session.data.copy()
        with self.assertRaises(ValueError):
            self.turn("Đổi RAM", {"min_ram_gb": -1})
        self.assertEqual(self.session.data, before)

    def test_conflicting_clear_and_update_does_not_commit(self):
        self.turn("ASUS", {"brand": "ASUS"})
        before = self.session.data.copy()
        with self.assertRaises(ValueError):
            self.turn("Thay điều kiện", {"brand": "Lenovo"}, ["brand"])
        self.assertEqual(self.session.data, before)

    def test_new_search_drops_previous_constraints(self):
        self.turn("ASUS dưới 20 triệu", {
            "brand": "ASUS", "min_ram_gb": 32,
        })
        state = self.turn("Tìm kiếm mới: Dell", {"brand": "Dell"},
                          new_search=True)
        self.assertEqual(state.brand, "Dell")
        self.assertIsNone(state.price_limit)
        self.assertIsNone(state.min_ram_gb)
        self.assertEqual(state.keywords, ["Dell"])

    def test_reset(self):
        self.turn("ASUS dưới 20 triệu", {"brand": "ASUS"})
        self.session.reset()
        self.assertIsNone(self.session.data["brand"])
        self.assertIsNone(self.session.data["price_limit"])
        self.assertEqual(self.session.data["keywords"], [])

    def test_search_question_preserves_constraints(self):
        state = self.turn("ASUS không quá 20 triệu", {
            "brand": "ASUS", "min_ram_gb": 32,
            "prefer_light": True, "usage": "học tập",
        })
        question = build_search_question(state)
        for fragment in ["ASUS", "không quá 20 triệu", "32GB",
                         "học tập", "ưu tiên máy nhẹ"]:
            self.assertIn(fragment, question)

    def test_price_parsing(self):
        cases = [
            ("ExpertBook dưới 1 triệu", (1000000, "lt")),
            ("không quá 25 triệu", (25000000, "lte")),
            ("Đổi ngân sách thành không quá 20 triệu", (20000000, "lte")),
            ("tối đa 25,5 triệu", (25500000, "lte")),
            ("Laptop nhẹ để học tập", None),
        ]
        for question, expected in cases:
            with self.subTest(question=question):
                self.assertEqual(explicit_price_limit(question), expected)


if __name__ == "__main__":
    unittest.main(verbosity=2)
