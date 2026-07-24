import { useState } from 'react'
import { Search, SlidersHorizontal, MessageSquare, ChevronRight, RotateCcw, ChevronDown, ChevronUp, AlertTriangle, CheckSquare } from 'lucide-react'
import Badge from '../components/Badge'
import type { BadgeStatus, ClauseResult } from '../types'

interface Props {
  onClauseClick: () => void
  onChatbot: () => void
}

const CLAUSES: ClauseResult[] = [
  { id: 'c1', article: '제1조 (근로계약 기간)', excerpt: '본 계약의 근로계약 기간은 계약 체결일로부터 1년으로 하며, 당사자 합의에 따라 연장할 수 있다.', status: 'matched', category: '계약 기간', summary: '표준조항과 유사한 기간 설정 구조가 확인됩니다. 연장 조건에 대한 상세 조건을 확인해 주세요.' },
  { id: 'c2', article: '제5조 (근로시간 및 휴게)', excerpt: '1일 근로시간은 8시간으로 하며, 연장근로는 당사자 합의에 따라 실시할 수 있다.', status: 'modified', category: '근무조건', summary: '표준조항 대비 연장근로 한도 및 가산수당 관련 조건이 명시되어 있지 않아 검토가 필요합니다.' },
  { id: 'c3', article: '제7조 (임금 및 지급 방법)', excerpt: '월 기본급은 금 원으로 하며, 매월 25일에 근로자가 지정한 계좌로 지급한다.', status: 'modified', category: '임금', summary: '기본급 금액이 미기재 상태입니다. 표준조항의 임금 항목별 명시 방식과 비교가 필요합니다.' },
  { id: 'c4', article: '제9조 (연차 유급휴가)', excerpt: '근로기준법에 따라 연차 유급휴가를 부여한다.', status: 'review', category: '휴가·휴일', summary: '단순 법령 참조만으로 기재되어 있어 구체적 부여 기준 및 사용 방식 확인이 필요합니다.' },
  { id: 'c5', article: '제11조 (비밀유지 및 경업금지)', excerpt: '근로자는 재직 중 및 퇴직 후 2년간 동종 업계에 취업하거나 유사 사업을 영위할 수 없다.', status: 'modified', category: '비밀유지·경업', summary: '경업금지 기간 및 보상 관련 내용이 표준조항과 다르게 설정되어 있어 검토가 필요합니다.' },
  { id: 'c6', article: '제13조 (손해배상 및 위약금)', excerpt: '근로자의 귀책으로 인한 손해 발생 시, 근로자는 이를 배상할 책임을 진다.', status: 'review', category: '손해배상', summary: '위약금 또는 과도한 손해배상 예정 조항과 관련된 표준조항과의 비교 확인이 필요합니다.' },
]

const MISSING_ITEMS = [
  { id: 'm1', label: '퇴직금 및 퇴직 절차 관련 조항', ref: '근로기준법 제34조', body: '사용자는 퇴직하는 근로자에게 급여를 지급하기 위하여 퇴직급여제도 중 하나 이상의 제도를 설립·운영하여야 한다.' },
  { id: 'm2', label: '직장 내 괴롭힘 금지 조항',       ref: '근로기준법 제76조의2', body: '사용자 또는 근로자는 직장에서의 지위 또는 관계 등의 우위를 이용하여 업무상 적정 범위를 넘어 다른 근로자에게 신체적·정신적 고통을 주거나 근무환경을 악화시키는 행위를 하여서는 아니 된다.' },
  { id: 'm3', label: '개인정보 처리 관련 동의 조항',   ref: '개인정보 보호법 제15조', body: '개인정보처리자는 다음 각 호의 어느 하나에 해당하는 경우에는 개인정보를 수집할 수 있으며 그 수집 목적의 범위에서 이용할 수 있다.' },
]

const NOTE_ITEMS = [
  { id: 'n1', article: '제11조 (경업금지)', excerpt: '퇴직 후 2년간 동종 업계 취업 금지', reason: '경업금지 기간이 2년으로 설정되어 있으며, 보상 조항 없이 제한만 명시된 구조를 확인해 주세요.' },
  { id: 'n2', article: '제13조 (손해배상)', excerpt: '근로자 귀책으로 인한 손해 배상 책임', reason: '배상 상한선이나 귀책 범위에 대한 구체적 기준이 없어 검토가 필요합니다.' },
]

const CATEGORIES = ['전체', '계약 기간', '근무조건', '임금', '휴가·휴일', '비밀유지·경업', '손해배상']
const STATUSES: { id: BadgeStatus | 'all'; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'matched', label: '대응 조항 있음' },
  { id: 'modified', label: '추가·변형 확인' },
  { id: 'review', label: '조항 확인 필요' },
  { id: 'missing', label: '포함 여부 확인' },
]

