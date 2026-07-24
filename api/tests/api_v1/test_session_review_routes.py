"""실제 v1 Router의 Cookie 소유권과 세션·검토 흐름을 검증한다."""

from contextlib import asynccontextmanager
from pathlib import Path
from types import SimpleNamespace

import httpx
import pytest
from fastapi import FastAPI

from app.api.v1.router import router as v1_router
from app.common.exception_handlers import register_exception_handlers
from app.config import Settings, get_settings
from app.db.database import Database
from app.db.dependencies import get_database
from app.llm.mcp.dependencies import get_workshield_runtime
from app.storage.dependencies import get_file_storage
from app.storage.local import LocalFileStorage


class FakeTool:
    """범위 판별 MCP 도구를 흉내 내는 테스트 도구."""

    name = "assess_contract_scope"

    async def ainvoke(self, _payload: dict[str, object]) -> dict[str, object]:
        return {
            "scope_status": "CONTRACT_TYPE_UNCERTAIN",
            "suggested_contract_type": "SW_FREELANCE",
            "candidates": [],
        }


def create_test_app(tmp_path: Path) -> FastAPI:
    """실제 v1 Router에 테스트 의존성만 교체한 앱을 만든다."""
    database = Database(f"sqlite+pysqlite:///{tmp_path / 'api.db'}")
    database.create_schema()
    storage = LocalFileStorage(tmp_path / "uploads")
    settings = Settings(
        app_env="local",
        llm_provider="ollama",
        temp_upload_dir=tmp_path / "uploads",
    )
    runtime = SimpleNamespace(tools=(FakeTool(),), supports_file_path=False)

    @asynccontextmanager
    async def no_lifespan(_app: FastAPI):
        yield

    app = FastAPI(lifespan=no_lifespan)
    register_exception_handlers(app)
    app.include_router(v1_router)
    app.dependency_overrides[get_database] = lambda: database
    app.dependency_overrides[get_file_storage] = lambda: storage
    app.dependency_overrides[get_workshield_runtime] = lambda: runtime
    app.dependency_overrides[get_settings] = lambda: settings
    return app


pytestmark = pytest.mark.asyncio


async def test_session_creation_and_review_access_are_cookie_bound(
    tmp_path: Path,
) -> None:
    app = create_test_app(tmp_path)
    transport = httpx.ASGITransport(app=app)
    pdf = b"%PDF-1.4\ncontract\n%%EOF"

    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as owner:
        created = await owner.post(
            "/api/v1/review-sessions",
            files={"file": ("contract.pdf", pdf, "application/pdf")},
        )
        assert created.status_code == 201
        assert "workshield_session=" in created.headers["set-cookie"]
        session_id = created.json()["data"]["session_id"]

        state = await owner.get(f"/api/v1/review-sessions/{session_id}")
        assert state.status_code == 200

        selected = await owner.patch(
            f"/api/v1/review-sessions/{session_id}/contract-type",
            json={
                "selected_contract_type": "SW_FREELANCE",
                "selection_source": "MANUAL",
            },
        )
        assert selected.status_code == 200

        review = await owner.post(
            "/api/v1/reviews",
            json={"session_id": session_id},
            headers={"Idempotency-Key": "route-test-1"},
        )
        assert review.status_code == 202
        review_id = review.json()["data"]["review_id"]
        status = await owner.get(f"/api/v1/reviews/{review_id}")
        assert status.status_code == 200

    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as other:
        assert (await other.get(f"/api/v1/review-sessions/{session_id}")).status_code == 404
        assert (await other.get(f"/api/v1/reviews/{review_id}")).status_code == 404
