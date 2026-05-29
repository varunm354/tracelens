from functools import lru_cache
from typing import Literal

from pydantic import Field, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Server
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    environment: Literal["development", "production"] = "development"

    # Database — either set DATABASE_URL directly or the individual vars below.
    # If DATABASE_URL is set it takes precedence.
    database_url: str = ""
    postgres_user: str = "tracelens"
    postgres_password: str = "tracelens"
    postgres_db: str = "tracelens"
    postgres_host: str = "localhost"
    postgres_port: int = 5432

    # pydantic-settings v2 calls json.loads() on any field typed as list[str]
    # before validators run, raising SettingsError for plain comma-separated values.
    # Storing as str bypasses that; cors_origins is exposed as list[str] below.
    cors_origins_raw: str = Field("http://localhost:3000", validation_alias="cors_origins")

    @computed_field
    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_origins_raw.split(",") if o.strip()]

    @property
    def db_url(self) -> str:
        """Resolved SQLAlchemy connection string."""
        if self.database_url:
            return self.database_url
        return (
            f"postgresql+psycopg2://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def is_development(self) -> bool:
        return self.environment == "development"


@lru_cache
def get_settings() -> Settings:
    return Settings()
