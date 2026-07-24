import { useState, useRef } from 'react'
import {
  UploadCloud, FileText, CheckCircle2, X, ChevronRight, BriefcaseBusiness, Handshake
} from 'lucide-react'
import { mockApi } from '../api/mockApi'
import { TEMP_FILE_MAX_SIZE, TEMP_SESSION_TOKEN_KEY } from '../config'

interface Props { 
  sessionId: string | null;
  setSessionId: (id: string | null) => void;
  setReviewId: (id: string | null) => void;
  onNext: () => void;
  onOutOfScope: () => void;
}

type UploadState = 'idle' | 'uploading' | 'success'

const FORMATS = ['HWP', 'HWPX', 'HWPML', 'PDF', 'XLS', 'XLSX', 'DOCX']

const CONTRACT_TYPES = [
  { id: 'SI_SUBCONTRACT', name: 'SI 하도급', sub: 'SI 구축 하도급 계약 비교 기준입니다.' },
  { id: 'SW_FREELANCE', name: 'SW 프리랜서 용역', sub: 'SW 프리랜서 도급·용역 계약 비교 기준입니다.' },
  { id: 'SM_SUBCONTRACT', name: 'SM 하도급', sub: 'SM 운영·유지보수 하도급 계약 비교 기준입니다.' },
]

