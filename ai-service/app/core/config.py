from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


AI_SERVICE_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    db_host: str = "localhost"
    db_port: int = 5434
    db_name: str = "regulation_db"
    db_user: str = "regulation_user"
    db_password: str

    model_name: str = "google/siglip-base-patch16-224"
    model_revision: str = "main"
    pipeline_version: str = "v1"

    image_weight: float = 0.7
    text_weight: float = 0.3

    default_top_k: int = 10
    max_top_k: int = 50

    model_config = SettingsConfigDict(
        env_file=AI_SERVICE_ROOT / ".env",
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