import { useState, useEffect } from 'react'
import { Check, AlertCircle, RefreshCw, ChevronRight } from 'lucide-react'

interface Props { onDone: () => void }

const STEPS = [
  { id: 0, label: '검토 준비 중',          detail: '파일 파싱 및 텍스트 추출 완료' },
  { id: 1, label: '관련 표준조항 탐색 중', detail: '근로기준법 관련 표준조항 12개 확인 중' },
  { id: 2, label: '비교 조항 선별 중',     detail: '비교 대상 조항을 정리하고 있습니다' },
  { id: 3, label: '계약 조항 비교 중',     detail: '제7조 (임금) 비교 분석 중' },
  { id: 4, label: '확인할 표준조항 정리 중', detail: '최종 검토 결과 구성 중' },
]

const CURRENT_EXAMPLES = [
  '제1조 (근로계약 기간)',
  '제3조 (근무 장소 및 업무 내용)',
  '제5조 (근로시간 및 휴게)',
  '제7조 (임금 및 지급 방법)',
  '제9조 (연차 유급휴가)',
]

type Mode = 'running' | 'error' | 'done'

export default function ProcessingScreen({ onDone }: Props) {
  const [activeStep, setActiveStep]     = useState(0)
  const [currentClause, setCurrentClause] = useState(0)
  const [progress, setProgress]         = useState(0)
  const [mode, setMode]                 = useState<Mode>('running')

  useEffect(() => {
    if (mode !== 'running') return
    const id = setInterval(() => {
      setActiveStep(s => {
        if (s >= STEPS.length - 1) {
          clearInterval(id)
          setMode('done')
          setProgress(100)
          return s
        }
        setProgress(((s + 1) / STEPS.length) * 100)
        setCurrentClause(c => (c + 1) % CURRENT_EXAMPLES.length)
        return s + 1
      })
    }, 1400)
    return () => clearInterval(id)
  }, [mode])

  const triggerError = () => setMode('error')

  return (
    <div className="space-y-8 animate-fade-up max-w-2xl">
      {/* Title */}
      <div>
        <h1 className="text-[22px] font-semibold text-[#1E293B] tracking-tight mb-2">
          {mode === 'error' ? '검토 중 오류가 발생했습니다' : '계약서를 검토하고 있습니다'}
        </h1>
        <p className="text-sm text-[#475569]">
          {mode === 'error'
            ? '진행하던 단계에서 처리가 중단되었습니다. 다시 시도해 주세요.'
            : '표준계약서와 조항을 비교하고 있습니다. 잠시 기다려 주세요.'}
        </p>
      </div>

      {/* Progress bar */}
      {mode !== 'error' && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-[#1E293B]">검토 진행 상태</p>
            <p className="text-xs font-medium text-[#2563EB]">처리 중</p>
          </div>
          <div className="h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#2563EB] rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
          {mode === 'running' && (
            <p className="text-xs text-[#475569] mt-3">
              현재 처리 중:{' '}
              <span className="font-medium text-[#1E293B]">{CURRENT_EXAMPLES[currentClause]}</span>
            </p>
          )}
        </div>
      )}

      {/* Step list */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl divide-y divide-[#F1F5F9]">
        {STEPS.map((step, i) => {
          const done    = i < activeStep || mode === 'done'
          const current = i === activeStep && mode === 'running'
          const error   = mode === 'error' && i === activeStep
          const ahead   = i > activeStep && mode !== 'done'

          return (
            <div key={step.id} className={`flex items-center gap-4 px-5 py-4 ${current ? 'bg-[#EFF6FF]/40' : ''}`}>
              {/* Status icon */}
              <div className="w-7 h-7 shrink-0 flex items-center justify-center">
                {done && !error && (
                  <div className="w-7 h-7 rounded-full bg-[#2563EB] flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                  </div>
                )}
                {current && (
                  <div className="w-7 h-7 rounded-full border-2 border-[#2563EB] border-t-transparent animate-spin-slow" />
                )}
                {error && (
                  <div className="w-7 h-7 rounded-full bg-rose-100 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                  </div>
                )}
                {ahead && (
                  <div className="w-7 h-7 rounded-full border-2 border-[#E2E8F0]" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${
                  done ? 'text-[#1E293B]' : current ? 'text-[#1E293B]' : error ? 'text-rose-600' : 'text-[#64748B]'
                }`}>
                  {step.label}
                </p>
                {(done || current) && !error && (
                  <p className="text-xs text-[#475569] mt-0.5">{step.detail}</p>
                )}
                {error && (
                  <p className="text-xs text-rose-500 mt-0.5">조항 비교 중 서버 응답을 받지 못했습니다</p>
                )}
              </div>

              {done && (
                <span className="text-[11px] text-[#475569] shrink-0">완료</span>
              )}
              {current && (
                <span className="text-[11px] text-[#2563EB] font-medium shrink-0 animate-pulse-dot">진행 중</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Error detail */}
      {mode === 'error' && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-rose-700 mb-1">비교 조항 선별 중 오류 발생</p>
              <p className="text-xs text-rose-600 leading-relaxed">
                표준조항 데이터베이스와의 연결이 일시적으로 중단되었습니다. 잠시 후 다시 시도하거나,
                문제가 지속되면 고객 지원에 문의해 주세요.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        {mode === 'error' && (
          <button
            onClick={() => { setActiveStep(0); setProgress(0); setMode('running') }}
            className="flex items-center gap-2 px-5 py-3 bg-[#2563EB] text-white rounded-xl text-sm font-medium hover:bg-[#1D4ED8] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            다시 시도
          </button>
        )}
        {mode === 'done' && (
          <button
            onClick={onDone}
            className="flex items-center gap-2 px-6 py-3 bg-[#2563EB] text-white rounded-xl text-sm font-medium hover:bg-[#1D4ED8] transition-colors"
          >
            검토 결과 확인하기
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
        {mode === 'running' && (
          <button
            onClick={triggerError}
            className="text-xs text-[#64748B] hover:text-[#475569] transition-colors"
          >
            오류 상태 미리보기 →
          </button>
        )}
      </div>
    </div>
  )
}