export default function UploadAndTypeScreen({ sessionId, setSessionId, setReviewId, onNext, onOutOfScope }: Props) {
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [isDragging, setIsDragging]   = useState(false)
  const [progress, setProgress]        = useState(0)
  const [fileName, setFileName]        = useState('')
  const [fileSizeStr, setFileSizeStr]  = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  
  const [selectedType, setSelectedType] = useState('SI_SUBCONTRACT')
  const [errorMsg, setErrorMsg] = useState('')

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    processFile(file)
  }

  const processFile = async (file: File) => {
    setErrorMsg('')
    if (file.size > TEMP_FILE_MAX_SIZE) {
      setErrorMsg(`파일 크기가 10MB를 초과합니다. (현재: ${(file.size / 1024 / 1024).toFixed(1)}MB)`)
      return
    }

    const extension = file.name.split('.').pop()?.toUpperCase() || ''
    if (!FORMATS.includes(extension)) {
      setErrorMsg(`지원하지 않는 파일 형식입니다. (.${extension.toLowerCase()})`)
      return
    }

    setFileName(file.name)
    setFileSizeStr((file.size / 1024).toFixed(1) + ' KB')
    setUploadState('uploading')
    setProgress(0)

    // Simulate progress while API is called
    const id = setInterval(() => {
      setProgress(p => Math.min(p + Math.random() * 20, 90))
    }, 200)

    try {
      const response = await mockApi.uploadContract(file)
      clearInterval(id)
      setProgress(100)
      setUploadState('success')
      
      const newSessionId = response.data.session_id
      setSessionId(newSessionId)
      localStorage.setItem(TEMP_SESSION_TOKEN_KEY, newSessionId)

      if (response.data.suggested_contract_type) {
        setSelectedType(response.data.suggested_contract_type)
      }
    } catch (err) {
      clearInterval(id)
      setUploadState('idle')
      setErrorMsg('업로드에 실패했습니다. 다시 시도해주세요.')
    }
  }

  const handleNext = async () => {
    if (!sessionId) return
    try {
      // 1. Confirm contract type
      await mockApi.selectContractType(sessionId, selectedType)
      
      // 2. Start review
      const reviewRes = await mockApi.startReview(sessionId)
      setReviewId(reviewRes.data.review_id)
      
      // 3. Move to processing screen
      onNext()
    } catch (err) {
      setErrorMsg('검토 시작 중 오류가 발생했습니다.')
    }
  }

  const reset = () => { 
    setUploadState('idle')
    setProgress(0)
    setErrorMsg('')
    setSessionId(null)
    setReviewId(null)
    localStorage.removeItem(TEMP_SESSION_TOKEN_KEY)
  }

  return (
    <div className="space-y-10 animate-fade-up">
      {/* ── 1. Upload Section ── */}
      <section className="space-y-6">
        <div>
          <p className="text-xs font-semibold tracking-[.14em] text-[#2563EB] mb-3">1단계 · 파일 업로드</p>
          <h1 className="text-[22px] font-semibold text-[#1E293B] tracking-tight mb-2">
            검토할 계약서를 업로드해 주세요
          </h1>
          <p className="text-sm text-[#475569] leading-relaxed">
            업로드한 문서는 검토 목적으로만 일시적으로 처리되며, 완료 후 서버에서 자동 삭제됩니다.
          </p>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
            {errorMsg}
          </div>
        )}

        {uploadState === 'idle' && (
          <div
            role="button"
            tabIndex={0}
            onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={e => { 
              e.preventDefault(); 
              setIsDragging(false); 
              const file = e.dataTransfer.files?.[0]
              if (file) processFile(file)
            }}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-10 sm:p-14 flex flex-col items-center text-center cursor-pointer transition-all duration-200 ${
              isDragging
                ? 'border-[#2563EB] bg-[#EFF6FF]'
                : 'border-[#CBD5E1] bg-white hover:border-[#2563EB] hover:bg-[#EFF6FF]/40'
            }`}
          >
            <input ref={fileRef} type="file" className="hidden" accept=".hwp,.hwpx,.hwpml,.pdf,.xls,.xlsx,.docx" onChange={handleFileChange} />
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-colors ${
              isDragging ? 'bg-[#2563EB]' : 'bg-[#EFF6FF]'
            }`}>
              <UploadCloud className={`w-8 h-8 transition-colors ${isDragging ? 'text-white' : 'text-[#2563EB]'}`} />
            </div>
            <p className="text-base font-medium text-[#1E293B] mb-4">
              파일을 이곳에 드래그하거나 직접 선택하세요
            </p>
            
            <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
              <span className="text-xs text-[#64748B] mr-2">지원 형식:</span>
              {FORMATS.map(f => (
                <span key={f} className="px-2 py-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded text-[11px] font-mono font-medium text-[#475569]">
                  .{f.toLowerCase()}
                </span>
              ))}
            </div>
            
            <p className="text-xs text-[#64748B] mb-8 font-medium">최대 10MB까지 업로드 가능합니다</p>

            <button
              onClick={e => { e.stopPropagation(); fileRef.current?.click() }}
              className="px-5 py-2.5 bg-[#2563EB] text-white rounded-xl text-sm font-medium hover:bg-[#1D4ED8] transition-colors"
            >
              파일 선택
            </button>
          </div>
        )}

        {/* Uploading */}
        {uploadState === 'uploading' && (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-[#EFF6FF] rounded-xl flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-[#2563EB]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-[#1E293B] truncate pr-4">{fileName}</p>
                  <span className="text-xs text-[#475569] shrink-0">{fileSizeStr}</span>
                </div>
                <div className="flex items-center gap-3 mb-1.5">
                  <div className="flex-1 h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#2563EB] rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-[#475569] shrink-0">전송 중</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success */}
        {uploadState === 'success' && (
          <div className="bg-white border border-emerald-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1E293B] truncate">{fileName}</p>
                <p className="text-xs text-[#475569] mt-0.5">{fileSizeStr} · 업로드 완료</p>
              </div>
              <button onClick={reset} aria-label="파일 제거" className="text-[#64748B] hover:text-[#475569] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </section>

      <hr className="border-[#E2E8F0]" />

      {/* ── 2. Contract Type Section ── */}
      <section className="space-y-6">
        <div>
          <p className="text-xs font-semibold tracking-[.14em] text-[#2563EB] mb-3">2단계 · 비교 기준</p>
          <h2 className="text-[22px] font-semibold text-[#1E293B] tracking-tight mb-2">계약 유형 선택</h2>
          <p className="text-sm text-[#475569] leading-relaxed mb-1">
            실제 계약 관계에 가장 가까운 유형을 선택해 주세요.
          </p>
          <p className="text-xs text-[#64748B] italic">
            * 그 외의 계약서 지원 서비스는 추후 확장 예정입니다.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          {CONTRACT_TYPES.map((type) => {
            const active = selectedType === type.id
            return (
              <button 
                key={type.id} 
                onClick={() => setSelectedType(type.id)} 
                aria-pressed={active}
                className={`relative min-h-[80px] py-3 px-2 rounded-xl border-2 transition-all flex flex-col items-center justify-center text-center ${
                  active 
                    ? 'border-[#2563EB] bg-[#EFF6FF]/40 shadow-sm' 
                    : 'border-[#E2E8F0] bg-white hover:border-[#93C5FD] hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-center gap-1.5 w-full">
                  <h3 className={`text-[14px] font-semibold ${active ? 'text-[#2563EB]' : 'text-[#1E293B]'}`}>{type.name}</h3>
                  {active && (
                    <CheckCircle2 className="w-4 h-4 text-[#2563EB]" />
                  )}
                </div>
                <p className="text-[11px] text-[#64748B] mt-1 leading-relaxed break-keep">{type.sub}</p>
              </button>
            )
          })}
        </div>

        <div className="rounded-xl border border-[#E2E8F0] bg-white px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <p className="text-xs text-[#475569] leading-relaxed flex-1">
            해당하는 계약 유형이 없다면, 제공 범위를 먼저 확인해 주세요.
          </p>
          <button onClick={onOutOfScope} className="text-sm font-semibold text-[#2563EB] hover:text-[#1D4ED8]">
            제공 범위 확인
          </button>
        </div>
      </section>

      {/* ── 3. Bottom Controls & Help ── */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between pt-4 gap-6">
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 border-dashed">
          <p className="text-xs font-medium text-slate-500">
            [도움이 필요하신가요?] 임시 영역 (팀 논의 후 삭제 또는 유지)
          </p>
        </div>

        <button
          onClick={handleNext}
          disabled={uploadState !== 'success'}
          className={`inline-flex items-center justify-center gap-2 rounded-xl px-8 py-3.5 text-sm font-semibold transition-all ${
            uploadState === 'success'
              ? 'bg-[#2563EB] text-white hover:bg-[#1D4ED8] shadow-md shadow-blue-500/20'
              : 'bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed'
          }`}
        >
          선택한 유형으로 검토 시작 <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

