"""검토 세션 생성·복구·선택 API."""

from fastapi import APIRouter, File, Request, Response, UploadFile

from app.access_control.dependencies import OwnedReviewSessionDep
from app.common.responses import ApiResponse, COMMON_ERROR_RESPONSES, success_response
from app.config import SettingsDep
from app.db.dependencies import DbSessionDep
from app.llm.mcp.dependencies import WorkShieldMCPRuntimeDep
from app.review_sessions.schemas import (
    ContractTypeSelectionRequest,
    OutOfScopeConfirmationRequest,
    ReviewSessionResponse,
    UploadInfo,
)
from app.review_sessions.service import (
    confirm_out_of_scope,
    create_review_session,
    select_contract_type,
)
from app.security.cookies import set_session_access_cookie
from app.storage.dependencies import FileStorageDep


router = APIRouter(
    prefix="/review-sessions",
    tags=["review-sessions"],
    responses=COMMON_ERROR_RESPONSES,
)


def _response(entity) -> ReviewSessionResponse:
    """Domain 세션을 API DTO로 변환한다."""
    can_start = entity.state.value == "READY_TO_REVIEW"
    return ReviewSessionResponse(
        session_id=entity.id,
        review_state=entity.state.value,
        upload=UploadInfo(
            file_name=entity.original_file_name,
            size_bytes=entity.file_size_bytes,
            extension=entity.original_file_name.rsplit(".", 1)[-1].lower()
            if "." in entity.original_file_name
            else "",
        ),
        scope_status=entity.scope_status.value if entity.scope_status else None,
        scope_result=entity.scope_result,
        suggested_contract_type=entity.suggested_contract_type,
        selected_contract_type=entity.selected_contract_type,
        selection_source=(
            entity.selection_source.value if entity.selection_source else None
        ),
        out_of_scope_confirmed_at=entity.out_of_scope_confirmed_at,
        can_start_review=can_start,
        expires_at=entity.expires_at,
    )


@router.post(
    "",
    status_code=201,
    response_model=ApiResponse[ReviewSessionResponse],
)
async def create_session(
    request: Request,
    response: Response,
    file: UploadFile = File(...),
    db_session: DbSessionDep = None,
    storage: FileStorageDep = None,
    runtime: WorkShieldMCPRuntimeDep = None,
    settings: SettingsDep = None,
):
    """계약서 파일을 저장하고 익명 검토 세션을 생성한다."""
    content = await file.read(settings.max_upload_size_bytes + 1)
    entity, access_token = await create_review_session(
        db_session=db_session,
        storage=storage,
        runtime=runtime,
        settings=settings,
        file_name=file.filename,
        content=content,
    )
    set_session_access_cookie(response, token=access_token, settings=settings)
    return success_response(request, _response(entity))


@router.get(
    "/{session_id}",
    response_model=ApiResponse[ReviewSessionResponse],
)
def get_session(request: Request, owned: OwnedReviewSessionDep):
    """Cookie 소유자에게만 세션 상태를 반환한다."""
    return success_response(request, _response(owned))


@router.patch(
    "/{session_id}/contract-type",
    response_model=ApiResponse[ReviewSessionResponse],
)
def choose_contract_type(
    request: Request,
    owned: OwnedReviewSessionDep,
    payload: ContractTypeSelectionRequest,
    db_session: DbSessionDep,
):
    """소유 세션의 계약 유형을 확정한다."""
    entity = select_contract_type(
        db_session,
        owned,
        selected_contract_type=payload.selected_contract_type,
        selection_source=payload.selection_source,
    )
    return success_response(request, _response(entity))


@router.post(
    "/{session_id}/out-of-scope-confirmation",
    response_model=ApiResponse[ReviewSessionResponse],
)
def confirm_scope(
    request: Request,
    owned: OwnedReviewSessionDep,
    payload: OutOfScopeConfirmationRequest,
    db_session: DbSessionDep,
):
    """소유 세션의 범위 외 계속 진행을 확인한다."""
    entity = confirm_out_of_scope(db_session, owned, confirmed=payload.confirmed)
    return success_response(request, _response(entity))
