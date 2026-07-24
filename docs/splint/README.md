# 백엔드 구현 현황

> 구현 기준: `docs/api/api-draft.md`  
> 역할 경계: 백엔드 A가 `READY_TO_REVIEW`까지 처리하고, 백엔드 B가 이후 검토 실행과 결과 처리를 담당한다.

## 작성 규칙

- A와 B는 각자 담당 영역의 상태와 비고를 수정한다.
- 공통 작업은 A·B가 합의한 후 수정한다.
- 구현 기준이 변경되면 `docs/api/api-draft.md`를 먼저 갱신한다.
- 상태는 `예정`, `진행 중`, `검토 요청`, `완료`, `블로커` 중 하나를 사용한다.
- `완료`는 테스트 통과와 main 반영까지 끝난 상태를 의미한다.

## 공통 작업

| 작업 | 상태 | 담당 | 비고 |
| --- | --- | --- | --- |
| 공통 Enum | 예정 | A·B | 상태·진행 단계·허용 행동 |
| 공통 오류 응답 | 예정 | A·B | `code`, `message`, `retryable`, `next_action` |
| 세션 DTO | 예정 | A·B | A가 생성하고 B가 검토 시작 시 재검증 |
| 검토 시작 조건 | 예정 | A·B | `READY_TO_REVIEW`, 유형 선택, 만료·중복 확인 |

## 백엔드 A

담당 범위: 파일 업로드부터 계약 유형 확정 및 `READY_TO_REVIEW`까지

| API | 작업 | 상태 | 비고 |
| --- | --- | --- | --- |
| `POST /api/v1/review-sessions` | 파일 업로드·검증·범위 판별 | 예정 | MCP `assess_contract_scope` 연동 |
| `GET /api/v1/review-sessions/{session_id}` | 세션 상태 복구 | 예정 | 새로고침·화면 이동 대응 |
| `PATCH /api/v1/review-sessions/{session_id}/contract-type` | 사용자 계약 유형 확정 | 예정 | 활성 MVP 유형 검증 |
| `POST /api/v1/review-sessions/{session_id}/out-of-scope-confirmation` | 범위 외 계약 계속 진행 확인 | 예정 | 유형 선택 여부 함께 확인 |

### A 완료 기준

- 파일 확장자·크기·실제 형식·암호화·손상 여부를 검증한다.
- 서버가 생성한 임시 경로에 파일을 저장한다.
- MCP 범위 판별 결과를 애플리케이션 상태로 변환한다.
- 사용자 선택 유형과 추천 유형을 분리해 저장한다.
- 조건 충족 시 세션을 `READY_TO_REVIEW`로 전환한다.
- 공통 오류 응답과 테스트를 적용한다.

## 백엔드 B

담당 범위: 검토 시작부터 진행 상황·결과 처리까지

| API | 작업 | 상태 | 비고 |
| --- | --- | --- | --- |
| `POST /api/v1/reviews` | 전체 계약 검토 시작 | 예정 | MCP `review_contract_candidates` 연동 |
| `GET /api/v1/reviews/{review_id}` | 검토 상태 조회 | 예정 | 폴링·SSE 복구 |
| `GET /api/v1/reviews/{review_id}/events` | SSE 진행 상황 전송 | 예정 | 순서·진행률 역행 방지 |
| `POST /api/v1/reviews/{review_id}/retry` | 재시도 가능한 검토 재실행 | 예정 | 멱등성·세션 TTL 확인 |
| `GET /api/v1/reviews/{review_id}/results` | 전체 검토 결과 조회 | 예정 | 조항 결과와 MISSING 분리 |

### B 완료 기준

- 검토 시작 전에 세션 조건을 다시 검증한다.
- 중복 검토를 차단하고 멱등성을 보장한다.
- MCP 진행 이벤트를 검토 ID와 연결한다.
- SSE 연결 종료·재연결·폴링 복구를 처리한다.
- 조항 결과와 MISSING 체크리스트를 분리한다.
- 완료·실패·재시도 상태와 테스트를 적용한다.

## 작업 기록

| 날짜 | 담당 | 작업 | 상태 | 블로커·비고 |
| --- | --- | --- | --- | --- |
| 07-24 | A | 업로드·검토 세션 생성 API | 예정 | 없음 |
| 07-24 | B | 검토 시작 API | 예정 | A 세션 DTO 필요 |

## 상태 기준

| 상태 | 의미 |
| --- | --- |
| `예정` | 아직 시작하지 않음 |
| `진행 중` | 구현 중 |
| `검토 요청` | PR 또는 코드 리뷰 대기 |
| `완료` | 테스트 통과 및 main 반영 완료 |
| `블로커` | 선행 작업이나 추가 협의 필요 |
