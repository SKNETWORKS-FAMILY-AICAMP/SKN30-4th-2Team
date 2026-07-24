"""환경 설정과 FastAPI 의존성 주입 계약을 검증한다."""

import pytest
from pydantic import ValidationError

from app.config import MCPTransport, Settings, get_settings


def test_get_settings_is_cached() -> None:
    get_settings.cache_clear()

    assert get_settings() is get_settings()


def test_production_rejects_external_provider() -> None:
    with pytest.raises(ValidationError, match="LLM_PROVIDER=ollama"):
        Settings(app_env="prod", llm_provider="openai")


def test_mcp_transport_defaults_to_stdio() -> None:
    settings = Settings(
        app_env="local",
        llm_provider="ollama",
        llm_model="configured-model",
        workshield_mcp_transport="stdio",
    )

    assert settings.workshield_mcp_transport is MCPTransport.STDIO


def test_mcp_timeout_must_be_positive() -> None:
    with pytest.raises(ValidationError):
        Settings(
            app_env="local",
            llm_provider="ollama",
            llm_model="configured-model",
            workshield_mcp_timeout=0,
        )


def test_database_defaults_to_file_sqlite() -> None:
    settings = Settings(
        app_env="local",
        llm_provider="ollama",
        llm_model="configured-model",
    )

    assert settings.database_url.startswith("sqlite+pysqlite:///")
    assert settings.database_url.endswith("/data/workshield.db")
    assert settings.database_echo is False


def test_production_rejects_debug_mode() -> None:
    with pytest.raises(ValidationError, match="APP_DEBUG=false"):
        Settings(
            app_env="prod",
            llm_provider="ollama",
            app_debug=True,
            database_echo=False,
        )


def test_production_rejects_database_query_logging() -> None:
    with pytest.raises(ValidationError, match="DATABASE_ECHO=false"):
        Settings(
            app_env="prod",
            llm_provider="ollama",
            app_debug=False,
            database_echo=True,
        )
