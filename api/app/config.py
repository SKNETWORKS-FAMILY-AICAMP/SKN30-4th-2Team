"""환경별 설정과 FastAPI 의존성 provider를 정의한다."""

import os
from enum import StrEnum
from functools import lru_cache
from pathlib import Path
from typing import Annotated, Literal, cast

from fastapi import Depends
from pydantic import AnyHttpUrl, Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


API_ROOT = Path(__file__).resolve().parent.parent
Environment = Literal["local", "prod"]
DEFAULT_SUPPORTED_FILE_EXTENSIONS = (
    "hwp",
    "hwpx",
    "hwpml",
    "pdf",
    "xls",
    "xlsx",
    "docx",
)


class LLMProvider(StrEnum):
    """지원하는 LLM 공급자 식별자."""

    OPENAI = "openai"
    GEMINI = "gemini"
    OLLAMA = "ollama"


class MCPTransport(StrEnum):
    """WorkShield MCP 서버 연결 방식."""

    STREAMABLE_HTTP = "streamable_http"
    STDIO = "stdio"


def _selected_environment() -> Environment:
    """프로세스 환경으로 공개 기본 설정 파일을 고른다."""
    environment = os.getenv("APP_ENV", "local").lower()
    if environment not in {"local", "prod"}:
        raise ValueError("APP_ENV는 'local' 또는 'prod'여야 합니다.")
    return cast(Environment, environment)


def _environment_files() -> tuple[Path, Path]:
    """공개 환경 파일 뒤에 Git 비추적 비밀 파일을 적용한다."""
    environment = _selected_environment()
    return (API_ROOT / f".env.{environment}", API_ROOT / ".env")


class Settings(BaseSettings):
    """WorkShield API 실행에 필요한 설정값."""

    model_config = SettingsConfigDict(
        env_file=_environment_files(),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: Environment = _selected_environment()
    llm_provider: LLMProvider
    llm_model: str | None = None
    database_url: str = (
        f"sqlite+pysqlite:///{API_ROOT / 'data' / 'workshield.db'}"
    )
    database_echo: bool = False
    app_debug: bool = False
    api_docs_enabled: bool = True
    cors_origins: list[str] = ["http://localhost:5173"]

    openai_api_key: SecretStr | None = None
    gemini_api_key: SecretStr | None = None
    ollama_base_url: AnyHttpUrl = "http://localhost:11434"
    workshield_mcp_transport: MCPTransport = MCPTransport.STDIO
    workshield_mcp_url: AnyHttpUrl = "http://localhost:8000/mcp"
    workshield_mcp_project_dir: Path = API_ROOT.parent / "mcp"
    workshield_mcp_timeout: float = Field(default=30.0, gt=0)
    workshield_mcp_read_timeout: float = Field(default=300.0, gt=0)
    max_upload_size_bytes: int = Field(
        default=10_000_000,
        gt=0,
        description="업로드 파일의 최대 크기(byte). 기본값은 10 MB이다.",
    )
    supported_file_extensions: Annotated[tuple[str, ...], NoDecode] = (
        DEFAULT_SUPPORTED_FILE_EXTENSIONS
    )
    temp_upload_dir: Path = Path("data/99_uploads")
    session_ttl_seconds: int = Field(
        default=30 * 60,
        gt=0,
        description="마지막 사용자 액션 이후 세션을 유지할 비활성 시간(초).",
    )

    @field_validator("supported_file_extensions", mode="before")
    @classmethod
    def parse_supported_file_extensions(
        cls, value: str | tuple[str, ...]
    ) -> tuple[str, ...]:
        """쉼표 구분 확장자 설정을 점 없는 소문자 튜플로 정규화한다."""
        raw_extensions = value.split(",") if isinstance(value, str) else value
        extensions = tuple(
            extension.strip().lower().removeprefix(".")
            for extension in raw_extensions
            if extension.strip().removeprefix(".")
        )
        if not extensions:
            raise ValueError("SUPPORTED_FILE_EXTENSIONS는 비어 있을 수 없습니다.")
        return extensions

    @model_validator(mode="after")
    def validate_production_provider(self) -> "Settings":
        """운영 환경의 외부 전송과 민감한 디버그 출력을 막는다."""
        if self.app_env == "prod" and self.llm_provider is not LLMProvider.OLLAMA:
            raise ValueError(
                "운영 환경에서는 LLM_PROVIDER=ollama만 사용할 수 있습니다."
            )
        if self.app_env == "prod" and self.app_debug:
            raise ValueError("운영 환경에서는 APP_DEBUG=false여야 합니다.")
        if self.app_env == "prod" and self.database_echo:
            raise ValueError("운영 환경에서는 DATABASE_ECHO=false여야 합니다.")
        return self

    def selected_provider_key(self) -> SecretStr | None:
        """선택된 외부 provider의 키만 반환한다. Ollama는 키가 필요하지 않다."""
        if self.llm_provider is LLMProvider.OPENAI:
            return self.openai_api_key
        if self.llm_provider is LLMProvider.GEMINI:
            return self.gemini_api_key
        return None


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """프로세스에서 공유할 설정 인스턴스를 지연 생성한다."""
    return Settings()


SettingsDep = Annotated[Settings, Depends(get_settings)]
"""FastAPI 라우터와 하위 의존성에서 재사용하는 설정 의존성."""
