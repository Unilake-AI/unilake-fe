export interface NlqResponse {
  sql: string
  answer?: string
  truncated?: boolean
  note?: string
  rows: Record<string, unknown>[]
}

export interface NlqConversationTurn {
  id: number
  question: string
  state: 'processing' | 'done' | 'error'
  result?: NlqResponse
  error?: string
  durationMs?: number
}
