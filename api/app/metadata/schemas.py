"""Metadata API DTO."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class MetadataCode(BaseModel):
    code: str
    label: str
    description: str | None = None
    enabled_for_mvp: bool | None = None


class FilePolicy(BaseModel):
    extensions: list[str]
    max_size_bytes: int
    single_file_only: bool = True
    encrypted_file_allowed: bool = False


class FeatureFlags(BaseModel):
    chat: bool = True
    basic_suggestion: bool = True
    confidence_score: bool = False
    suggestion_edit: bool = False
    single_clause_rereview: bool = False
    server_side_cancel: bool = True


class MetadataResponse(BaseModel):
    schema_version: str = "1.1"
    updated_at: datetime
    contract_types: list[MetadataCode]
    categories: list[MetadataCode]
    toxic_patterns: list[dict[str, Any]] = Field(default_factory=list)
    scope_statuses: list[str]
    review_states: list[str]
    result_codes: list[str]
    progress_stages: list[str]
    grounding_statuses: list[str]
    chat_outcomes: list[str]
    draft_outcomes: list[str]
    error_codes: list[str]
    selection_sources: list[str]
    next_actions: list[str]
    file_policy: FilePolicy
    features: FeatureFlags
