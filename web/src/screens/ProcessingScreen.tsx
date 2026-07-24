import { useState, useEffect } from 'react'
import { Check, AlertCircle, RefreshCw, ChevronRight } from 'lucide-react'
import { mockApi } from '../api/mockApi'
import { ReviewProgress } from '../types'

interface Props {
  reviewId: string | null;
  onDone: () => void
}

const STEPS = [
  { id: 0, label: '검토 준비 중', stage: 'PREPARE' },
  { id: 1, label: '조항 탐색 및 분류', stage: 'BATCH_SEARCH' },
  { id: 2, label: '검토 진행 중', stage: 'CLAUSE_REVIEW' },
  { id: 3, label: '누락 조항 검출', stage: 'MISSING_DETECTION' },
  { id: 4, label: '결과 정리 중', stage: 'RESULT_ASSEMBLY' },
]

type Mode = 'running' | 'error' | 'done'

export default function ProcessingScreen({ reviewId, onDone }: Props) {
  const [activeStep, setActiveStep] = useState(0)
  const [progress, setProgress] = useState<ReviewProgress | null>(null)
  const [mode, setMode] = useState<Mode>('running')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (mode !== 'running' || !reviewId) return

    let isSubscribed = true
    let currentPercent = progress?.percent || 0

    const poll = async () => {
      try {
        const res = await mockApi.pollReviewStatus(reviewId, currentPercent)
        if (!isSubscribed) return

        const { review_state, progress: newProgress } = res.data
        setProgress(newProgress)
        currentPercent = newProgress.percent

        // Update active step based on stage
        const stepIndex = STEPS.findIndex(s => s.stage === newProgress.stage)
        if (stepIndex !== -1) setActiveStep(stepIndex)

        if (review_state === 'COMPLETED') {
          setActiveStep(STEPS.length - 1)
          setMode('done')
        } else if (review_state === 'FAILED') {
          setMode('error')
          setErrorMsg('서버에서 검토 중 오류가 발생했습니다.')
        } else {
          // Continue polling
          setTimeout(poll, 1500)
        }
      } catch (err) {
        if (!isSubscribed) return
        setMode('error')
        setErrorMsg('통신 중 오류가 발생했습니다.')
      }
    }

    // Start initial polling
    poll()

    return () => { isSubscribed = false }
  }, [mode, reviewId])

  const triggerError = () => {
    setMode('error')
    setErrorMsg('오류 상태 미리보기용 테스트 오류입니다.')
  }

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
            <p className="text-xs font-medium text-[#2563EB]">
              {mode === 'done' ? '완료됨' : '처리 중'}
            </p>
          </div>
          <div className="h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#2563EB] rounded-full transition-all duration-700"
              style={{ width: `${progress?.percent || 0}%` }}
            />
          </div>
          {mode === 'running' && progress && (
            <p className="text-xs text-[#475569] mt-3">
              현재 처리 중:{' '}
              <span className="font-medium text-[#1E293B]">{progress.message}</span>
            </p>
          )}
        </div>
      )}

      {/* Step list */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl divide-y divide-[#F1F5F9]">
        {STEPS.map((step, i) => {
          const done = i < activeStep || mode === 'done'
          const current = i === activeStep && mode === 'running'
          const error = mode === 'error' && i === activeStep
          const ahead = i > activeStep && mode !== 'done'

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
                <p className={`text-sm font-medium ${done ? 'text-[#1E293B]' : current ? 'text-[#1E293B]' : error ? 'text-rose-600' : 'text-[#64748B]'
                  }`}>
                  {step.label}
                </p>
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
              <p className="text-sm font-semibold text-rose-700 mb-1">진행 중 오류 발생</p>
              <p className="text-xs text-rose-600 leading-relaxed">
                {errorMsg}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        {mode === 'error' && (
          <button
            onClick={() => { setActiveStep(0); setProgress(null); setMode('running') }}
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
