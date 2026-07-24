import type { BadgeStatus } from '../types'

interface Props {
  status: BadgeStatus
  size?: 'sm' | 'md'
}

const CONFIG: Record<BadgeStatus, { label: string; dot: string; bg: string; text: string; border: string }> = {
  matched: {
    label: '대응 표준조항 있음',
    dot: 'bg-emerald-500',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  modified: {
    label: '추가·변형 내용 확인',
    dot: 'bg-amber-500',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  review: {
    label: '대응 조항 확인 필요',
    dot: 'bg-rose-400',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
  },
  missing: {
    label: '포함 여부 확인 필요',
    dot: 'bg-slate-400',
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    border: 'border-slate-200',
  },
}

export default function Badge({ status, size = 'md' }: Props) {
  const c = CONFIG[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium border rounded-full ${c.bg} ${c.text} ${c.border} ${
        size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} aria-hidden="true" />
      {c.label}
    </span>
  )
}
