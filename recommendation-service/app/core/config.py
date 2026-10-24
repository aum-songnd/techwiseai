from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

RECOMMENDATION_SERVICE_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    # Cấu hình Database
    db_host: str = "localhost"
    db_port: int = 5434
    db_name: str = "regulation_db"
    db_user: str = "regulation_user"
    db_password: str = "regulation_password"

    # Cấu hình Railway Embedding API (Sentence-Transformers all-MiniLM-L6-v2)
    embedding_api_url: str = "https://api-production-b778.up.railway.app/v1"
    embedding_api_key: str = ""
    embedding_model: str = "all-MiniLM-L6-v2"
    embedding_dimensions: int = 384

    # Ngưỡng đề xuất (Thresholds)
    rec_price_tolerance: float = 0.15  # Vùng giá ưu tiên (+-15%)
    rec_price_hard_limit: float = 0.35 # Giới hạn cứng (+-35%)
    rec_default_limit: int = 8
    rec_max_limit: int = 12

    model_config = SettingsConfigDict(
        env_file=(
            RECOMMENDATION_SERVICE_ROOT / ".env",
            RECOMMENDATION_SERVICE_ROOT.parent / ".env",
        ),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def database_dsn(self) -> str:
        return (
            f"host={self.db_host} "
            f"port={self.db_port} "
            f"dbname={self.db_name} "
            f"user={self.db_user} "
            f"password={self.db_password}"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
