import { useState } from 'react'
import { ArrowLeft, Scale, Copy, ChevronRight, MessageSquare, Check, BookOpen } from 'lucide-react'
import Badge from '../components/Badge'

interface Props {
  onBack: () => void
  onChatbot: () => void
}

const CLAUSE_DATA = {
  article: '제5조 (근로시간 및 휴게)',
  status: 'modified' as const,
  category: '근무조건',
  reviewPoint: '표준조항 대비 연장근로 한도 및 가산수당 관련 조건이 다르게 기재되어 있으며, 근로자에게 불명확할 수 있는 표현이 포함되어 있습니다.',
  userText: `제5조 (근로시간 및 휴게)

① 1일 근로시간은 8시간으로 하며, 1주 근로시간은 40시간으로 한다.

② 연장근로는 당사자 합의에 따라 실시할 수 있다.

③ 사용자는 근로자에게 1일 근로시간이 4시간인 경우에는 30분 이상, 8시간인 경우에는 1시간 이상의 휴게시간을 부여한다.

④ 근무 장소는 회사 본사 또는 사용자가 지정하는 장소로 한다.`,
  standardText: `제5조 (근로시간 및 휴게)

① 소정 근로시간은 휴게시간을 제외하고 1일 8시간, 1주 40시간으로 한다.

② 연장근로는 1주간 12시간을 초과하지 않는 범위에서 당사자 합의에 따라 실시할 수 있으며, 연장근로에 대하여는 통상임금의 100분의 50 이상을 가산하여 지급한다.

③ 사용자는 근로자에게 근로시간 도중에 다음 기준에 따른 휴게시간을 부여하여야 한다.
   - 4시간 근무 시: 30분 이상
   - 8시간 근무 시: 1시간 이상`,
  legalBasis: [
    {
      law: '근로기준법 제53조',
      title: '연장근로의 제한',
      text: '당사자 간에 합의하면 1주간에 12시간을 한도로 근로시간을 연장할 수 있다.',
      source: '근로기준법 제53조 제1항',
    },
    {
      law: '근로기준법 제56조',
      title: '연장·야간 및 휴일 근로',
      text: '사용자는 연장근로(제53조, 제59조 및 제69조 단서에 따라 연장된 시간의 근로)에 대하여는 통상임금의 100분의 50 이상을 가산하여 근로자에게 지급하여야 한다.',
      source: '근로기준법 제56조 제1항',
    },
  ],
}

export default function ClauseDetailScreen({ onBack, onChatbot }: Props) {
  const [copied, setCopied] = useState<'user' | 'standard' | null>(null)

  const copy = (which: 'user' | 'standard', text: string) => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(which)
    setTimeout(() => setCopied(null), 1800)
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Back + breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-[#475569] hover:text-[#1E293B] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          검토 결과로
        </button>
        <span className="text-[#E2E8F0]">/</span>
        <span className="text-sm text-[#1E293B] font-medium">{CLAUSE_DATA.article}</span>
      </div>

      {/* Status + review point */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Badge status={CLAUSE_DATA.status} />
          <span className="text-xs text-[#64748B] bg-[#F8FAFC] border border-[#E2E8F0] px-2.5 py-1 rounded-full">
            {CLAUSE_DATA.category}
          </span>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mb-2">검토 포인트</p>
          <p className="text-sm text-[#1E293B] leading-relaxed">{CLAUSE_DATA.reviewPoint}</p>
        </div>
      </div>

      {/* Comparison */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* User clause */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <p className="text-xs font-semibold text-[#1E293B]">업로드한 계약서</p>
            <button
              onClick={() => copy('user', CLAUSE_DATA.userText)}
              className="flex items-center gap-1 text-[11px] text-[#475569] hover:text-[#1E293B] transition-colors"
              aria-label="원문 복사"
            >
              {copied === 'user' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied === 'user' ? '복사됨' : '복사'}
            </button>
          </div>
          <pre className="px-5 py-5 text-xs text-[#1E293B] leading-loose font-mono whitespace-pre-wrap break-words">
            {CLAUSE_DATA.userText}
          </pre>
        </div>

        {/* Standard clause */}
        <div className="bg-[#EFF6FF]/40 border border-[#BFDBFE] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#BFDBFE] bg-[#EFF6FF]/60">
            <p className="text-xs font-semibold text-[#2563EB]">대응 표준조항</p>
            <button
              onClick={() => copy('standard', CLAUSE_DATA.standardText)}
              className="flex items-center gap-1 text-[11px] text-[#2563EB] hover:text-[#1E293B] transition-colors"
              aria-label="표준조항 복사"
            >
              {copied === 'standard' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied === 'standard' ? '복사됨' : '복사'}
            </button>
          </div>
          <pre className="px-5 py-5 text-xs text-[#1E293B] leading-loose font-mono whitespace-pre-wrap break-words">
            {CLAUSE_DATA.standardText}
          </pre>
        </div>
      </div>

      {/* Legal basis */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Scale className="w-4 h-4 text-[#475569]" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-[#1E293B]">법령 근거</h2>
        </div>
        <div className="space-y-3">
          {CLAUSE_DATA.legalBasis.map((basis, i) => (
            <div key={i} className="bg-white border border-[#E2E8F0] rounded-xl p-5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-[#EFF6FF] rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  <BookOpen className="w-4 h-4 text-[#2563EB]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="text-xs font-semibold text-[#2563EB] bg-[#EFF6FF] border border-[#BFDBFE] px-2 py-0.5 rounded">{basis.law}</span>
                    <span className="text-xs font-medium text-[#1E293B]">{basis.title}</span>
                  </div>
                  <p className="text-xs text-[#475569] leading-relaxed mb-2">{basis.text}</p>
                  <p className="text-[10px] text-[#64748B]">출처: {basis.source}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTAs */}
      <div className="flex items-center gap-3 flex-wrap pt-2">
        <button
          onClick={onChatbot}
          className="flex items-center gap-2 px-5 py-3 bg-[#2563EB] text-white rounded-xl text-sm font-medium hover:bg-[#1D4ED8] transition-colors"
        >
          협의 문구 제안 보기
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={onChatbot}
          className="flex items-center gap-2 px-5 py-3 bg-white border border-[#E2E8F0] text-[#1E293B] rounded-xl text-sm font-medium hover:bg-[#F8FAFC] transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          이 조항에 대해 질문하기
        </button>
      </div>
    </div>
  )
}