const SUMMARY = [
  { status: 'matched' as BadgeStatus,  count: 8,  label: '대응 표준조항 있음',   bg: 'bg-emerald-50',  border: 'border-emerald-200', text: 'text-emerald-700', num: 'text-emerald-600' },
  { status: 'modified' as BadgeStatus, count: 5,  label: '추가·변형 내용 확인',  bg: 'bg-amber-50',    border: 'border-amber-200',   text: 'text-amber-700',   num: 'text-amber-600' },
  { status: 'review' as BadgeStatus,   count: 3,  label: '대응 조항 확인 필요',  bg: 'bg-rose-50',     border: 'border-rose-200',    text: 'text-rose-700',    num: 'text-rose-600' },
  { status: 'missing' as BadgeStatus,  count: 6,  label: '포함 여부 확인 필요',  bg: 'bg-slate-100',   border: 'border-slate-200',   text: 'text-[#475569]',   num: 'text-[#475569]' },
]

export default function ResultsScreen({ onClauseClick, onChatbot }: Props) {
  const [filterStatus, setFilterStatus]     = useState<BadgeStatus | 'all'>('all')
  const [filterCategory, setFilterCategory] = useState('전체')
  const [search, setSearch]                 = useState('')
  const [expandedMissing, setExpandedMissing] = useState<string | null>(null)
  const [expandedNote, setExpandedNote]     = useState<string | null>(null)
  const [activeTab, setActiveTab]           = useState<'results' | 'notes'>('results')

  const filtered = CLAUSES.filter(c => {
    const matchStatus = filterStatus === 'all' || c.status === filterStatus
    const matchCat    = filterCategory === '전체' || c.category === filterCategory
    const matchSearch = !search || c.article.includes(search) || c.excerpt.includes(search) || c.summary.includes(search)
    return matchStatus && matchCat && matchSearch
  })

  const resetFilters = () => { setFilterStatus('all'); setFilterCategory('전체'); setSearch('') }
  const hasFilter = filterStatus !== 'all' || filterCategory !== '전체' || search !== ''

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Title row */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-semibold text-[#1E293B] tracking-tight mb-1">계약서 검토 결과</h1>
          <p className="text-sm text-[#475569]">근로계약서 (표준근로계약서) 기준 · 2024년 06월 12일 검토</p>
        </div>
        <button
          onClick={onChatbot}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] rounded-xl text-sm font-medium hover:bg-[#DBEAFE] transition-colors shrink-0"
        >
          <MessageSquare className="w-4 h-4" />
          결과 기반 질의응답
        </button>
      </div>

      {/* Disclaimer banner */}
      <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-5 py-4 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-[#475569] shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-xs text-[#475569] leading-relaxed">
          이 결과는 표준계약서와의 비교를 통한 <strong className="text-[#1E293B] font-semibold">검토 후보 제안</strong>이며,
          법률 자문이나 법적 판단을 제공하지 않습니다. 구체적인 사항은 전문가에게 확인해 주세요.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {SUMMARY.map(s => (
          <button
            key={s.status}
            onClick={() => setFilterStatus(s.status)}
            className={`text-left p-4 rounded-xl border transition-all hover:shadow-sm ${s.bg} ${s.border} ${
              filterStatus === s.status ? 'ring-2 ring-[#2563EB]/40' : ''
            }`}
          >
            <p className={`text-3xl font-bold tracking-tight mb-1 ${s.num}`}>{s.count}</p>
            <p className={`text-xs font-medium leading-tight ${s.text}`}>{s.label}</p>
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#E2E8F0]">
        {([['results', '조항별 검토 결과'], ['notes', '주의 문구 후보 및 누락 체크리스트']] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === id
                ? 'border-[#2563EB] text-[#1E293B]'
                : 'border-transparent text-[#475569] hover:text-[#1E293B]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'results' && (
        <>
          {/* Filter bar */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
              <input
                type="text"
                placeholder="조항명, 키워드로 검색"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm text-[#1E293B] placeholder:text-[#64748B] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
              />
            </div>
            {/* Filters row */}
            <div className="flex items-center gap-3 flex-wrap">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#475569] shrink-0" />
              <div className="flex gap-1.5 flex-wrap">
                {STATUSES.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setFilterStatus(s.id as BadgeStatus | 'all')}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      filterStatus === s.id
                        ? 'bg-[#2563EB] text-white'
                        : 'bg-[#F8FAFC] border border-[#E2E8F0] text-[#475569] hover:border-[#CBD5E1]'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <div className="h-4 w-px bg-[#E2E8F0]" />
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="text-xs border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 bg-[#F8FAFC] text-[#475569] focus:outline-none focus:border-[#2563EB]"
              >
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
              {hasFilter && (
                <button onClick={resetFilters} className="flex items-center gap-1 text-xs text-[#475569] hover:text-[#1E293B] transition-colors ml-auto">
                  <RotateCcw className="w-3 h-3" />
                  필터 초기화
                </button>
              )}
            </div>
          </div>

          {/* Clause cards */}
          {filtered.length > 0 ? (
            <div className="space-y-3">
              {filtered.map(c => (
                <div key={c.id} className="bg-white border border-[#E2E8F0] rounded-xl p-5 hover:border-[#BFDBFE] hover:shadow-sm transition-all">
                  <div className="flex items-start gap-3 justify-between flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge status={c.status} />
                      <span className="text-xs text-[#64748B] bg-[#F8FAFC] border border-[#E2E8F0] px-2 py-0.5 rounded">{c.category}</span>
                    </div>
                    <button
                      onClick={onClauseClick}
                      className="flex items-center gap-1 text-xs font-medium text-[#2563EB] hover:text-[#1E293B] transition-colors shrink-0"
                    >
                      상세 보기 <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-sm font-semibold text-[#1E293B] mt-3 mb-1">{c.article}</p>
                  <p className="text-xs text-[#475569] line-clamp-2 leading-relaxed mb-3 bg-[#F8FAFC] rounded-lg px-3 py-2 border border-[#E2E8F0] font-mono">
                    "{c.excerpt}"
                  </p>
                  <p className="text-xs text-[#475569] leading-relaxed">{c.summary}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-12 text-center">
              <p className="text-sm font-medium text-[#475569] mb-1">현재 비교 결과가 생성되지 않았습니다</p>
              <p className="text-xs text-[#64748B]">필터를 변경하거나 초기화해 보세요</p>
              <button onClick={resetFilters} className="mt-4 text-xs font-medium text-[#2563EB] hover:underline">
                필터 초기화
              </button>
            </div>
          )}
        </>
      )}

      {activeTab === 'notes' && (
        <div className="space-y-6">
          {/* Note clauses */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-amber-500" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-[#1E293B]">주의 문구 후보</h2>
              <span className="text-xs text-[#475569] bg-amber-50 border border-amber-200 text-amber-600 px-2 py-0.5 rounded-full font-medium">{NOTE_ITEMS.length}건</span>
            </div>
            <p className="text-xs text-[#475569] mb-4 leading-relaxed">
              표준계약서 기준에서 주의가 필요한 것으로 분류된 조항입니다. 이는 검토 후보이며, 법적 판단이 아닙니다.
            </p>
            <div className="space-y-2">
              {NOTE_ITEMS.map(item => {
                const open = expandedNote === item.id
                return (
                  <div key={item.id} className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedNote(open ? null : item.id)}
                      className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[#F8FAFC] transition-colors"
                    >
                      <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" aria-hidden="true" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#1E293B]">{item.article}</p>
                        <p className="text-xs text-[#475569] mt-0.5 truncate">{item.excerpt}</p>
                      </div>
                      {open ? <ChevronUp className="w-4 h-4 text-[#64748B] shrink-0" /> : <ChevronDown className="w-4 h-4 text-[#64748B] shrink-0" />}
                    </button>
                    {open && (
                      <div className="px-5 pb-5 pt-0 border-t border-[#F1F5F9]">
                        <p className="text-xs text-[#475569] leading-relaxed mt-4 mb-3">{item.reason}</p>
                        <button
                          onClick={onClauseClick}
                          className="text-xs font-medium text-[#2563EB] hover:underline flex items-center gap-1"
                        >
                          조항 상세 보기 <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Missing checklist */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <CheckSquare className="w-4 h-4 text-[#64748B]" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-[#1E293B]">포함 여부 체크리스트</h2>
              <span className="text-xs text-[#475569] bg-[#EFF6FF] border border-[#CBD5E1] text-[#475569] px-2 py-0.5 rounded-full font-medium">{MISSING_ITEMS.length}건</span>
            </div>
            <p className="text-xs text-[#475569] mb-4 leading-relaxed">
              표준계약서에서 확인해 볼 항목을 체크리스트로 정리했습니다. 문서에 포함되어 있는지 직접 확인해 주세요.
            </p>
            <div className="space-y-2">
              {MISSING_ITEMS.map(item => {
                const open = expandedMissing === item.id
                return (
                  <div key={item.id} className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedMissing(open ? null : item.id)}
                      className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[#EFF6FF] transition-colors"
                      aria-expanded={open}
                    >
                      <div className="w-4 h-4 rounded border-2 border-[#94A3B8] shrink-0 flex items-center justify-center" aria-hidden="true" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#1E293B]">{item.label}</p>
                        <p className="text-[11px] text-[#475569] mt-0.5">{item.ref}</p>
                      </div>
                      {open ? <ChevronUp className="w-4 h-4 text-[#64748B] shrink-0" /> : <ChevronDown className="w-4 h-4 text-[#64748B] shrink-0" />}
                    </button>
                    {open && (
                      <div className="px-5 pb-5 border-t border-[#E2E8F0]">
                        <p className="text-[11px] font-semibold text-[#475569] uppercase tracking-wider mt-4 mb-2">표준조항 원문</p>
                        <p className="text-xs text-[#475569] leading-relaxed bg-white border border-[#E2E8F0] rounded-lg px-4 py-3 font-mono">
                          {item.body}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
