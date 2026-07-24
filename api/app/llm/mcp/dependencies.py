"""FastAPI에서 공유 WorkShield MCP runtime을 주입한다."""

from typing import Annotated, cast

from fastapi import Depends, Request

from app.llm.mcp.types import WorkShieldMCPRuntime


async def get_workshield_runtime(request: Request) -> WorkShieldMCPRuntime:
    """lifespan에서 준비한 MCP runtime을 반환한다."""
    runtime = getattr(request.app.state, "workshield_mcp", None)
    if runtime is None:
        raise RuntimeError("WorkShield MCP runtime이 준비되지 않았습니다.")
    return cast(WorkShieldMCPRuntime, runtime)


WorkShieldMCPRuntimeDep = Annotated[
    WorkShieldMCPRuntime,
    Depends(get_workshield_runtime),
]
