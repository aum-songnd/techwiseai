import os
from pathlib import Path
import psycopg
from dotenv import load_dotenv
from pgvector.psycopg import register_vector
from sentence_transformers import SentenceTransformer
import ollama

# ============================
# CẤU HÌNH
# ============================
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

# 1. Mô hình Embedding BGE-M3 (Chạy nhẹ trên CPU ~0.03s, nhường GPU cho LLM)
print("⏳ Đang tải BGE-M3 vào bộ nhớ...")
embed_model = SentenceTransformer("BAAI/bge-m3", device="cpu")

# 2. Mô hình LLM chạy trên GPU RTX 3050 qua Ollama
LOCAL_LLM = "qwen2.5:3b"


def connect_db():
    conn = psycopg.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "5432")),
        dbname=os.getenv("DB_NAME", "regulation_db"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD"),
    )
    register_vector(conn)
    return conn


# ============================
# 1. TÌM KIẾM SẢN PHẨM BẰNG BGE-M3 (1024 CHIỀU)
# ============================
def search_products(query: str, top_k: int = 3) -> list[dict]:
    # 1. Tính vector câu hỏi bằng BGE-M3 (1024 chiều)
    query_vector = embed_model.encode(query, normalize_embeddings=True).tolist()

    # 2. Tìm kiếm trong PostgreSQL (pgvector)
    with connect_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT 
                    sku, 
                    rag_document,
                    1 - (rag_embedding <=> %s::vector) AS similarity
                FROM products
                WHERE rag_embedding IS NOT NULL
                ORDER BY rag_embedding <=> %s::vector
                LIMIT %s;
                """,
                (query_vector, query_vector, top_k),
            )
            rows = cur.fetchall()
            return [{"sku": r[0], "document": r[1], "score": r[2]} for r in rows]


# ============================
# 2. TƯ VẤN BẰNG OLLAMA QWEN 2.5 (STREAMING)
# ============================
def stream_chatbot_response(user_message: str):
    # Bước 1: Tìm sản phẩm trong DB
    matched_products = search_products(user_message, top_k=3)

    if not matched_products:
        print("\n🤖 Bot: Dạ hiện tại bên em chưa tìm thấy sản phẩm phù hợp yêu cầu của bạn ạ.")
        return

    # Ghép ngữ cảnh các sản phẩm tìm được
    context_text = "\n\n---\n\n".join([p["document"] for p in matched_products])

    # Prompt cho LLM
    prompt = f"""Bạn là chuyên viên tư vấn bán hàng công nghệ chuyên nghiệp, thân thiện và trung thực.

THÔNG TIN SẢN PHẨM TRONG CỬA HÀNG:
{context_text}

CÂU HỎI CỦA KHÁCH: "{user_message}"

HƯỚNG DẪN TƯ VẤN:
- Dựa CHÍNH XÁC vào thông số kỹ thuật và giá bán của các sản phẩm ở trên để tư vấn, không tự bịa đặt.
- Giải thích vì sao sản phẩm phù hợp với nhu cầu của khách.
- Xưng hô lịch sự ("Dạ", "em chào anh/chị").
- Trình bày gạch đầu dòng rõ ràng: Tên sản phẩm, Giá bán, Điểm nổi bật, Bảo hành."""

    print("\n🤖 Bot: ", end="", flush=True)

    # Bước 2: Gọi Ollama chạy trên GPU RTX 3050 (Stream từng từ)
    response = ollama.chat(
        model=LOCAL_LLM,
        messages=[{"role": "user", "content": prompt}],
        stream=True
    )

    for chunk in response:
        print(chunk["message"]["content"], end="", flush=True)
    print("\n" + "-" * 60)


# ============================
# 3. GIAO DIỆN CHAT TRÊN TERMINAL
# ============================
if __name__ == "__main__":
    print("=" * 60)
    print("🤖 CHATBOT RAG 100% LOCAL (BGE-M3 + Qwen 2.5 trên RTX 3050)")
    print("Gõ câu hỏi của bạn (hoặc gõ 'exit' để thoát):")
    print("=" * 60)

    while True:
        try:
            user_input = input("\n👤 Khách hàng: ").strip()
            if not user_input:
                continue
            if user_input.lower() in ["exit", "quit", "thoat"]:
                print("Tạm biệt bạn!")
                break

            stream_chatbot_response(user_input)

        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"\n❌ Lỗi: {e}")