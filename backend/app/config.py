from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="EBOOK_", extra="ignore")

    database_url: str = "sqlite:///./ebook.db"
    secret_key: str = Field(default="change-me-in-production", min_length=16)
    access_token_minutes: int = 480
    cookie_secure: bool = False
    storage_dir: Path = Path("./storage")
    superadmin_username: str = "admin"
    superadmin_password: str = "admin123"
    max_upload_bytes: int = 100 * 1024 * 1024
    max_epub_entries: int = 2000
    max_uncompressed_bytes: int = 500 * 1024 * 1024
    max_compression_ratio: int = 100


@lru_cache
def get_settings() -> Settings:
    return Settings()
