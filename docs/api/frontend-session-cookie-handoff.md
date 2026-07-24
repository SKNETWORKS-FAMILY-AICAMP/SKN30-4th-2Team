# 프론트엔드 세션 Cookie 연동

대상: `@gyuwon02`

WorkShield의 익명 세션 접근 토큰은 세션 생성 응답의 본문이 아니라
`workshield_session` HttpOnly Cookie로 전달된다.

현재 연결 가능한 핵심 API는 다음과 같다.

- `POST /api/v1/review-sessions`
- `GET /api/v1/review-sessions/{session_id}`
- `PATCH /api/v1/review-sessions/{session_id}/contract-type`
- `POST /api/v1/review-sessions/{session_id}/out-of-scope-confirmation`
- `POST /api/v1/reviews`
- `GET /api/v1/reviews/{review_id}`
- `GET /api/v1/reviews/{review_id}/results`
- `GET /api/v1/reviews/{review_id}/events`
- `POST /api/v1/reviews/{review_id}/retry`
- `GET /api/v1/reviews/{review_id}/grounding?category={category_code}`
- `POST /api/v1/reviews/{review_id}/chat/messages`
- `POST /api/v1/reviews/{review_id}/suggestions`
- `DELETE /api/v1/reviews/{review_id}`
- `GET /api/v1/metadata` (Cookie 불필요, `ETag` 지원)

## 프론트엔드 규칙

- 토큰을 `localStorage`, `sessionStorage`, 전역 상태 또는 URL에 저장하지 않는다.
- `fetch`는 `credentials: "include"`를 사용한다.
- Axios는 `withCredentials: true`를 사용한다.
- 새로고침 복구에는 `session_id`와 `review_id`만 사용한다.
- `404`는 리소스가 없거나 현재 브라우저 세션이 소유하지 않은 경우다.
- `410 SESSION_EXPIRED`는 현재 브라우저가 소유한 세션이 만료된 경우다.
- `POST /api/v1/reviews`, retry, chat, suggestions 요청에는 매 요청 의미별로 고유한 `Idempotency-Key` 헤더를 포함한다.
- 같은 키와 같은 요청은 기존 응답을 반환하며, 같은 키를 다른 요청에 재사용하면 `409 IDEMPOTENCY_KEY_REUSED`를 반환한다.
- SSE가 끊기면 `GET /api/v1/reviews/{review_id}`로 상태를 동기화하고 `Last-Event-ID`와 함께 재연결한다.

```ts
await fetch(`${API_BASE_URL}/api/v1/review-sessions/${sessionId}`, {
  credentials: "include",
});
```

로컬 개발에서는 프론트와 API가 동일 사이트의 localhost를 사용한다.
운영에서는 HTTPS가 필요하며 Cookie에 `Secure`가 적용된다.
