"""MCP progress 정규화와 서버 재시작 복구 검증."""

from io import BytesIO
from pathlib import Path
from types import SimpleNamespace

import pytest

from app.config import Settings
from app.db.database import Database
from app.lifespan import _recover_interrupted_reviews
from app.review_sessions.repository import SqlAlchemyReviewSessionRepository
from app.reviews.domain import ReviewState
from app.reviews.repository import SqlAlchemyReviewRepository
from app.reviews.runner import execute_review
from app.storage.local import LocalFileStorage
from tests.review_sessions.test_repository import review_session_entity
from tests.reviews.test_repository import review_entity


class ProgressSession:
    def __init__(self, database: Database, review_id: str) -> None:
        self.database = database
        self.review_id = review_id
        self.percents: list[int] = []

    async def call_tool(
        self,
        _name,
        _arguments,
        read_timeout_seconds=None,
        progress_callback=None,
    ):
        for progress in (2, 7, 3):
            await progress_callback(
                progress,
                10,
                '{"stage":"CLAUSE_REVIEW"}',
            )
            with self.database.session() as db_session:
                review = SqlAlchemyReviewRepository(db_session).get(self.review_id)
                assert review is not None
                self.percents.append(review.progress["percent"])
        return {
            "status": "OK",
            "clause_results": None,
            "missing_standard_clauses": [],
            "toxic_patterns": None,
        }


@pytest.mark.asyncio
async def test_execute_review_uses_monotonic_mcp_progress(
    database: Database,
    tmp_path: Path,
) -> None:
    storage = LocalFileStorage(tmp_path / "uploads")
    storage_key = storage.save(BytesIO(b"contract"), extension="pdf")
    review_session = review_session_entity("ses_progress")
    review_session.storage_key = storage_key
    review_session.selected_contract_type = "SW_FREELANCE"
    review = review_entity("rev_progress", session_id=review_session.id)
    review.state = ReviewState.QUEUED
    with database.session() as db_session:
        SqlAlchemyReviewSessionRepository(db_session).add(review_session)
        db_session.commit()
        SqlAlchemyReviewRepository(db_session).add(review)
        db_session.commit()
    progress_session = ProgressSession(database, review.id)
    runtime = SimpleNamespace(
        session=progress_session,
        tools=(),
        supports_file_path=False,
    )
    settings = Settings(
        app_env="local",
        llm_provider="ollama",
        llm_model="test",
    )

    await execute_review(
        database=database,
        storage=storage,
        runtime=runtime,
        settings=settings,
        review_id=review.id,
    )

    assert progress_session.percents == [20, 70, 70]
    with database.session() as db_session:
        completed = SqlAlchemyReviewRepository(db_session).get(review.id)
    assert completed is not None
    assert completed.state is ReviewState.COMPLETED
    assert completed.progress["sequence"] == 5
    assert completed.result["clause_results"] == []
    assert completed.result["toxic_patterns"] == []


def test_restart_marks_active_review_retryable(database: Database) -> None:
    review_session = review_session_entity("ses_restart")
    review = review_entity("rev_restart", session_id=review_session.id)
    review.state = ReviewState.REVIEWING
    with database.session() as db_session:
        SqlAlchemyReviewSessionRepository(db_session).add(review_session)
        db_session.commit()
        SqlAlchemyReviewRepository(db_session).add(review)
        db_session.commit()

    _recover_interrupted_reviews(database)

    with database.session() as db_session:
        recovered = SqlAlchemyReviewRepository(db_session).get(review.id)
    assert recovered is not None
    assert recovered.state is ReviewState.FAILED
    assert recovered.error == {
        "code": "REVIEW_INTERRUPTED",
        "retryable": True,
        "next_action": "RETRY_REVIEW",
    }
