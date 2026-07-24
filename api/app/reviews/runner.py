"""백그라운드 MCP 전체 검토 실행기와 실제 progress 연결."""

import asyncio
import base64
import json
import math
from datetime import UTC, datetime, timedelta
from typing import Any

from app.config import Settings
from app.db.database import Database
from app.llm.mcp.types import WorkShieldMCPRuntime
from app.review_sessions.activity import resume_ttl_after_review
from app.review_sessions.repository import SqlAlchemyReviewSessionRepository
from app.review_sessions.service import _tool_payload
from app.reviews.domain import MCPReviewStatus, ReviewState
from app.reviews.repository import SqlAlchemyReviewRepository
from app.storage.protocol import FileStorage


def _mcp_status(payload: dict[str, Any]) -> MCPReviewStatus:
    raw = str(payload.get("status", "PIPELINE_ERROR")).upper()
    try:
        return MCPReviewStatus(raw)
    except ValueError:
        return MCPReviewStatus.PIPELINE_ERROR


def _list_of_dicts(value: object) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []
    return [dict(item) for item in value if isinstance(item, dict)]


def normalize_review_result(payload: dict[str, Any]) -> dict[str, Any]:
    """MCP 전체 검토 응답을 공개 결과의 세 배열로 정규화한다."""
    return {
        "status": str(payload.get("status", "PIPELINE_ERROR")).upper(),
        "contract_type": payload.get("contract_type"),
        "clause_results": _list_of_dicts(payload.get("clause_results")),
        "missing_standard_clauses": _list_of_dicts(
            payload.get("missing_standard_clauses")
        ),
        "toxic_patterns": _list_of_dicts(payload.get("toxic_patterns")),
        "message": payload.get("message")
        if isinstance(payload.get("message"), str)
        else None,
    }


def _stage_from_message(message: str | None, previous: str) -> str:
    if not message:
        return previous
    upper = message.upper()
    for stage in (
        "PREPARE",
        "BATCH_SEARCH",
        "RERANK",
        "CLAUSE_REVIEW",
        "MISSING_DETECTION",
        "RESULT_ASSEMBLY",
    ):
        if stage in upper:
            return stage
    try:
        parsed = json.loads(message)
    except (json.JSONDecodeError, TypeError):
        return previous
    if isinstance(parsed, dict) and isinstance(parsed.get("stage"), str):
        return parsed["stage"].upper()
    return previous


class ReviewProgressRecorder:
    """MCP progress를 review별 단조 증가 이벤트로 DB에 기록한다."""

    def __init__(self, database: Database, review_id: str) -> None:
        self._database = database
        self._review_id = review_id

    async def __call__(
        self,
        progress: float,
        total: float | None,
        message: str | None,
    ) -> None:
        with self._database.session() as db_session:
            repository = SqlAlchemyReviewRepository(db_session)
            review = repository.get(self._review_id)
            if review is None or review.state is not ReviewState.REVIEWING:
                return
            previous = review.progress or {}
            previous_sequence = int(previous.get("sequence", 0))
            previous_percent = int(previous.get("percent", 0))
            if total and total > 0:
                percent = math.floor(max(0, progress) / total * 100)
            else:
                percent = math.floor(max(0, progress))
            percent = max(previous_percent, min(percent, 99))
            review.progress = {
                "sequence": previous_sequence + 1,
                "stage": _stage_from_message(
                    message,
                    str(previous.get("stage", "PREPARE")),
                ),
                "current": progress,
                "total": total,
                "percent": percent,
                "message": message,
            }
            repository.save(review)
            db_session.commit()


async def _call_review_tool(
    runtime: WorkShieldMCPRuntime,
    payload: dict[str, Any],
    *,
    timeout_seconds: float,
    progress_callback: ReviewProgressRecorder,
) -> dict[str, Any]:
    """실제 MCP session을 우선 사용하고 테스트 runtime은 tool 호출로 대체한다."""
    session = getattr(runtime, "session", None)
    if session is not None:
        result = await session.call_tool(
            "review_contract_candidates",
            payload,
            read_timeout_seconds=timedelta(seconds=timeout_seconds),
            progress_callback=progress_callback,
        )
        return _tool_payload(result)

    tool = next(
        candidate
        for candidate in runtime.tools
        if candidate.name == "review_contract_candidates"
    )
    result = await asyncio.wait_for(
        tool.ainvoke(payload),
        timeout=timeout_seconds,
    )
    return _tool_payload(result)


