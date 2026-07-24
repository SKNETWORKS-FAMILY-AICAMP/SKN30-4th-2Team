"""검토 API의 요청·응답 DTO."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ReviewCreateRequest(BaseModel):
    """검토 시작 요청."""

    session_id: str = Field(min_length=1, max_length=64)


class ReviewResponse(BaseModel):
    """검토 상태 조회 응답."""

    review_id: str
    session_id: str
    review_state: str
    mcp_review_status: str | None = None
    progress: dict[str, Any] | None = None
    result: dict[str, Any] | None = None
    error: dict[str, Any] | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    expires_at: datetime


class ReviewCreateResponse(BaseModel):
    """비동기 검토 접수 응답."""

    review_id: str
    review_state: str
    session_id: str
    retry_of: str | None = None


class ReviewCancelResponse(BaseModel):
    """검토 결과 폐기와 파일 정리 응답."""

    review_id: str
    review_state: str
    deleted: bool
