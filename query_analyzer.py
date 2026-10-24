from typing import Literal

from ollama import chat
from pydantic import BaseModel, ConfigDict, Field, model_validator


class QueryAnalysis(BaseModel):
    model_config = ConfigDict(extra="forbid")

    intent: Literal[
        "specifications",
        "recommendation",
        "comparison",
    ]

    brand: Literal[
        "ASUS", "Lenovo", "Acer", "HP", "Dell",
        "MSI", "Gigabyte", "Apple", "Microsoft",
    ] | None

    product_line: str | None = Field(min_length=1)
    model_code: str | None = Field(min_length=1)

    price_limit: int | None = Field(ge=0)
    price_operator: Literal["lt", "lte"] | None

    min_ram_gb: int | None = Field(gt=0)
    prefer_light: bool

    keywords: list[str]

    usage: str | None

    @model_validator(mode="after")
    def validate_price(self):
        if (self.price_limit is None) != (
            self.price_operator is None
        ):
            raise ValueError(
                "price_limit và price_operator phải cùng có "
                "giá trị hoặc cùng là null"
            )

        return self


SYSTEM_PROMPT = """
Phân tích câu hỏi tìm laptop thành JSON theo schema.
Luôn trả đầy đủ các trường. Không tự suy đoán điều kiện.

Các trường:
- intent:
  specifications: hỏi thông số một máy cụ thể.
  comparison: yêu cầu so sánh.
  recommendation: tư vấn hoặc tìm sản phẩm.

- brand:
  Chỉ đặt khi yêu cầu đúng một hãng.
  Chuẩn hóa: ASUS, Lenovo, Acer, HP, Dell, MSI,
  Gigabyte, Apple, Microsoft.
  Không bỏ sót hãng được nêu rõ.
  Không tự suy ra hãng từ dòng máy.
  Không có hoặc yêu cầu nhiều hãng => null.

- product_line:
  Dòng máy được yêu cầu rõ như ExpertBook, VivoBook,
  ThinkPad, IdeaPad, LOQ, Zenbook.
  Không suy ra từ nhu cầu sử dụng.
  Không có hoặc yêu cầu nhiều dòng => null.

- model_code:
  Mã model của đúng một máy được nêu rõ.
  Giữ nguyên dấu gạch nối, không tự tạo mã.
  Không có hoặc có nhiều mã => null.

- price_limit:
  Giới hạn giá trên, số nguyên VNĐ.
  1 triệu = 1000000; 25 triệu = 25000000.
  25,5 triệu = 25500000.
  Không suy ra ngân sách từ nhu cầu.

- price_operator:
  "dưới", "ít hơn", "thấp hơn" => lt.
  "không quá", "tối đa", "không vượt quá" => lte.
  Không cộng hoặc trừ 1 VNĐ.
  Không có giới hạn trên rõ ràng =>
  price_limit và price_operator cùng null.

- min_ram_gb:
  RAM tối thiểu được yêu cầu rõ.
  "RAM ít nhất 32GB", "RAM từ 32GB" => 32.
  Không có yêu cầu tối thiểu rõ ràng => null.

- prefer_light:
  true nếu ưu tiên nhẹ hoặc dễ mang theo.
  Không có yêu cầu này => false.
  Không tự đặt giới hạn kg.

- usage:
  Nhu cầu sử dụng được nêu rõ, ví dụ học tập,
  văn phòng, lập trình, chơi game, chỉnh sửa video.
  Có thể ghi nhiều nhu cầu trong một chuỗi.
  Không suy ra từ hãng, dòng máy hoặc ngân sách.
  Không có nhu cầu được nêu rõ => null.

- keywords:
  Hãng, dòng máy, mã máy hoặc thuật ngữ cấu hình
  được nêu rõ.
  Không chứa giá tiền, từ giao tiếp hoặc nhu cầu chung.
  Không có từ khóa phù hợp => [].

Ví dụ:

Câu: ASUS không quá 25 triệu
JSON:
{"intent":"recommendation","brand":"ASUS",
"product_line":null,"model_code":null,
"price_limit":25000000,"price_operator":"lte",
"min_ram_gb":null,"prefer_light":false,
"keywords":["ASUS"],"usage":null}

Câu: ASUS ExpertBook không quá 25 triệu
JSON:
{"intent":"recommendation","brand":"ASUS",
"product_line":"ExpertBook","model_code":null,
"price_limit":25000000,"price_operator":"lte",
"min_ram_gb":null,"prefer_light":false,
"keywords":["ASUS","ExpertBook"],"usage":null}

Câu: ExpertBook dưới 1 triệu
JSON:
{"intent":"recommendation","brand":null,
"product_line":"ExpertBook","model_code":null,
"price_limit":1000000,"price_operator":"lt",
"min_ram_gb":null,"prefer_light":false,
"keywords":["ExpertBook"],"usage":null}

Câu: Laptop nhẹ để đi học
JSON:
{"intent":"recommendation","brand":null,
"product_line":null,"model_code":null,
"price_limit":null,"price_operator":null,
"min_ram_gb":null,"prefer_light":true,
"keywords":[],"usage":"học tập"}

Câu: RAM ít nhất 32GB
JSON:
{"intent":"recommendation","brand":null,
"product_line":null,"model_code":null,
"price_limit":null,"price_operator":null,
"min_ram_gb":32,"prefer_light":false,
"keywords":[],"usage":null}

Câu: ASUS không quá 25 triệu để lập trình, ưu tiên nhẹ
JSON:
{"intent":"recommendation","brand":"ASUS",
"product_line":null,"model_code":null,
"price_limit":25000000,"price_operator":"lte",
"min_ram_gb":null,"prefer_light":true,
"keywords":["ASUS"],"usage":"lập trình"}

Câu: Thông số P1403CVA-C5H16-63WS
JSON:
{"intent":"specifications","brand":null,
"product_line":null,"model_code":"P1403CVA-C5H16-63WS",
"price_limit":null,"price_operator":null,
"min_ram_gb":null,"prefer_light":false,
"keywords":["P1403CVA-C5H16-63WS"],"usage":null}
"""


def analyze_query(question: str) -> QueryAnalysis:
    response = chat(
        model="qwen3:4b",
        think=False,
        stream=False,
        format=QueryAnalysis.model_json_schema(),
        options={
            "temperature": 0,
            "num_ctx": 4096,
            "num_predict": 700,
        },
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": question},
        ],
    )

    if response.done_reason == "length":
        raise RuntimeError("Analyzer chưa hoàn tất đầu ra")

    return QueryAnalysis.model_validate_json(
        response.message.content
    )