# TechWiseAI RAG Service

Dịch vụ AI RAG Tư vấn Sản phẩm thông minh (Retrieval-Augmented Generation) kết hợp Hybrid Search + Re-ranker và mô hình **Google Gemini 3.1 Flash Lite**.

## 1. Tính năng chính
- **Query Analyzer**: Tự động nhận diện ý định, phân tách danh mục (`laptop`, `điện thoại`, `tai nghe`, v.v.), thương hiệu (`Apple`, `ASUS`, `Dell`, v.v.) và khoảng giá (`min_price`, `max_price`).
- **Hybrid Retrieval (Vector + Keyword Search)**:
  - **Dense Vector Search**: Sử dụng mô hình `BAAI/bge-m3` (vector 1024 chiều) cùng `pgvector` tính khoảng cách Cosine.
  - **Full-Text & Exact Search**: Tìm kiếm chính xác theo mã SKU, tên sản phẩm và PostgreSQL `ts_rank_cd`.
  - **Reciprocal Rank Fusion (RRF)**: Hợp nhất và chấm điểm ứng viên từ cả hai nhánh tìm kiếm.
- **Cross-Encoder Reranker**: Sử dụng mô hình `BAAI/bge-reranker-base` để tái xếp hạng độ liên quan ngữ cảnh chuyên sâu, chọn lọc Top 5 sản phẩm tối ưu nhất.
- **Gemini 3.1 Flash Lite Generation & Streaming**: Sử dụng mô hình ngôn ngữ lớn **Google Gemini 3.1 Flash Lite** qua SDK `google-genai` với System Prompt nghiêm ngặt chống ảo giác, stream token theo thời gian thực và sinh liên kết sản phẩm trực tiếp `[Tên sản phẩm](/product/ID)`.

## 2. Kiến trúc & Cấu trúc thư mục (Chuẩn Clean Architecture)

```
rag-service/
├── app/
│   ├── __init__.py
│   ├── main.py                     # FastAPI application, CORS middleware, lifespan, router inclusion
│   ├── api/
│   │   ├── __init__.py             # Router exports
│   │   └── chat.py                 # Endpoints: POST /api/v1/chat, POST /api/v1/chat/stream
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py               # Pydantic Settings & cấu hình môi trường (.env)
│   │   └── database.py             # Quản lý kết nối PostgreSQL & pgvector (Context Manager)
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── chat.py                 # Pydantic request/response schemas (ChatRequest, ChatResponse, v.v.)
│   └── services/
│       ├── __init__.py
│       ├── query_analyzer.py       # Phân tích câu truy vấn, bóc tách thực thể
│       ├── retrieval_service.py    # Tìm kiếm Semantic, Keyword và Hybrid Search (RRF)
│       ├── reranker_service.py     # Cross-Encoder Reranker
│       ├── generator_service.py    # Quản lý Prompt, ngữ cảnh và sinh câu trả lời bằng Gemini 3.1 Flash Lite
│       └── rag_service.py          # Facade Service điều phối luồng xử lý RAG hoàn chỉnh
├── data/                           # Dữ liệu sản phẩm mẫu, scripts import & batch embedding
│   ├── crawl_and_format_rag.js     # Tool cào dữ liệu mẫu
│   ├── generate_rag_documents.py   # Tool sinh văn bản rag_document từ CSDL
│   ├── import_rag_document.py      # Tool import tài liệu RAG vào CSDL
│   ├── embedding.py                # Batch embedding BGE-M3 vào PostgreSQL pgvector
│   └── *_cleaned_for_import.json   # Dữ liệu sản phẩm chuẩn hóa
├── Dockerfile                      # Container build script
├── requirements.txt                # Danh sách thư viện phụ thuộc
└── run.py                          # Entrypoint khởi chạy dịch vụ cổng 8003
```

## 3. Cấu hình Model Gemini

Cấu hình trong file `.env`:
```env
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-3.1-flash-lite
GEMINI_TEMPERATURE=0.2
GEMINI_MAX_OUTPUT_TOKENS=2048
```

## 4. Hướng dẫn khởi chạy Service

```bash
# Kích hoạt môi trường ảo
source .venv/bin/activate  # Trên Linux/macOS
# .venv\Scripts\activate   # Trên Windows

# Cài đặt thư viện phụ thuộc
pip install -r requirements.txt

# Khởi chạy dịch vụ RAG
python run.py
# hoặc
uvicorn app.main:app --host 0.0.0.0 --port 8003 --reload
```

## 5. Danh sách API
- **Health Check**: `GET http://localhost:8003/health`
- **Swagger Documentation**: `GET http://localhost:8003/docs`
- **Tư vấn Sản phẩm (Đồng bộ)**: `POST http://localhost:8003/api/v1/chat`
  - Body: `{"message": "Tư vấn laptop sinh viên dưới 15 triệu"}`
- **Tư vấn Sản phẩm (Streaming)**: `POST http://localhost:8003/api/v1/chat/stream`
  - Body: `{"message": "Tư vấn điện thoại chụp ảnh đẹp tầm 20 triệu"}`
  - Response: Server-Sent Content Stream (`text/plain`).
