import { Check } from 'lucide-react'
import type { Screen } from '../types'

const STEPS = [
  { id: 1, label: '계약서 업로드',   sub: '파일 업로드 및 검증',     nav: 'upload' as Screen },
  { id: 2, label: '계약 유형 선택',  sub: '표준계약서 기준 설정',    nav: 'contract-type' as Screen },
  { id: 3, label: '검토 진행',       sub: 'AI 표준조항 비교',        nav: 'processing' as Screen },
  { id: 4, label: '결과 확인',       sub: '조항별 검토 내용 확인',   nav: 'results' as Screen },
]

const STEP_FOR: Record<Screen, number> = {
  upload: 1,
  'contract-type': 2,
  'out-of-scope': 2,
  processing: 3,
  results: 4,
  'clause-detail': 4,
  chatbot: 4,
}

interface Props {
  currentScreen: Screen
  onNavigate: (s: Screen) => void
}

export default function Sidebar({ currentScreen, onNavigate }: Props) {
  const currentStep = STEP_FOR[currentScreen]

  return (
    <aside className="hidden lg:flex flex-col w-64 xl:w-[272px] shrink-0 border-r border-[#E2E8F0] bg-white py-8 px-5">
      <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-widest mb-6 px-1">검토 단계</p>

      <nav className="flex flex-col relative">
        {/* Vertical rail */}
        <div className="absolute left-[15px] top-8 bottom-8 w-px bg-[#E2E8F0]" />

        {STEPS.map((step) => {
          const done    = step.id < currentStep
          const current = step.id === currentStep
          const ahead   = step.id > currentStep
          const clickable = !ahead

          return (
            <button
              key={step.id}
              onClick={() => clickable && onNavigate(step.nav)}
              disabled={!clickable}
              className={`relative flex items-start gap-3 px-3 py-3 rounded-xl text-left transition-colors mb-1 ${
                current
                  ? 'bg-[#EFF6FF]'
                  : clickable
                  ? 'hover:bg-[#F8FAFC]'
                  : 'opacity-40 cursor-not-allowed'
              }`}
            >
              {/* Step dot */}
              <div
                className={`relative z-10 mt-0.5 w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0 text-xs font-semibold transition-colors ${
                  done
                    ? 'bg-[#2563EB] text-white'
                    : current
                    ? 'bg-[#1E293B] text-white ring-4 ring-[#EFF6FF]'
                    : 'bg-white border-2 border-[#E2E8F0] text-[#64748B]'
                }`}
              >
                {done ? <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> : step.id}
              </div>

              <div className="min-w-0 pt-0.5">
                <p className={`text-sm font-medium leading-tight ${current ? 'text-[#1E293B]' : done ? 'text-[#475569]' : 'text-[#64748B]'}`}>
                  {step.label}
                </p>
                <p className="text-[11px] text-[#64748B] mt-0.5 leading-tight">{step.sub}</p>
                {current && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#2563EB] bg-[#BFDBFE]/40 px-1.5 py-0.5 rounded-full mt-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-pulse-dot" />
                    진행 중
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </nav>

      {/* Help box */}
      <div className="mt-auto pt-6">
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4">
          <p className="text-xs font-semibold text-[#1E293B] mb-1.5">도움이 필요하신가요?</p>
          <p className="text-[11px] text-[#475569] leading-relaxed">
            사용 방법이나 서비스 관련 문의는 고객 지원 페이지를 이용해 주세요.
          </p>
          <a href="#" className="text-[11px] font-semibold text-[#2563EB] mt-2 inline-block hover:underline">
            고객 지원 바로가기 →
          </a>
        </div>
      </div>
    </aside>
  )
}
