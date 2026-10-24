import json
from pathlib import Path

import numpy as np
from sentence_transformers import SentenceTransformer

BASE_DIR = Path(__file__).resolve().parent
INPUT_FILE = BASE_DIR / "laptop_chunks.json"
OUTPUT_FILE = BASE_DIR / "laptop_embeddings.json"

MODEL_NAME = "intfloat/multilingual-e5-small"


def main():
    # 1. Đọc dữ liệu chunk.
    with INPUT_FILE.open("r", encoding="utf-8") as file:
        chunks = json.load(file)

    if not isinstance(chunks, list) or not chunks:
        raise ValueError("File chunk phải là danh sách có dữ liệu")

    ids = [str(chunk["id"]) for chunk in chunks]

    if len(ids) != len(set(ids)):
        raise ValueError("Có ID chunk trùng nhau")

    for chunk in chunks:
        text = chunk.get("text")
        if not isinstance(text, str) or not text.strip():
            raise ValueError(f"Chunk {chunk['id']} thiếu nội dung")

    # 2. Tải mô hình. Đổi thành "cuda" khi CUDA đã hoạt động.
    model = SentenceTransformer(MODEL_NAME, device="cpu")

    passages = ["passage: " + chunk["text"] for chunk in chunks]

    # 3. Kiểm tra token để tránh cắt mất nội dung.
    for chunk, passage in zip(chunks, passages):
        token_count = len(
            model.tokenizer(
                passage,
                add_special_tokens=True,
                truncation=False,
                verbose=False,
            )["input_ids"]
        )

        if token_count > model.max_seq_length:
            raise ValueError(
                f"Chunk {chunk['id']} có {token_count} token, "
                f"vượt giới hạn {model.max_seq_length}"
            )

    # 4. Tạo embedding.
    embeddings = model.encode(
        passages,
        batch_size=8,
        normalize_embeddings=True,
        convert_to_numpy=True,
        show_progress_bar=True,
    ).astype(np.float32)

    # 5. Tạo biến output trước khi lưu.
    output = {
        "model_name": MODEL_NAME,
        "dimension": int(embeddings.shape[1]),
        "normalized": True,
        "items": [
            {
                "id": chunk["id"],
                "text": chunk["text"],
                "metadata": chunk.get("metadata", {}),
                "embedding": vector.tolist(),
            }
            for chunk, vector in zip(chunks, embeddings)
        ],
    }

    # 6. Lưu JSON.
    with OUTPUT_FILE.open("w", encoding="utf-8") as file:
        json.dump(
            output,
            file,
            ensure_ascii=False,
            indent=2,
            allow_nan=False,
        )

    print(f"Đã embedding {len(chunks)} chunk")
    print(f"Kích thước ma trận: {embeddings.shape}")
    print(f"Đã lưu: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()