import { Shield } from 'lucide-react'
import type { Screen } from '../types'

interface Props {
  currentScreen: Screen
  onNavigate: (s: Screen) => void
}

export default function Header({ currentScreen, onNavigate }: Props) {
  const isReview = ['upload', 'contract-type', 'out-of-scope', 'processing'].includes(currentScreen)
  const isResult = ['results', 'clause-detail', 'chatbot'].includes(currentScreen)

  return (
    <header className="bg-white border-b border-[#E2E8F0] sticky top-0 z-40">
      <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center gap-8">
        {/* Logo */}
        <button
          onClick={() => onNavigate('upload')}
          className="flex items-center gap-2.5 shrink-0 group"
        >
          <div className="w-8 h-8 bg-[#2563EB] rounded-lg flex items-center justify-center group-hover:bg-[#1D4ED8] transition-colors">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-[#1E293B] text-[17px] tracking-tight">WorkShield</span>
        </button>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-1 ml-4">
          <button
            onClick={() => onNavigate('upload')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isReview
                ? 'bg-[#EFF6FF] text-[#1E293B]'
                : 'text-[#475569] hover:text-[#1E293B] hover:bg-[#F8FAFC]'
            }`}
          >
            계약서 검토
          </button>
          <button
            onClick={() => onNavigate('results')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isResult
                ? 'bg-[#EFF6FF] text-[#1E293B]'
                : 'text-[#475569] hover:text-[#1E293B] hover:bg-[#F8FAFC]'
            }`}
          >
            검토 결과
          </button>
        </nav>

        {/* Right: session */}
        <div className="ml-auto flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-dot" />
            <span className="text-xs text-[#475569]">세션 유지중 · 60분 남음</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-xs font-semibold text-[#2563EB]">
            김
          </div>
        </div>
      </div>
    </header>
  )
}