async def execute_review(
    *,
    database: Database,
    storage: FileStorage,
    runtime: WorkShieldMCPRuntime,
    settings: Settings,
    review_id: str,
) -> None:
    """검토를 수행하고 별도 DB session으로 최종 상태를 저장한다."""
    with database.session() as db_session:
        review_repository = SqlAlchemyReviewRepository(db_session)
        session_repository = SqlAlchemyReviewSessionRepository(db_session)
        review = review_repository.get(review_id)
        if review is None or review.state is not ReviewState.QUEUED:
            return
        review_session = session_repository.get(review.session_id)
        if review_session is None or review_session.storage_key is None:
            review.state = ReviewState.FAILED
            review.error = {
                "code": "SOURCE_FILE_UNAVAILABLE",
                "retryable": False,
                "next_action": "START_NEW_REVIEW",
            }
            review.completed_at = datetime.now(UTC)
            review_repository.save(review)
            db_session.commit()
            return
        review.state = ReviewState.REVIEWING
        review.started_at = datetime.now(UTC)
        review.progress = {
            "sequence": 1,
            "stage": "PREPARE",
            "current": 0,
            "total": None,
            "percent": 0,
            "message": "검토를 준비하고 있습니다.",
        }
        review_repository.save(review)
        db_session.commit()
        storage_key = review_session.storage_key
        file_name = review_session.original_file_name
        contract_type = review.contract_type

    try:
        if runtime.supports_file_path:
            with storage.local_path(storage_key) as local_path:
                arguments = {
                    "contract_type": contract_type,
                    "file_path": str(local_path),
                }
                raw_result = await _call_review_tool(
                    runtime,
                    arguments,
                    timeout_seconds=settings.workshield_mcp_read_timeout,
                    progress_callback=ReviewProgressRecorder(database, review_id),
                )
        else:
            with storage.open(storage_key) as stored_file:
                content = stored_file.read()
            arguments = {
                "contract_type": contract_type,
                "file_content": base64.b64encode(content).decode("ascii"),
                "file_name": file_name,
            }
            raw_result = await _call_review_tool(
                runtime,
                arguments,
                timeout_seconds=settings.workshield_mcp_read_timeout,
                progress_callback=ReviewProgressRecorder(database, review_id),
            )
        status = _mcp_status(raw_result)
        result_payload = normalize_review_result(raw_result)
        final_state = (
            ReviewState.COMPLETED
            if status is MCPReviewStatus.OK
            else ReviewState.FAILED
        )
        error = None
        if final_state is ReviewState.FAILED:
            retryable = status in {
                MCPReviewStatus.CORPUS_UNAVAILABLE,
                MCPReviewStatus.PIPELINE_ERROR,
            }
            error = {
                "code": status.value,
                "retryable": retryable,
                "next_action": "RETRY_REVIEW" if retryable else "CONTACT_SUPPORT",
            }
    except asyncio.CancelledError:
        return
    except (asyncio.TimeoutError, TimeoutError):
        status = None
        final_state = ReviewState.FAILED
        result_payload = None
        error = {
            "code": "MCP_TIMEOUT",
            "retryable": True,
            "next_action": "RETRY_REVIEW",
        }
    except Exception:
        status = None
        final_state = ReviewState.FAILED
        result_payload = None
        error = {
            "code": "PIPELINE_ERROR",
            "retryable": True,
            "next_action": "RETRY_REVIEW",
        }

    with database.session() as db_session:
        repository = SqlAlchemyReviewRepository(db_session)
        session_repository = SqlAlchemyReviewSessionRepository(db_session)
        review = repository.get(review_id)
        if review is None or review.state is ReviewState.CANCELLED:
            return
        previous_sequence = int((review.progress or {}).get("sequence", 1))
        review.state = final_state
        review.mcp_review_status = status
        review.result = result_payload
        review.error = error
        review.completed_at = datetime.now(UTC)
        review.progress = {
            "sequence": previous_sequence + 1,
            "stage": "RESULT_ASSEMBLY",
            "current": 1,
            "total": 1,
            "percent": 100,
            "message": "검토 결과 정리가 완료되었습니다.",
        }
        repository.save(review)
        resume_ttl_after_review(
            db_session,
            review,
            ttl_seconds=settings.session_ttl_seconds,
        )
        if (
            review.state is ReviewState.FAILED
            and review.error
            and not review.error.get("retryable", False)
        ):
            review_session = session_repository.get(review.session_id)
            if review_session is not None and review_session.storage_key is not None:
                storage.delete(review_session.storage_key)
                review_session.storage_key = None
                session_repository.save(review_session)
        db_session.commit()
