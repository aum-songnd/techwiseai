"""Integration checks against the real local Ollama and PostgreSQL.
Run from the project: python test_rag_integration.py
Writes a timestamped JSON report. Does not modify product data.
"""
import json
import time
import traceback
from datetime import datetime
from pathlib import Path

from conversation_state import ConversationState, build_search_question
from retriever import hybrid_search
from rag import select_evidence, source_lines


# Independent scenarios; turns inside each scenario share state.
SCENARIOS = [
    ("brand_budget_usage", [
        ("ASUS không quá 25 triệu", {"brand": "ASUS", "price_limit": 25000000, "price_operator": "lte"}),
        ("Để học tập, ưu tiên nhẹ", {"brand": "ASUS", "price_limit": 25000000, "prefer_light": True, "usage": "học tập"}),
        ("Đổi ngân sách thành không quá 20 triệu", {"brand": "ASUS", "price_limit": 20000000, "price_operator": "lte", "prefer_light": True, "usage": "học tập"}),
        ("Đổi sang Lenovo", {"brand": "Lenovo", "price_limit": 20000000, "prefer_light": True, "usage": "học tập"}),
        ("Thêm RAM ít nhất 32GB", {"brand": "Lenovo", "price_limit": 20000000, "min_ram_gb": 32, "prefer_light": True}),
        ("Bỏ yêu cầu máy nhẹ", {"brand": "Lenovo", "price_limit": 20000000, "min_ram_gb": 32, "prefer_light": False}),
        ("Bỏ giới hạn ngân sách", {"brand": "Lenovo", "price_limit": None, "price_operator": None, "min_ram_gb": 32, "prefer_light": False}),
    ]),
    ("product_line_price", [
        ("ASUS ExpertBook không quá 25 triệu", {"brand": "ASUS", "product_line": "ExpertBook", "price_limit": 25000000, "price_operator": "lte"}),
        ("Đổi ngân sách thành dưới 1 triệu", {"brand": "ASUS", "product_line": "ExpertBook", "price_limit": 1000000, "price_operator": "lt"}),
        ("Bỏ giới hạn ngân sách", {"brand": "ASUS", "product_line": "ExpertBook", "price_limit": None, "price_operator": None}),
        ("Đổi sang Lenovo", {"brand": "Lenovo", "product_line": None, "model_code": None}),
    ]),
    ("ram_filters", [
        ("RAM ít nhất 32GB", {"min_ram_gb": 32}),
        ("Đổi sang HP", {"brand": "HP", "min_ram_gb": 32}),
        ("Đổi ngân sách thành không quá 40 triệu", {"brand": "HP", "min_ram_gb": 32, "price_limit": 40000000, "price_operator": "lte"}),
        ("Bỏ yêu cầu RAM tối thiểu", {"brand": "HP", "min_ram_gb": None, "price_limit": 40000000}),
    ]),
    ("mobility", [
        ("Laptop nhẹ để đi học", {"prefer_light": True, "usage": "học tập"}),
        ("Đổi sang ASUS", {"brand": "ASUS", "prefer_light": True, "usage": "học tập"}),
        ("Ngân sách tối đa 25,5 triệu", {"brand": "ASUS", "price_limit": 25500000, "price_operator": "lte", "prefer_light": True}),
        ("Bỏ yêu cầu máy nhẹ", {"brand": "ASUS", "price_limit": 25500000, "prefer_light": False}),
    ]),
    ("exact_model", [
        ("Thông số P1403CVA-C5H16-63WS", {"intent": "specifications", "model_code": "P1403CVA-C5H16-63WS"}),
    ]),
]


def check_state(actual, expected):
    for key, value in expected.items():
        if actual.get(key) != value:
            raise AssertionError(f"State {key}: expected {value!r}, got {actual.get(key)!r}")


