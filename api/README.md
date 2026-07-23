## 환경 설정

공개 기본값은 Git으로 관리하고, API 키는 `api/.env`에만 저장합니다.

- `.env.local`: 로컬 개발 기본값 (`LLM_PROVIDER=openai`)
- `.env.prod`: 운영 기본값 (`LLM_PROVIDER=ollama`)
- `.env`: Git 비추적 파일. OpenAI·Gemini API 키와 내부 서비스 URL을 보관

`APP_ENV`를 지정하지 않으면 로컬 설정을 사용합니다. 운영 배포에서는 프로세스 환경에
`APP_ENV=prod`를 설정해야 `.env.prod`가 선택됩니다. 운영에서 `openai` 또는 `gemini`를
선택하면 API 시작 단계에서 설정 오류로 차단됩니다.

FastAPI 라우터나 하위 의존성에서 설정이 필요하면 `Settings`를 직접 생성하지 않고
`SettingsDep`를 매개변수 타입으로 선언합니다.

```python
from app.config import SettingsDep


async def example_service(settings: SettingsDep) -> str:
    return settings.llm_provider
```

```bash
uv run uvicorn main:app --reload
```
