from functools import lru_cache
from io import BytesIO

import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image, UnidentifiedImageError
from transformers import AutoModel, AutoProcessor

from app.core.config import get_settings


EXPECTED_DIMENSION = 768


class EmbeddingService:
    def __init__(self) -> None:
        settings = get_settings()

        self.model_name = settings.model_name
        self.model_revision = settings.model_revision

        self.device = torch.device(
            "cuda" if torch.cuda.is_available() else "cpu"
        )

        print(f"Đang tải SigLIP: {self.model_name}")
        print(f"Thiết bị xử lý: {self.device}")

        self.processor = AutoProcessor.from_pretrained(
            self.model_name,
            revision=self.model_revision,
        )

        self.model = AutoModel.from_pretrained(
            self.model_name,
            revision=self.model_revision,
        )

        self.model.to(self.device)
        self.model.eval()

        print("SigLIP đã sẵn sàng")

    def generate_image_embedding(
        self,
        image_content: bytes,
    ) -> np.ndarray:
        try:
            with Image.open(BytesIO(image_content)) as source_image:
                image = source_image.convert("RGB")
        except (UnidentifiedImageError, OSError) as error:
            raise ValueError("Tệp tải lên không phải ảnh hợp lệ") from error

        inputs = self.processor(
            images=image,
            return_tensors="pt",
        )

        inputs = {
            key: value.to(self.device)
            for key, value in inputs.items()
            if isinstance(value, torch.Tensor)
        }

        with torch.inference_mode():
            output = self.model.get_image_features(**inputs)

        embedding = self._extract_embedding(output).float()

        normalized_embedding = F.normalize(
            embedding,
            p=2,
            dim=-1,
        )

        dimension = normalized_embedding.shape[-1]

        if dimension != EXPECTED_DIMENSION:
            raise RuntimeError(
                f"Vector không đúng {EXPECTED_DIMENSION} chiều: "
                f"nhận được {dimension}"
            )

        return normalized_embedding[0].cpu().numpy()

    @staticmethod
    def _extract_embedding(output) -> torch.Tensor:
        if isinstance(output, torch.Tensor):
            return output

        if getattr(output, "pooler_output", None) is not None:
            return output.pooler_output

        if getattr(output, "image_embeds", None) is not None:
            return output.image_embeds

        raise RuntimeError(
            f"Không đọc được embedding từ {type(output).__name__}"
        )


@lru_cache(maxsize=1)
def get_embedding_service() -> EmbeddingService:
    return EmbeddingService()