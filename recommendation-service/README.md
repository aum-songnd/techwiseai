# TechWiseAI Personalized Recommendation Service

Dịch vụ AI Gợi ý sản phẩm thông minh độc lập cho hệ thống TechWiseAI, tập trung chuyên sâu vào **cá nhân hóa theo hành vi và tương tác của người dùng** (User Interaction & Behavioral Personalized Recommendations).

---

## 1. Tính năng cốt lõi

- **Mục tiêu duy nhất**: Phân tích lịch sử hành vi của từng người dùng để xây dựng vector hồ sơ sở thích cá nhân và gợi ý sản phẩm phù hợp nhất theo thời gian thực.
- **Bậc thang trọng số hành vi (Action Weights)**:
  - `PURCHASE`: **5.0** (Ý định mạnh mẽ nhất, tác động lớn nhất tới sở thích).
  - `ADD_TO_CART`: **3.0** (Mức độ quan tâm cao).
  - `FAVORITE`: **2.0** (Đánh dấu yêu thích).
  - `VIEW` / `CLICK`: **1.0** (Quan tâm cơ bản).
  - **Lọc nhiễu Dwell Time**: Nếu thời gian xem trang chi tiết `< 4s` (lướt nhanh / click nhầm), trọng số tự động giảm xuống `0.5` để tránh làm lệch vector sở thích.
- **Chu kỳ phân rã thời gian bán rã 7 ngày (Half-Life Temporal Decay)**:
  - Công thức: $w(t) = w_{base} \times \exp\left(-\frac{\ln(2) \times \Delta t}{7 \times 86400}\right)$
  - Tương tác hôm nay có sức nặng 100%. Sau 7 ngày còn 50%, sau 14 ngày còn 25%. Sở thích gần đây luôn được ưu tiên hơn xu hướng quá khứ.
- **Chuẩn hóa L2 Norm (Unit Vector 384D)**:
  - Vector hồ sơ tích lũy được chuẩn hóa L2 Norm ($\|v\|_2 = 1.0$) để đảm bảo công bằng về độ lớn khi đo khoảng cách Cosine với vector sản phẩm trong database.
- **Vector Search (pgvector - HNSW / IVFFlat)**:
  - Sử dụng khoảng cách Cosine (`products.embedding <=> user_profile_vector`) để truy vấn top sản phẩm tương đồng cao nhất.
- **Chế độ gợi ý động theo mức độ tương tác**:
  - `COLD_START` (0 tương tác): Đề xuất sản phẩm xu hướng, bán chạy nhất (fallback an toàn cho người dùng mới).
  - `EXPLORING` (1 - 5 tương tác): Kết hợp sở thích sơ khởi với sản phẩm nổi bật để đa dạng hóa trải nghiệm khám phá.
  - `PERSONALIZED` (6+ tương tác): Đề xuất cá nhân hóa hoàn toàn theo vector hồ sơ hành vi.

---

## 2. Hướng dẫn khởi chạy

```bash
# Tạo môi trường ảo (nếu cần)
python3 -m venv .venv
source .venv/bin/activate  # Trên Linux/macOS
# .venv\Scripts\activate   # Trên Windows

# Cài đặt thư viện
pip install -r requirements.txt

# Khởi chạy dịch vụ FastAPI
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

---

## 3. Danh sách API (Endpoints)

| Phương thức | Đường dẫn | Chức năng |
| :--- | :--- | :--- |
| `GET` | `/health` | Kiểm tra trạng thái hoạt động dịch vụ |
| `GET` | `/docs` | Swagger UI tương tác trực quan |
| `GET` | `/api/v1/recommendations/for-you?limit=8` | Lấy danh sách sản phẩm gợi ý cá nhân hóa (dựa theo User ID hoặc Guest Session) |
| `POST` | `/api/v1/recommendations/interactions` | Ghi nhận hành vi tương tác mới từ Frontend (Click, View, Cart, Favorite...) |

---

## 4. Lưu ý kỹ thuật quan trọng
- Khi thực hiện truy vấn Vector Search bằng `psycopg`, luôn sử dụng ép kiểu tường minh `%s::vector` trong SQL để tránh lỗi `operator does not exist: vector <=> double precision[]`.
- Vector hồ sơ người dùng tương thích hoàn toàn với model embedding Sentence-Transformers (384 chiều) được lưu trong cột `products.embedding`.

