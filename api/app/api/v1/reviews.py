"""검토 접수·상태·결과·재시도 API."""

import asyncio
import json
from collections.abc import AsyncIterator

from fastapi import APIRouter, Header, Request
from sse_starlette.sse import EventSourceResponse

from app.access_control.dependencies import (
    OwnedReviewDep,
    SessionCookie,
    resolve_owned_review,
    resolve_owned_session,
)
from app.common.errors import AppValidationError, ConflictError
from app.common.responses import success_response
from app.config import SettingsDep
from app.db.dependencies import DatabaseDep, DbSessionDep
from app.llm.mcp.dependencies import WorkShieldMCPRuntimeDep
from app.storage.dependencies import FileStorageDep
from app.reviews.schemas import ReviewCreateRequest, ReviewCreateResponse, ReviewResponse
from app.reviews.service import create_review, retry_review
from app.reviews.runner import execute_review


router = APIRouter(prefix="/reviews", tags=["reviews"])


def _schedule_review(
    request: Request,
    *,
    database,
    review_id: str,
    storage,
    runtime,
    settings,
) -> None:
    """검토를 앱 수명주기와 함께 추적되는 백그라운드 작업으로 예약한다."""
    task = asyncio.create_task(
        execute_review(
            database=database,
            storage=storage,
            runtime=runtime,
            settings=settings,
            review_id=review_id,
        )
    )
    tasks = getattr(request.app.state, "review_tasks", set())
    tasks.add(task)
    request.app.state.review_tasks = tasks
    task.add_done_callback(tasks.discard)


def _response(entity: object) -> ReviewResponse:
    """Domain 검토를 API DTO로 변환한다."""
    return ReviewResponse(
        review_id=entity.id,
        session_id=entity.session_id,
        review_state=entity.state.value,
        mcp_review_status=(
            entity.mcp_review_status.value if entity.mcp_review_status else None
        ),
        progress=entity.progress,
        result=entity.result,
        error=entity.error,
        started_at=entity.started_at,
        completed_at=entity.completed_at,
        expires_at=entity.expires_at,
    )


@router.post("", status_code=202)
async def start_review(
    request: Request,
    payload: ReviewCreateRequest,
    db_session: DbSessionDep,
    database: DatabaseDep,
    settings: SettingsDep,
    access_token: SessionCookie = None,
    runtime: WorkShieldMCPRuntimeDep = None,
    storage: FileStorageDep = None,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
):
    """Cookie 소유 세션의 검토를 멱등적으로 접수한다."""
    if not idempotency_key:
        raise AppValidationError(
            code="REQUIRED_VALUE_MISSING",
            message="Idempotency-Key 헤더가 필요합니다.",
        )
    session = resolve_owned_session(payload.session_id, access_token, db_session)
    entity = create_review(
        db_session,
        session,
        idempotency_key=idempotency_key,
        settings=settings,
    )
    _schedule_review(
        request,
        database=database,
        review_id=entity.id,
        storage=storage,
        runtime=runtime,
        settings=settings,
    )
    return success_response(
        request,
        ReviewCreateResponse(
            review_id=entity.id,
            review_state=entity.state.value,
            session_id=entity.session_id,
        ),
    )


@router.get("/{review_id}/results")
def get_results(request: Request, owned: OwnedReviewDep):
    """완료된 검토 결과를 Cookie 소유자에게만 반환한다."""
    if owned.state.value != "COMPLETED":
        raise ConflictError(
            code="REVIEW_NOT_COMPLETED",
            message="검토가 아직 완료되지 않았습니다.",
        )
    return success_response(request, _response(owned))


@router.get("/{review_id}/events")
async def review_events(
    request: Request,
    owned: OwnedReviewDep,
    database: DatabaseDep,
    access_token: SessionCookie = None,
):
    """Cookie 소유 검토의 진행 상태를 SSE로 전달한다."""

    async def stream() -> AsyncIterator[dict[str, str]]:
        current = owned
        sequence = 0
        while True:
            sequence += 1
            event_name = (
                "completed"
                if current.state.value == "COMPLETED"
                else "failed"
                if current.state.value in {"FAILED", "EXPIRED"}
                else "progress"
            )
            yield {
                "event": event_name,
                "id": str(sequence),
                "data": json.dumps(
                    {
                        "review_id": current.id,
                        "sequence": sequence,
                        "review_state": current.state.value,
                        "progress": current.progress,
                        "error": current.error,
                    },
                    ensure_ascii=False,
                ),
            }
            if event_name in {"completed", "failed"}:
                return
            await asyncio.sleep(1)
            if await request.is_disconnected():
                return
            with database.session() as db_session:
                current = resolve_owned_review(
                    current.id,
                    access_token,
                    db_session,
                )

    return EventSourceResponse(stream())


@router.get("/{review_id}")
def get_review(request: Request, owned: OwnedReviewDep):
    """검토 상태를 Cookie 소유자에게만 반환한다."""
    return success_response(request, _response(owned))


@router.post("/{review_id}/retry", status_code=202)
async def retry(
    request: Request,
    owned: OwnedReviewDep,
    db_session: DbSessionDep,
    database: DatabaseDep,
    settings: SettingsDep,
    runtime: WorkShieldMCPRuntimeDep = None,
    storage: FileStorageDep = None,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
):
    """재시도 가능한 실패에 대해 새 검토 ID를 발급한다."""
    if not idempotency_key:
        raise AppValidationError(
            code="REQUIRED_VALUE_MISSING",
            message="Idempotency-Key 헤더가 필요합니다.",
        )
    entity = retry_review(
        db_session,
        owned,
        idempotency_key=idempotency_key,
        settings=settings,
    )
    _schedule_review(
        request,
        database=database,
        review_id=entity.id,
        storage=storage,
        runtime=runtime,
        settings=settings,
    )
    return success_response(
        request,
        ReviewCreateResponse(
            review_id=entity.id,
            review_state=entity.state.value,
            session_id=entity.session_id,
        ),
    )
