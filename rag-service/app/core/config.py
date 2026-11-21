import os
from functools import lru_cache
from pathlib import Path
from typing import Any

from dotenv import dotenv_values, load_dotenv

RAG_SERVICE_ROOT = Path(__file__).resolve().parents[2]

try:
    from pydantic_settings import BaseSettings, SettingsConfigDict

    class Settings(BaseSettings):
        # Database
        db_host: str = "localhost"
        db_port: int = 5432
        db_name: str = "regulation_db"
        db_user: str = "regulation_user"
        db_password: str = "regulation_password"

        # Embedding - BAAI/bge-m3
        embedding_model: str = "BAAI/bge-m3"
        embedding_dimensions: int = 1024
        embedding_max_length: int = 2048
        embedding_device: str = "cuda"
        batch_size: int = 2

        # LLM Generation: Gemini
        gemini_api_key: str = ""
        gemini_model: str = "gemini-3.1-flash-lite"
        gemini_temperature: float = 0.2
        gemini_max_output_tokens: int = 2048

        # Legacy Ollama settings
        llm_model: str = "qwen2"
        ollama_base_url: str = "http://localhost:11434"
        llm_temperature: float = 0.2
        llm_max_output_tokens: int = 2048

        # Retrieval
        search_top_k: int = 5
        candidate_limit: int = 30
        rrf_k: int = 60

        # Reranker
        reranker_model: str = "BAAI/bge-reranker-base"
        reranker_device: str = "cpu"
        reranker_batch_size: int = 4
        reranker_max_length: int = 512
        reranker_top_k: int = 5
        reranker_candidate_limit: int = 30

        model_config = SettingsConfigDict(
            env_file=(
                RAG_SERVICE_ROOT / ".env",
                RAG_SERVICE_ROOT.parent / ".env",
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

        @property
        def effective_model(self) -> str:
            return self.gemini_model

except ImportError:
    from pydantic import BaseModel

    class Settings(BaseModel):
        # Database
        db_host: str = "localhost"
        db_port: int = 5432
        db_name: str = "regulation_db"
        db_user: str = "regulation_user"
        db_password: str = "regulation_password"

        # Embedding - BAAI/bge-m3
        embedding_model: str = "BAAI/bge-m3"
        embedding_dimensions: int = 1024
        embedding_max_length: int = 2048
        embedding_device: str = "cuda"
        batch_size: int = 2

        # LLM Generation: Gemini
        gemini_api_key: str = ""
        gemini_model: str = "gemini-3.1-flash-lite"
        gemini_temperature: float = 0.2
        gemini_max_output_tokens: int = 2048

        # Legacy Ollama settings
        llm_model: str = "qwen2"
        ollama_base_url: str = "http://localhost:11434"
        llm_temperature: float = 0.2
        llm_max_output_tokens: int = 2048

        # Retrieval
        search_top_k: int = 5
        candidate_limit: int = 30
        rrf_k: int = 60

        # Reranker
        reranker_model: str = "BAAI/bge-reranker-base"
        reranker_device: str = "cpu"
        reranker_batch_size: int = 4
        reranker_max_length: int = 512
        reranker_top_k: int = 5
        reranker_candidate_limit: int = 30

        def __init__(self, **data: Any):
            env_files = [
                RAG_SERVICE_ROOT / ".env",
                RAG_SERVICE_ROOT.parent / ".env",
            ]
            merged_env: dict[str, Any] = {}
            for path in reversed(env_files):
                if path.is_file():
                    merged_env.update(dotenv_values(path))
            merged_env.update(os.environ)

            lower_env = {k.lower(): v for k, v in merged_env.items() if v is not None}
            init_data: dict[str, Any] = {}
            for field_name in self.model_fields:
                if field_name in data:
                    init_data[field_name] = data[field_name]
                elif field_name.lower() in lower_env:
                    init_data[field_name] = lower_env[field_name.lower()]
            super().__init__(**init_data)

        @property
        def database_dsn(self) -> str:
            return (
                f"host={self.db_host} "
                f"port={self.db_port} "
                f"dbname={self.db_name} "
                f"user={self.db_user} "
                f"password={self.db_password}"
            )

        @property
        def effective_model(self) -> str:
            return self.gemini_model


@lru_cache
def get_settings() -> Settings:
    return Settings()
