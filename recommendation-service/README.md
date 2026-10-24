# TechWiseAI Recommendation Service

Dịch vụ AI Đề xuất sản phẩm thông minh độc lập cho hệ thống TechWiseAI.

## 1. Tính năng chính
- **Vector Search (pgvector)**: Sử dụng khoảng cách Cosine để tìm sản phẩm có độ tương đồng cấu hình và đặc tính cao nhất.
- **Phân tích cấu hình phần cứng**: Bóc tách tự động thông số CPU, RAM, GPU, Ổ cứng từ dữ liệu sản phẩm để chấm điểm sức mạnh `config_score`.
- **Kiểm soát tầm giá chặt chẽ**: Ưu tiên sản phẩm trong biên độ $\pm 15\%$, giới hạn cứng tối đa $\pm 35\%$ để không gợi ý sản phẩm quá lệch giá.
- **Đa dạng thương hiệu**: Tối đa 3 sản phẩm/hãng trong kết quả.
- **Gán nhãn thông minh**:
  - `BEST`: Sản phẩm tối ưu nhất.
  - `CHOICE`: Sản phẩm cấu hình tốt nhất trong tầm giá thấp hơn hoặc bằng sản phẩm đang xem.

## 2. Hướng dẫn khởi chạy

```powershell
# Tạo môi trường ảo (nếu chưa có)
python -m venv .venv

# Kích hoạt môi trường ảo
.venv\Scripts\activate

# Cài đặt thư viện
pip install -r requirements.txt

# Chạy kiểm thử độc lập
python test_recommendation.py

# Khởi chạy dịch vụ
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

## 3. API
- Health check: `GET http://localhost:8001/health`
- Swagger UI: `GET http://localhost:8001/docs`
- Đề xuất sản phẩm: `GET http://localhost:8001/api/v1/recommendations/{product_id}?limit=8`

## 4. Lưu ý kỹ thuật quan trọng
- Khi thực hiện truy vấn Vector Search hoặc cập nhật embedding bằng `psycopg`, luôn sử dụng ép kiểu tường minh `%s::vector` trong SQL để tránh lỗi `operator does not exist: vector <=> double precision[]`.
- Chi tiết kiến trúc, luồng xử lý và các sự cố đã khắc phục xem tại [RECOMMEND_MODULE.md](../RECOMMEND_MODULE.md).
