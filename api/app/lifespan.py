"""FastAPI 애플리케이션이 공유하는 외부 자원의 수명주기를 관리한다."""

import asyncio
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI

from app.config import API_ROOT, get_settings
from app.common.logging import log_event
from app.db.database import Database
from app.llm.mcp import open_workshield_mcp
from app.storage.cleanup import SessionFileLifecycle
from app.storage.local import LocalFileStorage


async def _periodic_storage_cleanup(
    database: Database,
    file_storage: LocalFileStorage,
    *,
    interval_seconds: int,
) -> None:
    """실행 중에도 만료 세션을 주기적으로 정리한다."""
    lifecycle = SessionFileLifecycle(database, file_storage)
    while True:
        await asyncio.sleep(interval_seconds)
        try:
            await asyncio.to_thread(
                lifecycle.cleanup_expired_and_orphaned,
                remove_orphans=False,
            )
        except Exception:
            log_event(
                event="storage.cleanup.failed",
                request_id="system",
                state="failed",
                level=logging.ERROR,
            )


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """SQLite와 MCP session을 API 애플리케이션 수명과 함께 관리한다."""
    settings = get_settings()
    database = Database(settings.database_url, echo=settings.database_echo)
    database.create_schema()
    storage_root = settings.temp_upload_dir
    if not storage_root.is_absolute():
        storage_root = (API_ROOT / storage_root).resolve()
    file_storage = LocalFileStorage(storage_root)
    SessionFileLifecycle(
        database,
        file_storage,
    ).cleanup_expired_and_orphaned()
    app.state.database = database
    app.state.file_storage = file_storage
    app.state.review_tasks = set()
    cleanup_task = asyncio.create_task(
        _periodic_storage_cleanup(
            database,
            file_storage,
            interval_seconds=settings.storage_cleanup_interval_seconds,
        )
    )
    try:
        async with open_workshield_mcp(settings) as runtime:
            app.state.workshield_mcp = runtime
            try:
                yield
            finally:
                del app.state.workshield_mcp
    finally:
        for task in getattr(app.state, "review_tasks", set()):
            task.cancel()
        if hasattr(app.state, "review_tasks"):
            del app.state.review_tasks
        cleanup_task.cancel()
        with suppress(asyncio.CancelledError):
            await cleanup_task
        if hasattr(app.state, "file_storage"):
            del app.state.file_storage
        if hasattr(app.state, "database"):
            del app.state.database
        database.dispose()
