from __future__ import annotations

import json
import logging
from typing import Any, Iterator

from google import genai
from google.genai import types

from app.core.config import get_settings

logger = logging.getLogger("uvicorn.error")

SYSTEM_PROMPT = """
Bạn là TechWiseAI, trợ lý tư vấn sản phẩm điện tử cho sàn thương mại điện tử Việt Nam.

NHIỆM VỤ:
- Tư vấn sản phẩm dựa trên nhu cầu của khách hàng.
- Sử dụng dữ liệu sản phẩm được truy xuất từ database.
- Trả lời bằng tiếng Việt tự nhiên, rõ ràng, dễ hiểu.
- Giải thích ngắn gọn lý do đề xuất từng sản phẩm.

QUY TẮC:
1. Chỉ giới thiệu những sản phẩm xuất hiện trong dữ liệu được cung cấp.
2. Không tự tạo sản phẩm, SKU, giá bán, thương hiệu hoặc thông số kỹ thuật.
3. Không tự suy đoán tính năng sản phẩm. Nếu thiếu thông tin, hãy nói rõ.
4. Không dùng kiến thức bên ngoài để bổ sung thông số kỹ thuật chưa có trong dữ liệu.
5. Nếu không tìm được sản phẩm phù hợp, hãy thông báo rõ cho người dùng.
6. Không đề cập đến embedding, RRF, similarity, reranker hoặc database trong câu trả lời.
7. Không dùng dấu sao (*) hoặc Markdown trang trí, dùng gạch đầu dòng "-".
8. Khi nhắc đến một sản phẩm, gắn liên kết trực tiếp vào tên theo đúng định dạng: [Tên sản phẩm](/product/ID) với ID chính xác từ dữ liệu.
"""


class GeneratorService:
    """Quản lý sinh câu trả lời tư vấn bằng mô hình Google Gemini 3.1 Flash Lite."""

    def __init__(self) -> None:
        self.settings = get_settings()
        if not self.settings.gemini_api_key:
            logger.warning("GEMINI_API_KEY chưa được cấu hình trong .env")
        self.client = genai.Client(api_key=self.settings.gemini_api_key)

    @staticmethod
    def build_context(products: list[dict[str, Any]]) -> str:
        """Trích xuất và serialize ngữ cảnh sản phẩm tối giản sang JSON."""
        fields = ("id", "name", "sku", "brand", "category", "price", "rag_document")
        documents = [
            {"index": idx, **{f: p.get(f) for f in fields}}
            for idx, p in enumerate(products, 1)
        ]
        return json.dumps(documents, ensure_ascii=False, indent=2, default=str)

    def generate_answer_stream(
        self,
        query: str,
        products: list[dict[str, Any]],
    ) -> Iterator[str]:
        """Tạo prompt ngữ cảnh và stream câu trả lời từ Gemini 3.1 Flash Lite."""
        if not products:
            yield (
                "Hiện tại cửa hàng chưa tìm thấy sản phẩm phù hợp với yêu cầu của bạn. "
                "Bạn có thể thử thay đổi tiêu chí tìm kiếm hoặc ngân sách."
            )
            return

        context = self.build_context(products)
        prompt = (
            f"CÂU HỎI KHÁCH HÀNG:\n{query}\n\n"
            f"DANH SÁCH SẢN PHẨM PHÙ HỢP:\n{context}\n\n"
            "YÊU CẦU:\n"
            "Hãy tư vấn sản phẩm phù hợp dựa trên danh sách sản phẩm được cung cấp.\n"
            "Chỉ sử dụng thông tin có trong dữ liệu. Không tự tạo thông số hoặc sản phẩm.\n"
            "Nếu dữ liệu không xác nhận một tính năng, không được khẳng định sản phẩm có tính năng đó."
        )

        try:
            stream = self.client.models.generate_content_stream(
                model=self.settings.gemini_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    temperature=self.settings.gemini_temperature,
                    max_output_tokens=self.settings.gemini_max_output_tokens,
                ),
            )
            for chunk in stream:
                if text := chunk.text:
                    yield text
        except Exception as e:
            logger.exception("Lỗi khi stream từ Gemini (%s): %s", self.settings.gemini_model, e)
            raise

    def close(self) -> None:
        """Đóng kết nối client Gemini nếu cần."""
        if hasattr(self, "client") and self.client:
            try:
                self.client.close()
            except Exception:
                pass
