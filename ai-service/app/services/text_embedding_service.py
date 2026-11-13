from functools import lru_cache
from typing import List

import torch
import torch.nn.functional as F
from transformers import AutoModel, AutoTokenizer


class TextEmbeddingService:
    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2") -> None:
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"Đang tải Text Embedding Model: {model_name} trên {self.device}")

        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModel.from_pretrained(model_name)
        self.model.to(self.device)
        self.model.eval()

        print(f"Text Embedding Model {model_name} đã sẵn sàng")

    def encode(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []

        inputs = self.tokenizer(
            texts,
            padding=True,
            truncation=True,
            max_length=512,
            return_tensors="pt",
        )
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        with torch.no_grad():
            outputs = self.model(**inputs)
            token_embeddings = outputs[0]
            input_mask = (
                inputs["attention_mask"]
                .unsqueeze(-1)
                .expand(token_embeddings.size())
                .float()
            )
            embeddings = torch.sum(token_embeddings * input_mask, 1) / torch.clamp(
                input_mask.sum(1), min=1e-9
            )
            embeddings = F.normalize(embeddings, p=2, dim=1)

        return embeddings.cpu().tolist()


@lru_cache
def get_text_embedding_service() -> TextEmbeddingService:
    return TextEmbeddingService()

