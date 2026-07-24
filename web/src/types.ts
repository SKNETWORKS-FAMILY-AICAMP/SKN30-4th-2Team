export type Screen =
  | 'upload-and-type'
  | 'out-of-scope'
  | 'processing'
  | 'results'
  | 'clause-detail'
  | 'chatbot'

export type BadgeStatus = 'matched' | 'modified' | 'review' | 'missing'

export interface ClauseResult {
  id: string
  article: string
  excerpt: string
  status: BadgeStatus
  category: string
  summary: string
}
