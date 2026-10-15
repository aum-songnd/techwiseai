
import json
from pathlib import Path

import torch
from sentence_transformers import SentenceTransformer


INPUT_FILE = Path("laptop_chunks.jsonl")
OUTPUT_FILE = Path("laptop_embedded.jsonl")

MODEL_NAME = "BAAI/bge-m3"
BATCH_SIZE = 2

TEXT_FIELDS = ("text", "content", "chunk_text", "chunk_content")


def get_text(item, line_number):
    for field in TEXT_FIELDS:
        value = item.get(field)
        if isinstance(value, str) and value.strip():
            return value.strip()

    raise ValueError(
        f"Line {line_number}: Cannot find chunk text. "
        f"Available fields: {list(item.keys())}"
    )


def main():
    if not INPUT_FILE.exists():
        raise FileNotFoundError(
            f"Cannot find {INPUT_FILE.resolve()}"
        )

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Device: {device}")
    print(f"Loading model: {MODEL_NAME}")

    model = SentenceTransformer(MODEL_NAME, device=device)

    total = 0

    with INPUT_FILE.open("r", encoding="utf-8") as source, \
         OUTPUT_FILE.open("w", encoding="utf-8") as target:

        batch = []
        line_numbers = []

        def process_batch(items, numbers):
            if not items:
                return 0

            texts = [get_text(item, n) for item, n in zip(items, numbers)]

            vectors = model.encode(
                texts,
                batch_size=BATCH_SIZE,
                normalize_embeddings=True,
                convert_to_numpy=True,
                show_progress_bar=False,
            )

            for item, vector in zip(items, vectors):
                item["embedding"] = vector.tolist()
                item["embedding_model"] = MODEL_NAME
                item["embedding_dimension"] = len(vector)

                target.write(
                    json.dumps(item, ensure_ascii=False) + "\n"
                )

            target.flush()
            return len(items)

        for line_number, line in enumerate(source, start=1):
            if not line.strip():
                continue

            item = json.loads(line)
            batch.append(item)
            line_numbers.append(line_number)

            if len(batch) >= BATCH_SIZE:
                total += process_batch(batch, line_numbers)
                print(f"Embedded {total} chunks")

                batch = []
                line_numbers = []

        total += process_batch(batch, line_numbers)


if __name__ == "__main__":
    main()
