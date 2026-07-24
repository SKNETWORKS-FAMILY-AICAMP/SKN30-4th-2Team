"""백그라운드 MCP 전체 검토 실행기."""

import asyncio
import base64
from datetime import UTC, datetime

from app.config import Settings
from app.db.database import Database
from app.llm.mcp.types import WorkShieldMCPRuntime
from app.review_sessions.repository import SqlAlchemyReviewSessionRepository
from app.review_sessions.service import _tool_payload
from app.reviews.domain import MCPReviewStatus, ReviewState
from app.reviews.repository import SqlAlchemyReviewRepository
from app.storage.protocol import FileStorage


def _mcp_status(payload: dict[str, object]) -> MCPReviewStatus:
    """MCP 상태를 허용된 상태 enum으로 정규화한다."""
    raw = str(payload.get("status", "OK")).upper()
    try:
        return MCPReviewStatus(raw)
    except ValueError:
        return MCPReviewStatus.PIPELINE_ERROR


async def execute_review(
    *,
    database: Database,
    storage: FileStorage,
    runtime: WorkShieldMCPRuntime,
    settings: Settings,
    review_id: str,
) -> None:
    """검토를 수행하고 별도 DB Session으로 최종 상태를 저장한다."""
    with database.session() as db_session:
        review_repository = SqlAlchemyReviewRepository(db_session)
        session_repository = SqlAlchemyReviewSessionRepository(db_session)
        review = review_repository.get(review_id)
        if review is None or review.state is not ReviewState.QUEUED:
            return
        session = session_repository.get(review.session_id)
        if session is None or session.storage_key is None:
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
        storage_key = session.storage_key
        file_name = session.original_file_name
        contract_type = review.contract_type

    try:
        tool = next(
            candidate
            for candidate in runtime.tools
            if candidate.name == "review_contract_candidates"
        )
        if runtime.supports_file_path:
            with storage.local_path(storage_key) as local_path:
                payload = {
                    "contract_type": contract_type,
                    "file_path": str(local_path),
                }
                result = await asyncio.wait_for(
                    tool.ainvoke(payload),
                    timeout=settings.workshield_mcp_read_timeout,
                )
        else:
            with storage.open(storage_key) as stored_file:
                content = stored_file.read()
            result = await asyncio.wait_for(
                tool.ainvoke(
                    {
                        "contract_type": contract_type,
                        "file_content": base64.b64encode(content).decode("ascii"),
                        "file_name": file_name,
                    }
                ),
                timeout=settings.workshield_mcp_read_timeout,
            )
        result_payload = _tool_payload(result)
        status = _mcp_status(result_payload)
        final_state = (
            ReviewState.COMPLETED if status is MCPReviewStatus.OK else ReviewState.FAILED
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
    except asyncio.TimeoutError:
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
        review = repository.get(review_id)
        if review is None:
            return
        review.state = final_state
        review.mcp_review_status = status
        review.result = result_payload
        review.error = error
        review.completed_at = datetime.now(UTC)
        review.progress = {
            "sequence": 2,
            "stage": "RESULT_ASSEMBLY",
            "current": 1,
            "total": 1,
            "percent": 100,
            "message": "검토 결과를 정리했습니다.",
        }
        repository.save(review)
        db_session.commit()
