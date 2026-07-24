import { AlertCircle, ArrowLeft, ChevronRight, FileQuestion } from 'lucide-react'

interface Props {
  onBack: () => void
  onContinue: () => void
}

export default function OutOfScopeScreen({ onBack, onContinue }: Props) {
  return (
    <div className="space-y-8 animate-fade-up max-w-2xl">
      {/* Title */}
      <div>
        <div className="inline-flex items-center gap-2 text-xs font-medium text-[#475569] bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-1.5 rounded-full mb-4">
          <AlertCircle className="w-3.5 h-3.5 text-[#64748B]" aria-hidden="true" />
          검토 범위 안내
        </div>
        <h1 className="text-[22px] font-semibold text-[#1E293B] tracking-tight mb-3 leading-snug">
          현재 표준계약서와의<br />공통 근거가 제한적입니다
        </h1>
        <p className="text-sm text-[#475569] leading-relaxed">
          선택한 계약 유형의 표준계약서와 업로드한 문서 사이의 공통 조항이 충분하지 않아
          비교 결과의 범위가 제한될 수 있습니다.
        </p>
      </div>

      {/* Selected type card */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
        <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mb-3">선택한 계약 유형</p>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#EEF2FF] rounded-xl flex items-center justify-center shrink-0">
            <FileQuestion className="w-5 h-5 text-[#6366F1]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#1E293B]">프리랜서 계약서</p>
            <p className="text-xs text-[#475569]">자유직업인 계약서</p>
          </div>
        </div>
      </div>

      {/* Limitation reason */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
        <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">제한 사유</p>
        <ul className="space-y-2.5">
          {[
            '문서에서 독립 계약자 관계를 명확히 나타내는 표현이 충분히 확인되지 않았습니다.',
            '근로 시간, 임금 등 근로 관계에 가까운 표현이 더 많이 나타납니다.',
            '선택한 유형의 표준계약서와 공통으로 비교할 조항이 3개 미만입니다.',
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#64748B] shrink-0" aria-hidden="true" />
              <span className="text-sm text-[#475569] leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Proceed caution */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <p className="text-xs font-semibold text-amber-700 mb-2">계속 진행 시 유의사항</p>
        <ul className="space-y-1.5">
          {[
            '비교 대상 조항이 적어 검토 결과가 일부에 그칠 수 있습니다.',
            '비교 결과는 해당 계약 유형의 표준조항을 기준으로 하며, 실제 계약 관계와 다를 수 있습니다.',
            '이 서비스는 법률 자문을 제공하지 않습니다.',
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-1.5 w-1 h-1 rounded-full bg-amber-400 shrink-0" aria-hidden="true" />
              <span className="text-xs text-amber-700 leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-3 bg-white border border-[#E2E8F0] text-[#1E293B] rounded-xl text-sm font-medium hover:border-[#CBD5E1] hover:bg-[#F8FAFC] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          유형 다시 선택
        </button>
        <button
          onClick={onContinue}
          className="flex items-center gap-2 px-5 py-3 bg-[#6366F1] text-white rounded-xl text-sm font-medium hover:bg-[#4F46E5] transition-colors"
        >
          계속 검토하기
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
