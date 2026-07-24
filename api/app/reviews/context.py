"""검토 결과에서 조항·표준조항·카테고리 컨텍스트를 안전하게 추출."""

from typing import Any


def clause_results(result: dict[str, Any] | None) -> list[dict[str, Any]]:
    if not result or not isinstance(result.get("clause_results"), list):
        return []
    return [
        item
        for item in result["clause_results"]
        if isinstance(item, dict)
    ]


def user_clause_id(item: dict[str, Any]) -> str | None:
    user_clause = item.get("user_clause")
    candidates = [
        item.get("user_clause_id"),
        item.get("clause_id"),
        item.get("id"),
        user_clause.get("id") if isinstance(user_clause, dict) else None,
    ]
    return next(
        (value for value in candidates if isinstance(value, str) and value),
        None,
    )


def match_data(item: dict[str, Any]) -> dict[str, Any]:
    value = item.get("match")
    return value if isinstance(value, dict) else {}


def standard_clause(item: dict[str, Any]) -> dict[str, Any] | None:
    match = match_data(item)
    value = match.get("standard")
    if not isinstance(value, dict):
        value = item.get("standard")
    return value if isinstance(value, dict) else None


def standard_clause_id(item: dict[str, Any]) -> str | None:
    standard = standard_clause(item)
    if not standard:
        return None
    value = standard.get("clause_id") or standard.get("id")
    return str(value) if value is not None else None


def clause_category(item: dict[str, Any]) -> str | None:
    direct = item.get("category")
    if isinstance(direct, str):
        return direct
    standard = standard_clause(item)
    if standard and isinstance(standard.get("category"), str):
        return standard["category"]
    return None


def find_user_clause(
    result: dict[str, Any] | None,
    clause_id: str,
) -> dict[str, Any] | None:
    return next(
        (
            item
            for item in clause_results(result)
            if user_clause_id(item) == clause_id
        ),
        None,
    )


def source_registry(result: dict[str, Any] | None) -> dict[str, set[str]]:
    registry = {"USER_CLAUSE": set(), "STANDARD_CLAUSE": set()}
    for item in clause_results(result):
        user_id = user_clause_id(item)
        standard_id = standard_clause_id(item)
        if user_id:
            registry["USER_CLAUSE"].add(user_id)
        if standard_id:
            registry["STANDARD_CLAUSE"].add(standard_id)
    return registry