def check_products(results, state):
    ids = [item["id"] for item in results]
    if len(ids) != len(set(ids)):
        raise AssertionError("Duplicate product IDs")
    for item in results:
        m = item["metadata"]
        if state.brand and m.get("brand") != state.brand:
            raise AssertionError(f"{item['id']}: wrong brand")
        if state.product_line and state.product_line.casefold() not in m.get("name", "").casefold():
            raise AssertionError(f"{item['id']}: wrong product line")
        if state.price_limit is not None:
            price = m.get("current_price")
            valid = price is not None and (
                price < state.price_limit if state.price_operator == "lt"
                else price <= state.price_limit
            )
            if not valid:
                raise AssertionError(f"{item['id']}: price violates filter")
        if state.min_ram_gb is not None:
            if m.get("ram_gb") is None or m["ram_gb"] < state.min_ram_gb:
                raise AssertionError(f"{item['id']}: RAM violates filter")
        if state.intent == "specifications" and state.model_code:
            if state.model_code.casefold() not in m.get("name", "").casefold():
                raise AssertionError(f"{item['id']}: wrong model")


def main():
    records = []
    for scenario, turns in SCENARIOS:
        session = ConversationState()
        blocked = False
        for turn, (question, expected) in enumerate(turns, 1):
            record = {"scenario": scenario, "turn": turn, "question": question, "expected": expected}
            if blocked:
                record.update(status="SKIP", error="Prior state update failed in this scenario")
                records.append(record)
                continue
            start = time.perf_counter()
            state_valid = False
            try:
                t = time.perf_counter()
                state = session.update(question)
                record["analysis_seconds"] = round(time.perf_counter() - t, 3)
                record["state"] = state.model_dump()
                check_state(record["state"], expected)
                state_valid = True

                query = build_search_question(state)
                record["search_question"] = query
                t = time.perf_counter()
                results = hybrid_search(query, top_k=3, analysis=state)
                record["retrieval_seconds"] = round(time.perf_counter() - t, 3)
                record["products"] = [{"id": x["id"], "metadata": x["metadata"]} for x in results]
                check_products(results, state)
                record["warnings"] = []

                if scenario == "exact_model" and not results:
                    raise AssertionError("Known model not found: verify imported dataset")
                if state.price_limit == 1000000 and results:
                    raise AssertionError("Expected no ExpertBook below 1 million in test dataset")
                if not results:
                    record["warnings"].append("No results; filter assertions alone do not prove retrieval completeness")

                if results and state.intent != "specifications":
                    t = time.perf_counter()
                    evidence = select_evidence(query, results)
                    record["evidence_seconds"] = round(time.perf_counter() - t, 3)
                    record["evidence"] = evidence
                    allowed = {x["id"]: set(source_lines(x)) for x in results}
                    for entry in evidence:
                        if entry["id"] not in allowed or any(q not in allowed[entry["id"]] for q in entry["quotes"]):
                            raise AssertionError("Evidence does not match retrieved source")
                    if not evidence:
                        record["warnings"].append("No verified evidence; inspect model output and token limit")
                record["status"] = "PASS"
            except Exception as error:
                record.update(status="FAIL", error=str(error), traceback=traceback.format_exc())
                # Avoid misleading cascading tests after a bad state transition.
                if not state_valid:
                    blocked = True
            record["total_seconds"] = round(time.perf_counter() - start, 3)
            records.append(record)
            print(f"\n[{record['status']}] {scenario}/{turn}: {question} ({record['total_seconds']}s)")
            if record.get("error"):
                print(record["error"])

    stamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    output = Path(__file__).resolve().parent / f"rag_integration_{stamp}.json"
    summary = {status: sum(r["status"] == status for r in records) for status in ["PASS", "FAIL", "SKIP"]}
    output.write_text(json.dumps({"summary": summary, "results": records}, ensure_ascii=False, indent=2), encoding="utf-8")
    print("\nSummary:", summary)
    print("Report:", output)
    print("PASS checks constraints and source membership; it does not certify ranking quality or source truth.")
    raise SystemExit(1 if summary["FAIL"] else 0)


if __name__ == "__main__":
    main()
